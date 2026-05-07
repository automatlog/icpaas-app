// src/components/LiveAgentAttachMenu.js
//
// Slide-up sheet shown when the agent taps the "+" in LiveAgentChat's
// composer. Just the UI — each option fires the matching `on…` callback
// and the parent screen owns the picker / upload / send flow.
import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, Animated, Pressable, useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = {
  dark:  { bg: '#0F0F12', sheet: '#17171B', ink: '#FFFFFF', muted: '#9A9AA2', border: '#26262C', teal: '#2094ab' },
  light: { bg: '#FFFFFF', sheet: '#FFFFFF', ink: '#0A0A0D', muted: '#5C5C63', border: '#E5E7EB', teal: '#175a6e' },
};

const TINTS = {
  image:    { bg: '#3B82F6', icon: 'image-outline' },
  video:    { bg: '#A855F7', icon: 'videocam-outline' },
  document: { bg: '#F59E0B', icon: 'document-text-outline' },
  location: { bg: '#10B981', icon: 'location-outline' },
  template: { bg: '#EC4899', icon: 'layers-outline' },
  sticker:  { bg: '#06B6D4', icon: 'happy-outline' },
};

const Row = ({ kind, label, hint, disabled, onPress, c }) => {
  const tint = TINTS[kind] || TINTS.document;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: 12, paddingHorizontal: 6,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <View
        style={{
          width: 40, height: 40, borderRadius: 12,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: tint.bg + '22',
        }}
      >
        <Ionicons name={tint.icon} size={20} color={tint.bg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.ink, fontSize: 15, fontWeight: '600' }}>{label}</Text>
        {hint ? (
          <Text style={{ color: c.muted, fontSize: 11, marginTop: 2 }}>{hint}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={c.muted} />
    </TouchableOpacity>
  );
};

export default function LiveAgentAttachMenu({
  visible,
  onClose,
  onPickImage,
  onPickVideo,
  onPickDocument,
  onPickLocation,
  onPickSticker,
  onPickTemplate,
  // Locked == window expired (24-h rule). Most kinds disabled, template
  // surfaces as the only allowed path.
  locked = false,
}) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: visible ? 220 : 160,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'flex-end',
        }}
      >
        <Animated.View
          style={{
            backgroundColor: c.sheet,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 18,
            paddingTop: 10,
            paddingBottom: 28,
            transform: [
              {
                translateY: slide.interpolate({
                  inputRange: [0, 1],
                  outputRange: [400, 0],
                }),
              },
            ],
          }}
          // Stop propagation so taps inside the sheet don't dismiss it.
          onStartShouldSetResponder={() => true}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', marginBottom: 14 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.border }} />
          </View>

          <Text style={{ color: c.ink, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>
            Attach
          </Text>
          <Text style={{ color: c.muted, fontSize: 11, marginBottom: 6 }}>
            {locked
              ? 'Service window closed — only template messages will deliver.'
              : 'Pick what you want to send.'}
          </Text>

          <View style={{ height: 1, backgroundColor: c.border, marginVertical: 6 }} />

          <Row
            kind="image"
            label="Image"
            hint="JPEG · PNG · WebP, up to 5 MB"
            disabled={locked}
            onPress={onPickImage}
            c={c}
          />
          <Row
            kind="video"
            label="Video"
            hint="MP4, up to 16 MB"
            disabled={locked}
            onPress={onPickVideo}
            c={c}
          />
          <Row
            kind="document"
            label="Document"
            hint="PDF · DOC · XLS · PPT, up to 100 MB"
            disabled={locked}
            onPress={onPickDocument}
            c={c}
          />
          <Row
            kind="location"
            label="Location"
            hint="Share a pinned location"
            disabled={locked}
            onPress={onPickLocation}
            c={c}
          />
          {onPickSticker ? (
            <Row
              kind="sticker"
              label="Sticker"
              hint="WebP only · static ≤100KB · animated ≤500KB"
              disabled={locked}
              onPress={onPickSticker}
              c={c}
            />
          ) : null}
          {onPickTemplate ? (
            <Row
              kind="template"
              label="Template"
              hint="Meta-approved · the only message type allowed after 24 h"
              onPress={onPickTemplate}
              c={c}
            />
          ) : null}

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={{
              marginTop: 14,
              alignSelf: 'center',
              paddingHorizontal: 18, paddingVertical: 10,
              borderRadius: 14,
              backgroundColor: c.border,
            }}
          >
            <Text style={{ color: c.ink, fontSize: 13, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
