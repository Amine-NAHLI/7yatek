import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

const API_URL = 'http://192.168.1.188:3000/api/users/profile';

const CHRONIC_OPTIONS = ['None', 'Asthma', 'Diabetes Type 1', 'Diabetes Type 2', 'Hypertension', 'Heart Disease', 'Epilepsy', 'Thyroid Disorder', 'Arthritis', 'Other'];
const ALLERGY_OPTIONS = ['None', 'Penicillin', 'Peanuts', 'Pollen', 'Latex', 'Dust Mites', 'Shellfish', 'Aspirin', 'Dairy', 'Other'];

export default function EditMedicalScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [medicationList, setMedicationList] = useState([]);
  const [newMedication, setNewMedication] = useState('');
  const [bloodType, setBloodType] = useState('Non spécifié');

  const [selectedDiseases, setSelectedDiseases] = useState([]);
  const [otherDisease, setOtherDisease] = useState('');
  
  const [selectedAllergies, setSelectedAllergies] = useState([]);
  const [otherAllergy, setOtherAllergy] = useState('');
  
  // We need the rest of the profile data so we don't overwrite it when saving!
  const [fullProfile, setFullProfile] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const parseStringToArray = (str) => {
    if (!str || str === 'None') return [];
    return str.split(', ').map(s => s.trim());
  };

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
        
        // Parse medications
        setMedicationList(parseStringToArray(data.medications));
        
        setBloodType(data.bloodType || 'Non spécifié');
        
        // Parse existing diseases
        const existingDiseases = parseStringToArray(data.chronicDiseases);
        let validDiseases = [];
        let othersD = [];
        existingDiseases.forEach(d => {
          if (CHRONIC_OPTIONS.includes(d)) validDiseases.push(d);
          else othersD.push(d);
        });
        if (othersD.length > 0) {
          validDiseases.push('Other');
          setOtherDisease(othersD.join(', '));
        } else if (existingDiseases.length === 0) {
          validDiseases.push('None');
        }
        setSelectedDiseases(validDiseases);

        // Parse existing allergies
        const existingAllergies = parseStringToArray(data.allergies);
        let validAllergies = [];
        let othersA = [];
        existingAllergies.forEach(a => {
          if (ALLERGY_OPTIONS.includes(a)) validAllergies.push(a);
          else othersA.push(a);
        });
        if (othersA.length > 0) {
          validAllergies.push('Other');
          setOtherAllergy(othersA.join(', '));
        } else if (existingAllergies.length === 0) {
          validAllergies.push('None');
        }
        setSelectedAllergies(validAllergies);

      }
    } catch (e) {
      Alert.alert("Erreur", "Impossible de charger le profil médical");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (item, selectedList, setList) => {
    if (item === 'None') {
      setList(['None']);
      return;
    }
    let newList = [...selectedList];
    if (newList.includes('None')) newList = [];

    if (newList.includes(item)) {
      newList = newList.filter(i => i !== item);
    } else {
      newList.push(item);
    }
    
    if (newList.length === 0) newList.push('None');
    setList(newList);
  };

  const handleAddMedication = () => {
    if (newMedication.trim() !== '') {
      if (!medicationList.includes(newMedication.trim())) {
        setMedicationList([...medicationList, newMedication.trim()]);
      }
      setNewMedication('');
    }
  };

  const handleRemoveMedication = (medToRemove) => {
    setMedicationList(medicationList.filter(med => med !== medToRemove));
  };

  const handleSave = async () => {
    setSaving(true);
    
    let finalDiseases = [...selectedDiseases];
    if (finalDiseases.includes('Other') && otherDisease.trim() !== '') {
      finalDiseases = finalDiseases.filter(d => d !== 'Other');
      finalDiseases.push(otherDisease.trim());
    }
    if (finalDiseases.includes('None')) finalDiseases = finalDiseases.filter(d => d !== 'None');

    let finalAllergies = [...selectedAllergies];
    if (finalAllergies.includes('Other') && otherAllergy.trim() !== '') {
      finalAllergies = finalAllergies.filter(a => a !== 'Other');
      finalAllergies.push(otherAllergy.trim());
    }
    if (finalAllergies.includes('None')) finalAllergies = finalAllergies.filter(a => a !== 'None');

    const updatedProfile = {
      ...fullProfile,
      medications: medicationList.join(', '),
      bloodType,
      chronicDiseases: finalDiseases.join(', ') || 'None',
      allergies: finalAllergies.join(', ') || 'None'
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
        Alert.alert("Succès", "Votre dossier médical a été mis à jour.");
        navigation.goBack();
      } else {
        Alert.alert("Erreur", "Impossible de mettre à jour le dossier.");
      }
    } catch (e) {
      Alert.alert("Erreur", "Problème de connexion.");
    } finally {
      setSaving(false);
    }
  };

  const renderButtons = (options, selectedList, setList) => {
    return (
      <View style={styles.optionsContainer}>
        {options.map((item) => {
          const isSelected = selectedList.includes(item);
          return (
            <TouchableOpacity 
              key={item} 
              style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
              onPress={() => toggleSelection(item, selectedList, setList)}
            >
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10B981" />
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
          <Text style={styles.title}>Dossier Médical</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Médicaments en cours</Text>
            
            <View style={styles.medicationInputRow}>
              <TextInput 
                style={[styles.input, { flex: 1, marginBottom: 0 }]} 
                value={newMedication} 
                onChangeText={setNewMedication} 
                placeholder="Ex: Paracétamol, Insuline..."
                placeholderTextColor="#9CA3AF"
                onSubmitEditing={handleAddMedication}
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAddMedication}>
                <Feather name="plus" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.medicationsList}>
              {medicationList.length === 0 ? (
                <Text style={styles.emptyText}>Aucun médicament ajouté.</Text>
              ) : (
                medicationList.map((med, index) => (
                  <View key={index} style={styles.medicationTag}>
                    <Text style={styles.medicationTagText}>{med}</Text>
                    <TouchableOpacity onPress={() => handleRemoveMedication(med)} style={styles.removeMedButton}>
                      <Feather name="x" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Maladies chroniques</Text>
            {renderButtons(CHRONIC_OPTIONS, selectedDiseases, setSelectedDiseases)}
            
            {selectedDiseases.includes('Other') && (
              <TextInput 
                style={[styles.input, styles.otherInput]} 
                placeholder="Veuillez préciser..." 
                value={otherDisease} 
                onChangeText={setOtherDisease} 
                placeholderTextColor="#9CA3AF"
              />
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Allergies</Text>
            {renderButtons(ALLERGY_OPTIONS, selectedAllergies, setSelectedAllergies)}
            
            {selectedAllergies.includes('Other') && (
              <TextInput 
                style={[styles.input, styles.otherInput]} 
                placeholder="Veuillez préciser..." 
                value={otherAllergy} 
                onChangeText={setOtherAllergy} 
                placeholderTextColor="#9CA3AF"
              />
            )}
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Enregistrer le dossier</Text>}
          </TouchableOpacity>
          
          <View style={{ height: 60 }} />
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
  inputGroup: { marginBottom: 24, marginTop: 16 },
  label: { fontSize: 16, color: '#111827', marginBottom: 12, fontWeight: 'bold' },
  
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  optionButton: { 
    backgroundColor: '#ffffff', borderColor: '#E5E7EB', borderWidth: 1, 
    borderRadius: 24, paddingVertical: 10, paddingHorizontal: 16, 
    marginRight: 8, marginBottom: 12 
  },
  optionButtonSelected: { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
  optionText: { color: '#4B5563', fontSize: 15 },
  optionTextSelected: { color: '#047857', fontWeight: 'bold' },
  
  input: { 
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#E5E7EB', 
    borderRadius: 12, padding: 14, fontSize: 16, color: '#111827', marginBottom: 8 
  },
  otherInput: { marginTop: 8 },
  
  saveButton: { 
    backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 12, 
    alignItems: 'center', marginTop: 32,
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  
  medicationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  medicationsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  medicationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  medicationTagText: {
    color: '#374151',
    fontSize: 14,
    marginRight: 8,
  },
  removeMedButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 2,
  },
  emptyText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
    fontSize: 14,
  }
});
