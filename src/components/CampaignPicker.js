// src/components/CampaignPicker.js — circular dock with one button per channel.
// Opens when the user taps the centre Campaign FAB in the bottom tab bar.
// Tap a channel → close the picker + navigate to that product's campaign
// composer. Tap outside / drag handle → close.
import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, Animated, Easing, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrand } from '../theme';
import { CHANNELS } from '../constants/channels';

export default function CampaignPicker({ visible, onClose, onPick }) {
  const c = useBrand();
  const fade = useRef(new Animated.Value(0)).current;
  const scales = useRef(CHANNELS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fade, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      Animated.stagger(50, scales.map((s) =>
        Animated.spring(s, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
      )).start();
    } else {
      fade.setValue(0);
      scales.forEach((s) => s.setValue(0));
    }
  }, [visible]);

  const handlePick = (ch) => {
    onClose();
    // Defer navigation so the modal animation can settle before a stack push.
    setTimeout(() => onPick(ch), 80);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15,15,18,0.55)',
          opacity: fade,
        }}
      >
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1 }} />

        <View
          style={{
            backgroundColor: c.primarySoft, // light-green dock matching the brand
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 34 : 26,
            paddingHorizontal: 18,
          }}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingBottom: 6 }}>
            <View style={{ width: 38, height: 4, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.14)' }} />
          </View>

          <View style={{ alignItems: 'center', marginTop: 6, marginBottom: 18 }}>
            <Text style={{ color: c.primaryDeep, fontSize: 17, fontWeight: '800' }}>New Campaign</Text>
            <Text style={{ color: c.primaryDeep, fontSize: 12, marginTop: 4, opacity: 0.75 }}>
              Pick a channel to start with.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
            {CHANNELS.map((ch, i) => (
              <Animated.View
                key={ch.id}
                style={{
                  alignItems: 'center',
                  transform: [{ scale: scales[i] }],
                  opacity: scales[i],
                  flex: 1,
                }}
              >
                <TouchableOpacity
                  onPress={() => handlePick(ch)}
                  activeOpacity={0.85}
                  style={{
                    width: 64, height: 64, borderRadius: 32,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: ch.tint,
                    shadowColor: ch.tint,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.35,
                    shadowRadius: 14,
                    elevation: 8,
                  }}
                >
                  <Ionicons name={ch.icon} size={26} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={{ color: c.primaryDeep, fontSize: 12, fontWeight: '700', marginTop: 8 }}>{ch.label}</Text>
              </Animated.View>
            ))}
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

