import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

const API_URL = 'http://192.168.1.188:3000/api/users/profile';

export default function EditEmergencyContactsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('Mother');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  
  const [fullProfile, setFullProfile] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

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
        setFullProfile(data);
        setEmergencyContactName(data.emergencyContactName || '');
        // We might not have relation in DB originally, default to Mother if empty
        setEmergencyContactRelation(data.emergencyContactRelation || 'Mother'); 
        setEmergencyContactPhone(data.emergencyContactPhone || '');
      }
    } catch (e) {
      Alert.alert("Erreur", "Impossible de charger les contacts d'urgence");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    const updatedProfile = {
      ...fullProfile,
      emergencyContactName,
      emergencyContactRelation,
      emergencyContactPhone
    };

    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedProfile)
      });

      if (response.ok) {
        Alert.alert("Succès", "Contact d'urgence mis à jour.");
        navigation.goBack();
      } else {
        Alert.alert("Erreur", "Impossible de mettre à jour le contact.");
      }
    } catch (e) {
      Alert.alert("Erreur", "Problème de connexion.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Contact d'urgence</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
          
          <View style={styles.infoBox}>
            <Feather name="info" size={20} color="#F59E0B" />
            <Text style={styles.infoText}>Ce contact sera automatiquement prévenu en cas de SOS ou de déclenchement d'un de vos agents (Crash, Agression, etc).</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom Complet</Text>
            <TextInput 
              style={styles.input} 
              value={emergencyContactName} 
              onChangeText={setEmergencyContactName} 
              placeholder="Ex: Jane Doe"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Relation</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={emergencyContactRelation}
                onValueChange={(itemValue) => setEmergencyContactRelation(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Mère (Mother)" value="Mother" />
                <Picker.Item label="Père (Father)" value="Father" />
                <Picker.Item label="Conjoint(e) (Spouse)" value="Spouse" />
                <Picker.Item label="Frère/Soeur (Sibling)" value="Sibling" />
                <Picker.Item label="Enfant (Child)" value="Child" />
                <Picker.Item label="Ami(e) (Friend)" value="Friend" />
                <Picker.Item label="Autre (Other)" value="Other" />
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Numéro de Téléphone</Text>
            <TextInput 
              style={styles.input} 
              value={emergencyContactPhone} 
              onChangeText={setEmergencyContactPhone} 
              placeholder="+212 xxxxxxxxx"
              keyboardType="phone-pad"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Enregistrer le contact</Text>}
          </TouchableOpacity>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backButton: { padding: 8, marginLeft: -8 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  formContainer: { padding: 20 },
  
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  infoText: {
    color: '#92400E',
    fontSize: 13,
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, color: '#111827', marginBottom: 8, fontWeight: 'bold' },
  input: { 
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#E5E7EB', 
    borderRadius: 12, padding: 14, fontSize: 16, color: '#111827'
  },
  pickerContainer: { 
    backgroundColor: '#ffffff', borderColor: '#E5E7EB', borderWidth: 1, 
    borderRadius: 12, overflow: 'hidden' 
  },
  picker: { width: '100%', height: 55, color: '#111827' },
  
  saveButton: { 
    backgroundColor: '#F59E0B', paddingVertical: 16, borderRadius: 12, 
    alignItems: 'center', marginTop: 16,
    shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});
