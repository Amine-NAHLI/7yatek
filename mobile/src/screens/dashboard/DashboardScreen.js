import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.188:3000/api/users';

export default function DashboardScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [favoritePlaces, setFavoritePlaces] = useState([]);
  const [isCrashAgentActive, setIsCrashAgentActive] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadFavorites = async () => {
        try {
          const stored = await AsyncStorage.getItem('userFavoritePlaces');
          if (stored) {
            setFavoritePlaces(JSON.parse(stored));
          }
        } catch (e) {
          console.error(e);
        }
      };
      loadFavorites();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setProfile(data);
      }
    } catch (error) {
      console.error("Erreur chargement profil:", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleNotDeveloped = () => {
    Alert.alert("En cours de développement", "Cet agent sera disponible dans une prochaine mise à jour.");
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarPlaceholder}>
             {loadingProfile ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.avatarText}>{profile?.name?.substring(0,2).toUpperCase() || 'US'}</Text>}
          </View>
          <View>
            <Text style={styles.appName}>7yatk IA</Text>
            <Text style={styles.greetingText}>Bonjour, {profile?.name || '...'} 👋</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.bellIcon}>
          <Feather name="bell" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* MAIN CONTENT (FIXED, NO SCROLL) */}
      <View style={styles.content}>
        
        {/* GLOBAL STATUS (BOUCLIER) */}
        <View style={styles.statusBadgeContainer}>
          <View style={styles.statusBadge}>
            <MaterialCommunityIcons name="shield-check" size={20} color="#10B981" />
            <Text style={styles.statusText}>Bouclier IA : 3/5 Agents Actifs</Text>
          </View>
        </View>

        {/* 2x3 WIDGETS GRID */}
        <View style={styles.widgetsGrid}>
          
          {/* Widget 1: Trajet Sécurisé */}
          <View style={[styles.widgetCard, { backgroundColor: '#EFF6FF' }]}>
            <View style={styles.widgetHeader}>
              <Feather name="map-pin" size={18} color="#3B82F6" />
              <Text style={[styles.widgetTitle, { color: '#1E3A8A' }]}>Trajet IA</Text>
            </View>
            <Text style={styles.widgetDesc}>Suivi GPS & Deviations</Text>
            <TouchableOpacity 
              style={styles.widgetBtnBlue}
              onPress={() => navigation.navigate('SafeJourney')}
            >
              <Text style={styles.widgetBtnText}>Démarrer</Text>
            </TouchableOpacity>
          </View>

          {/* Widget 2: Agent Anti-Crash */}
          <View style={[styles.widgetCard, { backgroundColor: '#FDF2F8' }]}>
            <View style={styles.widgetHeader}>
              <MaterialCommunityIcons name="car-brake-alert" size={16} color="#DB2777" />
              <Text style={[styles.widgetTitle, { color: '#831843' }]}>Anti-Crash</Text>
            </View>
            
            {!isCrashAgentActive ? (
              <TouchableOpacity 
                style={[styles.widgetBtnBlue, { backgroundColor: '#DB2777' }]}
                onPress={() => setIsCrashAgentActive(true)}
              >
                <Text style={styles.widgetBtnText}>Activer (En Voiture)</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={[styles.widgetDesc, { color: '#10B981', fontWeight: 'bold', marginTop: 2 }]}>
                  ✓ Surveillance Active
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity 
                    style={[styles.widgetBtnBlue, { backgroundColor: '#831843', flex: 1, paddingVertical: 8 }]}
                    onPress={() => navigation.navigate('CrashAgent')}
                  >
                    <Text style={styles.widgetBtnText}>Télémétrie</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.widgetBtnBlue, { backgroundColor: '#DB2777', flex: 1, paddingVertical: 8 }]}
                    onPress={() => setIsCrashAgentActive(false)}
                  >
                    <Text style={styles.widgetBtnText}>Désactiver</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Widget 3: Agent Audio (Stealth) */}
          <View style={[styles.widgetCard, { backgroundColor: '#F3E8FF' }]}>
            <View style={styles.widgetHeader}>
              <Feather name="mic" size={18} color="#9333EA" />
              <Text style={[styles.widgetTitle, { color: '#581C87' }]}>Agent Audio</Text>
            </View>
            <Text style={styles.widgetDesc}>Mode Furtif & SOS</Text>
            <TouchableOpacity 
              style={[styles.widgetBtnBlue, { backgroundColor: '#9333EA' }]}
              onPress={() => navigation.navigate('AudioAgent')}
            >
              <Text style={styles.widgetBtnText}>Ouvrir</Text>
            </TouchableOpacity>
          </View>

          {/* Widget 4: Agent Secouriste Vocal */}
          <TouchableOpacity 
            style={[styles.widgetCard, { backgroundColor: '#FEF2F2' }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('FirstAidVoice')}
          >
            <View style={styles.widgetHeader}>
              <MaterialCommunityIcons name="stethoscope" size={18} color="#DC2626" />
              <Text style={[styles.widgetTitle, { color: '#7F1D1D' }]}>Secouriste</Text>
            </View>
            <Text style={styles.widgetDesc}>Guidage Vocal IA</Text>
            <TouchableOpacity 
              style={[styles.widgetBtnBlue, { backgroundColor: '#DC2626' }]}
              onPress={() => navigation.navigate('FirstAidVoice')}
            >
               <Text style={styles.widgetBtnText}>Ouvrir</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Widget 5: Blackout / Mesh */}
          <TouchableOpacity 
            style={[styles.widgetCard, { backgroundColor: '#FEF3C7' }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('MeshAgent')}
          >
            <View style={styles.widgetHeader}>
              <MaterialCommunityIcons name="access-point-network" size={18} color="#D97706" />
              <Text style={[styles.widgetTitle, { color: '#78350F' }]}>Mesh SOS</Text>
            </View>
            <Text style={styles.widgetDesc}>Survie Hors-Réseau</Text>
            <TouchableOpacity 
              style={[styles.widgetBtnBlue, { backgroundColor: '#D97706' }]}
              onPress={() => navigation.navigate('MeshAgent')}
            >
               <Text style={styles.widgetBtnText}>Ouvrir</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Widget 6: Dossier Médical Compact */}
          <TouchableOpacity 
            style={[styles.widgetCard, { backgroundColor: '#F3F4F6' }]}
            activeOpacity={0.7}
            onPress={() => navigation?.navigate('Paramètres')} // Ajuster la nav si besoin
          >
            <View style={styles.widgetHeader}>
              <MaterialCommunityIcons name="heart-pulse" size={18} color="#D97706" />
              <Text style={[styles.widgetTitle, { color: '#78350F' }]}>Santé</Text>
            </View>
            <View style={styles.medicalRow}>
              <Text style={styles.medicalLabel}>Sang :</Text>
              <Text style={styles.medicalValue}>{profile?.bloodType || 'N/A'}</Text>
            </View>
            <View style={styles.medicalRow}>
              <Text style={styles.medicalLabel}>Allergies :</Text>
              <Text style={styles.medicalValue}>{profile?.allergies?.split(',').length || 0}</Text>
            </View>
          </TouchableOpacity>

        </View>

        {/* FAVORITE PLACES QUICK ACTIONS */}
        {favoritePlaces.length > 0 && (
          <View style={styles.favoritesSection}>
            <Text style={styles.favoritesTitle}>Démarrage Rapide (Trajet IA)</Text>
            <View style={styles.favoritesRow}>
              {favoritePlaces.map((place) => (
                <TouchableOpacity 
                  key={place.id}
                  style={styles.favoriteBadge}
                  onPress={() => navigation.navigate('SafeJourney', { autoDest: place })}
                >
                  <Feather name={place.icon} size={14} color="#3B82F6" />
                  <Text style={styles.favoriteBadgeText}>{place.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  appName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },
  bellIcon: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-evenly', // Distributes space perfectly without scrolling
  },
  statusBadgeContainer: {
    alignItems: 'center',
    marginBottom: 20, // Plus d'espace car on a retiré le gros bouton SOS
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  statusText: {
    color: '#065F46',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
  widgetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  widgetCard: {
    width: '48%',
    height: 125, // Un peu plus grand pour remplir l'espace
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  widgetTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 6,
  },
  widgetDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  widgetBtnBlue: {
    backgroundColor: '#3B82F6',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  widgetBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sensorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sensorText: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 6,
    fontWeight: '600',
  },
  meshStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  meshStatusText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '700',
  },
  medicalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  medicalLabel: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  medicalValue: {
    fontSize: 12,
    color: '#78350F',
    fontWeight: '800',
  },
  favoritesSection: {
    marginTop: 8,
  },
  favoritesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B7280',
    marginBottom: 8,
  },
  favoritesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  favoriteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  favoriteBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1D4ED8',
    marginLeft: 6,
  }
});
