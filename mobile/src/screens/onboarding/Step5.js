import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';

export default function Step5({ route, navigation }) {
  const { userData } = route.params;
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('Mother');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  const handleNext = () => {
    navigation.navigate('Step6', {
      userData: { ...userData, emergencyContactName, emergencyContactRelation, emergencyContactPhone }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        
        <View style={styles.header}>
          <Text style={styles.stepIndicator}>Step 5 of 6</Text>
          <Text style={styles.title}>Emergency Contact</Text>
          <Text style={styles.subtitle}>Who should we notify if you are in danger?</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Name</Text>
            <TextInput style={styles.input} placeholder="Jane Doe" value={emergencyContactName} onChangeText={setEmergencyContactName} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Relationship</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={emergencyContactRelation}
                onValueChange={(itemValue) => setEmergencyContactRelation(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Mother" value="Mother" />
                <Picker.Item label="Father" value="Father" />
                <Picker.Item label="Spouse" value="Spouse" />
                <Picker.Item label="Sibling" value="Sibling" />
                <Picker.Item label="Child" value="Child" />
                <Picker.Item label="Friend" value="Friend" />
                <Picker.Item label="Other" value="Other" />
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput style={styles.input} placeholder="+212 xxxxxxxxx" keyboardType="phone-pad" value={emergencyContactPhone} onChangeText={setEmergencyContactPhone} />
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
  form: { width: '100%' },
  inputGroup: { marginBottom: 24 },
  label: { color: '#374151', marginBottom: 8, fontWeight: '500', marginLeft: 4 },
  input: { width: '100%', backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, color: '#111827' },
  pickerContainer: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  picker: { width: '100%', height: 55, color: '#111827' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 32 },
  button: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  backButton: { width: '45%', backgroundColor: '#F3F4F6' },
  nextButton: { width: '45%', backgroundColor: '#3B82F6', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  backButtonText: { color: '#374151', fontWeight: 'bold', fontSize: 18 },
  buttonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 18 },
});
