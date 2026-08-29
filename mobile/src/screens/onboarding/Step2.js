import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function Step2({ route, navigation }) {
  const { userData } = route.params;
  const [gender, setGender] = useState('Male');
  
  const [date, setDate] = useState(new Date(2000, 0, 1)); // Par défaut: 1er Janvier 2000
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleNext = () => {
    // Format YYYY-MM-DD
    const formattedDate = date.toISOString().split('T')[0];
    navigation.navigate('Step3', {
      userData: { ...userData, gender, dateOfBirth: formattedDate }
    });
  };

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios'); // Fermer sur Android
    setDate(currentDate);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        <View style={styles.header}>
          <Text style={styles.stepIndicator}>Step 2 of 6</Text>
          <Text style={styles.title}>Demographics</Text>
          <Text style={styles.subtitle}>Help 7yatk AI understand your profile.</Text>
        </View>

        <View style={styles.form}>
          {/* GENDER PICKER */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={gender}
                onValueChange={(itemValue) => setGender(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Male" value="Male" />
                <Picker.Item label="Female" value="Female" />
                <Picker.Item label="Other" value="Other" />
              </Picker>
            </View>
          </View>

          {/* DATE OF BIRTH PICKER */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateButtonText}>{date.toISOString().split('T')[0]}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                testID="dateTimePicker"
                value={date}
                mode="date"
                display="spinner"
                onChange={onChangeDate}
                maximumDate={new Date()} // Impossible d'être né dans le futur
                minimumDate={new Date(1920, 0, 1)} // Permet d'aller loin dans le passé
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

      </View>
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
  pickerContainer: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  picker: { width: '100%', height: 55, color: '#111827' },
  dateButton: { width: '100%', backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 18, justifyContent: 'center' },
  dateButtonText: { color: '#111827', fontSize: 16 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 32 },
  button: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  backButton: { width: '45%', backgroundColor: '#F3F4F6' },
  nextButton: { width: '45%', backgroundColor: '#3B82F6', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  backButtonText: { color: '#374151', fontWeight: 'bold', fontSize: 18 },
  buttonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 18 },
});
