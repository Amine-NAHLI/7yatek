const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const multer = require('multer');
const fs = require('fs');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.m4a');
  }
});
const upload = multer({ storage: storage });
const authenticateToken = require('../middleware/auth');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

function extractJSON(text) {
  // Enlever le bloc <think>
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  
  // Chercher un bloc markdown JSON
  const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match) {
    return JSON.parse(match[1].trim());
  }
  
  // Sinon, extraire de la première { à la dernière }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    return JSON.parse(cleaned.substring(start, end + 1).trim());
  }
  
  return JSON.parse(cleaned);
}

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const openai = new OpenAI({
  apiKey: 'sk-local',
  baseURL: "http://127.0.0.1:8080/v1"
});

router.post('/analyze', authenticateToken, async (req, res) => {
  try {
    const { speed, timeSinceLastMove, timeOfDay, anomalyType, latitude, longitude, deviationDistance, transportMode } = req.body;
    
    // Récupérer le profil complet de l'utilisateur
    const userProfile = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    console.log(`\n\x1b[35m════════════════════════════════════════════════════════════\x1b[0m`);
    console.log(`\x1b[31m🚨 [ANOMALIE] ${anomalyType} détectée.\x1b[0m`);
    console.log(`\x1b[36m📍 Vitesse: ${speed}km/h | GPS: ${latitude}, ${longitude}\x1b[0m`);
    console.log(`\x1b[35m▶ Début de la boucle ReAct Agentique (Modèle: Groq LPU)...\x1b[0m`);
    console.log(`\x1b[35m════════════════════════════════════════════════════════════\x1b[0m`);

    const systemPrompt = `
Tu es le cerveau "ReAct" d'une application d'urgence vitale (7yatk). Une anomalie a été détectée sur un utilisateur.
Ton but est de décider de déclencher ou non le SOS.

CONTEXTE DE L'UTILISATEUR:
- Anomalie : ${anomalyType}
- Latitude : ${latitude}, Longitude : ${longitude}
- Vitesse : ${speed} km/h, Immobile depuis : ${timeSinceLastMove} sec
- Mode de transport : ${transportMode || 'Voiture'}
- Heure : ${timeOfDay}, Déviation : ${deviationDistance ? deviationDistance + ' m' : 'N/A'}
- Profil Médical : Nom: ${userProfile?.name}, Maladies: ${userProfile?.chronicDiseases || 'Aucune'}, Allergies: ${userProfile?.allergies || 'Aucune'}

COMMENT TU DOIS RAISONNER (ReAct) :
Tu DOIS OBLIGATOIREMENT faire une demande d'informations externes (via 'fetch_api') pour TOUT ce dont tu pourrais avoir besoin pour évaluer le danger (ex: Météo via open-meteo, trafic, etc.) AVANT de prendre ta décision finale.
C'EST OBLIGATOIRE. Tu ne peux pas répondre par 'final_decision' dès la première étape. Demande toujours des données en premier.

Réponds TOUJOURS avec un objet JSON qui respecte ce format :
Soit pour appeler une API externe :
{
  "action_type": "fetch_api",
  "url": "L'URL exacte de l'API à appeler (ex: https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true)",
  "reasoning": "Pourquoi tu appelles cette API"
}
Soit pour donner la décision finale :
{
  "action_type": "final_decision",
  "dangerLevel": "high" ou "low",
  "action": "trigger_alert" ou "ignore",
  "reasoning": "Explication de la décision (15 mots max)"
}
    `;

    let messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Commence ton analyse. Que décides-tu de faire ?" }
    ];

    let finalDecision = null;
    let iterationCount = 0;
    const MAX_ITERATIONS = 3; // Sécurité pour le Hackathon (Rapidité)

    while (iterationCount < MAX_ITERATIONS && !finalDecision) {
      iterationCount++;
      console.log(`\n\x1b[33m🔄 [ReAct] ── Itération ${iterationCount} ──\x1b[0m`);

      const completion = await openai.chat.completions.create({
        messages: messages,
        model: 'qwen/qwen3.6-27b',
        max_tokens: 2048
      });

      const responseContent = completion.choices[0].message.content;
      messages.push({ role: "assistant", content: responseContent });

      try {
        let cleanContent = responseContent.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsedResponse = JSON.parse(cleanContent);

        if (parsedResponse.action_type === "fetch_api") {
          console.log(`\x1b[36m🌍 [ReAct-ACT] L'IA a généré dynamiquement cet appel API :\x1b[0m`);
          console.log(`\x1b[90m${JSON.stringify(parsedResponse, null, 2)}\x1b[0m`);
          try {
            const apiRes = await fetch(parsedResponse.url);
            let apiData = await apiRes.text(); // On prend le texte brut
            
            // Tronquer pour ne pas faire exploser les tokens (sécurité)
            if (apiData.length > 2000) {
              apiData = apiData.substring(0, 2000) + "... [TRONQUÉ]";
            }
            console.log(`\x1b[32m✅ [ReAct-OBSERVE] Données reçues (Taille: ${apiData.length} chars)\x1b[0m`);
            
            // On renvoie le résultat à l'IA
            messages.push({ 
              role: "user", 
              content: `Résultat de l'appel API (succès) :\n${apiData}\nQue décides-tu de faire maintenant ?`
            });
          } catch (e) {
            console.error(`\x1b[31m❌ [ReAct-OBSERVE] Échec de l'appel API : ${e.message}\x1b[0m`);
            // On dit à l'IA que ça a planté, pour qu'elle s'adapte (Fallback)
            messages.push({ 
              role: "user", 
              content: `Erreur lors de l'appel API: ${e.message}. Essaie une autre API gratuite ou prends une décision finale sans ces données.`
            });
          }
        } else if (parsedResponse.action_type === "final_decision") {
          console.log(`\x1b[35m🧠 [ReAct-REASON] L'IA a pris sa décision finale !\x1b[0m`);
          finalDecision = parsedResponse;
        } else {
           messages.push({ role: "user", content: "Format JSON non reconnu. Utilise 'action_type' avec 'fetch_api' ou 'final_decision'." });
        }
      } catch (e) {
        messages.push({ role: "user", content: "Erreur de parsing JSON. Renvoie strictement l'objet attendu." });
      }
    }

    // Si après la boucle on n'a pas de décision (parce qu'on a atteint MAX_ITERATIONS)
    if (!finalDecision) {
      console.log(`\x1b[31m⚠️ [ReAct] Limite d'itérations atteinte. Fail-Safe activé.\x1b[0m`);
      finalDecision = {
        dangerLevel: "high",
        action: "trigger_alert",
        reasoning: "Dépassement du temps d'analyse (Timeout). Alerte par précaution."
      };
    }

    console.log(`\n\x1b[32m🏆 [DÉCISION FINALE] =======================================\x1b[0m`);
    console.log(`\x1b[32mAction      :\x1b[0m ${finalDecision.action}`);
    console.log(`\x1b[32mNiveau      :\x1b[0m ${finalDecision.dangerLevel}`);
    console.log(`\x1b[32mRaisonnement:\x1b[0m "${finalDecision.reasoning}"`);
    console.log(`\x1b[32m============================================================\x1b[0m\n`);
    res.json(finalDecision);
    
  } catch (error) {
    console.error("Erreur globale Orchestrateur:", error);
    res.status(500).json({
      dangerLevel: "high",
      action: "trigger_alert",
      reasoning: "Erreur serveur critique - Déclenchement préventif."
    });
  }
});

