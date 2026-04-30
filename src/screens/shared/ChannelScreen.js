// src/screens/ChannelScreen.js — Per-channel landing
// Matches whatsapp/sms/rcs/voice white.png references
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrand } from '../../theme';
import { BalanceAPI, VoiceAPI, IVRAPI, TemplatesAPI } from '../../services/api';
import { BottomTabBar } from './DashboardScreen';
import ScreenHeader from '../../components/ScreenHeader';

const PROFILES = {
  whatsapp: {
    label: 'WhatsApp', icon: 'logo-whatsapp', tag: 'Active', subtitle: 'Connected',
    blurb: 'Engage with your customers on WhatsApp',
    statLabels: ['Messages Sent', 'Delivered', 'Contacts', 'Response Rate'],
    fakeStats: ['1,248', '956', '356', '76%'],
    fakeDeltas: ['18.6%', '12.4%', '9.7%', '15.2%'],
    toolsTitle: 'WhatsApp Tools',
  },
  sms: {
    label: 'SMS', icon: 'chatbubble-outline', tag: 'Active', subtitle: 'Connected',
    blurb: 'Send and manage SMS campaigns at scale',
    statLabels: ['Messages Sent', 'Delivered', 'Contacts', 'Delivery Rate'],
    fakeStats: ['1,134', '874', '412', '81%'],
    fakeDeltas: ['18.6%', '12.4%', '9.7%', '15.2%'],
    toolsTitle: 'SMS Tools',
  },
  rcs: {
    label: 'RCS', icon: 'card-outline', tag: 'Active', subtitle: 'Connected',
    blurb: 'Build rich and interactive conversations with RCS',
    statLabels: ['Messages Sent', 'Delivered', 'Contacts', 'Response Rate'],
    fakeStats: ['842', '612', '256', '78%'],
    fakeDeltas: ['18.6%', '12.4%', '9.7%', '15.2%'],
    toolsTitle: 'RCS Tools',
  },
  voice: {
    label: 'Voice', icon: 'call', tag: 'Active', subtitle: 'Connected',
    blurb: 'Make, receive and manage voice calls at scale',
    statLabels: ['Calls Made', 'Calls Received', 'Contacts', 'Answer Rate'],
    fakeStats: ['624', '512', '236', '78%'],
    fakeDeltas: ['18.6%', '12.4%', '9.7%', '15.2%'],
    toolsTitle: 'Voice Tools',
  },
};

// Per-channel route map: each product has its own Inbox/Templates/Identity etc.
const ROUTES = {
  whatsapp: {
    inbox: 'WhatsAppInbox',
    campaignStart: 'WhatsAppCampaignStep1',
    templates: 'WhatsAppTemplates',
    identityScreen: 'WabaChannels',
    identityLabel: 'WABA Channels',
    identityDesc: 'WhatsApp Business numbers',
    identityIcon: 'logo-whatsapp',
  },
  rcs: {
    inbox: 'RcsInbox',
    campaignStart: 'RcsCampaign',
    templates: 'RcsTemplates',
    identityScreen: 'RcsBotIds',
    identityLabel: 'Bot IDs',
    identityDesc: 'Manage RCS bot agents',
    identityIcon: 'card',
  },
  sms: {
    inbox: 'SmsInbox',
    campaignStart: 'SmsCampaign',
    templates: 'SmsTemplates',
    identityScreen: 'SmsSenderIds',
    identityLabel: 'Sender IDs',
    identityDesc: 'DLT-registered SMS senders',
    identityIcon: 'chatbubble',
  },
  voice: {
    inbox: null,
    campaignStart: 'VoiceCampaign',
    templates: null,
    identityScreen: 'VoiceCallerIds',
    identityLabel: 'Caller IDs',
    identityDesc: 'Outbound caller numbers',
    identityIcon: 'call',
    configScreen: 'VoiceConfig',
  },
};

