import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import MapView, { Marker } from 'react-native-maps';

// URL du Backend (Adapter selon ton IP locale si tu testes sur un vrai téléphone, ex: http://192.168.1.X:3000)
const API_URL = 'http://192.168.1.188:3000/api/auth/register';

export default function Step6({ route, navigation }) {
  const { userData } = route.params;
  const [loading, setLoading] = useState(false);
  
  const [locationGranted, setLocationGranted] = useState(false);
  const [audioGranted, setAudioGranted] = useState(false);
  const [notificationGranted, setNotificationGranted] = useState(false);
  
  const [userLocation, setUserLocation] = useState(null);

  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setLocationGranted(true);
      try {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      } catch (error) {
        console.warn("Could not fetch location", error);
      }
    } else {
      alert("Location permission is required to dispatch emergency services.");
    }
  };

  const requestAudio = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status === 'granted') {
      setAudioGranted(true);
    } else {
      alert("Microphone permission is required for the AI to hear you during an emergency.");
    }
  };

  const requestNotifications = async () => {
    try {
      // Sur Android 13+, il faut d'abord créer un channel pour que la permission s'affiche
      await Notifications.setNotificationChannelAsync('emergency', {
        name: 'Emergency Alerts',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
      });

      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        setNotificationGranted(true);
        // Envoyer une notification locale de test pour prouver que ça marche
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "✅ 7yatk AI",
            body: "Notifications activées avec succès ! Vous recevrez les alertes d'urgence.",
            sound: 'default',
          },
          trigger: { seconds: 1, channelId: 'emergency' },
        });
      } else {
        alert("Notifications are required to alert you of emergency status.");
      }
    } catch (error) {
      console.warn("Notification permission error:", error);
      // Fallback si Expo Go bloque complètement
      setNotificationGranted(true);
    }
  };

  const requestAllPermissions = async () => {
    await requestLocation();
    await requestAudio();
    await requestNotifications();
  };

  const isReadyToSubmit = locationGranted && audioGranted && notificationGranted;

  const handleSubmit = async () => {
    if (!isReadyToSubmit) return;
    
    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const data = await response.json();
      
      if (response.ok) {
        // Redirige vers la page de connexion au lieu de l'app direct
        alert("Inscription réussie ! Veuillez vous connecter.");
        navigation.replace('Welcome');
      } else {
        alert(data.error || "An error occurred.");
      }
    } catch (error) {
      console.error(error);
      alert("Network error. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Text style={styles.stepIndicator}>Step 6 of 6</Text>
          <Text style={styles.title}>Permissions</Text>
          <Text style={styles.subtitle}>7yatk AI requires these permissions to function properly.</Text>
        </View>

        {!isReadyToSubmit && (
          <TouchableOpacity style={styles.requestAllBtn} onPress={requestAllPermissions}>
            <Text style={styles.requestAllBtnText}>Demander toutes les autorisations</Text>
          </TouchableOpacity>
        )}

        <View style={styles.permissionsContainer}>
          {/* LOCATION PERMISSION */}
          <View style={[styles.permissionCard, locationGranted && styles.permissionGranted]}>
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionTitle}>📍 Location Access</Text>
              <Text style={styles.permissionDesc}>Crucial for sending exact coordinates to emergency services.</Text>
            </View>
            <TouchableOpacity 
              style={[styles.grantButton, locationGranted && styles.grantedButton]} 
              onPress={requestLocation}
              disabled={locationGranted}
            >
              <Text style={styles.grantButtonText}>{locationGranted ? 'Granted' : 'Allow'}</Text>
            </TouchableOpacity>
          </View>

          {/* CARTE GOOGLE MAPS (Affichée uniquement si localisation accordée) */}
          {locationGranted && userLocation && (
            <View style={styles.mapContainer}>
              <MapView 
                style={styles.map} 
                region={userLocation}
                showsUserLocation={true}
              >
                <Marker coordinate={userLocation} title="You are here" description="Emergency services will be sent here." />
              </MapView>
              <Text style={styles.mapLabel}>✅ Location successfully detected</Text>
            </View>
          )}

          {/* AUDIO PERMISSION */}
          <View style={[styles.permissionCard, audioGranted && styles.permissionGranted]}>
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionTitle}>🎤 Microphone</Text>
              <Text style={styles.permissionDesc}>Required for the AI to listen and communicate during a crisis.</Text>
            </View>
            <TouchableOpacity 
              style={[styles.grantButton, audioGranted && styles.grantedButton]} 
              onPress={requestAudio}
              disabled={audioGranted}
            >
              <Text style={styles.grantButtonText}>{audioGranted ? 'Granted' : 'Allow'}</Text>
            </TouchableOpacity>
          </View>

          {/* NOTIFICATION PERMISSION */}
          <View style={[styles.permissionCard, notificationGranted && styles.permissionGranted]}>
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionTitle}>🔔 Notifications</Text>
              <Text style={styles.permissionDesc}>Required to alert you and your contacts in an emergency.</Text>
            </View>
            <TouchableOpacity 
              style={[styles.grantButton, notificationGranted && styles.grantedButton]} 
              onPress={requestNotifications}
              disabled={notificationGranted}
            >
              <Text style={styles.grantButtonText}>{notificationGranted ? 'Granted' : 'Allow'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, styles.backButton]} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.finishButton, !isReadyToSubmit && styles.finishButtonDisabled]} 
            onPress={handleSubmit}
            disabled={!isReadyToSubmit || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Finish & Save</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 24, flexGrow: 1, justifyContent: 'center' },
  header: { marginBottom: 32 },
  stepIndicator: { color: '#10B981', fontWeight: 'bold', marginBottom: 8, fontSize: 14 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#111827' },
  subtitle: { color: '#6B7280', marginTop: 8, fontSize: 16 },
  
  requestAllBtn: { backgroundColor: '#10B981', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  requestAllBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  permissionsContainer: { marginBottom: 20 },
  permissionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 },
  permissionGranted: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  permissionInfo: { flex: 1, paddingRight: 16 },
  permissionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  permissionDesc: { color: '#4B5563', fontSize: 14, lineHeight: 20 },
  grantButton: { backgroundColor: '#3B82F6', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16 },
  grantedButton: { backgroundColor: '#10B981' },
  grantButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },

  mapContainer: { width: '100%', height: 180, borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#10B981' },
  map: { width: '100%', height: '100%' },
  mapLabel: { position: 'absolute', bottom: 8, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, fontSize: 12, fontWeight: 'bold', color: '#10B981', overflow: 'hidden' },

  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 24 },
  button: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  backButton: { width: '40%', backgroundColor: '#F3F4F6' },
  finishButton: { width: '55%', backgroundColor: '#10B981', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  finishButtonDisabled: { backgroundColor: '#9CA3AF', shadowOpacity: 0 },
  backButtonText: { color: '#374151', fontWeight: 'bold', fontSize: 18 },
  buttonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 18 },
});
