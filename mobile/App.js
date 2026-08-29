import React, { createContext, useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { LogBox, View, Text, Modal, TouchableOpacity, StyleSheet, Linking, ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';

// Masquer les avertissements d'Expo Go qui n'affectent pas le fonctionnement
LogBox.ignoreLogs([
  'expo-notifications',         // Push notifications non supportées dans Expo Go (les locales marchent)
  '[expo-av]',                  // Dépréciation expo-av (marche toujours en SDK 54)
  'expo-av',
]);

import WelcomeScreen from './src/screens/WelcomeScreen';
import Step1 from './src/screens/onboarding/Step1';
import Step2 from './src/screens/onboarding/Step2';
import Step3 from './src/screens/onboarding/Step3';
import Step4 from './src/screens/onboarding/Step4';
import Step5 from './src/screens/onboarding/Step5';
import Step6 from './src/screens/onboarding/Step6';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import EditProfileScreen from './src/screens/settings/EditProfileScreen';
import EditMedicalScreen from './src/screens/settings/EditMedicalScreen';
import EditEmergencyContactsScreen from './src/screens/settings/EditEmergencyContactsScreen';
import EditFavoritePlacesScreen from './src/screens/settings/EditFavoritePlacesScreen';
import SafeJourneyScreen from './src/screens/agents/SafeJourneyScreen';
import CrashAgentScreen from './src/screens/agents/CrashAgentScreen';
import AudioAgentScreen from './src/screens/agents/AudioAgentScreen';
import MeshAgentScreen from './src/screens/agents/MeshAgentScreen';
import FirstAidVoiceScreen from './src/screens/agents/FirstAidVoiceScreen';
import { initializeWebSocketPush, getSocket } from './src/utils/pushNotifications';
import { isMeshSimulating } from './src/utils/meshState';

const Stack = createNativeStackNavigator();

export const OnboardingContext = createContext();

export default function App() {
  const [onboardingData, setOnboardingData] = useState({});
  const [relayAlert, setRelayAlert] = useState(null);
  const [isSatelliteOpen, setIsSatelliteOpen] = useState(false);

  // Model Download State
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const modelUri = FileSystem.documentDirectory + 'gemma-270m.gguf';

  useEffect(() => {
    // Check if model already exists
    const checkModel = async () => {
      const info = await FileSystem.getInfoAsync(modelUri);
      if (info.exists) setIsModelReady(true);
    };
    checkModel();
  }, []);

  const downloadLocalModel = async () => {
    setIsDownloading(true);
    const downloadResumable = FileSystem.createDownloadResumable(
      'https://huggingface.co/ggml-org/gemma-3-270m-it-qat-GGUF/resolve/main/gemma-3-270m-it-qat-Q4_0.gguf',
      modelUri,
      {},
      (downloadInfo) => {
        const progress = downloadInfo.totalBytesWritten / downloadInfo.totalBytesExpectedToWrite;
        setDownloadProgress(progress);
      }
    );

    try {
      await downloadResumable.downloadAsync();
      setIsModelReady(true);
      setIsDownloading(false);
    } catch (e) {
      console.error("Erreur de téléchargement :", e);
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    // Initialisation du WebSocket et des notifications locales
    initializeWebSocketPush();
    
    // Attendre que le socket soit initialisé puis écouter l'alerte Mesh
    const checkSocket = setInterval(() => {
      const socket = getSocket();
      if (socket) {
        socket.on('mesh_relay_alert', (data) => {
          console.log('🔴 ALERTE MESH RECUE EN FRONTEND:', data);
          // Si CE téléphone n'est pas celui qui a lancé la simulation
          if (!isMeshSimulating) {
            setRelayAlert(data);
          } else {
            console.log('Ignoré: C\'est notre propre SOS (Ce téléphone est la victime).');
          }
        });
        clearInterval(checkSocket);
      }
    }, 1000);

    // Écouter le clic sur la notification push locale
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data && data.type === 'mesh_relay_alert' && data.payload) {
        setRelayAlert(data.payload);
      }
    });

    return () => {
      clearInterval(checkSocket);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  return (
    <OnboardingContext.Provider value={{ onboardingData, setOnboardingData }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Step1" component={Step1} />
            <Stack.Screen name="Step2" component={Step2} />
            <Stack.Screen name="Step3" component={Step3} />
            <Stack.Screen name="Step4" component={Step4} />
            <Stack.Screen name="Step5" component={Step5} />
            <Stack.Screen name="Step6" component={Step6} />
            <Stack.Screen name="MainApp" component={MainTabNavigator} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="EditMedical" component={EditMedicalScreen} />
            <Stack.Screen name="EditEmergencyContacts" component={EditEmergencyContactsScreen} />
            <Stack.Screen name="EditFavoritePlaces" component={EditFavoritePlacesScreen} />
            <Stack.Screen name="SafeJourney" component={SafeJourneyScreen} />
            <Stack.Screen name="CrashAgent" component={CrashAgentScreen} />
            <Stack.Screen name="AudioAgent" component={AudioAgentScreen} />
            <Stack.Screen name="MeshAgent" component={MeshAgentScreen} />
            <Stack.Screen name="FirstAidVoice" component={FirstAidVoiceScreen} />
          </Stack.Navigator>
        </NavigationContainer>

        {/* =========================================
            MODAL ROUGE D'ALERTE RELAIS (DEMO MESH) 
            ========================================= */}
        <Modal visible={!!relayAlert} animationType="slide" transparent={false}>
          <SafeAreaProvider style={{ backgroundColor: '#DC2626' }}>
            <ScrollView contentContainerStyle={styles.relayModalContainer}>
              <Feather name="radio" size={40} color="white" style={{marginBottom: 10}} />
              <Text style={styles.relayTitle}>🚨 ALERTE MESH</Text>
              <Text style={styles.relaySubtitle}>Votre téléphone sert de relais d'urgence</Text>
              
              <View style={styles.relayInfoBox}>
                <Text style={styles.relayInfoText}>
                  Un utilisateur en zone blanche s'est connecté à votre téléphone via Bluetooth pour envoyer ce signal de détresse avec votre 4G.
                </Text>
                
                <View style={{marginTop: 10}}>
                  <Text style={styles.relayData}>👤 Victime : {relayAlert?.victimName}</Text>
                  <Text style={styles.relayData}>📍 Localisation : {relayAlert?.latitude}, {relayAlert?.longitude}</Text>
                  <Text style={styles.relayData}>⚠️ Gravité IA : {relayAlert?.dangerLevel}</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.actionBtnCall, { backgroundColor: '#374151', marginBottom: 15, paddingVertical: 14 }]} 
                onPress={() => setIsSatelliteOpen(true)}
              >
                <Feather name="globe" size={20} color="white" />
                <Text style={[styles.actionBtnText, { fontSize: 14, textAlign: 'center' }]}>🛰️ Ouvrir Caméra Satellite 3D</Text>
              </TouchableOpacity>

              {relayAlert && (
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity 
                    style={[styles.actionBtnMaps, { flex: 1, marginRight: 5 }]} 
                    onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${relayAlert?.latitude},${relayAlert?.longitude}`)}
                  >
                    <Feather name="map-pin" size={20} color="white" />
                    <Text style={[styles.actionBtnText, {fontSize: 12}]}>Google Maps</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionBtnCall, { flex: 1, marginLeft: 5 }]} 
                    onPress={() => Linking.openURL(`sms:${relayAlert?.emergencyContactPhone}?body=🚨 URGENCE 7YATK : Je sers de relais réseau pour ${relayAlert?.victimName} qui est en danger. Localisation : https://maps.google.com/?q=${relayAlert?.latitude},${relayAlert?.longitude}`)}
                  >
                    <Feather name="send" size={20} color="white" />
                    <Text style={[styles.actionBtnText, {fontSize: 12, textAlign: 'center', flexShrink: 1}]}>Transmettre Alerte</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={styles.relayCloseBtn} onPress={() => setRelayAlert(null)}>
                <Text style={styles.relayCloseBtnText}>J'AI COMPRIS (Fermer)</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaProvider>
        </Modal>

        {/* Modal Plein Écran pour la Caméra Satellite 3D */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={isSatelliteOpen}
          onRequestClose={() => setIsSatelliteOpen(false)}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, paddingTop: 40, backgroundColor: '#111' }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>📡 Radar Satellite en Direct</Text>
              <TouchableOpacity onPress={() => setIsSatelliteOpen(false)} style={{ padding: 5 }}>
                <Feather name="x" size={28} color="white" />
              </TouchableOpacity>
            </View>

            {relayAlert && (
              <WebView 
                source={{ uri: `http://192.168.1.188:4173/#lat=${relayAlert.latitude}&lon=${relayAlert.longitude}&alt=1200&pitch=-45&heading=0&style=flir&hud=tactical&hv=1&dm=BALANCED` }}
                style={{ flex: 1 }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                mixedContentMode="always"
                allowsInlineMediaPlayback={true}
                injectedJavaScript={`
                  const style = document.createElement('style');
                  style.textContent = \`
                    #title-bar, 
                    #style-indicator, 
                    #top-center-actions, 
                    #command-dock, 
                    #left-panel-stack, 
                    #right-context-rail,
                    #pp-toggles,
                    #cesium-credits { 
                      display: none !important; 
                    }
                  \`;
                  document.head.appendChild(style);
                  
                  // Script to add 3D Marker to Cesium
                  const targetLat = ${relayAlert.latitude};
                  const targetLon = ${relayAlert.longitude};
                  
                  const initMarker = () => {
                    if (window.__godsEyeView && window.__godsEyeView.viewer && window.Cesium) {
                      const viewer = window.__godsEyeView.viewer;
                      const Cesium = window.Cesium;
                      
                      // Add a 3D Entity marker
                      viewer.entities.add({
                        id: 'victim-target-marker',
                        position: Cesium.Cartesian3.fromDegrees(targetLon, targetLat, 50),
                        point: {
                          pixelSize: 20,
                          color: Cesium.Color.RED,
                          outlineColor: Cesium.Color.WHITE,
                          outlineWidth: 3,
                          disableDepthTestDistance: Number.POSITIVE_INFINITY // Always visible on top of buildings
                        },
                        label: {
                          text: 'CIBLE LOCALISÉE',
                          font: '14pt monospace',
                          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                          outlineWidth: 2,
                          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                          pixelOffset: new Cesium.Cartesian2(0, -20),
                          fillColor: Cesium.Color.RED,
                          disableDepthTestDistance: Number.POSITIVE_INFINITY
                        }
                      });
                      
                      // Stop polling
                      clearInterval(intervalId);
                    }
                  };
                  
                  // Check every 500ms if Cesium is loaded
                  const intervalId = setInterval(initMarker, 500);
                  
                  true;
                `}
                renderLoading={() => (
                  <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 18 }}>📡 CONNEXION SATELLITE EN COURS...</Text>
                  </View>
                )}
              />
            )}
          </View>
        </Modal>

      </SafeAreaProvider>
    </OnboardingContext.Provider>
  );
}

const styles = StyleSheet.create({
  relayModalContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#DC2626',
  },
  relayTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center'
  },
  relaySubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20
  },
  relayInfoBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 20,
    borderRadius: 15,
    width: '100%'
  },
  relayInfoText: {
    color: 'white',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center'
  },
  relayData: {
    color: '#FCD34D',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5
  },
  radarMapContainer: {
    width: '100%',
    height: 320,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FCD34D',
    marginVertical: 15,
    backgroundColor: '#000',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    gap: 15
  },
  actionBtnMaps: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  actionBtnCall: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#10B981',
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  actionBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  relayCloseBtn: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 30,
    width: '100%',
    alignItems: 'center'
  },
  relayCloseBtnText: {
    color: '#DC2626',
    fontSize: 18,
    fontWeight: 'bold'
  }
});
