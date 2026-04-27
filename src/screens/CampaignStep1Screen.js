// src/screens/CampaignStep1Screen.js — Campaign wizard · Step 1 · Details
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Platform, Alert, useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp',      tint: '#8FCFBD' },
  { id: 'sms',      label: 'SMS',      icon: 'chatbubble-outline', tint: '#F2A8B3' },
  { id: 'rcs',      label: 'RCS',      icon: 'card-outline',       tint: '#D4B3E8' },
  { id: 'voice',    label: 'Voice',    icon: 'call-outline',       tint: '#E8D080' },
];

const C = {
  dark:  { bg: '#0A0A0D', bgSoft: '#141418', bgInput: '#1C1C22', ink: '#FFFFFF', muted: '#9A9AA2', dim: '#5C5C63' },
  light: { bg: '#FAFAFB', bgSoft: '#F2F2F5', bgInput: '#ECECEF', ink: '#0A0A0D', muted: '#5C5C63', dim: '#9A9AA2' },
};

export default function CampaignStep1Screen({ navigation, route }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;

  const seed = route?.params?.draft || {};
  const [name, setName] = useState(seed.name || '');
  const [channel, setChannel] = useState(seed.channel || 'whatsapp');
  const [description, setDescription] = useState(seed.description || '');

  const next = () => {
    if (!name.trim()) { Alert.alert('Required', 'Enter a campaign name.'); return; }
    navigation.navigate('CampaignStep2', { draft: { ...seed, name: name.trim(), channel, description: description.trim() } });
  };

  const rootBg = dark ? 'bg-bg' : 'bg-white';
  const softBg = dark ? 'bg-bgSoft' : 'bg-[#F2F2F5]';
  const textInk = dark ? 'text-ink' : 'text-[#0A0A0D]';
  const textMuted = dark ? 'text-textMuted' : 'text-[#5C5C63]';

  return (
    <View className={`flex-1 ${rootBg}`}>
      <ScrollView contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 22, paddingBottom: 140 }}>
        {/* Header */}
        <View className="flex-row items-center mb-5" style={{ gap: 10 }}>
          <TouchableOpacity className={`w-[42px] h-[42px] rounded-full items-center justify-center ${softBg}`} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={c.ink} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className={`text-[11px] font-semibold tracking-widest uppercase ${textMuted}`}>Step 1 of 3</Text>
            <Text className={`text-[24px] font-bold tracking-tight ${textInk}`}>Campaign details</Text>
          </View>
        </View>

        {/* Step indicator */}
        <Stepper current={1} dark={dark} c={c} />

        <Label cls={textMuted}>Campaign name</Label>
        <View className={`rounded-[18px] px-4 ${softBg}`}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Summer Sale · WhatsApp Blast"
            placeholderTextColor={c.muted}
            className={`py-3 text-sm ${textInk}`}
            style={Platform.select({ web: { outlineStyle: 'none' } })}
          />
        </View>

        <Label cls={textMuted}>Channel</Label>
        <View className="flex-row flex-wrap mb-3" style={{ gap: 8 }}>
          {CHANNELS.map((ch) => {
            const active = channel === ch.id;
            return (
              <TouchableOpacity
                key={ch.id}
                onPress={() => setChannel(ch.id)}
                activeOpacity={0.8}
                className="flex-row items-center py-2.5 px-3.5 rounded-[18px]"
                style={{ backgroundColor: active ? ch.tint : (dark ? '#141418' : '#F2F2F5'), gap: 8 }}
              >
                <Ionicons name={ch.icon} size={14} color={active ? '#0A0A0D' : c.muted} />
                <Text className="text-sm" style={{ color: active ? '#0A0A0D' : c.muted, fontWeight: active ? '700' : '500' }}>
                  {ch.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Label cls={textMuted}>Description (optional)</Label>
        <View className={`rounded-[18px] px-4 ${softBg}`}>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What is this campaign about?"
            placeholderTextColor={c.muted}
            multiline
            className={`py-3 text-sm ${textInk}`}
            style={[{ minHeight: 100, textAlignVertical: 'top' }, Platform.select({ web: { outlineStyle: 'none' } })]}
          />
        </View>

        <TouchableOpacity
          onPress={next}
          activeOpacity={0.88}
          className="mt-6 rounded-[28px] py-4 items-center justify-center flex-row"
          style={{ backgroundColor: c.ink, gap: 10 }}
        >
          <Text className="text-[15px] font-bold" style={{ color: c.bg }}>Continue</Text>
          <Ionicons name="arrow-forward" size={16} color={c.bg} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const Label = ({ cls, children }) => (
  <Text className={`text-[11px] font-semibold tracking-widest uppercase mb-2 mt-3 ${cls}`}>{children}</Text>
);

const Stepper = ({ current, dark, c }) => (
  <View className="flex-row mb-5" style={{ gap: 6 }}>
    {[1, 2, 3].map((n) => (
      <View
        key={n}
        className="flex-1 h-1 rounded-full"
        style={{ backgroundColor: n <= current ? c.ink : (dark ? '#1C1C22' : '#ECECEF') }}
      />
    ))}
  </View>
);
