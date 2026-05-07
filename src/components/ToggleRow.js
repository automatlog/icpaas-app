// src/components/ToggleRow.js — Switch row used in campaign / settings forms.
// `help` adds a question-mark glyph and an explanatory line under the label.
import React from 'react';
import { View, Text, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import haptics from '../services/haptics';

export default function ToggleRow({ c, label, help, value, onChange, divider = true }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: c.rule,
        gap: 10,
      }}
    >
      <Switch
        value={value}
        onValueChange={(v) => { haptics.select(); onChange?.(v); }}
        trackColor={{ false: c.bgInput, true: c.primary }}
        thumbColor="#FFFFFF"
      />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: c.text, fontSize: 13, fontWeight: '600' }}>{label}</Text>
          {help ? (
            <View
              style={{
                width: 14, height: 14, borderRadius: 7,
                backgroundColor: c.bgInput,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="help" size={9} color={c.textMuted} />
            </View>
          ) : null}
        </View>
        {help ? <Text style={{ color: c.textMuted, fontSize: 10, marginTop: 2 }}>{help}</Text> : null}
      </View>
    </View>
  );
}
