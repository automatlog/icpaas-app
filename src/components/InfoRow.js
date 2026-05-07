// src/components/InfoRow.js — labelled mono value with copy button.
// Used by the identity screens (WABA Channels / RCS Bot IDs / SMS Sender IDs /
// Voice Caller IDs) to surface IDs the user often needs to copy.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function InfoRow({ c, label, value, onCopy }) {
  // Tolerate both palette shapes: brand theme (`text`/`textMuted`) used by
  // useBrand(), and the local C palette (`ink`/`muted`) used by the
  // identity screens.
  const text = c.text || c.ink;
  const muted = c.textMuted || c.muted;
  const bg = c.bgInput;

  return (
    <View style={{ marginBottom: 8 }}>
      <Text
        style={{
          color: muted,
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: bg,
          borderRadius: 14,
          paddingHorizontal: 12,
          paddingVertical: 10,
          gap: 8,
        }}
      >
        <Text
          numberOfLines={1}
          style={{ color: text, flex: 1, fontSize: 12, fontFamily: 'monospace' }}
        >
          {value || '—'}
        </Text>
        {value && onCopy ? (
          <TouchableOpacity
            onPress={onCopy}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={`Copy ${label}`}
            accessibilityHint="Copies value to clipboard"
          >
            <Ionicons name="copy-outline" size={14} color={muted} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
