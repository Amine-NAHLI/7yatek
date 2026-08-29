import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const agents = [
  {
    id: '1',
    name: 'Agent "Trajet Sécurisé"',
    icon: 'shield-account-outline',
    color: '#3B82F6',
    isDeveloped: true,
    details: "Le 'Night Walk Guardian' (Garde du Corps pour Trajet Nocturne) est conçu pour veiller sur vous lorsque vous rentrez seul(e). Avant de partir, vous lui indiquez où vous allez. Pendant tout votre trajet, l'application agit comme un ange gardien invisible : elle compare en temps réel votre position actuelle avec le chemin que vous deviez emprunter. Si vous restez immobile trop longtemps sans raison, ou si vous vous éloignez dangereusement de votre route prévue, votre téléphone vibrera et vous demandera si tout va bien. Si vous ne répondez pas, vos proches seront alertés pour venir vous aider.",
    technical: "Sous le capot, l'application utilise le GPS de votre téléphone (API native `expo-location`) pour obtenir vos coordonnées géographiques en temps réel. Elle génère ensuite le meilleur itinéraire grâce à l'API cartographique 'GraphHopper'. Tout au long du trajet, un algorithme mathématique (la formule de Haversine) calcule l'écart exact entre votre position réelle et l'itinéraire tracé. Si l'écart dépasse un certain seuil critique, le Cerveau IA sur notre serveur est appelé via une connexion haut débit pour analyser la situation et décider s'il faut lancer une alerte.",
    howToTest: "Étape 1 : Allez sur la page d'accueil (Dashboard).\nÉtape 2 : Cliquez sur 'Démarrer' dans le bloc bleu 'Trajet IA'.\nÉtape 3 : Saisissez une fausse destination (ou utilisez un de vos favoris).\nÉtape 4 : L'Agent va tracer le chemin. Pour le tester, éloignez-vous volontairement de plus de 150 mètres de ce chemin, ou posez votre téléphone sur une table sans bouger pendant plus de 60 secondes.\nÉtape 5 : L'écran d'alerte de sécurité s'affichera pour vous demander si vous allez bien !"
  },
  {
    id: '2',
    name: 'Agent "Crash Automobile"',
    icon: 'car-brake-alert',
    color: '#EF4444',
    isDeveloped: true,
    details: "Cet Agent est conçu pour vous sauver la vie si vous êtes victime d'un grave accident de la route et que vous perdez connaissance. L'Agent s'active tout seul lorsque vous êtes en voiture. Il surveille en permanence la vitesse et la brutalité de vos mouvements. S'il détecte un choc extrême (comme une forte collision), il présume que vous ne pouvez plus appeler à l'aide vous-même. Il fera alors sonner une sirène très puissante et fera clignoter le flash de votre téléphone pour alerter les passants de nuit. Sans intervention de votre part, il contactera de lui-même les secours en leur donnant votre géolocalisation et votre groupe sanguin.",
    technical: "D'un point de vue technologique, l'application lit en temps réel les capteurs physiques natifs de votre téléphone : l'accéléromètre (qui mesure la force gravitationnelle G) et le gyroscope (qui mesure la rotation de l'appareil). Si la décélération dépasse une certaine force (par exemple > 4G) et que la vitesse chute brusquement, un algorithme de télémétrie locale s'active sans dépendre d'Internet. Le SOS final contacte le backend Node.js, qui s'occupe de dispatcher instantanément l'alerte au réseau de secours.",
    howToTest: "Étape 1 : Sur l'accueil (Dashboard), trouvez le bloc rose 'Anti-Crash' et cliquez sur 'Activer'.\nÉtape 2 : Un bouton 'Télémétrie' apparaît, cliquez dessus pour voir les capteurs en direct.\nÉtape 3 : Tenez bien votre téléphone en main et secouez-le très brusquement pour simuler l'impact physique d'un accident.\nÉtape 4 : L'écran deviendra orange (pré-alerte) puis rouge de manière spectaculaire. L'alarme et le flash s'activeront. N'oubliez pas d'appuyer sur 'Annuler' !"
  },
  {
    id: '3',
    name: 'Agent "SOS Audio / Furtif"',
    icon: 'microphone-outline',
    color: '#8B5CF6',
    isDeveloped: true,
    details: "C'est votre système de défense absolue et invisible en cas d'agression ou de kidnapping. Parfois, on ne peut pas toucher son téléphone pour appeler à l'aide. Avec ce mode furtif, une fois l'alerte donnée, le téléphone éteint totalement son écran (il devient complètement noir pour faire croire qu'il est éteint et ne pas énerver l'agresseur) et enregistre secrètement tout ce qu'il entend. Une Intelligence Artificielle écoute l'enregistrement, analyse le niveau de danger, transfère cet audio comme preuve à vos contacts, et affiche secrètement (en gris très sombre) ce que vous devez faire pour vous échapper.",
    technical: "Le fonctionnement s'appuie sur la baisse de la luminosité au niveau purement matériel (via `expo-brightness`) pour garantir l'invisibilité totale. L'enregistrement audio en haute qualité est transmis de façon silencieuse (Upload HTTP Multipart) au serveur. C'est là qu'intervient une IA surpuissante : Whisper-V3 (tournant sur l'infrastructure ultra-rapide Groq) transcrit la voix en texte en quelques millisecondes. Ensuite, le gigantesque modèle de langage Qwen 3.6 (27 Milliards de paramètres) analyse la psychologie de l'agression et vous suggère des boutons d'actions contextuels interactifs.",
    howToTest: "Étape 1 : Allez sur le Dashboard, cherchez le bloc violet 'Agent Audio', et cliquez sur 'Ouvrir'.\nÉtape 2 : Cliquez sur le gros bouton 'Simuler Écoute-moi'.\nÉtape 3 : Votre écran va s'éteindre (devenir noir absolu). Parlez à haute voix dans le vide (ex: 'À l'aide, on m'a enfermé dans le coffre d'une voiture Mercedes !') pendant 8 secondes.\nÉtape 4 : Patientez. Le texte de survie va s'afficher en gris foncé. Vous pourrez même cliquer sur des boutons invisibles pour répondre à l'IA sans faire de bruit."
  },
  {
    id: '4',
    name: 'Agent "Secouriste Vocal"',
    icon: 'stethoscope',
    color: '#DC2626',
    isDeveloped: true,
    details: "Cet Agent transforme votre téléphone en secouriste professionnel. Si quelqu'un tombe devant vous et que vous ne savez pas quoi faire, décrivez la situation à voix haute. L'Intelligence Artificielle va consulter en temps réel les bases médicales officielles (MedlinePlus du gouvernement américain, PubMed) pour trouver les protocoles de premiers secours certifiés. Ensuite, elle vous guidera vocalement, étape par étape, comme un médecin urgentiste du SAMU au téléphone. Vous avez les mains libres pour agir pendant que l'IA vous parle.",
    technical: "L'architecture repose sur une boucle 'ReAct' (Reasoning + Action) médicale. L'audio est transcrit via Whisper V3 (Groq LPU). Le modèle Qwen 3.6 (27B paramètres) identifie le type d'urgence médicale, puis génère dynamiquement un appel API vers MedlinePlus (https://wsearch.nlm.nih.gov). Les données médicales officielles reçues sont injectées dans le prompt de l'IA (technique RAG). L'IA formule sa réponse STRICTEMENT à partir de ces données. La synthèse vocale est assurée par 'expo-speech' (moteur natif iOS/Android).",
    howToTest: "Étape 1 : Ouvrez l'Agent Secouriste depuis le Dashboard.\nÉtape 2 : Appuyez sur le bouton micro rouge.\nÉtape 3 : Décrivez une situation (ex: 'Un homme s'est effondré, il ne respire plus').\nÉtape 4 : L'IA va transcrire votre voix, consulter MedlinePlus (visible dans les logs du serveur), puis vous répondre vocalement avec les étapes du massage cardiaque.\nÉtape 5 : Vous pouvez continuer la conversation (ex: 'Il a vomi, je fais quoi ?')."
  },
  {
    id: '5',
    name: "Blackout / Mesh SOS",
    icon: "access-point-network",
    color: "#D97706",
    isDeveloped: true,
    details: "L'Agent ultime de survie. En cas de catastrophe naturelle (séisme) ou dans une forêt sans aucun réseau (ni Wi-Fi, ni 4G), l'Agent détecte la zone blanche et transforme votre téléphone en Balise de Détresse (Beacon) Bluetooth Low Energy. Il émet silencieusement un SOS aux téléphones à proximité.",
    technical: "Capteurs : expo-network (Statut Wi-Fi/4G), expo-battery. Protocole : Bluetooth Low Energy (BLE) Mesh. Payload : { batterie, position GPS, timestamp }. ReAct IA : Analyse de l'urgence de la situation (batterie critique + perte de réseau longue).",
    howToTest: "Cliquez sur 'Simuler Perte de Réseau' dans le Dashboard de l'Agent. Vous verrez le réseau se couper virtuellement, l'activation du radar Bluetooth, et la validation IA côté serveur."
  },
];

