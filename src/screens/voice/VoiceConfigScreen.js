// src/screens/voice/VoiceConfigScreen.js — Voice channel config hub.
// Mirrors UI image/Voice Config Screen.png. Two grouped sections of cards:
// System Configuration and Contact Manager. Tapping a card routes to a
// dedicated manager (placeholders for now — wire as endpoints come online).
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrand } from '../../theme';
import SectionHeader from '../../components/SectionHeader';

const SYSTEM_CONFIG = [
  { id: 'voiceFiles',   label: 'Voice Files',     desc: 'Add Description Here.', icon: 'musical-notes',          tint: '#FED7AA', fg: '#C2410C' },
  { id: 'components',   label: 'Components',      desc: 'Add Description Here.', icon: 'cube',                   tint: '#DBEAFE', fg: '#1D4ED8' },
  { id: 'agents',       label: 'Manage Agents',   desc: 'Add Description Here.', icon: 'people-circle',          tint: '#D1FAE5', fg: '#047857' },
  { id: 'remarks',      label: 'Manage Remarks',  desc: 'Add Description Here.', icon: 'chatbubble-ellipses',    tint: '#FCE7F3', fg: '#BE185D' },
  { id: 'mscCodes',     label: 'Manage MSCCodes', desc: 'Add Description Here.', icon: 'grid',                   tint: '#EDE9FE', fg: '#6D28D9' },
];

const CONTACT_MANAGER = [
  { id: 'group',     label: 'Manage Group',      desc: 'Easily manage your groups here.',         icon: 'people',          tint: '#FEF3C7', fg: '#B45309' },
  { id: 'blacklist', label: 'Blacklist Numbers', desc: 'Manage your blacklist for better control.', icon: 'shield-checkmark', tint: '#FEE2E2', fg: '#B91C1C' },
];

export default function VoiceConfigScreen({ navigation }) {
  const c = useBrand();

  const goTo = (id) => {
    if (id === 'voiceFiles') return navigation.navigate('MediaLibrary');
    if (id === 'agents')     return navigation.navigate('Agent');
    if (id === 'group')      return navigation.navigate('Contacts', { tab: 'groups' });
    if (id === 'blacklist')  return navigation.navigate('Contacts', { tab: 'blacklist' });
    // Placeholders for managers without a dedicated screen yet.
    navigation.navigate('Config');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 130, paddingHorizontal: 18 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center mb-4" style={{ gap: 10 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} className="w-9 h-9 items-center justify-center">
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
          <Text className="flex-1 text-[18px] font-extrabold text-center" style={{ color: c.text }}>
            Voice Config
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <SectionHeader c={c} icon="megaphone-outline" title="System Configuration" />
        <View style={{ gap: 10, marginBottom: 24 }}>
          {SYSTEM_CONFIG.map((item) => (
            <ConfigCard key={item.id} c={c} item={item} onPress={() => goTo(item.id)} />
          ))}
        </View>

        <SectionHeader c={c} icon="people-outline" title="Contact Manager" />
        <View style={{ gap: 10 }}>
          {CONTACT_MANAGER.map((item) => (
            <ConfigCard key={item.id} c={c} item={item} onPress={() => goTo(item.id)} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const ConfigCard = ({ c, item, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: 14,
      gap: 14,
    }}
  >
    <View
      style={{
        width: 46, height: 46, borderRadius: 12,
        backgroundColor: item.tint,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Ionicons name={item.icon} size={22} color={item.fg} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ color: c.text, fontSize: 14, fontWeight: '700' }}>{item.label}</Text>
      <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}>{item.desc}</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color={c.textDim} />
  </TouchableOpacity>
);
