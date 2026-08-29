import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setMeshSimulating } from '../../utils/meshState';

const API_URL_MESH = 'http://192.168.1.188:3000/api/orchestrator/mesh-sos';

export default function MeshAgentScreen({ navigation }) {
  // Real-time sensor states
  const [networkState, setNetworkState] = useState({ isConnected: true, type: 'UNKNOWN' });
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [location, setLocation] = useState(null);
  
  // App States
  const [isMeshActive, setIsMeshActive] = useState(false);
  const [statusText, setStatusText] = useState('Émission BLE en cours...');
  const [relayDevices, setRelayDevices] = useState([]);

  // Animations
  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;
  const pulseAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchSensors();
    // Refresh sensors every 5 seconds
    const interval = setInterval(fetchSensors, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSensors = async () => {
    try {
      const net = await Network.getNetworkStateAsync();
      setNetworkState(net);

      const bat = await Battery.getBatteryLevelAsync();
      setBatteryLevel(Math.round(bat * 100));

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(loc.coords);
      }
    } catch (e) {
      console.log('Erreur capteurs:', e);
    }
  };

  const startRadarAnimation = () => {
    const createPulse = (anim, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000,
            delay: delay,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          })
        ])
      ).start();
    };

    createPulse(pulseAnim1, 0);
    createPulse(pulseAnim2, 600);
    createPulse(pulseAnim3, 1200);
  };

  const handleSimulation = () => {
    // Exécution directe sans demander 1000 fois la permission
    executeSimulation();
  };

  const executeSimulation = async () => {
    let foundRelays = [];
    setMeshSimulating(true);

    // 1. Send data to Backend AI BEFORE disconnecting everything
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log("Envoi des télémétries au Backend pour analyse...");
      
      const payload = {
        batteryLevel: batteryLevel,
        latitude: location ? location.latitude : 33.5731,
        longitude: location ? location.longitude : -7.5898,
        isOffline: true, // we tell the AI we are offline
      };

      // Non-blocking fetch so the UI can proceed immediately
      fetch(API_URL_MESH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(data => {
        if (data.relayDeviceNames) {
          foundRelays = data.relayDeviceNames;
        }
      })
      .catch(e => console.log("Backend error:", e));

    } catch (e) {
      console.error(e);
    }

    // 2. UI Simulation: Turn off network and start Bluetooth
    setNetworkState({ isConnected: false, type: 'NONE' });
    setIsMeshActive(true);
    startRadarAnimation();

    // 3. Fake Relay Discovery Sequence
    setTimeout(() => {
      setStatusText("Recherche de relais dans un rayon de 1km...");
    }, 2000);

    setTimeout(() => {
      if (foundRelays.length > 0) {
        setRelayDevices(foundRelays);
        setStatusText(`${foundRelays.length} relais trouvés ! Négociation BLE en cours...`);
      } else {
        setStatusText("Aucun appareil détecté dans un rayon de 1km.");
      }
    }, 6000);

    setTimeout(() => {
      if (foundRelays.length > 0) {
        setStatusText("SOS relayé au serveur central avec succès.");
        Alert.alert(
          "✅ Sauvetage Réussi (Simulation)", 
          `Les appareils de ${foundRelays.join(', ')} ont capté votre SOS en Bluetooth et ont utilisé leur 4G pour prévenir le serveur central.`
        );
      } else {
        setStatusText("En attente d'un relais...");
        Alert.alert(
          "⚠️ Mode Survie", 
          "Il n'y a personne avec l'application dans un rayon de 1km.\n\nVotre message est stocké et sera transmis le plus tôt possible dès qu'un utilisateur passera à proximité."
        );
      }
    }, 9000);
  };

  return (
    <SafeAreaView style={[styles.container, isMeshActive && styles.containerDark]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
          <Feather name="arrow-left" size={24} color={isMeshActive ? "#fff" : "#1F2937"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isMeshActive && {color: 'white'}]}>Agent Mesh SOS</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Sensor Dashboard */}
      {!isMeshActive ? (
        <View style={styles.dashboard}>
          <Text style={styles.dashboardTitle}>Télémétrie en temps réel</Text>
          
          <View style={styles.sensorRow}>
            <MaterialCommunityIcons name="wifi" size={24} color={networkState.type === 'WIFI' ? "#10B981" : "#9CA3AF"} />
            <Text style={styles.sensorText}>Wi-Fi : {networkState.type === 'WIFI' ? "Connecté" : "Déconnecté"}</Text>
          </View>
          
          <View style={styles.sensorRow}>
            <MaterialCommunityIcons name="signal-cellular-3" size={24} color={networkState.type === 'CELLULAR' ? "#10B981" : "#9CA3AF"} />
            <Text style={styles.sensorText}>4G/5G : {networkState.type === 'CELLULAR' ? "Connecté" : "Déconnecté"}</Text>
          </View>

          <View style={styles.sensorRow}>
            <MaterialCommunityIcons name="battery" size={24} color={batteryLevel > 20 ? "#10B981" : "#EF4444"} />
            <Text style={styles.sensorText}>Batterie : {batteryLevel}%</Text>
          </View>

          <View style={styles.sensorRow}>
            <MaterialCommunityIcons name="crosshairs-gps" size={24} color={location ? "#10B981" : "#9CA3AF"} />
            <Text style={styles.sensorText}>GPS : {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : "Recherche..."}</Text>
          </View>

          <TouchableOpacity style={styles.simulateBtn} onPress={handleSimulation}>
            <Feather name="zap-off" size={20} color="white" />
            <Text style={styles.simulateBtnText}>Simuler Perte de Réseau</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* MESH ACTIVE UI */
        <View style={styles.meshContainer}>
          <View style={styles.warningBox}>
            <Feather name="alert-triangle" size={24} color="#D97706" />
            <Text style={styles.warningText}>ZONE BLANCHE DÉTECTÉE</Text>
            <Text style={styles.warningSubText}>Réseaux Wi-Fi et 4G indisponibles. Basculement en mode Survie.</Text>
          </View>

          <View style={styles.radarContainer}>
            {/* Pulse 1 */}
            <Animated.View style={[styles.pulseCircle, {
              transform: [{ scale: pulseAnim1.interpolate({ inputRange: [0, 1], outputRange: [0.5, 3] }) }],
              opacity: pulseAnim1.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] })
            }]} />
            {/* Pulse 2 */}
            <Animated.View style={[styles.pulseCircle, {
              transform: [{ scale: pulseAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.5, 3] }) }],
              opacity: pulseAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] })
            }]} />
            {/* Pulse 3 */}
            <Animated.View style={[styles.pulseCircle, {
              transform: [{ scale: pulseAnim3.interpolate({ inputRange: [0, 1], outputRange: [0.5, 3] }) }],
              opacity: pulseAnim3.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] })
            }]} />
            
            <View style={styles.centerPhone}>
              <Feather name="bluetooth" size={32} color="white" />
            </View>
          </View>

          <Text style={styles.statusText}>{statusText}</Text>
          {relayDevices.length > 0 && (
            <View style={{ width: '100%', gap: 10, marginBottom: 20 }}>
              {relayDevices.map((device, index) => (
                <View key={index} style={styles.relayBox}>
                  <MaterialCommunityIcons name="cellphone-wireless" size={20} color="#10B981" />
                  <Text style={styles.relayText}>{device}</Text>
                </View>
              ))}
            </View>
          )}
          
          <TouchableOpacity style={styles.stopBtn} onPress={() => {
            setIsMeshActive(false);
            setMeshSimulating(false);
          }}>
            <Text style={styles.stopBtnText}>ARRÊTER LE TEST</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  dashboard: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dashboardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
  },
  sensorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sensorText: {
    fontSize: 16,
    color: '#4B5563',
    marginLeft: 15,
    fontWeight: '500',
  },
  simulateBtn: {
    flexDirection: 'row',
    backgroundColor: '#DC2626',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  simulateBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  meshContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  warningBox: {
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
    borderWidth: 1,
    borderColor: '#D97706',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 40,
  },
  warningText: {
    color: '#F59E0B',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
  },
  warningSubText: {
    color: '#FCD34D',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  radarContainer: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  pulseCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(217, 119, 6, 0.5)',
  },
  centerPhone: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  relayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  relayText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  stopBtn: {
    position: 'absolute',
    bottom: 40,
    borderColor: '#4B5563',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  stopBtnText: {
    color: '#9CA3AF',
    fontWeight: 'bold',
  }
});
