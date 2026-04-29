// src/components/FormField.js — labelled form row.
// <FormField c={c} label="Name *" hint="..." icon="megaphone-outline" flex>
//   <TextInput style={inputStyle(c)} ... />
// </FormField>
//
// Two label styles:
//  - default → 12px / weight 600, sentence case (campaign forms).
//  - caps    → 10px / bold / uppercase / wide tracking (older Profile,
//              Contacts, CreateTemplate, AddRecipients forms).
//
// Props:
//   label    (required)
//   required → renders red * after label
//   hint     → small muted line under the field
//   icon     → leading Ionicon next to the label
//   right    → component aligned to the end of the label row
//   flex     → makes the field flex:1 for two-column rows
//   caps     → toggles the older uppercase label visual
//
// `inputStyle(c)` is a shared style helper for TextInputs and dropdown
// triggers. Pass the brand theme `c` so border / bg / text follow theme.
import React from 'react';
import { View, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const inputStyle = (c) => ({
  backgroundColor: c.bgCard,
  borderWidth: 1,
  borderColor: c.border,
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  fontSize: 14,
  color: c.text,
  ...Platform.select({ web: { outlineStyle: 'none' } }),
});

export default function FormField({
  c,
  label,
  required,
  hint,
  icon,
  right,
  flex,
  caps = false,
  style,
  children,
}) {
  const labelStyle = caps
    ? {
        color: c.textMuted,
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.4,
      }
    : {
        color: c.text,
        fontSize: 12,
        fontWeight: '600',
      };

  return (
    <View
      style={[
        { marginBottom: caps ? 12 : 14, flex: flex ? 1 : undefined },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 6,
          gap: 6,
        }}
      >
        {icon ? <Ionicons name={icon} size={caps ? 11 : 12} color={c.textMuted} /> : null}
        <Text style={[labelStyle, { flex: right ? 1 : 0 }]}>
          {label}
          {required ? <Text style={{ color: c.danger }}>  *</Text> : null}
        </Text>
        {right || null}
      </View>
      {children}
      {hint ? (
        <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 6 }}>{hint}</Text>
      ) : null}
    </View>
  );
}
