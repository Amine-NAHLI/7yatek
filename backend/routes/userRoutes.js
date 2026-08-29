const express = require('express');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const router = express.Router();

// ==========================================
// ROUTE : RÉCUPÉRER LE PROFIL (GET)
// ==========================================
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    // L'ID utilisateur est extrait du token JWT par le middleware
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        bloodType: true,
        medications: true,
        chronicDiseases: true,
        allergies: true,
        emergencyContactName: true,
        emergencyContactRelation: true,
        emergencyContactPhone: true,
        createdAt: true,
        // On ne sélectionne pas le mot de passe
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Erreur Fetch Profile:", error);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil.' });
  }
});

// ==========================================
// ROUTE : METTRE À JOUR LE PROFIL (PUT)
// ==========================================
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      name, phone, gender, dateOfBirth, bloodType,
      medications, chronicDiseases, allergies,
      emergencyContactName, emergencyContactRelation, emergencyContactPhone
    } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        phone,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        bloodType,
        medications,
        chronicDiseases,
        allergies,
        emergencyContactName,
        emergencyContactRelation,
        emergencyContactPhone
      },
      select: {
        id: true,
        email: true,
        name: true,
        // etc.
      }
    });

    res.status(200).json({ message: 'Profil mis à jour avec succès', user: updatedUser });
  } catch (error) {
    console.error("Erreur Update Profile:", error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil.' });
  }
});

// ==========================================
// ROUTE : ENREGISTRER LE PUSH TOKEN
// ==========================================
router.put('/push-token', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { token } = req.body;

    await prisma.user.update({
      where: { id: userId },
      data: { pushToken: token }
    });

    res.status(200).json({ message: 'Push token enregistré avec succès' });
  } catch (error) {
    console.error("Erreur Push Token:", error);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement du token push.' });
  }
});

// ==========================================
// ROUTE : TESTER UNE NOTIFICATION PUSH VIA WEBSOCKET
// ==========================================
router.post('/test-notification', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { title, body } = req.body;
    
    console.log(`\n🔔 Bouton TEST cliqué par l'utilisateur ${userId} !`);
    
    // Récupérer l'instance de socket.io attachée à l'application
    const io = req.app.get('io');
    
    if (io) {
      console.log(`Envoi de l'alerte via WebSocket...`);
      // Pour être 100% sûr que le téléphone le reçoit (même si l'enregistrement de l'ID a échoué),
      // on envoie (broadcast) l'alerte à TOUTES les connexions (io.emit au lieu de io.to)
      io.emit('alert', {
        title: title || "🚨 Alerte IA",
        body: body || "Ceci est une alerte en temps réel (WebSocket) !",
        data: { dangerLevel: 'high' }
      });
      return res.status(200).json({ message: "Alerte WebSocket envoyée !" });
    } else {
      console.log(`❌ ERREUR: io n'est pas défini`);
      return res.status(500).json({ error: "Serveur WebSocket non initialisé." });
    }
  } catch (error) {
    console.error("Erreur Envoi WebSocket:", error);
    res.status(500).json({ error: "Erreur lors de l'envoi de la notification." });
  }
});

// ==========================================
// ROUTE : DÉCLENCHER UNE ALERTE SOS (DASHBOARD)
// ==========================================
router.post('/sos-alert', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log(`\n🚨 SOS MANUEL déclenché par l'utilisateur ${userId} !`);
    
    const io = req.app.get('io');
    
    if (io) {
      // Broadcast l'urgence absolue à tout le monde
      io.emit('alert', {
        title: "🆘 URGENCE ABSOLUE",
        body: "Alerte SOS déclenchée manuellement depuis le Dashboard !",
        data: { dangerLevel: 'critical', type: 'sos_manual' }
      });
      return res.status(200).json({ message: "SOS WebSocket envoyé avec succès !" });
    } else {
      console.log(`❌ ERREUR: io n'est pas défini lors du SOS`);
      return res.status(500).json({ error: "Serveur WebSocket non initialisé." });
    }
  } catch (error) {
    console.error("Erreur Envoi SOS:", error);
    res.status(500).json({ error: "Erreur lors du déclenchement du SOS." });
  }
});

module.exports = router;