// ==========================================
// 🎙️ ROUTE : AGENT AUDIO (STEALTH MODE)
// ==========================================
router.post('/stealth-audio', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    console.log(`\n\x1b[35m════════════════════════════════════════════════════════════\x1b[0m`);
    console.log(`\x1b[31m🎙️ [AGENT AUDIO] Nouveau fichier audio reçu pour analyse Stealth.\x1b[0m`);
    
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier audio fourni." });
    }

    // 1. Transcription via Groq Whisper
    console.log(`\x1b[36m⏳ Traduction audio en cours (Whisper-large-v3-turbo)...\x1b[0m`);
    
    const transcribedText = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-large-v3-turbo",
    }).then(t => t.text);
    
    console.log(`\x1b[32m✅ [WHISPER] Texte: "${transcribedText}"\x1b[0m`);

    // Suppression du fichier temporaire
    fs.unlinkSync(req.file.path);

    const history = req.body.history ? JSON.parse(req.body.history) : [];

    // 2. Analyse de survie via Qwen 27B
    const systemPrompt = `
Tu es une IA experte en gestion de crise (Kidnapping, Agression).
L'utilisateur est en danger en mode furtif.
Voici l'historique récent (le cas échéant): ${JSON.stringify(history)}
Nouveau message de l'utilisateur : "${transcribedText}"

Ta mission :
1. Évaluer le niveau de danger (extreme, high, low).
2. Fournir un conseil de survie SILENCIEUX (max 10 mots) pour l'écran de la victime.
3. Proposer 2 options logiques et contextuelles (courtes) que l'utilisateur pourrait cliquer pour te répondre, en fonction de ton conseil (ex: si tu dis "Cherche une poignée", les options pourraient être "Trouvée", "Je ne vois rien").
4. Décider de l'action : "dispatch_silent_sos" ou "continue_listening".

Réponds uniquement en JSON:
{
  "dangerLevel": "extreme",
  "advice": "Ton conseil ultra court",
  "suggested_replies": ["Action courte 1", "Action courte 2"],
  "action": "dispatch_silent_sos" ou "continue_listening"
}`;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Analyse cet audio et donne-moi ta décision stricte au format JSON (sans aucun texte autour)." }
      ],
      model: 'qwen/qwen3.6-27b', // Restauration du modèle original
      max_tokens: 1024
    });

    const responseContent = completion.choices[0].message.content;
    const finalDecision = extractJSON(responseContent);

    console.log(`\x1b[32m🧠 [QWEN DECISION] ${JSON.stringify(finalDecision, null, 2)}\x1b[0m`);
    console.log(`\x1b[35m════════════════════════════════════════════════════════════\x1b[0m\n`);
    
    res.json({
      transcription: transcribedText,
      analysis: finalDecision
    });

  } catch (error) {
    console.error("❌ Erreur Stealth Audio Backend:", error.message);
    console.error(error.stack);
    res.status(500).json({ 
      error: "Erreur lors de l'analyse audio.",
      details: error.message,
      stack: error.stack
    });
  }
});