export default function AgentsScreen() {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'technical', 'howToTest'

  const openAgentDetails = (agent) => {
    setSelectedAgent(agent);
    setActiveTab('details');
    setModalVisible(true);
  };

  const renderTabContent = () => {
    if (!selectedAgent) return null;
    
    if (!selectedAgent.isDeveloped) {
      return (
        <View style={styles.notDevelopedContainer}>
          <Feather name="clock" size={40} color="#9CA3AF" />
          <Text style={styles.notDevelopedText}>Pas encore développé</Text>
          <Text style={styles.notDevelopedSub}>Cet agent sera disponible dans une prochaine mise à jour.</Text>
        </View>
      );
    }

    let textContent = '';
    switch (activeTab) {
      case 'details':
        textContent = selectedAgent.details;
        break;
      case 'technical':
        textContent = selectedAgent.technical;
        break;
      case 'howToTest':
        textContent = selectedAgent.howToTest;
        break;
    }

    return (
      <View style={styles.tabContentContainer}>
        <Text style={styles.modalDescription}>{textContent}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes Agents IA</Text>
        <Text style={styles.subtitle}>Découvrez comment 7yatk IA vous protège.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {agents.map((agent) => (
          <TouchableOpacity 
            key={agent.id} 
            style={styles.card} 
            onPress={() => openAgentDetails(agent)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: agent.color + '20' }]}>
              <MaterialCommunityIcons name={agent.icon} size={32} color={agent.color} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{agent.name}</Text>
              <Text style={styles.cardAction}>En savoir plus <Feather name="chevron-right" size={14} /></Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Modal pour les détails de l'agent */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAgent && (
              <>
                <View style={[styles.modalIconContainer, { backgroundColor: selectedAgent.color + '20' }]}>
                  <MaterialCommunityIcons name={selectedAgent.icon} size={48} color={selectedAgent.color} />
                </View>
                <Text style={styles.modalTitle}>{selectedAgent.name}</Text>
                
                {selectedAgent.isDeveloped && (
                  <View style={styles.tabsContainer}>
                    <TouchableOpacity 
                      style={[styles.tabButton, activeTab === 'details' && styles.tabButtonActive, { borderBottomColor: activeTab === 'details' ? selectedAgent.color : 'transparent' }]}
                      onPress={() => setActiveTab('details')}
                    >
                      <Text style={[styles.tabText, activeTab === 'details' && { color: selectedAgent.color }]}>Détails</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.tabButton, activeTab === 'technical' && styles.tabButtonActive, { borderBottomColor: activeTab === 'technical' ? selectedAgent.color : 'transparent' }]}
                      onPress={() => setActiveTab('technical')}
                    >
                      <Text style={[styles.tabText, activeTab === 'technical' && { color: selectedAgent.color }]}>Technique</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.tabButton, activeTab === 'howToTest' && styles.tabButtonActive, { borderBottomColor: activeTab === 'howToTest' ? selectedAgent.color : 'transparent' }]}
                      onPress={() => setActiveTab('howToTest')}
                    >
                      <Text style={[styles.tabText, activeTab === 'howToTest' && { color: selectedAgent.color }]}>Comment Tester</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {renderTabContent()}
                
                <TouchableOpacity 
                  style={[styles.closeButton, { backgroundColor: selectedAgent.color }]} 
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Fermer</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    padding: 24,
    paddingTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 6,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Pour la bottom navbar
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  cardAction: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', // Modal au milieu
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24, // Bords arrondis partout
    padding: 24,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    // border color is dynamic
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  tabContentContainer: {
    width: '100%',
    minHeight: 100,
    marginBottom: 24,
  },
  modalDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    textAlign: 'left',
  },
  notDevelopedContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  notDevelopedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 12,
  },
  notDevelopedSub: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  closeButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
