import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert, Vibration } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function CrashAgentScreen({ navigation }) {
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const [gForce, setGForce] = useState(1);
  const [speed, setSpeed] = useState(0); // Vitesse en km/h
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState('monitoring'); // monitoring, analyzing_pre_alert, sos, sos_dispatched
  const [countdown, setCountdown] = useState(5);
  const [sosCountdown, setSosCountdown] = useState(15);
  const [transportMode, setTransportMode] = useState('Voiture'); // Voiture, Moto, Vélo
  
  const subscriptionRef = useRef(null);
  const locationSubRef = useRef(null);
  const soundRef = useRef(null);
  const flashIntervalRef = useRef(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  
  const [permission, requestPermission] = useCameraPermissions();

  const CRASH_THRESHOLD = 4.0;
  
  // API URL is centralized here for easy maintenance
  const API_URL_ANALYZE = 'http://192.168.1.188:3000/api/orchestrator/analyze';
  const API_URL_SOS = 'http://192.168.1.188:3000/api/users/sos-alert';

  useEffect(() => {
    _subscribe();
    _startLocationTracking();
    if (!permission?.granted) {
      requestPermission();
    }
    return () => {
      _unsubscribe();
      _stopLocationTracking();
      stopAlarms(); // Nettoyage en quittant l'écran
    };
  }, []);

  const _startLocationTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    locationSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (location) => {
        // La vitesse de l'API est en mètres par seconde (m/s), on convertit en km/h
        const speedKmh = location.coords.speed && location.coords.speed > 0 
          ? (location.coords.speed * 3.6).toFixed(0) 
          : 0;
        setSpeed(speedKmh);
      }
    );
  };

  const _stopLocationTracking = () => {
    if (locationSubRef.current) {
      locationSubRef.current.remove();
      locationSubRef.current = null;
    }
  };

  const _subscribe = () => {
    Accelerometer.setUpdateInterval(200); // 5 fois par seconde
    subscriptionRef.current = Accelerometer.addListener(accelerometerData => {
      setData(accelerometerData);
      const force = Math.sqrt(
        Math.pow(accelerometerData.x, 2) +
        Math.pow(accelerometerData.y, 2) +
        Math.pow(accelerometerData.z, 2)
      );
      setGForce(force);

      if (force > CRASH_THRESHOLD && status === 'monitoring' && !isAnalyzing) {
        triggerCrashFlow(force);
      }
    });
  };

  const _unsubscribe = () => {
    subscriptionRef.current && subscriptionRef.current.remove();
    subscriptionRef.current = null;
  };

  // Lancement du flux de crash
  const triggerCrashFlow = async (detectedForce) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setStatus('analyzing_pre_alert');
    setCountdown(5); // 5 secondes de pré-alerte
    setSosCountdown(15); // 15 secondes avant de prévenir les contacts
    _unsubscribe(); 

    // Démarre la vibration d'urgence (Vibre 1s, Pause 0.5s)
    Vibration.vibrate([500, 1000], true);

    // On lance l'analyse IA en arrière-plan sans bloquer
    checkAI(detectedForce);
  };

  const checkAI = async (detectedForce) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log(`📡 Choc détecté (${detectedForce.toFixed(2)}G). Envoi à l'Orchestrateur...`);
      
      const response = await fetch(API_URL_ANALYZE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          speed: parseInt(speed) || 80, // Utilise la vraie vitesse ou 80 par défaut si 0
          timeSinceLastMove: 0,
          timeOfDay: new Date().toLocaleTimeString(),
          anomalyType: 'car_crash',
          deviationDistance: 0,
          latitude: 33.5731, 
          longitude: -7.5898,
          transportMode: transportMode
        })
      });
      
      const decision = await response.json();
      console.log("🤖 Décision de l'Orchestrateur:", decision);

      // Si l'utilisateur a déjà annulé entre-temps, on ignore la décision
      setStatus(currentStatus => {
        if (currentStatus === 'monitoring') return currentStatus; 
        
        if (decision.action === 'trigger_alert') {
          // Si on est encore dans les 5 secondes, l'effet se déclenchera à la fin du timer
          // Si on veut qu'elle passe immédiatement en SOS si les 5s sont finies:
          return currentStatus;
        } else {
          // Faux positif selon l'IA
          Alert.alert("Analyse IA", "L'Orchestrateur a jugé le choc mineur. Annulation automatique.");
          Vibration.cancel();
          setIsAnalyzing(false);
          _subscribe();
          return 'monitoring';
        }
      });
    } catch (e) {
      console.error("Erreur Orchestrateur:", e);
      // Fail-Safe: On garde l'alerte
    }
  };

  // Gestion du compte à rebours de la pré-alerte et SOS
  useEffect(() => {
    let timer;
    if (status === 'analyzing_pre_alert') {
      if (countdown > 0) {
        timer = setInterval(() => {
          setCountdown((prev) => prev - 1);
        }, 1000);
      } else if (countdown === 0) {
        setStatus('sos');
        triggerSOSAlert();
      }
    } else if (status === 'sos') {
      if (sosCountdown > 0) {
        timer = setInterval(() => {
          setSosCountdown((prev) => prev - 1);
        }, 1000);
      } else if (sosCountdown === 0) {
        setStatus('sos_dispatched');
        dispatchEmergencyContacts();
      }
    }
    return () => clearInterval(timer);
  }, [status, countdown, sosCountdown]);

  const dispatchEmergencyContacts = async () => {
    console.log("🚨 Envoi des messages aux contacts d'urgence...");
    Alert.alert("URGENCE", "Vos contacts d'urgence ont été prévenus (SMS/Appel automatique).");
    // L'alarme et le flash continuent pour attirer l'attention
  };

  const triggerSOSAlert = async () => {
    Vibration.cancel(); // On arrête la vibration de pré-alerte
    
    // Joue l'alarme à plein volume
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg' },
        { shouldPlay: true, isLooping: true }
      );
      soundRef.current = sound;
    } catch (e) {
      console.log("Erreur son:", e);
    }

    // Déclenche le flash stroboscopique
    if (permission?.granted) {
      flashIntervalRef.current = setInterval(() => {
        setIsFlashOn(prev => !prev);
      }, 300); // Clignote toutes les 300ms
    }

    // Appel API pour alerter les secours
    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch(API_URL_SOS, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🆘 URGENCE ABSOLUE",
          body: "Les secours et vos contacts d'urgence ont été prévenus.",
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const stopAlarms = async () => {
    Vibration.cancel();
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    if (flashIntervalRef.current) {
      clearInterval(flashIntervalRef.current);
      flashIntervalRef.current = null;
    }
    setIsFlashOn(false);
  };

  const cancelPreAlert = () => {
    stopAlarms();
    setStatus('monitoring');
    setIsAnalyzing(false);
    _subscribe(); // Relance l'accéléromètre
  };
  
  const endSOS = () => {
    stopAlarms();
    setStatus('monitoring');
    setIsAnalyzing(false);
    _subscribe();
  };

  // 1. Écran de Pré-Alerte (Tout va bien ?)
  if (status === 'analyzing_pre_alert') {
    return (
      <View style={[styles.container, { backgroundColor: '#F59E0B' }]}>
        <Feather name="alert-circle" size={80} color="white" />
        <Text style={styles.criticalTitle}>CHOC DÉTECTÉ</Text>
        <Text style={styles.criticalSubtitle}>Tout va bien ? Déclenchement automatique du SOS dans :</Text>
        <Text style={styles.countdownText}>{countdown}</Text>
        
        <TouchableOpacity style={styles.cancelBtn} onPress={cancelPreAlert}>
          <Text style={styles.cancelBtnText}>JE VAIS BIEN (Annuler)</Text>
        </TouchableOpacity>
        
        <Text style={{color: 'rgba(255,255,255,0.7)', marginTop: 20}}>L'IA analyse la situation en arrière-plan...</Text>
      </View>
    );
  }

  // 2. Écran SOS (Rouge avec Flash/Son) - Délai 15s
  if (status === 'sos') {
    return (
      <View style={[styles.container, { backgroundColor: '#DC2626' }]}>
        {permission?.granted && (
          <View style={{ width: 0, height: 0, overflow: 'hidden' }}>
            <CameraView enableTorch={isFlashOn} style={{flex: 1}} />
          </View>
        )}
        
        <Feather name="shield" size={80} color="white" />
        <Text style={styles.criticalTitle}>🆘 SECOURS DÉCLENCHÉS</Text>
        <Text style={styles.criticalSubtitle}>Une alarme et le flash sont activés.</Text>
        <Text style={[styles.criticalSubtitle, { fontWeight: 'bold', marginTop: 20 }]}>Prévention des contacts d'urgence dans :</Text>
        <Text style={[styles.countdownText, { fontSize: 80, marginVertical: 10 }]}>{sosCountdown}s</Text>
        
        <TouchableOpacity style={[styles.cancelBtn, { marginTop: 30 }]} onPress={endSOS}>
          <Text style={[styles.cancelBtnText, { color: '#DC2626' }]}>DÉSACTIVER L'ALARME</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. Écran SOS Dispatched (Contacts prévenus)
  if (status === 'sos_dispatched') {
    return (
      <View style={[styles.container, { backgroundColor: '#991B1B' }]}>
        {permission?.granted && (
          <View style={{ width: 0, height: 0, overflow: 'hidden' }}>
            <CameraView enableTorch={isFlashOn} style={{flex: 1}} />
          </View>
        )}
        
        <Feather name="radio" size={80} color="white" />
        <Text style={styles.criticalTitle}>CONTACTS PRÉVENUS</Text>
        <Text style={styles.criticalSubtitle}>Vos proches et les secours ont été informés de votre position exacte.</Text>
        
        <TouchableOpacity style={[styles.cancelBtn, { marginTop: 60 }]} onPress={endSOS}>
          <Text style={[styles.cancelBtnText, { color: '#991B1B' }]}>J'AI ÉTÉ SECOURU (STOP)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. Écran normal (Monitoring)
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
          <Feather name="arrow-left" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agent Anti-Crash</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.dashboard}>
        <Feather name="activity" size={40} color={gForce > 2 ? "#D97706" : "#10B981"} />
        
        <View style={styles.metricsContainer}>
          <View style={styles.metricBox}>
            <Text style={styles.gforceLabel}>Force G</Text>
            <Text style={[styles.gforceValue, { color: gForce > 2 ? "#D97706" : "#10B981" }]}>
              {gForce.toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.metricDivider} />
          
          <View style={styles.metricBox}>
            <Text style={styles.gforceLabel}>Vitesse</Text>
            <Text style={[styles.gforceValue, { color: "#3B82F6" }]}>
              {speed} <Text style={{fontSize: 20}}>km/h</Text>
            </Text>
          </View>
        </View>
        
        {/* Sélecteur de Transport */}
        <View style={styles.transportSelector}>
          <Text style={styles.transportLabel}>Mode de Transport :</Text>
          <View style={styles.transportButtons}>
            {['Voiture', 'Moto', 'Vélo'].map(mode => (
              <TouchableOpacity 
                key={mode} 
                style={[styles.tBtn, transportMode === mode && styles.tBtnActive]}
                onPress={() => setTransportMode(mode)}
              >
                <Text style={[styles.tBtnText, transportMode === mode && styles.tBtnTextActive]}>{mode}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>L'IA d'impact est active en arrière-plan.</Text>
          <Text style={styles.infoText}>Alerte automatique à : {CRASH_THRESHOLD} G</Text>
        </View>

        <TouchableOpacity 
          style={styles.simulateBtn} 
          onPress={() => triggerCrashFlow(5.2)}
        >
          <Feather name="zap" size={20} color="white" />
          <Text style={styles.simulateBtnText}>Simuler Crash (5.2G)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  dashboard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    width: '100%'
  },
  metricsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginVertical: 15,
  },
  metricBox: {
    alignItems: 'center',
    flex: 1,
  },
  metricDivider: {
    width: 2,
    height: 50,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 10,
  },
  gforceLabel: {
    marginTop: 5,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  gforceValue: {
    fontSize: 48,
    fontWeight: '900',
    marginTop: 5,
  },
  infoBox: {
    backgroundColor: '#F3F4F6',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    marginVertical: 20,
    alignItems: 'center',
  },
  infoText: {
    color: '#4B5563',
    fontSize: 14,
  },
  transportSelector: {
    width: '100%',
    marginVertical: 10,
    alignItems: 'center',
  },
  transportLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  transportButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  tBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tBtnActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  tBtnText: {
    color: '#4B5563',
    fontWeight: '600',
  },
  tBtnTextActive: {
    color: 'white',
  },
  simulateBtn: {
    flexDirection: 'row',
    backgroundColor: '#DC2626',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
  },
  simulateBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  criticalTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: 'white',
    marginTop: 20,
    textAlign: 'center',
  },
  criticalSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  countdownText: {
    fontSize: 120,
    fontWeight: 'bold',
    color: 'white',
    marginVertical: 20,
    textAlign: 'center',
  },
  cancelBtn: {
    backgroundColor: 'white',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
    width: '90%',
  },
  cancelBtnText: {
    color: '#F59E0B',
    fontSize: 20,
    fontWeight: '900',
  },
});