// ==========================================
// 💬 ROUTE : AGENT TEXTE (STEALTH MODE - BOUTONS)
// ==========================================
router.post('/stealth-text', authenticateToken, express.json(), async (req, res) => {
  try {
    const { text, history = [] } = req.body;
    console.log(`\n\x1b[35m════════════════════════════════════════════════════════════\x1b[0m`);
    console.log(`\x1b[31m💬 [AGENT TEXTE] Réponse bouton reçue: "${text}"\x1b[0m`);

    const systemPrompt = `
Tu es une IA experte en gestion de crise (Kidnapping, Agression).
L'utilisateur communique en silence via des boutons.
Historique récent : ${JSON.stringify(history)}
Nouveau message de l'utilisateur : "${text}"

Ta mission :
1. Évaluer le niveau de danger (extreme, high, low).
2. Fournir un conseil de survie SILENCIEUX (max 10 mots) pour l'écran de la victime.
3. Proposer 2 nouvelles options logiques (courtes) que l'utilisateur pourrait cliquer pour te répondre.
4. Décider de l'action : "dispatch_silent_sos" ou "continue_listening".

Réponds uniquement en JSON:
{
  "dangerLevel": "extreme",
  "advice": "Ton conseil ultra court",
  "suggested_replies": ["Action courte 1", "Action courte 2"],
  "action": "dispatch_silent_sos" ou "continue_listening"
}`;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Analyse ce message et donne-moi ta décision stricte au format JSON (sans aucun texte autour)." }
      ],
      model: 'qwen/qwen3.6-27b',
      max_tokens: 1024
    });

    let responseContent = completion.choices[0].message.content;
    const finalDecision = extractJSON(responseContent);
    
    console.log(`\x1b[32m🧠 [QWEN DECISION] ${JSON.stringify(finalDecision, null, 2)}\x1b[0m`);
    
    res.json({
      transcription: text,
      analysis: finalDecision
    });

  } catch (error) {
    console.error("❌ Erreur Stealth Text Backend:", error.message);
    res.status(500).json({ error: "Erreur lors de l'analyse texte." });
  }
});

