// src/components/LiveAgentLocationModal.js
//
// Lightweight prompt for sending a location pin from LiveAgentChat. Manual
// lat/lon entry — no GPS dep. (Adding `expo-location` for current-location
// is straightforward later: ask permissions, prefill these fields.)
import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, Pressable, useColorScheme, Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import toast from '../services/toast';

const C = {
  dark:  { sheet: '#17171B', ink: '#FFFFFF', muted: '#9A9AA2', input: '#0F0F12', border: '#26262C', teal: '#2094ab' },
  light: { sheet: '#FFFFFF', ink: '#0A0A0D', muted: '#5C5C63', input: '#F2F2F5', border: '#E5E7EB', teal: '#175a6e' },
};

const isFiniteNumber = (n) => Number.isFinite(n) && !Number.isNaN(n);
const inRange = (n, min, max) => isFiniteNumber(n) && n >= min && n <= max;

export default function LiveAgentLocationModal({ visible, onClose, onSubmit }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;

  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [locating, setLocating] = useState(false);

  const reset = () => { setLat(''); setLon(''); setName(''); setAddress(''); };
  const close = () => { reset(); onClose?.(); };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        toast.warning('Permission needed', 'Allow location access to auto-fill.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;
      setLat(latitude.toFixed(6));
      setLon(longitude.toFixed(6));
      // Best-effort reverse geocode for the address field.
      try {
        const places = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (places?.[0]) {
          const p = places[0];
          const composedAddress = [p.name, p.street, p.city, p.region, p.country]
            .filter(Boolean).join(', ');
          if (composedAddress && !address) setAddress(composedAddress);
        }
      } catch (_) {
        // Reverse geocode is best-effort — don't fail the prefill.
      }
    } catch (e) {
      toast.error('Location unavailable', e?.message || 'Could not read GPS.');
    } finally {
      setLocating(false);
    }
  };

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  const valid = inRange(latNum, -90, 90) && inRange(lonNum, -180, 180);

  const submit = () => {
    if (!valid) return;
    onSubmit?.({
      latitude: latNum,
      longitude: lonNum,
      name: name.trim() || undefined,
      address: address.trim() || undefined,
    });
    reset();
  };

  const inputStyle = {
    backgroundColor: c.input,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: c.ink,
    fontSize: 14,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <Pressable
        onPress={close}
        style={{
          flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center', justifyContent: 'center', padding: 20,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: '100%', maxWidth: 380,
            backgroundColor: c.sheet,
            borderRadius: 18,
            padding: 18,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View style={{
              width: 34, height: 34, borderRadius: 10,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: '#10B98122',
            }}>
              <Ionicons name="location" size={18} color="#10B981" />
            </View>
            <Text style={{ color: c.ink, fontSize: 15, fontWeight: '700', flex: 1 }}>Send location</Text>
            <TouchableOpacity onPress={close} hitSlop={12}>
              <Ionicons name="close" size={18} color={c.muted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={useCurrentLocation}
            disabled={locating}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 8, paddingVertical: 10, marginBottom: 14,
              borderRadius: 10, backgroundColor: '#10B98122',
              borderWidth: 1, borderColor: '#10B981',
              opacity: locating ? 0.6 : 1,
            }}
          >
            {locating ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <Ionicons name="locate" size={14} color="#10B981" />
            )}
            <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>
              {locating ? 'Reading GPS…' : 'Use my current location'}
            </Text>
          </TouchableOpacity>

          <Text style={{ color: c.muted, fontSize: 11, marginBottom: 4 }}>LATITUDE *</Text>
          <TextInput
            value={lat} onChangeText={setLat}
            placeholder="19.0760"
            placeholderTextColor={c.muted}
            keyboardType="decimal-pad"
            style={inputStyle}
          />

          <Text style={{ color: c.muted, fontSize: 11, marginBottom: 4, marginTop: 10 }}>LONGITUDE *</Text>
          <TextInput
            value={lon} onChangeText={setLon}
            placeholder="72.8777"
            placeholderTextColor={c.muted}
            keyboardType="decimal-pad"
            style={inputStyle}
          />

          <Text style={{ color: c.muted, fontSize: 11, marginBottom: 4, marginTop: 10 }}>NAME (optional)</Text>
          <TextInput
            value={name} onChangeText={setName}
            placeholder="Gateway of India"
            placeholderTextColor={c.muted}
            style={inputStyle}
          />

          <Text style={{ color: c.muted, fontSize: 11, marginBottom: 4, marginTop: 10 }}>ADDRESS (optional)</Text>
          <TextInput
            value={address} onChangeText={setAddress}
            placeholder="Apollo Bandar, Colaba, Mumbai"
            placeholderTextColor={c.muted}
            style={inputStyle}
          />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              onPress={close}
              activeOpacity={0.85}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 12,
                borderRadius: 12, backgroundColor: c.border,
              }}
            >
              <Text style={{ color: c.ink, fontSize: 13, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={submit}
              disabled={!valid}
              activeOpacity={0.85}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 12,
                borderRadius: 12, backgroundColor: valid ? c.teal : c.border,
                opacity: valid ? 1 : 0.6,
              }}
            >
              <Text style={{
                color: valid ? '#FFFFFF' : c.muted,
                fontSize: 13, fontWeight: '700',
              }}>Send</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
