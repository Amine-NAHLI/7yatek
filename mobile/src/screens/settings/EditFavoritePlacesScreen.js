import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Keyboard, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

export default function EditFavoritePlacesScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimer, setSearchTimer] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);

  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [customName, setCustomName] = useState('');
  const [selectedPlace, setSelectedPlace] = useState(null);

  useEffect(() => {
    loadFavorites();
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        setCurrentLocation(location.coords);
      }
    })();
  }, []);

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem('userFavoritePlaces');
      if (stored) setFavorites(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  };

  const saveFavorites = async (newFavorites) => {
    try {
      await AsyncStorage.setItem('userFavoritePlaces', JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchTimer) clearTimeout(searchTimer);
    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const newTimer = setTimeout(() => {
      searchAddress(text);
    }, 500);
    setSearchTimer(newTimer);
  };

  const searchAddress = async (text) => {
    if (!currentLocation) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&lat=${currentLocation.latitude}&lon=${currentLocation.longitude}&limit=5`
      );
      const data = await response.json();
      if (data.features) setSuggestions(data.features);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlace = (item) => {
    Keyboard.dismiss();
    const lon = item.geometry.coordinates[0];
    const lat = item.geometry.coordinates[1];
    const addressName = item.properties.name || item.properties.city || item.properties.street || "Destination";
    
    setSelectedPlace({ lat, lon, addressName });
    setCustomName('');
    setIsModalVisible(true);
  };

  const confirmAddPlace = () => {
    if (!selectedPlace || customName.trim() === '') return;
    
    const newPlace = {
      id: Date.now().toString(),
      label: customName.trim(),
      icon: 'star',
      name: selectedPlace.addressName,
      latitude: selectedPlace.lat,
      longitude: selectedPlace.lon
    };
    saveFavorites([...favorites, newPlace]);
    
    setIsModalVisible(false);
    setSearchQuery('');
    setSuggestions([]);
  };

  const deletePlace = (id) => {
    const newFavorites = favorites.filter(f => f.id !== id);
    saveFavorites(newFavorites);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lieux Favoris</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Ajouter une adresse (Maison, Travail...)"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCorrect={false}
          />
          {isSearching && <ActivityIndicator size="small" color="#3B82F6" />}
        </View>

        {suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={suggestions}
              keyExtractor={(item, index) => index.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const props = item.properties;
                const displayName = [props.name, props.city, props.state].filter(Boolean).join(', ');
                return (
                  <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSelectPlace(item)}>
                    <Feather name="map-pin" size={16} color="#6B7280" />
                    <Text style={styles.suggestionText} numberOfLines={1}>{displayName}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        <Text style={styles.sectionTitle}>Vos lieux enregistrés</Text>
        
        {favorites.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="map-marker-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Aucun lieu favori enregistré.</Text>
            <Text style={styles.emptySubtext}>Ajoutez votre maison ou lieu de travail pour des trajets ultra-rapides.</Text>
          </View>
        ) : (
          <FlatList
            data={favorites}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.favoriteCard}>
                <View style={styles.favoriteIconBox}>
                  <Feather name={item.icon} size={20} color="#3B82F6" />
                </View>
                <View style={styles.favoriteInfo}>
                  <Text style={styles.favoriteLabel}>{item.label}</Text>
                  <Text style={styles.favoriteName} numberOfLines={1}>{item.name}</Text>
                </View>
                <TouchableOpacity onPress={() => deletePlace(item.id)} style={styles.deleteBtn}>
                  <Feather name="trash-2" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nom personnalisé</Text>
            <Text style={styles.modalSubtext}>Comment voulez-vous appeler ce lieu ? (ex: Chez Maman, Salle de sport...)</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Nom du lieu"
              placeholderTextColor="#9CA3AF"
              value={customName}
              onChangeText={setCustomName}
              autoFocus={true}
            />
            
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.modalBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={confirmAddPlace}>
                <Text style={styles.modalBtnConfirmText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  content: { flex: 1, padding: 24 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 24,
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' },
  suggestionsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: -16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionText: { marginLeft: 12, fontSize: 14, color: '#374151', flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyText: { color: '#6B7280', fontSize: 16, fontWeight: 'bold', marginTop: 16 },
  emptySubtext: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },
  favoriteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  favoriteIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  favoriteInfo: { flex: 1 },
  favoriteLabel: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  favoriteName: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  deleteBtn: { padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#ffffff', borderRadius: 16, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  modalSubtext: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  modalInput: { width: '100%', height: 48, backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 16, fontSize: 16, color: '#111827', marginBottom: 24 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  modalBtnCancel: { flex: 1, paddingVertical: 12, alignItems: 'center', marginRight: 8, backgroundColor: '#F3F4F6', borderRadius: 8 },
  modalBtnCancelText: { color: '#374151', fontWeight: 'bold' },
  modalBtnConfirm: { flex: 1, paddingVertical: 12, alignItems: 'center', marginLeft: 8, backgroundColor: '#3B82F6', borderRadius: 8 },
  modalBtnConfirmText: { color: '#ffffff', fontWeight: 'bold' },
});