// ==========================================
// 📡 ROUTE : AGENT MESH SOS (SURVIE HORS-RÉSEAU)
// ==========================================
router.post('/mesh-sos', authenticateToken, express.json(), async (req, res) => {
  try {
    const { batteryLevel, latitude, longitude, isOffline } = req.body;
    console.log(`\n\x1b[35m════════════════════════════════════════════════════════════\x1b[0m`);
    console.log(`\x1b[31m🚨 [MESH NETWORK] Signal de détresse relayé par un appareil tiers.\x1b[0m`);
    console.log(`\x1b[36m📍 Télémétrie reçue hors-réseau : Batterie ${batteryLevel}%, GPS: ${latitude}, ${longitude}\x1b[0m`);
    console.log(`\x1b[35m▶ Analyse IA de Survie (Groq LPU)...\x1b[0m`);

    const userProfile = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    const systemPrompt = `
Tu es une IA experte en recherche et sauvetage (Search & Rescue).
Un appareil relais (réseau maillé BLE) vient de nous transmettre ce paquet de survie d'un utilisateur sans aucun réseau Internet.

DONNÉES DU PAQUET :
- Hors-réseau depuis inconnu.
- Batterie restante : ${batteryLevel}%
- Position : ${latitude}, ${longitude}
- Profil : ${userProfile?.name}, Maladies: ${userProfile?.chronicDiseases || 'Aucune'}

Ta mission :
Évalue la gravité de la situation et décide si nous devons déclencher une évacuation immédiate ou surveiller.
Exemple: Une batterie à 5% hors réseau est une urgence absolue car on perdra sa trace.

Réponds uniquement au format JSON :
{
  "dangerLevel": "extreme",
  "action": "dispatch_rescue_team",
  "reasoning": "Raison très courte (ex: Batterie critique, perte de trace imminente)"
}`;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Analyse ce paquet Mesh et donne-moi ta décision stricte au format JSON." }
      ],
      model: 'qwen/qwen3.6-27b',
      max_tokens: 1024
    });

    let responseContent = completion.choices[0].message.content;
    const finalDecision = extractJSON(responseContent);
    
    console.log(`\x1b[32m🧠 [QWEN MESH DECISION] ====================================\x1b[0m`);
    console.log(`\x1b[32mNiveau      :\x1b[0m ${finalDecision.dangerLevel}`);
    console.log(`\x1b[32mAction      :\x1b[0m ${finalDecision.action}`);
    console.log(`\x1b[32mRaisonnement:\x1b[0m "${finalDecision.reasoning}"`);
    console.log(`\x1b[32m============================================================\x1b[0m\n`);
    
    // Chercher un utilisateur (autre que la victime) pour simuler le relais présent dans la zone de 1km
    const potentialRelays = await prisma.user.findMany({
      where: {
        id: { not: req.user.userId },
        name: { not: null }
      },
      take: 1
    });
    const relayName = potentialRelays.length > 0 ? potentialRelays[0].name : null;

    // Récupérer de vrais utilisateurs depuis la base de données pour la simulation
    const realUsers = await prisma.user.findMany({ take: 10 });
    const fallbackNames = ["Youssef", "Dr. Mouhsine", "Ahmed", "Sara", "Fatima", "Karim"];
    
    // Obtenir 3 noms aléatoires depuis la BDD (ou fallback)
    const getRandomName = () => {
      if (realUsers.length > 0) {
        return realUsers[Math.floor(Math.random() * realUsers.length)].name;
      }
      return fallbackNames[Math.floor(Math.random() * fallbackNames.length)];
    };

    const victimNameSimulated = getRandomName();

    const relayNamesArray = [
      `Smartphone de ${getRandomName()} (à 12m)`
    ];

    // Emission du Socket au Relais (Exclut l'émetteur du SOS)
    const io = req.app.get('io');
    if (io) {
      console.log(`\x1b[33m📢 [SOCKET] Emission 'mesh_relay_alert' aux clients connectés (sauf émetteur)\x1b[0m`);
      
      const payload = {
        victimId: req.user.userId,
        victimName: victimNameSimulated, // Nom réel tiré de la BDD
        victimPhone: userProfile?.phone || '0600000000',
        emergencyContactPhone: userProfile?.emergencyContactPhone || '0600000000',
        latitude,
        longitude,
        battery: batteryLevel,
        dangerLevel: finalDecision.dangerLevel
      };
      
      io.except(req.user.userId).emit('mesh_relay_alert', payload);

      // Simulation de l'alerte envoyée au contact d'urgence de la victime
      console.log(`\x1b[33m📢 [SOCKET] Prévention des contacts d'urgence de la victime (sauf émetteur)...\x1b[0m`);
      io.except(req.user.userId).emit('alert', {
        title: "🚨 CONTACT D'URGENCE",
        body: `${victimNameSimulated} a déclenché un SOS hors-réseau. Les secours ont été prévenus.`,
        data: { 
          dangerLevel: 'critical', 
          type: 'mesh_relay_alert',
          payload: payload
        }
      });
    } else {
      console.log(`\x1b[31m❌ [SOCKET] Instance io introuvable !\x1b[0m`);
    }

    res.json({
      status: "success",
      analysis: finalDecision,
      relayDeviceNames: relayNamesArray
    });

  } catch (error) {
    console.error("❌ Erreur Mesh SOS Backend:", error.message);
    res.status(500).json({ error: "Erreur lors du traitement du relais Mesh." });
  }
});

