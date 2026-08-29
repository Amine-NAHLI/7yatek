import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://192.168.1.188:3000'; // IP du backend

// Configuration de la manière dont les notifications s'affichent quand l'app est ouverte
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let socket = null;

// Initialiser les notifications locales et Socket.io
export async function initializeWebSocketPush() {
  // 1. Demander la permission pour les notifications locales (vibra/son)
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('Permission refusée pour les notifications locales.');
    return;
  }

  // Configuration de la chaîne de notification (requis sur Android 8+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // 2. Initialiser la connexion WebSocket si ce n'est pas déjà fait
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    socket.on('connect', async () => {
      console.log('✅ Connecté au serveur WebSocket depuis l\'app');
      // On s'enregistre avec notre userId pour que le serveur nous trouve
      const userToken = await AsyncStorage.getItem('userToken');
      if (userToken) {
        // En vrai il faudrait décoder le JWT pour avoir le userId,
        // Mais pour simplifier, on envoie le token au backend ou on récupère d'abord le userId
        // Ici, on va d'abord récupérer le profil pour obtenir l'ID
        try {
          const response = await fetch(`${SOCKET_URL}/api/users/profile`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
          });
          const data = await response.json();
          if (data && data.id) {
            socket.emit('register', data.id);
            socket.userId = data.id; // Store for frontend checks
          }
        } catch(e) {
          console.log("Erreur d'enregistrement WebSocket", e);
        }
      }
    });

    // 3. Écouter les événements d'alerte venant du serveur
    socket.on('alert', async (data) => {
      console.log("🚨 Alerte WebSocket reçue !", data);
      // Déclencher instantanément une vraie notification locale (vibreur + bannière)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title || 'Alerte Système',
          body: data.body || 'Nouveau message.',
          data: data.data || {},
          sound: true,
        },
        trigger: null, // trigger: null = immédiat
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ Déconnecté du serveur WebSocket');
    });
  }
}

// Fonction utilitaire pour déconnecter si besoin
export function disconnectWebSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}

