import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = 'http://192.168.1.188:3000';

export default function FirstAidVoiceScreen({ navigation }) {
  const [phase, setPhase] = useState('idle'); // idle, recording, thinking, speaking
  const [recording, setRecording] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [currentSource, setCurrentSource] = useState(null);

  // Animation pour le micro
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const startThinkingAnim = () => {
    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true })
    ).start();
  };

  const stopThinkingAnim = () => {
    rotateAnim.stopAnimation();
    rotateAnim.setValue(0);
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setPhase('recording');
      startPulse();
    } catch (e) {
      console.error('Erreur enregistrement:', e);
    }
  };

  const stopRecordingAndSend = async () => {
    if (!recording) return;

    stopPulse();
    setPhase('thinking');
    startThinkingAnim();

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      // Permettre la lecture audio
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      // Ajout message utilisateur (en attente de transcription)
      const userMsgIndex = conversation.length;
      setConversation(prev => [...prev, { role: 'user', text: '🎤 Transcription en cours...' }]);

      // Envoi au backend
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      formData.append('audio', {
        uri: uri,
        type: 'audio/m4a',
        name: 'first_aid_audio.m4a',
      });
      formData.append('history', JSON.stringify(conversation));

      const response = await fetch(`${BACKEND_URL}/api/orchestrator/first-aid-voice`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      stopThinkingAnim();

      if (data.error) {
        setPhase('idle');
        setConversation(prev => [...prev, { role: 'ai', text: 'Erreur: ' + data.error }]);
        return;
      }

      // Mettre à jour la transcription de l'utilisateur
      setConversation(prev => {
        const updated = [...prev];
        updated[userMsgIndex] = { role: 'user', text: data.transcription };
        return updated;
      });

      // Ajouter la réponse IA
      const aiResponse = data.aiResponse;
      const sourceText = data.source || null;
      setCurrentSource(sourceText);

      setConversation(prev => [...prev, { role: 'ai', text: aiResponse, source: sourceText }]);

      // Lire la réponse à voix haute
      setPhase('speaking');
      Speech.speak(aiResponse, {
        language: 'fr-FR',
        rate: 0.95,
        onDone: () => setPhase('idle'),
        onError: () => setPhase('idle'),
      });

    } catch (e) {
      console.error('Erreur envoi audio:', e);
      stopThinkingAnim();
      setPhase('idle');
      setConversation(prev => [...prev, { role: 'ai', text: 'Erreur réseau. Vérifiez la connexion au serveur.' }]);
    }
  };

  const stopSpeaking = () => {
    Speech.stop();
    setPhase('idle');
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏥 Agent Secouriste IA</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Badge Source */}
      <View style={styles.sourceBadge}>
        <MaterialCommunityIcons name="shield-check" size={16} color="#10B981" />
        <Text style={styles.sourceBadgeText}>Sources : MedlinePlus (NIH) · PubMed (NCBI)</Text>
      </View>

      {/* Conversation */}
      <ScrollView 
        style={styles.chatContainer} 
        contentContainerStyle={styles.chatContent}
        ref={ref => { if (ref) ref.scrollToEnd({ animated: true }); }}
      >
        {conversation.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="stethoscope" size={60} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Agent Secouriste Vocal</Text>
            <Text style={styles.emptyDesc}>
              Décrivez la situation d'urgence à voix haute. L'IA consultera les protocoles médicaux officiels (MedlinePlus, PubMed) et vous guidera étape par étape en temps réel.
            </Text>
            <Text style={styles.emptyHint}>Appuyez sur le micro pour commencer</Text>
          </View>
        )}

        {conversation.map((msg, index) => (
          <View key={index} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <View style={styles.bubbleHeader}>
              {msg.role === 'user' ? (
                <Feather name="mic" size={14} color="#3B82F6" />
              ) : (
                <MaterialCommunityIcons name="robot-outline" size={14} color="#DC2626" />
              )}
              <Text style={[styles.bubbleLabel, msg.role === 'user' ? { color: '#3B82F6' } : { color: '#DC2626' }]}>
                {msg.role === 'user' ? 'Vous' : 'Secouriste IA'}
              </Text>
            </View>
            <Text style={styles.bubbleText}>{msg.text}</Text>
            {msg.source && (
              <View style={styles.sourceTag}>
                <MaterialCommunityIcons name="link-variant" size={12} color="#6B7280" />
                <Text style={styles.sourceTagText}>Source : {msg.source}</Text>
              </View>
            )}
          </View>
        ))}

        {phase === 'thinking' && (
          <View style={[styles.bubble, styles.aiBubble]}>
            <View style={styles.thinkingRow}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <MaterialCommunityIcons name="loading" size={20} color="#DC2626" />
              </Animated.View>
              <Text style={styles.thinkingText}>Consultation MedlinePlus en cours...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Controls */}
      <View style={styles.controls}>
        {phase === 'idle' && (
          <TouchableOpacity style={styles.micButton} onPress={startRecording}>
            <Feather name="mic" size={32} color="white" />
            <Text style={styles.micLabel}>Appuyez pour parler</Text>
          </TouchableOpacity>
        )}

        {phase === 'recording' && (
          <TouchableOpacity style={styles.stopButton} onPress={stopRecordingAndSend}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={styles.stopInner}>
                <Feather name="square" size={28} color="white" />
              </View>
            </Animated.View>
            <Text style={styles.stopLabel}>🔴 En écoute... Appuyez pour envoyer</Text>
          </TouchableOpacity>
        )}

        {phase === 'thinking' && (
          <View style={styles.statusBar}>
            <MaterialCommunityIcons name="brain" size={24} color="#D97706" />
            <Text style={styles.statusText}>L'IA consulte les sources médicales...</Text>
          </View>
        )}

        {phase === 'speaking' && (
          <TouchableOpacity style={styles.speakingButton} onPress={stopSpeaking}>
            <MaterialCommunityIcons name="volume-high" size={28} color="white" />
            <Text style={styles.speakingLabel}>🔊 L'IA parle... Appuyez pour couper</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  sourceBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, backgroundColor: '#ECFDF5', gap: 6,
  },
  sourceBadgeText: { fontSize: 12, color: '#065F46', fontWeight: '600' },
  chatContainer: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 20 },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#374151', marginTop: 16 },
  emptyDesc: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginTop: 12, lineHeight: 22 },
  emptyHint: { fontSize: 14, color: '#9CA3AF', marginTop: 20, fontStyle: 'italic' },
  bubble: { borderRadius: 16, padding: 14, marginBottom: 12, maxWidth: '90%' },
  userBubble: { backgroundColor: '#EFF6FF', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: '#FEF2F2', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  bubbleLabel: { fontSize: 12, fontWeight: 'bold' },
  bubbleText: { fontSize: 15, color: '#1F2937', lineHeight: 22 },
  sourceTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  sourceTagText: { fontSize: 11, color: '#6B7280', fontStyle: 'italic' },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thinkingText: { fontSize: 14, color: '#DC2626', fontWeight: '600' },
  controls: { padding: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB', alignItems: 'center' },
  micButton: {
    backgroundColor: '#DC2626', width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  micLabel: { color: '#6B7280', fontSize: 13, marginTop: 8, fontWeight: '500' },
  stopButton: { alignItems: 'center' },
  stopInner: {
    backgroundColor: '#EF4444', width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
  },
  stopLabel: { color: '#EF4444', fontSize: 14, marginTop: 8, fontWeight: 'bold' },
  statusBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFBEB', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12,
  },
  statusText: { color: '#92400E', fontWeight: '600', fontSize: 14 },
  speakingButton: {
    backgroundColor: '#10B981', width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  speakingLabel: { color: '#10B981', fontSize: 14, marginTop: 8, fontWeight: 'bold' },
});
