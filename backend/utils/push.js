const { Expo } = require('expo-server-sdk');

// Crée une nouvelle instance du SDK Expo
let expo = new Expo();

/**
 * Envoie une notification push à un token spécifique
 * @param {string} pushToken - Le token Expo du téléphone
 * @param {string} title - Le titre de la notification
 * @param {string} body - Le corps du message
 * @param {object} data - Données invisibles supplémentaires
 */
const sendPushNotification = async (pushToken, title, body, data = {}) => {
  // Vérifie que le token est un Expo push token valide
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Le push token ${pushToken} n'est pas valide.`);
    return;
  }

  // Crée le message
  const messages = [{
    to: pushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  }];

  // L'API Expo gère l'envoi par lots (chunks)
  let chunks = expo.chunkPushNotifications(messages);
  let tickets = [];
  
  for (let chunk of chunks) {
    try {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("Erreur lors de l'envoi de la notification:", error);
    }
  }
  
  return tickets;
};

module.exports = {
  sendPushNotification
};
