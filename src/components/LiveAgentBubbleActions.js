// src/components/LiveAgentBubbleActions.js
//
// Action sheet shown when the agent long-presses a chat bubble. Two
// outcomes:
//   • Reply  → calls onReply()  → parent stages the bubble as the reply target
//   • React  → calls onReact(emoji) → parent fires sendReaction (immediate)
//
// Pure UI; the parent owns dispatch + slice state. Renders the bubble
// snippet at the top so the agent sees what they're acting on.
import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, Pressable, useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = {
  dark:  { sheet: '#17171B', ink: '#FFFFFF', muted: '#9A9AA2', border: '#26262C', tint: '#2094ab', input: '#0F0F12' },
  light: { sheet: '#FFFFFF', ink: '#0A0A0D', muted: '#5C5C63', border: '#E5E7EB', tint: '#175a6e', input: '#F2F2F5' },
};

// Standard 6 quick-reaction emoji used in WhatsApp + most chat apps.
// Sending an empty string would *remove* a reaction — not exposed here.
const QUICK_EMOJI = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function LiveAgentBubbleActions({
  visible,
  bubble,                // { messageId, snippet, fromMe, type }
  onClose,
  onReply,
  onReact,
  onForward,
}) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;

  if (!bubble) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: '100%', maxWidth: 360,
            backgroundColor: c.sheet,
            borderRadius: 20,
            padding: 16,
          }}
        >
          {/* Snippet of the bubble being acted on */}
          <View
            style={{
              padding: 10,
              borderRadius: 12,
              backgroundColor: c.input,
              borderLeftWidth: 3,
              borderLeftColor: c.tint,
              marginBottom: 14,
            }}
          >
            <Text style={{ color: c.muted, fontSize: 10, fontWeight: '700', marginBottom: 2 }}>
              {bubble.fromMe ? 'YOUR MESSAGE' : 'CUSTOMER MESSAGE'}
            </Text>
            <Text style={{ color: c.ink, fontSize: 13, lineHeight: 18 }} numberOfLines={3}>
              {bubble.snippet}
            </Text>
          </View>

          {/* Quick-reaction emoji row */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 6,
              paddingHorizontal: 4,
              borderRadius: 999,
              backgroundColor: c.input,
              marginBottom: 12,
            }}
          >
            {QUICK_EMOJI.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => onReact?.(emoji)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`React with ${emoji}`}
                style={{
                  width: 38, height: 38,
                  alignItems: 'center', justifyContent: 'center',
                  borderRadius: 19,
                }}
              >
                <Text style={{ fontSize: 22 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Reply row */}
          <TouchableOpacity
            onPress={onReply}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 12,
              paddingHorizontal: 10,
              borderRadius: 12,
            }}
          >
            <View
              style={{
                width: 36, height: 36, borderRadius: 12,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: c.tint + '22',
              }}
            >
              <Ionicons name="return-up-back" size={18} color={c.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.ink, fontSize: 14, fontWeight: '600' }}>Reply</Text>
              <Text style={{ color: c.muted, fontSize: 11 }}>Quote this message in your next send</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.muted} />
          </TouchableOpacity>

          {/* Forward row */}
          {onForward ? (
            <TouchableOpacity
              onPress={onForward}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 10,
                borderRadius: 12,
              }}
            >
              <View
                style={{
                  width: 36, height: 36, borderRadius: 12,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#10B98122',
                }}
              >
                <Ionicons name="share-outline" size={18} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.ink, fontSize: 14, fontWeight: '600' }}>Forward</Text>
                <Text style={{ color: c.muted, fontSize: 11 }}>Send this message to another contact</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={c.muted} />
            </TouchableOpacity>
          ) : null}

          {/* Cancel */}
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={{
              alignSelf: 'center',
              marginTop: 4,
              paddingHorizontal: 18, paddingVertical: 8,
              borderRadius: 14,
            }}
          >
            <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
