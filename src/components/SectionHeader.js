// src/components/SectionHeader.js — small icon circle + title row.
// Optional `right` slot for inline pills, links, refresh buttons, etc.
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SectionHeader({ c, icon, title, right, style }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }, style]}>
      {icon ? (
        <View
          style={{
            width: 26, height: 26, borderRadius: 13,
            backgroundColor: c.primarySoft,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={14} color={c.primary} />
        </View>
      ) : null}
      <Text style={{ color: c.text, fontSize: 14, fontWeight: '700', flex: 1 }}>{title}</Text>
      {right || null}
    </View>
  );
}
