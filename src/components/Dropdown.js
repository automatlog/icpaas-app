// src/components/Dropdown.js — controlled inline dropdown.
// `value` is the visible label, `selectedId` highlights an option.
// Options: [{ id, label, sub? }]. Caller controls `open` state.
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { inputStyle } from './FormField';

export default function Dropdown({
  c,
  placeholder = 'Select',
  value,
  open,
  onToggle,
  options = [],
  selectedId,
  onSelect,
  maxHeight = 220,
}) {
  return (
    <>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.85}
        style={{
          ...inputStyle(c),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 12,
        }}
      >
        <Text numberOfLines={1} style={{ color: value ? c.text : c.textMuted, fontSize: 14, flex: 1 }}>
          {value || placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={c.textMuted} />
      </TouchableOpacity>
      {open ? (
        <View
          style={{
            marginTop: 6,
            backgroundColor: c.bgCard,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 10,
            maxHeight,
            overflow: 'hidden',
          }}
        >
          <ScrollView nestedScrollEnabled>
            {options.length === 0 ? (
              <Text style={{ color: c.textMuted, padding: 14, fontSize: 12 }}>No options.</Text>
            ) : (
              options.map((o) => {
                const active = o.id === selectedId;
                return (
                  <TouchableOpacity
                    key={o.id}
                    onPress={() => onSelect(o)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: c.border,
                      backgroundColor: active ? c.primarySoft : 'transparent',
                      gap: 10,
                    }}
                  >
                    <Ionicons
                      name={active ? 'radio-button-on' : 'radio-button-off'}
                      size={14}
                      color={active ? c.primary : c.textMuted}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{o.label}</Text>
                      {o.sub ? (
                        <Text style={{ color: c.textMuted, fontSize: 10, marginTop: 2 }} numberOfLines={1}>{o.sub}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      ) : null}
    </>
  );
}
