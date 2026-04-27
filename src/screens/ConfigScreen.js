// src/screens/ConfigScreen.js — matches UI image/Config Screen.png
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrand } from '../theme';
import { BottomTabBar } from './DashboardScreen';

const SECTIONS = (navigation) => [
  {
    title: 'Channel & Templates Management',
    rows: [
      {
        title: 'Waba Channels',
        subtitle: 'Easily Connect and manage WABA Channels.',
        icon: 'logo-whatsapp',
        tint: '#0EA5E9', tintBg: '#DBEAFE',
        onPress: () => navigation.navigate('WabaChannels'),
      },
      {
        title: 'Manage Template',
        subtitle: 'Easily Manage your WhatsApp Template.',
        icon: 'document-text',
        tint: '#3B82F6', tintBg: '#DBEAFE',
        onPress: () => navigation.navigate('Templates'),
      },
      {
        title: 'Template Library',
        subtitle: 'Browse approved template library.',
        icon: 'library',
        tint: '#8B5CF6', tintBg: '#EDE9FE',
        onPress: () => navigation.navigate('Templates'),
      },
      {
        title: 'Media Library',
        subtitle: 'Browse media library.',
        icon: 'images',
        tint: '#EC4899', tintBg: '#FCE7F3',
        onPress: () => navigation.navigate('MediaLibrary'),
      },
      {
        title: 'API Docs',
        subtitle: 'Endpoint reference per product.',
        icon: 'code-slash',
        tint: '#10B981', tintBg: '#D1FAE5',
        onPress: () => navigation.navigate('ApiDocs'),
      },
    ],
  },
  {
    title: 'Contact Manager',
    rows: [
      {
        title: 'WhatsApp Contact',
        subtitle: 'Manage your Contact.',
        icon: 'people',
        tint: '#10B981', tintBg: '#D1FAE5',
        onPress: () => {},
      },
      {
        title: 'Unsubscriber Number List',
        subtitle: 'View and manage unsubscribed numbers.',
        icon: 'remove-circle',
        tint: '#22C55E', tintBg: '#D1FAE5',
        onPress: () => {},
      },
      {
        title: 'Manage Group',
        subtitle: 'Easily manage your groups here.',
        icon: 'people-circle',
        tint: '#F472B6', tintBg: '#FCE7F3',
        onPress: () => {},
      },
      {
        title: 'Blacklist Numbers',
        subtitle: 'Manage your blacklist for better control.',
        icon: 'ban',
        tint: '#EF4444', tintBg: '#FEE2E2',
        onPress: () => {},
      },
    ],
  },
];

export default function ConfigScreen({ navigation }) {
  const c = useBrand();
  const sections = SECTIONS(navigation);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View
        className="flex-row items-center px-4"
        style={{
          paddingTop: Platform.OS === 'ios' ? 56 : 36,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: c.rule,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} className="w-10 h-10 items-center justify-center">
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </TouchableOpacity>
        <Text className="flex-1 text-[18px] font-bold text-center" style={{ color: c.text }}>Config</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {sections.map((sec) => (
          <View
            key={sec.title}
            className="rounded-[20px] mb-4 overflow-hidden"
            style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}
          >
            <View
              className="flex-row items-center px-4 py-3.5"
              style={{ borderBottomWidth: 1, borderBottomColor: c.rule, gap: 8 }}
            >
              <Ionicons name="megaphone" size={16} color={c.primary} />
              <Text className="text-[15px] font-bold" style={{ color: c.text }}>{sec.title}</Text>
            </View>
            {sec.rows.map((r, i) => (
              <Row
                key={r.title}
                c={c}
                last={i === sec.rows.length - 1}
                {...r}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      <BottomTabBar c={c} navigation={navigation} active="you" />
    </View>
  );
}

function Row({ c, icon, tint, tintBg, title, subtitle, onPress, last }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="flex-row items-center px-4 py-3.5"
      style={{ gap: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.rule }}
    >
      <View className="w-12 h-12 rounded-[14px] items-center justify-center" style={{ backgroundColor: tintBg }}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <View className="flex-1">
        <Text className="text-[14px] font-bold" style={{ color: c.text }}>{title}</Text>
        <Text className="text-[11px] mt-0.5" style={{ color: c.textMuted }}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
    </TouchableOpacity>
  );
}
