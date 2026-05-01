// src/components/AlertDialog.js — modern SweetAlert-style modal host.
//
// Visual reference: the sign-in error modal in LoginScreen.js — large
// iconified halo + bold title + muted body + full-width gradient CTA.
// This component generalises that look so EVERY dialog across the app
// shares it, with the halo + CTA tinted by tone (info / success /
// warning / danger).
//
// Mount once near the App root. Subscribes to the dialog service and
// renders the active dialog. Use the imperative dialog.* API to show one.
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, Animated, Easing, useColorScheme, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { subscribe } from '../services/dialog';

// Per-tone palette. `gradient` is used for primary CTAs so the buttons
// feel tactile rather than flat — matches the LoginScreen reference.
const TONES = {
  info: {
    fg: '#1D4ED8',
    haloBg: '#DBEAFE',
    accent: '#3B82F6',
    gradient: ['#3B82F6', '#1D4ED8'],
    shadow: '#3B82F6',
  },
  success: {
    fg: '#047857',
    haloBg: '#D1FAE5',
    accent: '#10B981',
    gradient: ['#10B981', '#047857'],
    shadow: '#10B981',
  },
  warning: {
    fg: '#B45309',
    haloBg: '#FEF3C7',
    accent: '#F59E0B',
    gradient: ['#F59E0B', '#B45309'],
    shadow: '#F59E0B',
  },
  danger: {
    fg: '#B91C1C',
    haloBg: '#FEE2E2',
    accent: '#EF4444',
    gradient: ['#EF4444', '#B91C1C'],
    shadow: '#EF4444',
  },
};

const SURFACE = {
  light: { bg: '#FFFFFF', text: '#1A1A1A', textMuted: '#666666', overlay: 'rgba(0,0,0,0.7)', border: 'rgba(0,0,0,0.05)' },
  dark:  { bg: '#17171B', text: '#FFFFFF', textMuted: '#A0A0A0', overlay: 'rgba(0,0,0,0.7)', border: 'rgba(255,255,255,0.1)' },
};

export default function AlertDialogHost() {
  const scheme = useColorScheme();
  const surface = scheme === 'dark' ? SURFACE.dark : SURFACE.light;

  const [active, setActive] = useState(null);
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => subscribe((action, payload) => {
    if (action === 'show') setActive(payload);
    if (action === 'hide') setActive(null);
  }), []);

  useEffect(() => {
    if (!active) return;
    scale.setValue(0.92);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [active]);

  const dismiss = (button) => {
    if (!active) return;
    const value = button ? button.value : false;
    Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      const resolve = active._resolve;
      setActive(null);
      if (resolve) resolve(value);
    });
  };

  if (!active) return null;
  const tone = TONES[active.tone] || TONES.info;
  const dark = scheme === 'dark';

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={() => dismiss(null)}
      statusBarTranslucent
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: surface.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          opacity,
        }}
      >
        <Animated.View
          style={{
            width: '100%',
            maxWidth: 360,
            borderRadius: 32,
            overflow: 'hidden',
            backgroundColor: surface.bg,
            borderWidth: 1,
            borderColor: surface.border,
            transform: [{ scale }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 14 },
            shadowOpacity: 0.3,
            shadowRadius: 30,
            elevation: 22,
          }}
        >
          <LinearGradient
            colors={dark ? ['#1F1F24', '#17171B'] : ['#FFFFFF', '#F8FAFB']}
            style={{ paddingTop: 28, paddingHorizontal: 24, paddingBottom: 22, alignItems: 'center' }}
          >
            {/* Tone-tinted halo with the icon */}
            <View
              style={{
                width: 76, height: 76, borderRadius: 38,
                backgroundColor: tone.haloBg,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 18,
              }}
            >
              <Ionicons name={active.icon} size={40} color={tone.fg} />
            </View>

            {active.title ? (
              <Text style={{ color: surface.text, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
                {active.title}
              </Text>
            ) : null}
            {active.message ? (
              <Text style={{ color: surface.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 18 }}>
                {active.message}
              </Text>
            ) : null}

            {/* Button row — single button stretches full width like the
                LoginScreen reference; multi-button arrangements split. */}
            <View
              style={{
                flexDirection: active.buttons?.length > 1 ? 'row' : 'column',
                width: '100%',
                gap: 10,
                marginTop: 4,
              }}
            >
              {active.buttons?.map((btn, i) => (
                <DialogButton
                  key={i}
                  button={btn}
                  tone={tone}
                  surface={surface}
                  onPress={() => dismiss(btn)}
                  full={active.buttons.length === 1}
                />
              ))}
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function DialogButton({ button, tone, surface, onPress, full }) {
  const isDanger = button.kind === 'danger';
  const isCancel = button.kind === 'cancel';
  const isPrimary = button.kind === 'primary' || (!isDanger && !isCancel);

  // Cancel button: outlined, neutral.
  if (isCancel) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={button.text}
        style={{
          flex: full ? 0 : 1,
          paddingVertical: 14,
          paddingHorizontal: 18,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: surface.textMuted + '55',
        }}
      >
        <Text style={{ color: surface.textMuted, fontSize: 15, fontWeight: '700' }}>{button.text}</Text>
      </TouchableOpacity>
    );
  }

  // Danger / primary: gradient CTA tinted by tone (or by the danger
  // palette when the button is explicitly destructive).
  const gradient = isDanger ? TONES.danger.gradient : tone.gradient;
  const shadow = isDanger ? TONES.danger.shadow : tone.shadow;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={button.text}
      style={{ flex: full ? 0 : 1 }}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 18,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 5,
          ...Platform.select({ web: { cursor: 'pointer' } }),
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>{button.text}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}
