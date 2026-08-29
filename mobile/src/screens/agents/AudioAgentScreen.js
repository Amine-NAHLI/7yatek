import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as Brightness from 'expo-brightness';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const BACKEND_URL = 'http://192.168.1.188:3000';

export default function AudioAgentScreen({ navigation }) {
  const [mode, setMode] = useState('monitoring'); // monitoring, sos, stealth
  const [recording, setRecording] = useState(null);
  const [stealthMessage, setStealthMessage] = useState('Enregistrement en cours...');
  const [originalBrightness, setOriginalBrightness] = useState(0.5);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [sentTranscription, setSentTranscription] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);

  useEffect(() => {
    (async () => {
      const { status: audioStatus } = await Audio.requestPermissionsAsync();
      const { status: brightnessStatus } = await Brightness.requestPermissionsAsync();
      
      if (audioStatus !== 'granted') {
        Alert.alert('Permission requise', "L'accès au micro est nécessaire.");
      }
      if (brightnessStatus === 'granted') {
        const current = await Brightness.getBrightnessAsync();
        setOriginalBrightness(current);
      }
    })();
    
    return () => {
      restoreBrightness();
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [recording]);

  const restoreBrightness = async () => {
    try {
      await Brightness.setBrightnessAsync(originalBrightness);
    } catch (e) {}
  };

  // ==========================================
  // SCÉNARIO 1 : URGENCE DIRECTE (Action Words)
  // ==========================================
  const simulateHelpKeyword = () => {
    setMode('sos');
    console.log("🚨 ALERTE MAXIMALE : Mot 'Help' détecté !");
    Alert.alert("🚨 SOS ENVOYÉ", "Les secours sont prévenus immédiatement !");
  };

  // ==========================================
  // SCÉNARIO 2 : MODE FURTIF (Agent Words)
  // ==========================================
  const simulateListenKeyword = async () => {
    setMode('stealth');
    setAnalysisResult(null);
    setStealthMessage('Enregistrement en cours...');
    setConversationHistory([]);
    
    // 1. Passage en mode Stealth (Luminosité à 0)
    try {
      await Brightness.setBrightnessAsync(0);
    } catch (e) {
      console.log("Erreur luminosité:", e);
    }

    // 2. Enregistrement silencieux
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      
      // Enregistre pendant 5 secondes puis stoppe et envoie
      setTimeout(async () => {
        try {
          const status = await newRecording.getStatusAsync();
          if (status.isRecording) {
            await newRecording.stopAndUnloadAsync();
            const uri = newRecording.getURI();
            console.log("🎙️ Enregistrement terminé, URI:", uri);
            setStealthMessage('Analyse en cours...');
            sendAudioToBackend(uri);
          }
        } catch (e) {
           console.log("❌ Erreur lors de l'arrêt de l'enregistrement:", e.message, e.stack);
        }
      }, 8000);

    } catch (err) {
      console.error('❌ Erreur démarrage enregistrement:', err.message, err.stack);
    }
  };

    const sendAudioToBackend = async (uri) => {
    try {
      console.log("📤 Début de l'envoi de l'audio au backend...");
      const token = await AsyncStorage.getItem('userToken');

      // On utilise 1 car FileSystemUploadType.MULTIPART n'est pas exporté dans cette version d'expo
      const response = await FileSystem.uploadAsync(
        `${BACKEND_URL}/api/orchestrator/stealth-audio`,
        uri,
        {
          httpMethod: 'POST',
          uploadType: 1, // 1 = MULTIPART
          fieldName: 'audio',
          parameters: {
            history: JSON.stringify(conversationHistory)
          },
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      console.log("📥 Réponse reçue du backend, status:", response.status);
      const data = JSON.parse(response.body);
      
      if (data.analysis && data.analysis.advice) {
        setStealthMessage(data.analysis.advice);
        setSentTranscription(data.transcription);
        setAnalysisResult(data.analysis);
        
        // Mettre à jour l'historique
        setConversationHistory(prev => [
          ...prev, 
          { role: 'user', content: data.transcription },
          { role: 'assistant', content: data.analysis.advice }
        ]);
        
      } else if (data.error) {
        console.error("❌ Erreur renvoyée par le backend:", data.error, data.details, data.stack);
        setStealthMessage('Erreur: ' + (data.details || data.error));
      } else {
        setStealthMessage('Erreur réseau inconnue.');
      }
    } catch (error) {
      console.error("❌ Erreur CRITIQUE lors de l'envoi audio:", error.message, error.stack);
      setStealthMessage('Échec connexion au serveur.');
    }
  };

  const sendTextToBackend = async (text) => {
    try {
      console.log(`📤 Envoi de l'action texte: "${text}"...`);
      setStealthMessage('Analyse en cours...');
      setAnalysisResult(null);
      
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BACKEND_URL}/api/orchestrator/stealth-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: text,
          history: conversationHistory
        })
      });
      
      const data = await response.json();
      
      if (data.analysis && data.analysis.advice) {
        setStealthMessage(data.analysis.advice);
        // On ne met pas à jour sentTranscription car le bouton cliqué n'est pas envoyé par audio au contact
        setAnalysisResult(data.analysis);
        
        setConversationHistory(prev => [
          ...prev, 
          { role: 'user', content: data.transcription },
          { role: 'assistant', content: data.analysis.advice }
        ]);
      } else {
        setStealthMessage('Erreur: ' + (data.error || 'Erreur réseau'));
      }
    } catch (error) {
      console.error("❌ Erreur envoi texte:", error);
      setStealthMessage('Échec connexion.');
    }
  };

  const cancelStealth = () => {
    setMode('monitoring');
    setStealthMessage('Enregistrement en cours...');
    setAnalysisResult(null);
    setConversationHistory([]);
    restoreBrightness();
  };

  const recordAnotherMessage = async () => {
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(newRecording);
      
      setTimeout(async () => {
        try {
          const status = await newRecording.getStatusAsync();
          if (status.isRecording) {
            await newRecording.stopAndUnloadAsync();
            const uri = newRecording.getURI();
            setStealthMessage('Analyse en cours...');
            sendAudioToBackend(uri);
          }
        } catch (e) {}
      }, 8000);
    } catch (err) {}
  };

  // ==========================================
  // RENDUS CONDITIONNELS (UI)
  // ==========================================

  // 1. Écran FURTIF (Stealth Mode)
  if (mode === 'stealth') {
    return (
      <View style={[styles.container, { backgroundColor: '#000000', justifyContent: 'center' }]}>
        <Text style={{ color: '#444', fontSize: 18, textAlign: 'center', marginHorizontal: 20, marginBottom: 20 }}>
          {stealthMessage}
        </Text>
        
        {analysisResult && (
          <View style={{ width: '90%', alignItems: 'center' }}>
            <Text style={{ color: '#222', fontSize: 12, textAlign: 'center', marginBottom: 30 }}>
              ✓ Alerte et audio transférés au contact d'urgence : "{sentTranscription}"
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 }}>
              {analysisResult.suggested_replies && analysisResult.suggested_replies.map((reply, index) => (
                <TouchableOpacity 
                  key={index}
                  style={{ backgroundColor: '#111', padding: 15, borderRadius: 8, width: '48%', alignItems: 'center', borderWidth: 1, borderColor: '#222' }}
                  onPress={() => sendTextToBackend(reply)}
                >
                  <Text style={{ color: '#555', textAlign: 'center' }}>{reply}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={{ backgroundColor: '#111', padding: 15, borderRadius: 8, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#222' }}
              onPress={() => {
                 setAnalysisResult(null);
                 setStealthMessage('Enregistrement en cours...');
                 // On relance l'enregistrement manuellement via la logique existante mais en gardant l'historique
                 // simulateListenKeyword remet l'historique à zéro, on va donc juste relancer l'audio
                 recordAnotherMessage();
              }}
            >
              <Text style={{ color: '#555' }}>🎤 Enregistrer un autre message (8s)</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity 
          style={{ position: 'absolute', bottom: 10, width: 200, height: 100 }} 
          onPress={cancelStealth}
        />
      </View>
    );
  }

  // 2. Écran SOS (Urgence Directe)
  if (mode === 'sos') {
    return (
      <View style={[styles.container, { backgroundColor: '#DC2626' }]}>
        <Feather name="mic" size={80} color="white" />
        <Text style={styles.criticalTitle}>SOS VOCAL DÉCLENCHÉ</Text>
        <Text style={styles.criticalSubtitle}>Les secours sont en route silencieusement.</Text>
        <TouchableOpacity style={[styles.cancelBtn, { marginTop: 60 }]} onPress={() => setMode('monitoring')}>
          <Text style={[styles.cancelBtnText, { color: '#DC2626' }]}>ANNULER L'ALERTE</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. Écran Monitoring (Simulateur)
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Feather name="mic" size={32} color="#10B981" />
        <Text style={styles.headerTitle}>Garde du Corps Audio</Text>
      </View>
      
      <Text style={styles.infoText}>
        L'IA écoute en tâche de fond hors-ligne. (Simulation)
      </Text>

      <View style={styles.simulationBox}>
        <Text style={styles.simTitle}>Simuler un mot-clé :</Text>
        
        <TouchableOpacity style={styles.simBtnDirect} onPress={simulateHelpKeyword}>
          <Text style={styles.simBtnTextWhite}>Simuler "Au secours !"</Text>
          <Text style={styles.simSubText}>Déclenche le SOS immédiatement</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.simBtnStealth} onPress={simulateListenKeyword}>
          <Text style={styles.simBtnTextWhite}>Simuler "Écoute-moi"</Text>
          <Text style={styles.simSubText}>Active le mode Kidnapping (Furtif + IA)</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.quitBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.quitBtnText}>Quitter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  infoText: {
    color: '#6B7280',
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  simulationBox: {
    width: '90%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  simTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  simBtnDirect: {
    backgroundColor: '#EF4444',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  simBtnStealth: {
    backgroundColor: '#1F2937',
    padding: 15,
    borderRadius: 10,
  },
  simBtnTextWhite: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  simSubText: {
    color: '#D1D5DB',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  quitBtn: {
    marginTop: 40,
  },
  quitBtnText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: 'bold',
  },
  criticalTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: 'white',
    marginTop: 20,
    textAlign: 'center',
  },
  criticalSubtitle: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  cancelBtn: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  cancelBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
  }
});