// Tools per channel — skips items that don't apply (e.g. voice has no inbox).
const TOOLS = (id, navigation) => {
  const r = ROUTES[id] || ROUTES.whatsapp;
  const items = [];

  if (r.inbox) {
    items.push({ icon: 'chatbubbles', tint: '#10B981', tintBg: '#D1FAE5', label: 'Live Agent', desc: 'Chat in real time', badge: '12 Active', onPress: () => navigation.navigate(r.inbox) });
  }
  if (r.campaignStart) {
    items.push({ icon: 'megaphone', tint: '#8B5CF6', tintBg: '#EDE9FE', label: 'Campaign', desc: 'Create & manage campaigns', onPress: () => navigation.navigate(r.campaignStart) });
  }
  items.push({ icon: 'flash', tint: '#3B82F6', tintBg: '#DBEAFE', label: 'Automation', desc: 'Automate workflows and auto-replies', onPress: () => {} });
  if (r.templates) {
    items.push({ icon: 'document-text', tint: '#10B981', tintBg: '#D1FAE5', label: 'Templates', desc: 'Manage message templates', onPress: () => navigation.navigate(r.templates) });
  }
  if (r.identityScreen) {
    items.push({ icon: r.identityIcon, tint: '#0B8A6F', tintBg: '#D1FAE5', label: r.identityLabel, desc: r.identityDesc, onPress: () => navigation.navigate(r.identityScreen) });
  }
  items.push({ icon: 'people', tint: '#8B5CF6', tintBg: '#EDE9FE', label: 'Contacts', desc: 'Manage & segment contacts', onPress: () => navigation.navigate('Contacts') });
  items.push({ icon: 'bar-chart', tint: '#EC4899', tintBg: '#FCE7F3', label: 'Reports', desc: 'View analytics & performance', onPress: () => navigation.navigate('Report') });
  items.push({ icon: 'settings', tint: '#3B82F6', tintBg: '#DBEAFE', label: 'Config', desc: 'Manage channel preferences', onPress: () => navigation.navigate(r.configScreen || 'Config') });
  items.push({ icon: 'code-slash', tint: '#10B981', tintBg: '#D1FAE5', label: 'API Docs', desc: `Integrate ${id.toUpperCase()} using our API`, onPress: () => navigation.navigate('ApiDocs', { product: id }) });

  return items;
};

export default function ChannelScreen({ navigation, route }) {
  const c = useBrand();
  const channelId = route?.params?.channel || 'whatsapp';
  const profile = PROFILES[channelId] || PROFILES.whatsapp;

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(profile.fakeStats);

  const fetch = useCallback(async () => {
    try {
      if (channelId === 'voice') {
        const today = new Date();
        const from = new Date(); from.setDate(today.getDate() - 7);
        const range = {
          fromDate: ymd(from), toDate: ymd(today), reportType: 'OBD',
        };
        const res = await VoiceAPI.getDeliveryReport(range);
        const total = (res?.data || []).length;
        setStats([String(total), String(Math.floor(total * 0.7)), profile.fakeStats[2], profile.fakeStats[3]]);
      }
    } catch {}
    setRefreshing(false);
  }, [channelId]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        icon={profile.icon}
        title={profile.label}
        badge={profile.tag}
        subtitle={{ text: profile.subtitle, dotColor: c.success }}
        right={
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate(ROUTES[channelId]?.configScreen || 'Config')}
            style={{
              width: 36, height: 36, borderRadius: 18,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: c.bgInput,
            }}
          >
            <Ionicons name="settings-outline" size={16} color={c.text} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={c.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[12px] px-4 mb-3" style={{ color: c.textMuted }}>{profile.blurb}</Text>

        {/* Search */}
        <View
          className="flex-row items-center rounded-[14px] px-4 mx-4 mb-4"
          style={{ backgroundColor: c.bgInput, gap: 10 }}
        >
          <Ionicons name="search-outline" size={16} color={c.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search contacts, messages or campaigns…"
            placeholderTextColor={c.textMuted}
            className="flex-1 text-[13px]"
            style={[
              { paddingVertical: Platform.OS === 'ios' ? 11 : 9, color: c.text },
              Platform.select({ web: { outlineStyle: 'none' } }),
            ]}
          />
          <Ionicons name="options-outline" size={16} color={c.textMuted} />
        </View>

        {/* Today's Overview */}
        <View className="flex-row items-center justify-between px-4 mb-2">
          <Text className="text-[15px] font-bold" style={{ color: c.text }}>Today's Overview</Text>
          <TouchableOpacity className="flex-row items-center px-3 py-1 rounded-[10px]" style={{ backgroundColor: c.bgInput, gap: 6 }}>
            <Text className="text-[11px] font-semibold" style={{ color: c.text }}>Today</Text>
            <Ionicons name="chevron-down" size={11} color={c.textMuted} />
          </TouchableOpacity>
        </View>
        <View className="flex-row flex-wrap px-4" style={{ gap: 10 }}>
          {profile.statLabels.map((label, i) => (
            <ChannelStat
              key={label}
              c={c}
              icon={STAT_ICONS[i]}
              tint={STAT_COLORS[i].fg}
              tintBg={STAT_COLORS[i].bg}
              label={label}
              value={stats[i]}
              delta={profile.fakeDeltas[i]}
            />
          ))}
        </View>

        {/* Performance callout */}
        <View
          className="flex-row items-center rounded-[16px] mx-4 mt-4 p-3.5"
          style={{ backgroundColor: c.primarySoft, gap: 12 }}
        >
          <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: c.primary }}>
            <Ionicons name="trending-up" size={18} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-[13px] font-bold" style={{ color: c.primaryDeep }}>Great job!</Text>
            <Text className="text-[11px]" style={{ color: c.primaryDeep }}>Your performance is higher than yesterday.</Text>
          </View>
          <TouchableOpacity className="rounded-[10px] px-3 py-1.5" style={{ backgroundColor: c.primary }}>
            <Text className="text-[11px] font-bold text-white">View Analytics</Text>
          </TouchableOpacity>
        </View>

        {/* Tools section */}
        <Text className="text-[15px] font-bold px-4 mt-6 mb-3" style={{ color: c.text }}>{profile.toolsTitle}</Text>
        <View className="flex-row flex-wrap px-4" style={{ gap: 10 }}>
          {TOOLS(channelId, navigation).map((t) => (
            <ToolTile key={t.label} c={c} {...t} />
          ))}
        </View>
      </ScrollView>

      <BottomTabBar c={c} navigation={navigation} active="home" />
    </View>
  );
}

