// src/components/ChatsPicker.js — Chats speed-dial.
// Toggled by the "Chats" tab in the BottomTabBar; renders the same
// arc/fan visual as CampaignPicker but with only WhatsApp + RCS — the
// two channels that support 2-way live chat. SMS / Voice are excluded
// because they don't surface in the Live Agent inbox.
//
// Picking a channel routes to the live-agent Inbox (with a `channel`
// route param so the screen can adapt header / data source).
import React, { useEffect, useRef } from 'react';
import {
  Modal, View, TouchableOpacity, Animated, Easing, Pressable, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBrand } from '../theme';
import { getChannel } from '../constants/channels';

// Pull WhatsApp + RCS from the canonical channel list so icons / labels
// stay in sync with the Dashboard tiles + CampaignPicker. SMS / Voice
// don't have live chat — omitted.
const CHATS_CHANNELS = [
  { ...getChannel('whatsapp'), route: 'Inbox',    routeParams: { channel: 'whatsapp' } },
  { ...getChannel('rcs'),      route: 'RcsInbox', routeParams: { channel: 'rcs' } },
];

const RADIUS = 96;
// Two icons, slightly tighter spread than the 4-channel campaign arc.
const ANGLES = [-130, -50];
const CIRCLE_SIZE = 64;
const ICON_SIZE   = 30;

// Per-channel icon tint — mirrors CampaignPicker's map so both pickers
// read consistently.
const ICON_COLOR = {
  whatsapp: '#25D366', // canonical WhatsApp green
  rcs:      '#3B82F6', // RCS blue
  voice:    '#F97316', // orange
  sms:      '#A78BFA', // light purple / violet
};

export default function ChatsPicker({ visible, onClose, onPick }) {
  const c = useBrand();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 240 : 160,
      easing: visible ? Easing.out(Easing.back(1.4)) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [visible]);

  // Anchor at the Chats tab — that's the second of five tabs, ~30% from
  // left. The bottom y matches the campaign FAB centre so both arcs read
  // as part of the same bar visually.
  const anchorLeftPercent = '30%';
  const anchorBottom = insets.bottom + 100 - 20; // tab icon middle ≈ 80px from screen bottom

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: anim }]}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close chats picker"
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.18)' }]}
        />

        {CHATS_CHANNELS.map((ch, i) => {
          const ang = (ANGLES[i] * Math.PI) / 180;
          const dx = RADIUS * Math.cos(ang);
          const dy = RADIUS * Math.sin(ang);

          return (
            <Animated.View
              key={ch.id}
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                bottom: anchorBottom - CIRCLE_SIZE / 2,
                left: anchorLeftPercent,
                marginLeft: -CIRCLE_SIZE / 2,
                opacity: anim,
                transform: [
                  { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
                  { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
                  { scale: anim },
                ],
              }}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => onPick?.(ch)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${ch.label} chats`}
                style={{ alignItems: 'center' }}
              >
                <View
                  style={{
                    width: CIRCLE_SIZE,
                    height: CIRCLE_SIZE,
                    borderRadius: CIRCLE_SIZE / 2,
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.18,
                    shadowRadius: 10,
                    elevation: 6,
                  }}
                >
                  <Ionicons
                    name={ch.icon}
                    size={ICON_SIZE}
                    color={ICON_COLOR[ch.id] || c.primary}
                  />
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.View>
    </Modal>
  );
}
