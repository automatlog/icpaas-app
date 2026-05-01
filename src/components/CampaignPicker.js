// src/components/CampaignPicker.js — speed-dial arc.
// Toggled by the centre Campaign FAB in the BottomTabBar; renders 4
// channel circles fanning across 120° in the upper semi-circle above
// the FAB. Each circle is a light-green tinted bubble with the channel
// icon (matches the Channels grid on the Dashboard).
//
// Layout:
//   - Transparent Modal so the arc floats above the BottomTabBar
//   - Tap-outside backdrop closes
//   - Stagger spring animation in; quick fade out on close
//
// Caller provides `visible` / `onClose` / `onPick`. The arc is pinned a
// fixed distance above the bottom of the screen so it lines up with the
// FAB across devices.
import React, { useEffect, useRef } from 'react';
import {
  Modal, View, TouchableOpacity, Animated, Easing, Pressable,
  StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBrand } from '../theme';
import { CHANNELS } from '../constants/channels';

const RADIUS = 92;
const ANGLES = [-150, -110, -70, -30]; // 4 channels across 120° upper arc
const CIRCLE_SIZE = 52;
const ICON_SIZE   = 24;

export default function CampaignPicker({ visible, onClose, onPick }) {
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

  // FAB centre y from screen bottom. The bottom tab strip is ~100px tall
  // (BAR_HEIGHT) including padding; the FAB is lifted 32px and has a 30px
  // radius. We add insets.bottom for devices that surface a gesture pill
  // and an extra 8px so circles sit cleanly above the FAB rim.
  const fabAnchor = insets.bottom + 100 - 32 + 30 - 8;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: anim }]}>
        {/* Tap-outside backdrop — faint dim so the arc reads as elevated
            without hiding the screen behind. */}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close campaign picker"
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.18)' }]}
        />

        {CHANNELS.map((ch, i) => {
          const ang = (ANGLES[i] * Math.PI) / 180;
          const dx = RADIUS * Math.cos(ang);
          const dy = RADIUS * Math.sin(ang); // upward (negative y)

          return (
            <Animated.View
              key={ch.id}
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                bottom: fabAnchor - CIRCLE_SIZE / 2,
                left: '50%',
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
                accessibilityLabel={`New ${ch.label} campaign`}
                style={{ alignItems: 'center' }}
              >
                <View
                  style={{
                    width: CIRCLE_SIZE,
                    height: CIRCLE_SIZE,
                    borderRadius: CIRCLE_SIZE / 2,
                    backgroundColor: c.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: c.primary,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.22,
                    shadowRadius: 10,
                    elevation: 6,
                  }}
                >
                  <Ionicons name={ch.icon} size={ICON_SIZE} color={c.primary} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.View>
    </Modal>
  );
}