const STAT_ICONS = ['chatbubble-ellipses', 'send', 'people', 'time'];
const STAT_COLORS = [
  { fg: '#10B981', bg: '#D1FAE5' },
  { fg: '#8B5CF6', bg: '#EDE9FE' },
  { fg: '#3B82F6', bg: '#DBEAFE' },
  { fg: '#F59E0B', bg: '#FEF3C7' },
];

function ChannelStat({ c, icon, tint, tintBg, label, value, delta }) {
  return (
    <View className="rounded-[14px] p-3" style={{ width: '48%', backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}>
      <View className="w-7 h-7 rounded-full items-center justify-center mb-2" style={{ backgroundColor: tintBg }}>
        <Ionicons name={icon} size={14} color={tint} />
      </View>
      <Text className="text-[18px] font-extrabold" style={{ color: c.text }}>{value}</Text>
      <Text className="text-[11px] mb-1" style={{ color: c.textMuted }}>{label}</Text>
      <View className="flex-row items-center" style={{ gap: 4 }}>
        <Ionicons name="arrow-up" size={10} color={c.success} />
        <Text className="text-[10px] font-bold" style={{ color: c.success }}>{delta}</Text>
        <Text className="text-[10px]" style={{ color: c.textDim }}>vs yesterday</Text>
      </View>
    </View>
  );
}

function ToolTile({ c, icon, tint, tintBg, label, desc, badge, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="rounded-[14px] p-3 relative"
      style={{ width: '48%', backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}
    >
      <Ionicons name="chevron-forward" size={11} color={c.textDim} style={{ position: 'absolute', top: 10, right: 10 }} />
      <View className="w-9 h-9 rounded-[10px] items-center justify-center mb-2" style={{ backgroundColor: tintBg }}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text className="text-[13px] font-bold" style={{ color: c.text }}>{label}</Text>
      <Text className="text-[10px] mt-0.5" style={{ color: c.textMuted }} numberOfLines={2}>{desc}</Text>
      {badge ? (
        <View className="rounded-full px-2 py-0.5 mt-2 self-start" style={{ backgroundColor: c.primarySoft }}>
          <Text className="text-[9px] font-bold" style={{ color: c.primaryDeep }}>{badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const ymd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
