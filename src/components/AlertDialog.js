// src/components/AlertDialog.js — SweetAlert-style modal host.
// Mount once near the App root. Subscribes to the dialog service and
// renders the active dialog. Use the imperative dialog.* API to show one.
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, Animated, Easing, useColorScheme, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subscribe } from '../services/dialog';

const TONES = {
  info:    { fg: '#1D4ED8', bg: '#DBEAFE', accent: '#3B82F6' },
  success: { fg: '#047857', bg: '#D1FAE5', accent: '#10B981' },
  warning: { fg: '#B45309', bg: '#FEF3C7', accent: '#F59E0B' },
  danger:  { fg: '#B91C1C', bg: '#FEE2E2', accent: '#EF4444' },
};

const SURFACE = {
  light: { bg: '#FFFFFF', text: '#0A0A0D', textMuted: '#6B7280', overlay: 'rgba(15,15,23,0.55)' },
  dark:  { bg: '#17171B', text: '#F9FAFB', textMuted: '#9CA3AF', overlay: 'rgba(0,0,0,0.7)' },
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
      Animated.timing(opacity, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [active]);

  const dismiss = (button) => {
    if (!active) return;
    const value = button ? button.value : false;
    Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      const resolve = active._resolve;
      setActive(null);
      if (resolve) resolve(value);
    });
  };

  if (!active) return null;
  const tone = TONES[active.tone] || TONES.info;

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
          padding: 24,
          opacity,
        }}
      >
        <Animated.View
          style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: surface.bg,
            borderRadius: 22,
            paddingTop: 24,
            paddingBottom: 14,
            paddingHorizontal: 22,
            transform: [{ scale }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.25,
            shadowRadius: 28,
            elevation: 18,
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 14 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: tone.bg,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 14,
            }}>
              <Ionicons name={active.icon} size={34} color={tone.fg} />
            </View>
            {active.title ? (
              <Text style={{ color: surface.text, fontSize: 18, fontWeight: '800', textAlign: 'center' }}>
                {active.title}
              </Text>
            ) : null}
            {active.message ? (
              <Text style={{ color: surface.textMuted, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
                {active.message}
              </Text>
            ) : null}
          </View>

          <View
            style={{
              flexDirection: active.buttons?.length > 1 ? 'row' : 'column',
              marginTop: 6,
              gap: 8,
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
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function DialogButton({ button, tone, surface, onPress, full }) {
  const isPrimary = button.kind === 'primary';
  const isDanger = button.kind === 'danger';
  const isCancel = button.kind === 'cancel';

  let bg, fg, border;
  if (isCancel) {
    bg = 'transparent';
    fg = surface.textMuted;
    border = surface.textMuted + '33';
  } else if (isDanger) {
    bg = TONES.danger.accent;
    fg = '#FFFFFF';
  } else if (isPrimary) {
    bg = tone.accent;
    fg = '#FFFFFF';
  } else {
    bg = tone.bg;
    fg = tone.fg;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        flex: full ? 0 : 1,
        backgroundColor: bg,
        borderWidth: border ? 1 : 0,
        borderColor: border || 'transparent',
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
          web: { cursor: 'pointer' },
        }),
      }}
    >
      <Text style={{ color: fg, fontSize: 14, fontWeight: '700' }}>{button.text}</Text>
    </TouchableOpacity>
  );
}
