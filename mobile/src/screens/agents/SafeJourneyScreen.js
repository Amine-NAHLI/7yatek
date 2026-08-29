import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Keyboard, Alert, Vibration, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- UTILITAIRE MATHÉMATIQUE ---
// Calcule la distance en mètres entre deux coordonnées GPS
const getDistance = (coord1, coord2) => {
  const R = 6371e3; // Rayon de la Terre en mètres
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(coord1.latitude)) * Math.cos(toRad(coord2.latitude)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function SafeJourneyScreen({ navigation, route }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [destination, setDestination] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  
  const [isSearching, setIsSearching] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [searchTimer, setSearchTimer] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // TELEMETRIE & ARRET
  const [currentSpeed, setCurrentSpeed] = useState(0); // km/h
  const [lastMovementTime, setLastMovementTime] = useState(Date.now());
  const [locationSubscription, setLocationSubscription] = useState(null);

  // DEVIATION LOGIC STATES
  const [deviationStatus, setDeviationStatus] = useState('none'); // 'none', 'notification', 'warning', 'critical', 'sos'
  const [countdown, setCountdown] = useState(10);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // TIMERS EFFECT
  useEffect(() => {
    let timer;
    if ((deviationStatus === 'notification' || deviationStatus === 'warning' || deviationStatus === 'critical') && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    } else if (countdown === 0) {
      if (deviationStatus === 'notification' || deviationStatus === 'warning') {
        // Escalate to critical
        setDeviationStatus('critical');
        setCountdown(10);
        Vibration.vibrate([500, 1000, 500, 1000], true); // Pattern: wait 500ms, vibrate 1s, repeat
      } else if (deviationStatus === 'critical') {
        // Escalate to SOS
        Vibration.cancel();
        setDeviationStatus('sos');
        triggerSOS();
      }
    }
    return () => clearInterval(timer);
  }, [deviationStatus, countdown]);

  const triggerSOS = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch('http://192.168.1.188:3000/api/users/sos-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      console.log("SOS Déclenché via Agent Trajet");
    } catch (e) {
      console.error("Erreur SOS:", e);
    }
  };

  // NOTIFICATION LISTENER
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data && data.type === 'deviation_alert') {
        openWarningFromNotification();
      }
    });
    return () => subscription.remove();
  }, []);

  const triggerAnomalyAlert = async (type = 'immobility', distance = 0) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      const timeSinceLastMove = Math.floor((Date.now() - lastMovementTime)/1000);
      
      console.log(`📡 Envoi des données à l'Orchestrateur (Type: ${type})...`);
      const response = await fetch('http://192.168.1.188:3000/api/orchestrator/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          speed: currentSpeed,
          timeSinceLastMove: type === 'immobility' && timeSinceLastMove < 60 ? 60 : timeSinceLastMove, 
          timeOfDay: new Date().toLocaleTimeString(),
          anomalyType: type,
          deviationDistance: distance,
          latitude: currentLocation?.latitude,
          longitude: currentLocation?.longitude
        })
      });
      
      const decision = await response.json();
      console.log("🤖 Décision de l'Orchestrateur:", decision);

      if (decision.action === 'trigger_alert') {
        // DECLENCHEMENT DE LA VRAIE NOTIFICATION OS
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "⚠️ Alerte 7yatk IA",
            body: `Orchestrateur : ${decision.reasoning || 'Anomalie détectée.'} Touchez ici.`,
            data: { type: 'deviation_alert' },
            sound: true,
          },
          trigger: null, // Immédiat
        });
        
        setDeviationStatus('notification');
        setCountdown(10);
      } else {
        // Fausse alerte selon l'IA
        Alert.alert("Analyse IA", "L'Orchestrateur a jugé la situation sans danger.");
        setLastMovementTime(Date.now()); // Reset pour éviter de spammer
      }
    } catch (e) {
      console.error("Erreur lors de l'appel à l'Orchestrateur:", e);
      // En cas d'erreur de connexion, on déclenche l'alerte par précaution (Fail-Safe)
      setDeviationStatus('notification');
      setCountdown(10);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openWarningFromNotification = () => {
    setDeviationStatus('warning');
    setCountdown(10);
  };

  const cancelDeviation = () => {
    Vibration.cancel();
    setDeviationStatus('none');
    setCountdown(10);
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission refusée", "L'accès à la localisation est requis pour le trajet sécurisé.");
        return;
      }
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const currentLoc = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setCurrentLocation(currentLoc);
      
      // AUTO-START DESTINATION (depuis Dashboard)
      if (route.params?.autoDest) {
         setDestination(route.params.autoDest);
         setSearchQuery(route.params.autoDest.name);
         calculateRoute(currentLoc, route.params.autoDest);
         navigation.setParams({ autoDest: null }); // éviter la boucle
      }
    })();
  }, []);

  // 0. GESTION DU WATCH POSITION EN TEMPS RÉEL (VITESSE)
  useEffect(() => {
    let sub;
    const startWatching = async () => {
      setLastMovementTime(Date.now());
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 1,
        },
        (location) => {
          setCurrentLocation((prev) => ({
            ...prev,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }));
          
          const speedMS = Math.max(0, location.coords.speed || 0);
          const speedKMH = Math.round(speedMS * 3.6);
          setCurrentSpeed(speedKMH);

          if (speedKMH > 2) {
            setLastMovementTime(Date.now());
          }

          // DÉTECTION DE DÉVIATION (si on a un trajet)
          if (routeCoords && routeCoords.length > 0) {
            let minDistance = Infinity;
            // Trouver le point du trajet le plus proche
            for (const pt of routeCoords) {
              const dist = getDistance(
                { latitude: location.coords.latitude, longitude: location.coords.longitude },
                pt
              );
              if (dist < minDistance) {
                minDistance = dist;
              }
            }
            // Si on est à plus de 150 mètres du trajet, c'est une déviation !
            if (minDistance > 150) {
              // Vérifier via ref ou un petit flag pour ne pas spammer, mais useEffect s'en occupe
              triggerAnomalyAlert('deviation', Math.round(minDistance));
            }
          }
        }
      );
      setLocationSubscription(sub);
    };

    if (isTracking) {
      startWatching();
    } else {
      if (locationSubscription) {
        locationSubscription.remove();
        setLocationSubscription(null);
      }
    }

    return () => {
      if (sub) sub.remove();
    };
  }, [isTracking]);

  // 0.5 GESTION DE L'ANOMALIE D'ARRÊT
  useEffect(() => {
    let interval;
    if (isTracking && deviationStatus === 'none' && !isAnalyzing) {
      interval = setInterval(() => {
        const timeSinceLastMove = Date.now() - lastMovementTime;
        if (timeSinceLastMove > 60000) { // 1 minute
          triggerAnomalyAlert('immobility', 0);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isTracking, deviationStatus, lastMovementTime, isAnalyzing]);

  // 1. RECHERCHE (PHOTON KOMOOT avec Debounce)
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    
    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    // Set new timer for debounce (500ms)
    const newTimer = setTimeout(() => {
      searchAddress(text);
    }, 500);
    
    setSearchTimer(newTimer);
  };

  const searchAddress = async (text) => {
    setIsSearching(true);
    try {
      const lat = currentLocation.latitude;
      const lon = currentLocation.longitude;
      
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&lat=${lat}&lon=${lon}&limit=5`
      );
      const data = await response.json();
      if (data.features) {
        setSuggestions(data.features);
      }
    } catch (e) {
      console.error("Erreur recherche:", e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectDestination = (item) => {
    Keyboard.dismiss();
    const lon = item.geometry.coordinates[0];
    const lat = item.geometry.coordinates[1];
    const name = item.properties.name || item.properties.city || item.properties.street || "Destination";
    
    const dest = {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      name: name,
    };
    
    setDestination(dest);
    setSearchQuery(name);
    setSuggestions([]);
    
    // Calculer la route
    calculateRoute(currentLocation, dest);
  };

  // 2. CALCUL ITINÉRAIRE (OSRM)
  const calculateRoute = async (start, end) => {
    setIsCalculatingRoute(true);
    try {
      // OSRM format: lon,lat
      const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;
      console.log("OSRM URL:", url);
      
      const response = await fetch(url);
      const data = await response.json();
      console.log("OSRM Response Code:", data.code);
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        // Convert GeoJSON coords [lon, lat] to {latitude, longitude}
        const coords = route.geometry.coordinates.map(coord => ({
          latitude: coord[1],
          longitude: coord[0]
        }));
        setRouteCoords(coords);
        
        // Info temps et distance
        const durationMin = Math.round(route.duration / 60);
        const distanceKm = (route.distance / 1000).toFixed(1);
        setRouteInfo({ duration: durationMin, distance: distanceKm });
      } else {
        Alert.alert("Erreur OSRM", `Code: ${data.code || 'Inconnu'}\nMessage: ${data.message || 'Aucun itinéraire trouvé.'}`);
      }
    } catch (e) {
      console.error("Erreur calcul route:", e);
      Alert.alert("Erreur Réseau", e.message || "Impossible de joindre le serveur de calcul d'itinéraire.");
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const startTracking = async () => {
    setIsTracking(true);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 2, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
    Alert.alert("Agent IA Activé", "L'agent Trajet Sécurisé analyse maintenant votre progression en temps réel. Si vous déviez fortement, le SOS sera déclenché.");
  };

  const cancelTracking = () => {
    setIsTracking(false);
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
    setRouteCoords([]);
    setDestination(null);
    setRouteInfo(null);
    setSearchQuery('');
  };

  // 3. UI
  if (!currentLocation) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 12, color: '#4B5563' }}>Localisation en cours...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* LA CARTE */}
      <MapView
        style={styles.map}
        initialRegion={currentLocation}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {destination && (
          <Marker
            coordinate={destination}
            title="Destination"
            description={destination.name}
          >
            <View style={styles.markerContainer}>
              <FontAwesome5 name="map-marker-alt" size={32} color="#DC2626" />
            </View>
          </Marker>
        )}

        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#3B82F6"
            strokeWidth={4}
          />
        )}
        
        {isTracking && (
          <Marker coordinate={currentLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Animated.View
                style={[
                  styles.radarPulse,
                  {
                    transform: [{ scale: pulseAnim }],
                    opacity: pulseAnim.interpolate({
                      inputRange: [1, 2],
                      outputRange: [0.6, 0]
                    })
                  }
                ]}
              />
              <View style={styles.radarCenter} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* BOUTON RETOUR & BARRE DE RECHERCHE FLOTTANTE */}
      <SafeAreaView style={styles.topContainer} edges={['top']}>
        {/* TELEMETRY WIDGET */}
        {isTracking && deviationStatus === 'none' && (
          <View style={styles.telemetryWidget}>
            <View style={styles.telemetryStatusRow}>
              <View style={[styles.statusDot, { backgroundColor: currentSpeed > 2 ? '#10B981' : '#F59E0B' }]} />
              <Text style={styles.telemetryTitle}>IA Active</Text>
            </View>
            <Text style={styles.telemetryText}>Vitesse: {currentSpeed} km/h | {currentSpeed > 2 ? 'Trajectoire saine' : `À l'arrêt (${Math.floor((Date.now() - lastMovementTime)/1000)}s)`}</Text>
          </View>
        )}
        {isTracking && deviationStatus !== 'none' && deviationStatus !== 'sos' && (
          <View style={[styles.telemetryWidget, { backgroundColor: '#FEF3C7' }]}>
            <View style={styles.telemetryStatusRow}>
              <View style={[styles.statusDot, { backgroundColor: '#D97706' }]} />
              <Text style={[styles.telemetryTitle, { color: '#D97706' }]}>IA Alerte</Text>
            </View>
            <Text style={[styles.telemetryText, { color: '#92400E' }]}>Vitesse: {currentSpeed} km/h | Anomalie détectée</Text>
          </View>
        )}

        {!isTracking && (
          <View style={styles.searchHeaderRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Feather name="arrow-left" size={24} color="#111827" />
            </TouchableOpacity>

            <View style={styles.searchBar}>
              <Feather name="search" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Où allez-vous ?"
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoCorrect={false}
              />
              {isSearching && <ActivityIndicator size="small" color="#3B82F6" />}
            </View>
          </View>
        )}

        {/* SUGGESTIONS DE RECHERCHE */}
        {suggestions.length > 0 && !isTracking && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={suggestions}
              keyExtractor={(item, index) => index.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const props = item.properties;
                const displayName = [props.name, props.city, props.state].filter(Boolean).join(', ');
                return (
                  <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSelectDestination(item)}>
                    <Feather name="map-pin" size={16} color="#6B7280" />
                    <Text style={styles.suggestionText} numberOfLines={1}>
                      {displayName}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}
      </SafeAreaView>

      {/* PANNEAU DU BAS : CONFIRMATION OU TRACKING ACTIF */}
      {isCalculatingRoute && (
        <View style={styles.bottomPanel}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.panelTitle}>Calcul de l'itinéraire sécurisé...</Text>
        </View>
      )}

      {!isCalculatingRoute && routeInfo && !isTracking && (
        <View style={styles.bottomPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Trajet trouvé</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{routeInfo.duration} min</Text>
            </View>
          </View>
          <Text style={styles.panelDesc}>Distance : {routeInfo.distance} km</Text>
          <Text style={styles.panelWarning}>Voulez-vous suivre cette trajectoire ? L'Agent IA surveillera toute déviation anormale.</Text>
          
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={cancelTracking}>
              <Text style={styles.btnCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnConfirm]} onPress={startTracking}>
              <Text style={styles.btnConfirmText}>Démarrer l'Agent</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isTracking && (
        <View style={styles.bottomPanelTracking}>
          <View style={styles.trackingHeader}>
            <MaterialCommunityIcons name="robot" size={24} color="#10B981" />
            <Text style={styles.trackingTitle}>Agent IA en surveillance</Text>
          </View>
          <Text style={styles.trackingDesc}>Analyse des déviations et arrêts suspects en cours...</Text>
          
          <View style={styles.trackingBtnRow}>
            {isAnalyzing ? (
              <View style={[styles.btnSimulate, { backgroundColor: '#DBEAFE' }]}>
                <ActivityIndicator size="small" color="#1D4ED8" />
                <Text style={[styles.btnSimulateText, { color: '#1D4ED8' }]}>Analyse par l'Orchestrateur IA...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.btnSimulate} onPress={() => triggerAnomalyAlert('deviation', 200)}>
                <Feather name="alert-triangle" size={16} color="#D97706" />
                <Text style={styles.btnSimulateText}>Simuler Alerte</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.btnStop} onPress={cancelTracking}>
              <Text style={styles.btnStopText}>Terminer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* IN-APP NOTIFICATION REMOVED IN FAVOR OF OS PUSH NOTIFICATION */}

      {/* OVERLAYS D'URGENCE */}
      {deviationStatus === 'warning' && (
        <View style={styles.overlayWarning}>
          <Feather name="alert-triangle" size={64} color="#D97706" />
          <Text style={styles.overlayTitle}>Prenez-vous une autre route ?</Text>
          <Text style={styles.overlayDesc}>Nous pouvons recalculer votre itinéraire.</Text>
          <Text style={styles.countdownText}>{countdown}s</Text>
          
          <TouchableOpacity style={styles.btnWarningConfirm} onPress={cancelDeviation}>
            <Text style={styles.btnWarningConfirmText}>Oui, annuler l'alerte</Text>
          </TouchableOpacity>
        </View>
      )}

      {deviationStatus === 'critical' && (
        <View style={styles.overlayCritical}>
          <Feather name="alert-circle" size={80} color="#ffffff" />
          <Text style={styles.overlayTitleCritical}>ÊTES-VOUS EN SÉCURITÉ ?</Text>
          <Text style={styles.overlayDescCritical}>Aucune réponse détectée.</Text>
          <Text style={styles.countdownTextCritical}>{countdown}</Text>
          
          <TouchableOpacity style={styles.btnCriticalSafe} onPress={cancelDeviation}>
            <Text style={styles.btnCriticalSafeText}>JE VAIS BIEN</Text>
          </TouchableOpacity>
        </View>
      )}

      {deviationStatus === 'sos' && (
        <View style={styles.overlaySos}>
          <MaterialCommunityIcons name="shield-alert" size={100} color="#ffffff" />
          <Text style={styles.overlayTitleSos}>URGENCE DÉCLARÉE</Text>
          <Text style={styles.overlayDescSos}>Vos contacts d'urgence ont été alertés.</Text>
          <TouchableOpacity style={styles.btnSosCancel} onPress={cancelDeviation}>
            <Text style={styles.btnSosCancelText}>ANNULER L'URGENCE</Text>
          </TouchableOpacity>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA'
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  
  /* RADAR IA */
  radarPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
  },
  radarCenter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1E3A8A',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  
  /* TELEMETRY WIDGET */
  telemetryWidget: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    alignSelf: 'center',
    width: '90%',
    marginTop: 10,
  },
  telemetryStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  telemetryTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  telemetryText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },

  searchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginRight: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  suggestionsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginTop: 8,
    marginLeft: 56, // S'aligne avec la barre de recherche
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  badge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#1D4ED8',
    fontWeight: 'bold',
    fontSize: 14,
  },
  panelDesc: {
    fontSize: 16,
    color: '#4B5563',
    marginTop: 8,
  },
  panelWarning: {
    fontSize: 13,
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    lineHeight: 18,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  btnConfirm: {
    backgroundColor: '#3B82F6',
  },
  btnCancelText: {
    color: '#374151',
    fontWeight: 'bold',
    fontSize: 16,
  },
  btnConfirmText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  bottomPanelTracking: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#10B981', // Green for active tracking
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackingTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginLeft: 12,
  },
  trackingDesc: {
    color: '#D1FAE5',
    fontSize: 14,
    marginBottom: 24,
  },
  btnStop: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnStopText: {
    color: '#065F46',
    fontWeight: 'bold',
    fontSize: 16,
  },
  trackingBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  btnSimulate: {
    flex: 1,
    backgroundColor: '#FEF3C7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  btnSimulateText: {
    color: '#D97706',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  
  /* OVERLAYS */
  overlayWarning: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 100,
  },
  overlayTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#D97706',
    marginTop: 16,
    textAlign: 'center',
  },
  overlayDesc: {
    fontSize: 18,
    color: '#92400E',
    marginTop: 8,
    textAlign: 'center',
  },
  countdownText: {
    fontSize: 64,
    fontWeight: '900',
    color: '#B45309',
    marginVertical: 32,
  },
  btnWarningConfirm: {
    backgroundColor: '#D97706',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  btnWarningConfirmText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  overlayCritical: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#DC2626', // Rouge vif
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 100,
  },
  overlayTitleCritical: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 16,
    textAlign: 'center',
  },
  overlayDescCritical: {
    fontSize: 20,
    color: '#FECACA',
    marginTop: 8,
  },
  countdownTextCritical: {
    fontSize: 80,
    fontWeight: '900',
    color: '#ffffff',
    marginVertical: 32,
  },
  btnCriticalSafe: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 40,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  btnCriticalSafeText: {
    color: '#DC2626',
    fontSize: 24,
    fontWeight: '900',
  },

  overlaySos: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 100,
  },
  overlayTitleSos: {
    fontSize: 32,
    fontWeight: '900',
    color: '#EF4444',
    marginTop: 16,
  },
  overlayDescSos: {
    fontSize: 18,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  btnSosCancel: {
    marginTop: 64,
    backgroundColor: '#1F2937',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnSosCancelText: {
    color: '#D1D5DB',
    fontWeight: 'bold',
  }
});
