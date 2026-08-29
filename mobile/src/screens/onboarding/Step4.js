import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CHRONIC_OPTIONS = ['None', 'Asthma', 'Diabetes Type 1', 'Diabetes Type 2', 'Hypertension', 'Heart Disease', 'Epilepsy', 'Thyroid Disorder', 'Arthritis', 'Other'];
const ALLERGY_OPTIONS = ['None', 'Penicillin', 'Peanuts', 'Pollen', 'Latex', 'Dust Mites', 'Shellfish', 'Aspirin', 'Dairy', 'Other'];

export default function Step4({ route, navigation }) {
  const { userData } = route.params;
  
  const [selectedDiseases, setSelectedDiseases] = useState([]);
  const [otherDisease, setOtherDisease] = useState('');
  
  const [selectedAllergies, setSelectedAllergies] = useState([]);
  const [otherAllergy, setOtherAllergy] = useState('');

  const toggleSelection = (item, selectedList, setList) => {
    if (item === 'None') {
      setList(['None']);
      return;
    }
    
    let newList = [...selectedList];
    // Retirer 'None' si on sélectionne autre chose
    if (newList.includes('None')) {
      newList = [];
    }

    if (newList.includes(item)) {
      newList = newList.filter(i => i !== item);
    } else {
      newList.push(item);
    }
    setList(newList);
  };

  const handleNext = () => {
    // Combiner les sélections et les textes "Other"
    let finalDiseases = [...selectedDiseases];
    if (finalDiseases.includes('Other') && otherDisease.trim() !== '') {
      finalDiseases = finalDiseases.filter(d => d !== 'Other');
      finalDiseases.push(otherDisease.trim());
    }

    let finalAllergies = [...selectedAllergies];
    if (finalAllergies.includes('Other') && otherAllergy.trim() !== '') {
      finalAllergies = finalAllergies.filter(a => a !== 'Other');
      finalAllergies.push(otherAllergy.trim());
    }

    navigation.navigate('Step5', {
      userData: { 
        ...userData, 
        chronicDiseases: finalDiseases.join(', ') || 'None', 
        allergies: finalAllergies.join(', ') || 'None' 
      }
    });
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.header}>
            <Text style={styles.stepIndicator}>Step 4 of 6</Text>
            <Text style={styles.title}>Medical History</Text>
            <Text style={styles.subtitle}>Tap all that apply to you.</Text>
          </View>

          <View style={styles.form}>
            {/* CHRONIC DISEASES */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Chronic Diseases</Text>
              {renderButtons(CHRONIC_OPTIONS, selectedDiseases, setSelectedDiseases)}
              
              {selectedDiseases.includes('Other') && (
                <TextInput 
                  style={[styles.input, styles.otherInput]} 
                  placeholder="Please specify other disease(s)..." 
                  value={otherDisease} 
                  onChangeText={setOtherDisease} 
                />
              )}
            </View>

            {/* ALLERGIES */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Allergies</Text>
              {renderButtons(ALLERGY_OPTIONS, selectedAllergies, setSelectedAllergies)}
              
              {selectedAllergies.includes('Other') && (
                <TextInput 
                  style={[styles.input, styles.otherInput]} 
                  placeholder="Please specify other allergy(ies)..." 
                  value={otherAllergy} 
                  onChangeText={setOtherAllergy} 
                />
              )}
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.backButton]} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.nextButton]} onPress={handleNext}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 32, flexGrow: 1, justifyContent: 'center' },
  header: { marginBottom: 32 },
  stepIndicator: { color: '#3B82F6', fontWeight: 'bold', marginBottom: 8, fontSize: 14 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#111827' },
  subtitle: { color: '#6B7280', marginTop: 8, fontSize: 16 },
  form: { width: '100%' },
  inputGroup: { marginBottom: 32 },
  label: { color: '#374151', marginBottom: 12, fontWeight: 'bold', fontSize: 18, marginLeft: 4 },
  
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  optionButton: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 24, paddingVertical: 10, paddingHorizontal: 16, marginRight: 8, marginBottom: 12 },
  optionButtonSelected: { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' },
  optionText: { color: '#4B5563', fontSize: 15 },
  optionTextSelected: { color: '#1D4ED8', fontWeight: 'bold' },
  
  input: { width: '100%', backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, color: '#111827' },
  otherInput: { marginTop: 8 },

  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  button: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  backButton: { width: '45%', backgroundColor: '#F3F4F6' },
  nextButton: { width: '45%', backgroundColor: '#3B82F6', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  backButtonText: { color: '#374151', fontWeight: 'bold', fontSize: 18 },
  buttonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 18 },
});
