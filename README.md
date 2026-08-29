# Projet : 7YATEK

*Ce document servira à structurer et à conserver l'idée finale complète du projet au fur et à mesure de nos discussions.*

**⚠️ RÈGLE D'OR (Mise à jour) :**
Après chaque modification importante ou ajout d'une nouvelle fonctionnalité/Agent, ce document **doit obligatoirement être mis à jour** pour conserver l'architecture exacte du projet.


## Technologies et Plateforme
- **Plateforme :** Application mobile
- **Framework :** React Native
- **Environnement de développement :** Expo Go
- **Langage principal :** JavaScript (JS)
- **Base de données :** Neon DB (PostgreSQL Serverless)

## Structure du Projet
- **Dossier `mobile/`** : Contiendra le code de l'application mobile (React Native/Expo).
- **Dossier `backend/`** : Contiendra l'API/le serveur qui communiquera avec l'application.

## Parcours Utilisateur & Fonctionnalités (User Flow)
1. **Écran de Bienvenue :** À l'ouverture de l'application, l'utilisateur est accueilli par une page de présentation/bienvenue.
2. **Authentification :** Depuis la page de bienvenue, un bouton ou une action redirige l'utilisateur vers une interface lui permettant de :
   - **S'inscrire** (Création de compte - Parcours en 6 étapes) :
     - *Page 1 :* Nom, Prénom, Numéro de téléphone, Email, Mot de passe.
     - *Page 2 :* Sexe, Date de naissance.
     - *Page 3 :* Groupe sanguin, Prise de médicaments (Si oui : traitement à vie ou durée précise ? Laquelle ?).
       *(Note UX : La saisie des médicaments se fait via une barre de recherche avec auto-complétion connectée à l'API openFDA/RxNorm. Ex : l'utilisateur tape "Doli", l'API suggère instantanément "Doliprane", garantissant ainsi une orthographe exacte pour l'Agent de Compatibilité).*
     - *Page 4 :* Maladies chroniques ou Allergies.
     - *Page 5 :* Contact de secours (Nom, Prénom, Lien de parenté, Numéro de téléphone).
     - *Page 6 :* Autorisations système (Permissions). L'application demandera les accès critiques :
       - **Localisation en temps réel :** Pour envoyer les secours à la position exacte.
       - **Microphone :** Pour permettre à l'Agent Audio de détecter un appel au secours.
       - **Notifications :** Pour alerter l'utilisateur d'un danger ou lui demander "Tout va bien ?".
   - **Se connecter** (Accès à un compte existant)

## Cœur de l'Application : Risk Life Management (IA & Sub-Agents)
L'écran principal et l'architecture de l'application reposent sur un **Agent Principal (Master Agent)** qui orchestre plusieurs **Sous-Agents (Sub-Agents)** spécialisés dans la gestion des risques vitaux. 

