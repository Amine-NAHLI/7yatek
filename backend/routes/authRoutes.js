const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const router = express.Router();

// Clé secrète pour le JWT
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_lifeguard_key_2026';

// ==========================================
// ROUTE : INSCRIPTION (Sign Up)
// ==========================================
router.post('/register', async (req, res) => {
  const { 
    email, password, name, phone, gender, dateOfBirth, 
    bloodType, medications, chronicDiseases, allergies, 
    emergencyContactName, emergencyContactRelation, emergencyContactPhone 
  } = req.body;

  try {
    // 1. Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Un utilisateur avec cet email existe déjà.' });
    }

    // 2. Crypter le mot de passe (Hachage)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Créer l'utilisateur dans la base Neon DB
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
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
      }
    });

    // 4. Générer le Token d'accès (JWT)
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ 
      message: 'Compte créé avec succès', 
      token, 
      user: { id: newUser.id, email: newUser.email, name: newUser.name } 
    });
  } catch (error) {
    console.error("Erreur Inscription:", error);
    res.status(500).json({ error: 'Erreur critique lors de la création du compte.' });
  }
});

// ==========================================
// ROUTE : CONNEXION (Sign In)
// ==========================================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Chercher l'utilisateur par email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    // 2. Vérifier que le mot de passe correspond au hash crypté
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Mot de passe incorrect.' });
    }

    // 3. Générer le Token d'accès (JWT)
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({ 
      message: 'Connexion réussie', 
      token, 
      user: { id: user.id, email: user.email, name: user.name } 
    });
  } catch (error) {
    console.error("Erreur Connexion:", error);
    res.status(500).json({ error: 'Erreur critique lors de la connexion.' });
  }
});

module.exports = router;
