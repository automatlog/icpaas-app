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
  StyleSheet, Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBrand } from '../theme';
import { CHANNELS } from '../constants/channels';

const RADIUS = 110; // Increased radius for labels
const ANGLES = [-155, -112, -68, -25]; // Spread slightly more
const CIRCLE_SIZE = 56; // Slightly larger
const ICON_SIZE   = 26;

export default function CampaignPicker({ visible, onClose, onPick }) {
  const c = useBrand();
  const insets = useSafeAreaInsets();
  
  // Master opacity for the backdrop
  const overlayAnim = useRef(new Animated.Value(0)).current;
  // Individual anims for the icons to support staggered entry
  const anims = useRef(CHANNELS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (visible) {
      // Reset animations to start state
      overlayAnim.setValue(0);
      anims.forEach((a) => a.setValue(0));

      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // Increased stagger to 100ms so it's more clearly "one by one"
      Animated.stagger(100, anims.map((a) => 
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

  // FAB centre y from screen bottom.
  const fabAnchor = insets.bottom + 100 - 32 + 30 - 8;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: overlayAnim }]}>
        {/* Darkened backdrop for better visibility */}
        <Pressable
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
        />

        {CHANNELS.map((ch, i) => {
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
                bottom: fabAnchor - CIRCLE_SIZE / 2,
                left: '50%',
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
