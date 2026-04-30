// src/screens/sms/ConfigScreen.js — SMS channel config hub.
// Mirrors icpaas.in /SMS/SendSms/Index?section=Config:
//   System Configuration: Manage SenderId, Manage Template, My Routes
//   Contact Manager:      Manage Group, Blacklist Numbers
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrand } from '../../theme';
import SectionHeader from '../../components/SectionHeader';
import ScreenHeader from '../../components/ScreenHeader';

const SYSTEM_CONFIG = [
  { id: 'senderId', label: 'Manage SenderId',  desc: 'Easily manage your Sender ID here.',     icon: 'megaphone',   tint: '#DBEAFE', fg: '#1D4ED8' },
  { id: 'template', label: 'Manage Template',  desc: 'Easily control your message templates.', icon: 'document-text', tint: '#D1FAE5', fg: '#047857' },
  { id: 'routes',   label: 'My Routes',        desc: 'Access and configure your message routes.', icon: 'git-network', tint: '#EDE9FE', fg: '#6D28D9' },
];

const CONTACT_MANAGER = [
  { id: 'group',     label: 'Manage Group',      desc: 'Easily manage your groups here.',           icon: 'people',           tint: '#FEF3C7', fg: '#B45309' },
  { id: 'blacklist', label: 'Blacklist Numbers', desc: 'Manage your blacklist for better control.', icon: 'shield-checkmark', tint: '#FEE2E2', fg: '#B91C1C' },
];

export default function ConfigScreen({ navigation }) {
  const c = useBrand();

  const goTo = (id) => {
    if (id === 'senderId') return navigation.navigate('SmsSenderIds');
    if (id === 'template') return navigation.navigate('SmsTemplates');
    if (id === 'group')    return navigation.navigate('Contacts', { tab: 'groups' });
    if (id === 'blacklist') return navigation.navigate('Contacts', { tab: 'blacklist' });
    // 'routes' has no dedicated screen yet — fall back to shared Config.
    navigation.navigate('Config');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        icon="chatbubble-outline"
        title="SMS Config"
        badge="SMS"
      />
      <ScrollView
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 130, paddingHorizontal: 18 }}
        showsVerticalScrollIndicator={false}
      >
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
