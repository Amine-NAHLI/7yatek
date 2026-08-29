import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const API_URL = 'http://192.168.1.188:3000/api/users/profile';

export default function SettingsScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await fetch(API_URL, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (response.ok) {
        setProfile(data);
      }
    } catch (e) {
      console.log("Erreur lors de la récupération du profil", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );
  
  const handleLogout = () => {
    Alert.alert("Déconnexion", "Êtes-vous sûr de vouloir vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { 
        text: "Se déconnecter", 
        style: "destructive", 
        onPress: async () => {
          // Supprimer le token
          await AsyncStorage.removeItem('userToken');
          // Naviguer vers l'écran de bienvenue
          navigation.replace('Welcome');
        }
      }
    ]);
  };

  const handleEdit = () => {
    navigation.navigate('EditProfile');
  };

  // Helper pour l'initiale
  const getInitials = (name) => {
    if (!name) return '??';
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Paramètres</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          {loading ? (
            <ActivityIndicator size="large" color="#3B82F6" />
          ) : (
            <>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(profile?.name)}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile?.name || 'Inconnu'}</Text>
                <Text style={styles.profileEmail}>{profile?.email || 'email@example.com'}</Text>
              </View>
            </>
          )}
        </View>

        {/* Test Alert Button (WebSocket) - DÉPLACÉ EN HAUT */}
        <TouchableOpacity 
          style={styles.testAlertButton} 
          activeOpacity={0.8}
          onPress={() => {
            Alert.alert(
              "🚨 TEST DE SÉCURITÉ",
              "Ceci est juste un test d'alarme.\n\nEn confirmant, votre téléphone va simuler le déclenchement d'un Agent IA via WebSocket (Vibration + Alerte).",
              [
                { text: "Annuler", style: "cancel" },
                { 
                  text: "Lancer le test", 
                  style: "destructive",
                  onPress: async () => {
                    try {
                      const token = await AsyncStorage.getItem('userToken');
                      await fetch('http://192.168.1.188:3000/api/users/test-notification', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          title: "⚠️ TEST RÉUSSI",
                          body: "La connexion WebSocket fonctionne parfaitement 0ms de latence."
                        })
                      });
                    } catch(e) {
                      console.log(e);
                    }
                  }
                }
              ]
            );
          }}
        >
          <View style={styles.testAlertContent}>
            <MaterialCommunityIcons name="shield-check" size={24} color="#ffffff" />
            <View style={styles.testAlertTextContainer}>
              <Text style={styles.testAlertTitle}>Test de Sécurité IA</Text>
              <Text style={styles.testAlertSubtitle}>Simuler le déclenchement d'un Agent</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color="#ffffff" style={{ opacity: 0.7 }} />
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>Gérer mon compte</Text>

        {/* Edit Info Button */}
        <TouchableOpacity style={styles.menuItem} onPress={handleEdit} activeOpacity={0.7}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#3B82F620' }]}>
              <Feather name="user" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.menuItemText}>Informations personnelles</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* View Medical File Button */}
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('EditMedical')} activeOpacity={0.7}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#10B98120' }]}>
              <MaterialCommunityIcons name="medical-bag" size={20} color="#10B981" />
            </View>
            <Text style={styles.menuItemText}>Mon dossier médical</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* View Favorite Places */}
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('EditFavoritePlaces')} activeOpacity={0.7}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#8B5CF620' }]}>
              <Feather name="heart" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.menuItemText}>Lieux Favoris</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* View Emergency Contacts */}
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('EditEmergencyContacts')} activeOpacity={0.7}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#F59E0B20' }]}>
              <Feather name="shield" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.menuItemText}>Contacts d'urgence</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Feather name="log-out" size={20} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutButtonText}>Se déconnecter de 7yatk</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    padding: 24,
    paddingTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100, // navbar padding
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 16,
    marginLeft: 4,
  },
  testAlertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#8B5CF6', // Purple IA
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  testAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testAlertTextContainer: {
    marginLeft: 16,
  },
  testAlertTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  testAlertSubtitle: {
    color: '#EEDCFF',
    fontSize: 13,
    marginTop: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 32,
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
