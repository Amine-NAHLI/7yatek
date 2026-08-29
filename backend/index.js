const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
app.use(cors());
app.use(express.json());

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

// Stocker l'instance IO dans app pour l'utiliser dans les routes
app.set('io', io);

// Gestion des connexions WebSocket
io.on('connection', (socket) => {
  console.log('🔗 Nouveau client connecté:', socket.id);

  // Un utilisateur s'enregistre avec son ID pour recevoir des alertes personnelles
  socket.on('register', (userId) => {
    socket.join(userId);
    console.log(`👤 Utilisateur ${userId} a rejoint sa room perso.`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Client déconnecté:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;

// Enregistrement des API d'authentification
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

const orchestratorRoutes = require('./routes/orchestratorRoutes');
app.use('/api/orchestrator', orchestratorRoutes);

app.get('/', (req, res) => {
  res.json({ message: "Le Master Agent (Backend) est en ligne !" });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend démarré sur le port ${PORT} et accessible sur le réseau (0.0.0.0)`);
});
