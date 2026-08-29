import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Feather } from '@expo/vector-icons';

// URL du Backend (À adapter si tu testes sur un vrai téléphone, ex: http://192.168.1.X:3000)
const API_URL = 'http://192.168.1.188:3000/api/auth/login';

export default function WelcomeScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Model Download State
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const modelUri = FileSystem.documentDirectory + 'gemma-270m.gguf';

  React.useEffect(() => {
    const checkModel = async () => {
      try {
        const info = await FileSystem.getInfoAsync(modelUri);
        if (info.exists) setIsModelReady(true);
      } catch(e) {}
    };
    checkModel();
  }, []);

  const downloadLocalModel = async () => {
    setIsDownloading(true);
    const downloadResumable = FileSystem.createDownloadResumable(
      'https://huggingface.co/ggml-org/gemma-3-270m-it-qat-GGUF/resolve/main/gemma-3-270m-it-qat-Q4_0.gguf',
      modelUri,
      {},
      (downloadInfo) => {
        const progress = downloadInfo.totalBytesWritten / downloadInfo.totalBytesExpectedToWrite;
        setDownloadProgress(progress);
      }
    );

    try {
      await downloadResumable.downloadAsync();
      setIsModelReady(true);
      setIsDownloading(false);
    } catch (e) {
      console.error("Download error:", e);
      setIsDownloading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (response.ok) {
        // Sauvegarde du token JWT
        if (data.token) {
          await AsyncStorage.setItem('userToken', data.token);
        }
        // Redirection vers le Dashboard principal
        navigation.replace('MainApp');
      } else {
        alert(data.error || "Login failed.");
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
      <View style={styles.content}>
        
        {/* Logo / Header */}
        <View style={styles.header}>
          <Image source={require('../../assets/logo-7yatek.jpg')} style={styles.logoImage} />
          <Text style={styles.title}>7yatk AI</Text>
          <Text style={styles.subtitle}>
            Your personal risk management and emergency assistant.
          </Text>
        </View>

        {/* Form Inputs */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email or Phone</Text>
            <TextInput 
              style={styles.input}
              placeholder="Enter your email or phone"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput 
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Local AI Download Panel */}
        <View style={{ marginBottom: 20, width: '100%', backgroundColor: '#1F2937', padding: 15, borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 5 }}>IA Locale de Survie (Hors-Ligne)</Text>
          <Text style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center', marginBottom: 15 }}>
            Téléchargez le modèle d'intelligence artificielle pour que le téléphone puisse analyser les urgences sans internet.
          </Text>

          {isModelReady ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#064E3B', padding: 10, borderRadius: 8 }}>
              <Feather name="check-circle" size={16} color="#10B981" />
              <Text style={{ color: '#10B981', marginLeft: 8, fontWeight: 'bold', fontSize: 12 }}>Gemma 270M Téléchargé (Prêt)</Text>
            </View>
          ) : isDownloading ? (
            <View style={{ width: '100%' }}>
              <Text style={{ color: '#F3F4F6', marginBottom: 5, textAlign: 'center', fontSize: 12 }}>
                Téléchargement : {(downloadProgress * 100).toFixed(1)}%
              </Text>
              <View style={{ width: '100%', height: 8, backgroundColor: '#374151', borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ width: `${downloadProgress * 100}%`, height: '100%', backgroundColor: '#3B82F6' }} />
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', padding: 12, borderRadius: 8, width: '100%', justifyContent: 'center' }} 
              onPress={downloadLocalModel}
            >
              <Feather name="download-cloud" size={16} color="white" />
              <Text style={{ color: 'white', marginLeft: 8, fontWeight: 'bold', fontSize: 14 }}>Télécharger le Modèle (300 Mo)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sign In Button */}
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Step1')}>
            <Text style={styles.signupText}>Sign Up</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: 22,
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 16,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#374151',
    marginBottom: 4,
    fontWeight: '500',
    marginLeft: 4,
  },
  input: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#111827',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  button: {
    width: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#4B5563',
  },
  signupText: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
});
