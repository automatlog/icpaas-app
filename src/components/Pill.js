// src/components/Pill.js — compact label/value badge.
// Two layouts:
//  - inline (default): "Total: 12" on one line — used in section headers.
//  - stacked: value on top, label below — used in stats clusters.
// Pass `bg` / `fg` for tone-coloured pills (e.g. counts in the SMS / Voice
// campaign screens). Without those, falls back to the brand theme.
import React from 'react';
import { View, Text } from 'react-native';

export default function Pill({
  c,
  label,
  value,
  bg,
  fg,
  layout = 'inline',
  style,
}) {
  const background = bg || c?.bgInput || '#F3F4F6';
  const foreground = fg || c?.text || '#111827';
  const labelColor = bg ? fg : (c?.textMuted || '#6B7280');

  if (layout === 'stacked') {
    return (
      <View
        style={[{
          flex: 1,
          paddingVertical: 8,
          paddingHorizontal: 10,
          backgroundColor: background,
          borderRadius: 8,
          alignItems: 'center',
        }, style]}
      >
        <Text style={{ color: foreground, fontSize: 13, fontWeight: '700' }}>{value}</Text>
        <Text style={{ color: labelColor, fontSize: 10, marginTop: 2 }}>{label}</Text>
      </View>
    );
  }

  return (
    <View
      style={[{
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: background,
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }, style]}
    >
      <Text style={{ color: labelColor, fontSize: 10, fontWeight: '600' }}>{label}:</Text>
      <Text style={{ color: foreground, fontSize: 11, fontWeight: '800' }}>{value}</Text>
    </View>
  );
}
