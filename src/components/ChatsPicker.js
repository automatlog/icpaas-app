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
  Modal, View, TouchableOpacity, Animated, Easing, Pressable, StyleSheet, Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBrand } from '../theme';
import { getChannel } from '../constants/channels';

// Pull WhatsApp + RCS from the canonical channel list so icons / labels
// stay in sync with the Dashboard tiles + CampaignPicker. SMS / Voice
// don't have live chat — omitted.
const CHATS_CHANNELS = [
  { ...getChannel('whatsapp'), route: 'Inbox', routeParams: { channel: 'whatsapp' } },
  { ...getChannel('rcs'), route: 'RcsInbox', routeParams: { channel: 'rcs' } },
];

const RADIUS = 100;
// Two icons, slightly tighter spread than the 4-channel campaign arc.
const ANGLES = [-130, -50];
const CIRCLE_SIZE = 56;
const ICON_SIZE   = 26;

export default function ChatsPicker({ visible, onClose, onPick }) {
  const c = useBrand();
  const insets = useSafeAreaInsets();
  
  // Master opacity for the backdrop
  const overlayAnim = useRef(new Animated.Value(0)).current;
  // Individual anims for the icons to support staggered entry
  const anims = useRef(CHATS_CHANNELS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (visible) {
      // Explicitly reset to 0 before starting
      overlayAnim.setValue(0);
      anims.forEach(a => a.setValue(0));

      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // Increased stagger for a clear sequential "one by one" effect
      Animated.stagger(120, anims.map((a) => 
        Animated.spring(a, {
          toValue: 1,
          friction: 7,
          tension: 35,
          useNativeDriver: true,
        })
      )).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ...anims.map((a) => Animated.timing(a, { toValue: 0, duration: 150, useNativeDriver: true })),
      ]).start();
    }
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
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: overlayAnim }]}>
        <Pressable
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
        />

        {CHATS_CHANNELS.map((ch, i) => {
          const ang = (ANGLES[i] * Math.PI) / 180;
          const dx = RADIUS * Math.cos(ang);
          const dy = RADIUS * Math.sin(ang);
          const iconAnim = anims[i];

          return (
            <Animated.View
              key={ch.id}
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                bottom: anchorBottom - CIRCLE_SIZE / 2,
                left: anchorLeftPercent,
                marginLeft: -CIRCLE_SIZE / 2,
                opacity: iconAnim,
                transform: [
                  { translateX: iconAnim.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
                  { translateY: iconAnim.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
                  { scale: iconAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                ],
                alignItems: 'center',
              }}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => onPick?.(ch)}
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
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 10,
                    borderWidth: 1.5,
                    borderColor: ch.tint + '33',
                  }}
                >
                  <Ionicons name={ch.icon} size={ICON_SIZE} color={ch.tint} />
                </View>
                <Animated.View 
                  style={{ 
                    marginTop: 6,
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8,
                    opacity: iconAnim,
                  }}
                >
                  <Text 
                    style={{ 
                      fontSize: 10, 
                      fontWeight: '800', 
                      color: '#000',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {ch.label}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.View>
    </Modal>
  );
}