**⚠️ Règle d'Or de Fiabilité (Anti-Hallucination) :**
Dans un contexte de santé et de survie, les agents ne doivent **jamais inventer** d'informations. Pour garantir une fiabilité absolue, chaque agent doit s'appuyer exclusivement sur :
- Des **API officielles et certifiées** (Météo, qualité de l'air, bases de données pharmaceutiques).
- Des **Skills / Bases de Connaissances (RAG)** pré-approuvées contenant des informations médicales validées.
- Les données strictes renseignées par l'utilisateur lors de son inscription.

### Sous-Agents (L'Équipe "LifeGuard" Physique & Proactive) :

Pour ce Hackathon, nous nous éloignons totalement du concept de "Médecin Virtuel / Chatbot" (Pédiatrie, Femme enceinte, Généraliste) pour proposer un **Garde du Corps Numérique** qui utilise les capteurs physiques du téléphone et le temps réel.

#### 1. Agent "Trajet Sécurisé" (Night Walk Guardian) 🗺️
**Objectif :** Protéger l'utilisateur lors de ses déplacements à risque (ex: rentrer seul tard le soir).
**Sources de Vérité (API & Capteurs) :**
- **GPS en temps réel** (Positionnement via `expo-location`).
- **Photon/Komoot API & OSRM** (Recherche d'adresse gratuite et Calcul d'itinéraire).
- **Lieux Favoris Intelligents** (Dashboard avec accès rapide).
**Fonctionnement (Workflow) :**
1. L'utilisateur indique sa destination. L'Agent trace l'itinéraire.
2. L'Agent surveille en permanence la vitesse et la distance par rapport au trajet initial (Télémétrie).
3. Si l'utilisateur s'arrête plus de 60 secondes ou dévie de plus de 150 mètres de son trajet, l'Agent ne sonne pas aveuglément : il envoie le contexte au **Cerveau Central (Orchestrateur IA)**.
4. L'Orchestrateur évalue le danger. S'il valide, une notification Push locale critique s'affiche.
5. Sans réponse dans les 10 secondes (ou clic sur "Je vais bien"), l'alarme se déclenche. 10 secondes plus tard, le SOS est déclaré.

#### 2. Agent "Crash Automobile" (Détection de Choc Violent) 🚗
**Objectif :** Sauver la vie de l'utilisateur en cas d'accident de la route lorsqu'il est inconscient.
**Sources de Vérité (Capteurs) :**
- **Accéléromètre & Gyroscope** du téléphone.
- **GPS** (Calcul de la vélocité).
**Fonctionnement (Workflow d'Escalade à 3 niveaux) :**
1. **Détection Physique (Edge AI)** : L'Agent lit l'Accéléromètre 5 fois par seconde et calcule la norme euclidienne 3D (Math.sqrt(x²+y²+z²)) pour isoler la Force G (gravité = 1G). Le seuil de déclenchement `CRASH_THRESHOLD` est paramétré à **4.0 G** (équivalent à un impact majeur). La vitesse est mesurée par `expo-location` (conversion m/s en km/h).
    - *Hackathon Bypass :* Pour permettre les démonstrations physiques devant le jury sans être dans un véhicule, si l'application détecte un choc (téléphone secoué fortement) alors que la vitesse réelle est de 0 km/h, le frontend envoie artificiellement "80 km/h" à l'Orchestrateur. L'IA réagira donc comme s'il s'agissait d'un véritable accident à haute vitesse.
2. **Escalade IA** : Dès que les 4.0 G sont dépassés, l'Agent interroge l'Orchestrateur IA en arrière-plan. Pendant ce temps, il lance une...
2. **Pré-Alerte (5 secondes)** : L'écran devient Orange ("Tout va bien ?") et le téléphone vibre agressivement. L'utilisateur a 5s pour annuler en cas de faux positif.
3. **SOS Local (15 secondes)** : Si aucune annulation, l'écran devient Rouge. Une **sirène** retentit à plein volume et le **flash de la caméra** clignote (mode stroboscope) pour alerter les passants de nuit.
4. **SOS Final (Transmission)** : Si le compte à rebours de 15s expire, l'écran devient Rouge Foncé. Un message d'urgence avec localisation GPS précise est transmis automatiquement aux contacts d'urgence et aux secours via l'API Backend. L'alarme continue de sonner.

#### 3. Agent "SOS Audio / Mode Furtif" 🎙️
**Objectif :** Déclencher une assistance en cas d'agression ou de kidnapping, de manière totalement invisible.
**Sources de Vérité :**
- Enregistrement Audio (`expo-av`).
- Transcription Whisper (Groq) et Analyse LLM (Qwen).
- Contrôle matériel de la luminosité (`expo-brightness`).
**Fonctionnement (Workflow) :**
1. L'utilisateur simule le mot clé (ex: "Écoute-moi").
2. L'application baisse instantanément la luminosité de l'écran à 0% (écran noir absolu) et enregistre silencieusement le son ambiant pendant 8 secondes.
3. L'audio est uploadé via `expo-file-system/legacy` en mode `MULTIPART` vers le backend.
4. L'IA transcrit la voix, analyse le danger, et renvoie un conseil court avec 2 suggestions d'actions.
5. L'écran noir affiche en texte très sombre le conseil, confirme l'envoi du message vocal au contact d'urgence, et propose les boutons interactifs générés par l'IA pour poursuivre la conversation silencieusement, ou ré-enregistrer un nouvel audio. L'historique entier est conservé.

#### 4. Agent "Digital Detox & Sommeil" (Anti-Anxiété Proactif) 🧘
**Objectif :** Analyser les comportements d'utilisation nocturnes pour prévenir l'anxiété et l'insomnie, et agir comme un "Compagnon de Nuit".
**Fonctionnement (Workflow) :**
1. L'agent détecte une utilisation frénétique du téléphone (Scroll continu) à 3h du matin.
2. Il intervient via une notification locale : *"Il est 3h du matin. Tu n'arrives pas à dormir ?"*
3. **Le Compagnon de Sommeil :** Si l'utilisateur clique, l'Agent ouvre une interface apaisante (Mode Sombre strict) et devient un compagnon interactif : il propose un exercice de cohérence cardiaque (respiration guidée de 2 min), lance un bruit blanc (pluie, vagues), ou suggère de baisser la luminosité pour l'aider à retrouver le sommeil en douceur.

#### 5. Agent "Blackout / Mesh SOS" (Survie Hors-Réseau) 📡
**Objectif :** Sauver l'utilisateur lors d'une catastrophe ou d'un accident dans une zone sans Internet (Pas de 4G, pas de Wi-Fi).
**Sources de Vérité :**
- Capteurs réseau du téléphone (détection de zone blanche).
- **Bluetooth Low Energy (BLE)** / Wi-Fi Direct.
**Fonctionnement (Workflow) :**
1. L'Agent détecte la perte totale de réseau. Il bascule le téléphone en mode "Économie d'énergie extrême".
2. Il active le Bluetooth en mode "Émission de détresse" (Beacon) de manière continue.
3. **L'Effet Mesh (Réseau Maillé) :** Si n'importe quel autre utilisateur possédant l'application passe à moins de 50 mètres de la victime, son téléphone captera le signal Bluetooth silencieux. Le téléphone du passant utilisera sa propre connexion Internet pour relayer automatiquement l'alerte SOS au serveur central, sauvant ainsi la vie de la victime hors-réseau.

---

## Architecture Technique Implémentée (Mises à jour récentes)

Afin de conserver une trace des éléments fonctionnels qui ont été codés et intégrés avec succès au projet, voici le statut technique actuel :

### 1. Base de Données & Authentification
- **Neon DB (PostgreSQL) + Prisma :** La table `User` est fully structurée pour contenir toutes les informations vitales (Médicaments, maladies chroniques, allergies, contact d'urgence).
- **Sécurité (JWT) :** Les connexions et inscriptions génèrent un token JWT, qui est stocké de manière persistante sur le téléphone via `AsyncStorage`.

### 2. Interface de Profil (Settings)
- **SettingsScreen :** Une interface dynamique qui utilise le JWT pour interroger le backend (`GET /api/users/profile`) et afficher les informations de l'utilisateur (Initiale, Nom, Email).
- **EditProfileScreen :** Formulaire complet permettant à l'utilisateur de modifier toutes ses données médicales et de secours, synchronisé avec le backend (`PUT /api/users/profile`).

### 3. Système d'Alerte IA Temps Réel & Cerveau Central (Orchestrateur)
Pour garantir que l'application réagisse intelligemment et éviter les fausses alertes, l'architecture est scindée en deux parties : **Edge AI** (Mobile) et **Orchestrateur LLM** (Backend).

**A. Edge AI (Les Capteurs sur le Mobile)**
- Utilisation des capteurs physiques du téléphone (`expo-location`, `expo-sensors`) pour un traitement ultrarapide et économe en batterie.
- Exemples implémentés : Détection d'immobilité prolongée (1 minute) et calcul de déviation du trajet (Haversine Formula > 150m) dans l'Agent Trajet Sécurisé.

**B. Orchestrateur IA Ultime : Agent "ReAct" (Reason & Act)**
- **Technologie :** API **Groq LPU** (compatibilité OpenAI) utilisant le modèle **`qwen/qwen3.6-27b`** pour une vitesse de raisonnement stratosphérique (< 1 seconde).
- **Workflow de Décision ReAct (Boucle d'Essai/Erreur) :**
  1. **L'Analyse (Reason) :** Face à une anomalie (Crash, Immobilité), le Backend donne à l'IA la liberté totale de chercher du contexte. L'IA génère dynamiquement l'URL d'une API publique (ex: Météo, Hôpitaux OSM) dont elle a besoin.
  2. **L'Action (Act) :** Le Backend Node.js exécute aveuglément cette API générée par l'IA et lui renvoie les données (ou l'erreur si l'API ne marche pas).
  3. **L'Observation (Observe) :** Si l'API échoue, l'IA s'adapte et prend sa décision finale sans ces données ou essaie une alternative. Dès qu'elle est prête, elle renvoie la décision `trigger_alert`.
  4. Ce système est ultra-moderne, sans hardcoding de l'outil côté backend, et prouve une véritable intelligence autonome, tout en étant sécurisé par une limite de boucle de 3 itérations (Timeout Fail-Safe) et un nettoyage Markdown pour garantir le parse JSON.

### 4. Pipeline Agent Furtif & Audio (Implémenté)
- **Frontend (Mobile) :** Contrôle matériel avancé avec `expo-brightness` pour simuler un écran éteint. Gestion d'états dynamiques pour maintenir l'historique d'une conversation de crise silencieuse via des boutons textuels générés dynamiquement.
- **Backend (Node.js) :** 
  - Route `/stealth-audio` : Réception du fichier via `multer`, ajout de l'extension `.m4a` obligatoire pour le modèle Whisper. Transcription hyper rapide via `whisper-large-v3-turbo` sur l'API Groq.
  - Route `/stealth-text` : Continuité de la conversation via les boutons de l'interface, maintien de l'historique de conversation (contexte RAG court).
- **Fiabilité JSON :** Implémentation d'un parseur intelligent `extractJSON` côté backend, capable d'ignorer les balises de raisonnement (`<think>...</think>`) des modèles type DeepSeek/Qwen R1 et d'extraire purement le JSON malgré les formattages Markdown capricieux des LLMs.

### 5. Notifications, Hardware & Protocole d'Escalade
- **Notifications Push :** Utilisation de `expo-notifications`.
- **Hardware Control :** Utilisation de `Vibration` (API native), `expo-av` (pour la sirène) et `expo-camera` (pour le flash en mode Torch stroboscopique).
- **Protocole de l'Agent Crash :** 
  - Étape 1 (Pré-Alerte, 5s) : Écran orange "Tout va bien ?" + Vibration intense + Analyse IA en arrière-plan.
  - Étape 2 (SOS, 15s) : Écran rouge + Sirène très forte + Flash stroboscope + Compte à rebours final.
  - Étape 3 (Dispatch) : Contacts d'urgence prévenus (Envoi via API Backend) et localisation GPS transmise.

### 6. Radar Satellite 3D (God's Eye View)
- **Technologie :** `CesiumJS` encapsulé dans une WebApp Vite, rendue sur le téléphone via `react-native-webview`.
- **Interface Épurée (UI/UX) :** Injection dynamique de CSS/JS depuis l'application mobile pour masquer tous les contrôles d'interface du radar et offrir une expérience "Plein Écran" immersive.
- **Marqueur Géographique 3D :** Contrairement à un simple point fixé à l'écran, un script JavaScript injecté instancie une véritable `Cesium.Entity` 3D (un point rouge clignotant type "Radar" avec un label textuel). Ce marqueur est solidement ancré au sol sur les coordonnées GPS exactes de la victime. Si l'utilisateur manipule la caméra (zoom, rotation), la cible reste physiquement sur le bâtiment ou la rue concernée.

### 7. Intelligence Artificielle 100% Locale (Llama.cpp Edge AI)
- **Objectif :** Analyser les alertes de survie sans aucune dépendance au Cloud, pour une résilience absolue hors-réseau.
- **Frontend (Application) :** Ajout d'un panneau sur l'écran d'accueil permettant de télécharger le fichier du modèle GGUF (ex: Gemma-3-270m ou Qwen-0.5B, environ 300 Mo) directement dans le stockage local du téléphone via `expo-file-system`.
- **Backend (Edge Server) :** Redirection complète du moteur d'analyse de survie. Les appels à l'API OpenAI/Groq ont été remplacés par une connexion à un serveur local `llama.cpp` (`http://127.0.0.1:8080/v1`). L'analyse de la gravité de la situation (batterie, offline) se fait désormais entièrement hors ligne, garantissant un fonctionnement même en cas de coupure Internet globale.

### 8. Architecture de Confidentialité Zéro-Serveur (True P2P Mesh & E2EE)
- **Problématique :** Comment transmettre une localisation en zone blanche (Mesh) sans qu'un serveur ou un téléphone intermédiaire ne puisse intercepter ces données privées ?
- **Solution Technique (Privacy by Design) :** 
  1. **Chiffrement de Bout-en-Bout (E2EE) :** L'application chiffre le paquet SOS (Latitude, Longitude) avec la clé publique des secours avant de l'émettre.
  2. **Transmission Radio Native :** Utilisation du **Bluetooth Low Energy (BLE)** en mode "Advertising" (Diffusion) et du **Wi-Fi Direct**. Le paquet chiffré voyage littéralement dans les ondes (sans passer par la 4G/Wi-Fi public) et "rebondit" de téléphone en téléphone.
  3. **Routage Aveugle :** Les téléphones agissant comme relais (les passants) transmettent le message de manière cryptographique et locale. Aucun serveur centralisé n'intercepte la position, garantissant un système d'urgence sécurisé, résilient et totalement privé.
