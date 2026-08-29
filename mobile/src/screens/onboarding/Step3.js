import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';

export default function Step3({ route, navigation }) {
  const { userData } = route.params;
  const [bloodType, setBloodType] = useState('O+');
  
  // Medications Autocomplete State
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedMedications, setSelectedMedications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch medications from NIH API & Custom Morocco API
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSuggestions([]);
      return;
    }
    
    const fetchMeds = async () => {
      setLoading(true);
      try {
        // API NIH (Américaine)
        const fetchNIH = fetch(`https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=${searchTerm}`)
          .then(res => res.json())
          .then(data => (data && data[1]) ? data[1] : [])
          .catch(() => []);

        // API Morocco Medication (Vercel)
        const fetchMorocco = fetch(`https://morocco-medication-api.vercel.app/api/v1/medications?search=${searchTerm}`)
          .then(res => res.json())
          .then(json => {
            if (json.status === 'success' && Array.isArray(json.data)) {
              return json.data.map(med => med.name);
            }
            return [];
          })
          .catch(() => []);

        // Lancer les deux requêtes en parallèle
        const [nihResults, moroccoResults] = await Promise.all([fetchNIH, fetchMorocco]);

        // Fusionner et dédupliquer les résultats
        const mergedResults = [...new Set([...moroccoResults, ...nihResults])];
        
        setSuggestions(mergedResults);
      } catch (error) {
        console.error("Erreur API Médicaments", error);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchMeds();
    }, 500); // 500ms de debounce

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSelectMed = (med) => {
    if (!selectedMedications.includes(med)) {
      setSelectedMedications([...selectedMedications, med]);
    }
    setSearchTerm('');
    setSuggestions([]);
  };

  const handleRemoveMed = (med) => {
    setSelectedMedications(selectedMedications.filter(m => m !== med));
  };

  const handleNext = () => {
    const medsString = selectedMedications.join(', ');
    navigation.navigate('Step4', {
      userData: { ...userData, bloodType, medications: medsString }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        
        <View style={styles.header}>
          <Text style={styles.stepIndicator}>Step 3 of 6</Text>
          <Text style={styles.title}>Medical Basics</Text>
          <Text style={styles.subtitle}>Crucial for the First-Aid AI Agent.</Text>
        </View>

        <View style={styles.form}>
          {/* BLOOD TYPE PICKER */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Blood Type</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={bloodType} onValueChange={(itemValue) => setBloodType(itemValue)} style={styles.picker}>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map(type => (
                  <Picker.Item key={type} label={type} value={type} />
                ))}
              </Picker>
            </View>
          </View>

          {/* MEDICATIONS AUTOCOMPLETE */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Medications</Text>
            
            {/* Badges des médicaments sélectionnés */}
            <View style={styles.badgesContainer}>
              {selectedMedications.map(med => (
                <View key={med} style={styles.badge}>
                  <Text style={styles.badgeText}>{med}</Text>
                  <TouchableOpacity onPress={() => handleRemoveMed(med)}>
                    <Text style={styles.badgeClose}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.searchInputContainer}>
              <TextInput 
                style={styles.input} 
                placeholder="Type a medication (e.g., Aspirin)..." 
                value={searchTerm} 
                onChangeText={setSearchTerm} 
              />
              {loading && <ActivityIndicator style={styles.loader} color="#3B82F6" />}
            </View>

            {/* Liste des suggestions */}
            {suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {suggestions.map((item, index) => (
                  <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => handleSelectMed(item)}>
                    <Text style={styles.suggestionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  header: { marginBottom: 32 },
  stepIndicator: { color: '#3B82F6', fontWeight: 'bold', marginBottom: 8, fontSize: 14 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#111827' },
  subtitle: { color: '#6B7280', marginTop: 8, fontSize: 16 },
  form: { width: '100%', zIndex: 1 },
  inputGroup: { marginBottom: 24, zIndex: 2 },
  label: { color: '#374151', marginBottom: 8, fontWeight: '500', marginLeft: 4 },
  pickerContainer: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  picker: { width: '100%', height: 55, color: '#111827' },
  
  // Meds Autocomplete Styles
  searchInputContainer: { position: 'relative' },
  loader: { position: 'absolute', right: 16, top: 18 },
  input: { width: '100%', backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, color: '#111827' },
  suggestionsContainer: { backgroundColor: '#ffffff', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 12, marginTop: 4, maxHeight: 150, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, position: 'absolute', top: 60, width: '100%', zIndex: 10 },
  suggestionItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  suggestionText: { color: '#111827', fontSize: 16 },
  
  badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 },
  badgeText: { color: '#1D4ED8', fontWeight: '500', marginRight: 8 },
  badgeClose: { color: '#1D4ED8', fontWeight: 'bold', fontSize: 16 },

  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 32, zIndex: -1 },
  button: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  backButton: { width: '45%', backgroundColor: '#F3F4F6' },
  nextButton: { width: '45%', backgroundColor: '#3B82F6', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  backButtonText: { color: '#374151', fontWeight: 'bold', fontSize: 18 },
  buttonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 18 },
});
