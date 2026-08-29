import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Step1({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleNext = () => {
    // On passe les données à l'étape suivante via les paramètres de navigation
    navigation.navigate('Step2', {
      userData: { name, email, phone, password }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        
        <View style={styles.header}>
          <Text style={styles.stepIndicator}>Step 1 of 6</Text>
          <Text style={styles.title}>Basic Information</Text>
          <Text style={styles.subtitle}>Let's start with your identity.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} placeholder="John Doe" value={name} onChangeText={setName} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput style={styles.input} placeholder="john@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput style={styles.input} placeholder="+212 xxxxxxxxx" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput style={styles.input} placeholder="Create a strong password" secureTextEntry value={password} onChangeText={setPassword} />
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>

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
  inputGroup: { marginBottom: 16 },
  label: { color: '#374151', marginBottom: 4, fontWeight: '500', marginLeft: 4 },
  input: { width: '100%', backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, color: '#111827' },
  button: { width: '100%', backgroundColor: '#3B82F6', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 32, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  buttonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 18 },
});