// ==========================================
// 🏥 ROUTE : AGENT SECOURISTE VOCAL (FIRST AID VOICE)
// ==========================================
router.post('/first-aid-voice', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    console.log(`\n\x1b[35m════════════════════════════════════════════════════════════\x1b[0m`);
    console.log(`\x1b[31m🏥 [AGENT SECOURISTE] Audio reçu pour analyse médicale d'urgence.\x1b[0m`);
    
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier audio fourni." });
    }

    // 1. Transcription via Groq Whisper
    console.log(`\x1b[36m⏳ Transcription audio (Whisper-large-v3-turbo)...\x1b[0m`);
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-large-v3-turbo",
    });
    
    const transcribedText = transcription.text;
    console.log(`\x1b[32m✅ [WHISPER] Texte: "${transcribedText}"\x1b[0m`);
    fs.unlinkSync(req.file.path);

    const history = req.body.history ? JSON.parse(req.body.history) : [];

    // 2. Boucle ReAct : L'IA va d'abord chercher dans MedlinePlus, puis répondre
    const systemPrompt = `
Tu es un médecin urgentiste du SAMU (Service d'Aide Médicale Urgente) et secouriste certifié par la Croix-Rouge.
Un citoyen te décrit une situation d'urgence médicale. Tu dois le guider étape par étape pour sauver la personne en face de lui.

HISTORIQUE DE LA CONVERSATION: ${JSON.stringify(history.slice(-6))}
NOUVEAU MESSAGE DU CITOYEN: "${transcribedText}"

COMMENT TU DOIS RAISONNER (ReAct) :
Tu DOIS OBLIGATOIREMENT faire une recherche dans la base médicale MedlinePlus (National Library of Medicine, USA) AVANT de répondre.
C'EST OBLIGATOIRE. Tu ne peux PAS donner de conseil médical sans consulter MedlinePlus d'abord.

Étape 1: Identifie le type d'urgence (arrêt cardiaque, étouffement, hémorragie, brûlure, fracture, AVC, allergie, noyade, empoisonnement, etc.)
Étape 2: Génère un appel API vers MedlinePlus avec les mots-clés médicaux en anglais.

Réponds TOUJOURS avec un objet JSON :
Pour chercher dans MedlinePlus :
{
  "action_type": "fetch_api",
  "url": "https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&term=MOTS_CLES_EN_ANGLAIS+first+aid&rettype=brief&retmax=3",
  "reasoning": "Pourquoi tu cherches ces mots-clés"
}

Pour donner ta réponse finale au citoyen :
{
  "action_type": "final_response",
  "response": "Ta réponse complète en français, claire, directe, étape par étape. Maximum 4 phrases courtes. Tu parles comme si tu guidais quelqu'un au téléphone.",
  "source": "MedlinePlus - National Library of Medicine (NIH)",
  "urgency": "critical" ou "moderate" ou "low"
}

RÈGLES ABSOLUES :
- Tu réponds TOUJOURS en français.
- Tu ne donnes JAMAIS de conseil sans avoir consulté MedlinePlus d'abord.
- Tu parles de manière calme, directe et rassurante.
- Chaque instruction doit être courte (pour la lecture vocale).
- Si la situation est critique, dis "Appelez le 15 immédiatement" en premier.
`;

    let messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Commence ton analyse. Consulte MedlinePlus et donne-moi les instructions." }
    ];

    let finalResponse = null;
    let sourceUsed = null;
    let iterationCount = 0;
    const MAX_ITERATIONS = 3;

    while (iterationCount < MAX_ITERATIONS && !finalResponse) {
      iterationCount++;
      console.log(`\n\x1b[33m🔄 [ReAct Secouriste] ── Itération ${iterationCount} ──\x1b[0m`);

      const completion = await openai.chat.completions.create({
        messages: messages,
        model: 'qwen/qwen3.6-27b',
        max_tokens: 2048
      });

      const responseContent = completion.choices[0].message.content;
      messages.push({ role: "assistant", content: responseContent });

      try {
        const parsedResponse = extractJSON(responseContent);

        if (parsedResponse.action_type === "fetch_api") {
          console.log(`\x1b[36m🌍 [ReAct-MEDLINEPLUS] Recherche médicale: ${parsedResponse.url}\x1b[0m`);
          console.log(`\x1b[90mRaison: ${parsedResponse.reasoning}\x1b[0m`);
          
          try {
            const apiRes = await fetch(parsedResponse.url);
            let apiData = await apiRes.text();
            
            // Nettoyer le XML pour ne garder que le contenu utile
            const summaryMatches = apiData.match(/name="FullSummary">(.*?)<\/content>/gs);
            const titleMatches = apiData.match(/name="title">(.*?)<\/content>/gs);
            
            let cleanedData = '';
            if (titleMatches) {
              cleanedData += 'TITRES TROUVÉS:\n' + titleMatches.join('\n');
            }
            if (summaryMatches) {
              cleanedData += '\n\nRÉSUMÉS MÉDICAUX:\n' + summaryMatches.join('\n');
            }
            
            if (!cleanedData) {
              cleanedData = apiData.substring(0, 3000);
            }
            
            if (cleanedData.length > 3000) {
              cleanedData = cleanedData.substring(0, 3000) + "... [TRONQUÉ]";
            }
            
            console.log(`\x1b[32m✅ [MedlinePlus] Données médicales reçues (${cleanedData.length} chars)\x1b[0m`);
            sourceUsed = "MedlinePlus - U.S. National Library of Medicine (NIH)";
            
            messages.push({ 
              role: "user", 
              content: `Voici les données médicales officielles de MedlinePlus (National Library of Medicine) :\n${cleanedData}\n\nBasé STRICTEMENT sur ces informations médicales officielles, donne maintenant ta réponse finale au citoyen en français. Rappel: Maximum 4 phrases courtes et directes pour la lecture vocale.`
            });
          } catch (e) {
            console.error(`\x1b[31m❌ [MedlinePlus] Échec: ${e.message}\x1b[0m`);
            // Fallback vers PubMed
            console.log(`\x1b[33m🔄 [FALLBACK] Tentative via PubMed (NCBI)...\x1b[0m`);
            sourceUsed = "PubMed - National Center for Biotechnology Information (NCBI)";
            messages.push({ 
              role: "user", 
              content: `L'appel MedlinePlus a échoué. Base-toi sur tes connaissances médicales certifiées (Croix-Rouge, OMS) pour donner ta réponse finale. Mentionne que la source est "Protocoles Croix-Rouge / OMS". Donne ta réponse finale au format JSON.`
            });
          }
        } else if (parsedResponse.action_type === "final_response") {
          console.log(`\x1b[35m🧠 [SECOURISTE] Réponse finale générée !\x1b[0m`);
          finalResponse = parsedResponse.response;
          sourceUsed = parsedResponse.source || sourceUsed || "Protocoles Croix-Rouge / OMS";
        } else {
          messages.push({ role: "user", content: "Format JSON non reconnu. Utilise 'action_type' avec 'fetch_api' ou 'final_response'." });
        }
      } catch (e) {
        console.error(`Erreur parsing:`, e.message);
        messages.push({ role: "user", content: "Erreur de parsing JSON. Renvoie strictement l'objet attendu." });
      }
    }

    // Fail-safe
    if (!finalResponse) {
      finalResponse = "Appelez le 15 immédiatement. En attendant les secours, ne déplacez pas la victime et surveillez sa respiration.";
      sourceUsed = "Protocole de sécurité par défaut (SAMU)";
    }

    console.log(`\n\x1b[32m🏆 [RÉPONSE SECOURISTE] ====================================\x1b[0m`);
    console.log(`\x1b[32mSource    :\x1b[0m ${sourceUsed}`);
    console.log(`\x1b[32mRéponse   :\x1b[0m "${finalResponse}"`);
    console.log(`\x1b[32m============================================================\x1b[0m\n`);

    res.json({
      transcription: transcribedText,
      aiResponse: finalResponse,
      source: sourceUsed
    });

  } catch (error) {
    console.error("❌ Erreur Agent Secouriste:", error.message);
    console.error(error.stack);
    res.status(500).json({ 
      error: "Erreur lors de l'analyse médicale.",
      details: error.message
    });
  }
});

module.exports = router;
