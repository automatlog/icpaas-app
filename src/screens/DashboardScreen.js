// src/screens/DashboardScreen.js — Home (NativeWind)
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, RefreshControl, useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { BalanceAPI, VoiceAPI, IVRAPI } from '../services/api';
import { logout as logoutAction } from '../store/slices/authSlice';

const ymd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
};

// Color tokens — inline for dynamic icons / gradients (NativeWind handles className)
const C = {
  dark: {
    bg: '#0A0A0D', bgSoft: '#141418', bgInput: '#1C1C22',
    ink: '#FFFFFF', muted: '#9A9AA2',
    gradA: '#FF4D7E', gradB: '#FF8A3D', gradC: '#B765E8',
    peach: '#E8B799', mint: '#8FCFBD', lavender: '#D4B3E8', yellow: '#E8D080', rose: '#F2A8B3', sage: '#9CB89A', clay: '#CB8A75',
    pink: '#FF4D7E',
  },
  light: {
    bg: '#FAFAFB', bgSoft: '#F2F2F5', bgInput: '#ECECEF',
    ink: '#0A0A0D', muted: '#5C5C63',
    gradA: '#E6428A', gradB: '#FF7A22', gradC: '#9A47D4',
    peach: '#E8B799', mint: '#8FCFBD', lavender: '#D4B3E8', yellow: '#E8D080', rose: '#F2A8B3', sage: '#9CB89A', clay: '#CB8A75',
    pink: '#E6428A',
  },
};

const HEADLINES = [
  { n: '01', kicker: 'VOICE · OBD',   title: 'Outbound dispatch holds steady through the night.', body: 'Campaigns cleared through the OGCall queue with low drop rates.', cta: 'Read ledger',   route: 'Report' },
  { n: '02', kicker: 'IVR · INBOUND', title: 'Inbound lines answered faster than last week.',    body: 'Answer rate improved versus prior period.',                         cta: 'View floor',    route: 'Agent'  },
  { n: '03', kicker: 'PRODUCT DECK',  title: 'Six channels, one bound edition.',                 body: 'WhatsApp, SMS, RCS, Voice, IVR and Campaigns.',                     cta: 'Press room',    route: 'ProductIcons' },
];

export default function DashboardScreen({ navigation }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;

  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const logout = () => dispatch(logoutAction());

  const [balance, setBalance] = useState(null);
  const [voiceRows, setVoiceRows] = useState(0);
  const [ivrRows, setIvrRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFront = useCallback(async () => {
    const today = new Date();
    const from = new Date(); from.setDate(today.getDate() - 7);
    const range = { fromDate: ymd(from), toDate: ymd(today) };

    const [bal, voice, ivr] = await Promise.allSettled([
      BalanceAPI.getBalance(),
      VoiceAPI.getDeliveryReport({ ...range, reportType: 'OBD' }),
      IVRAPI.getInboundReports({ ...range, exportToCsv: false }),
    ]);

    if (bal.status === 'fulfilled') setBalance(bal.value?.walletBalance ?? bal.value?.balance ?? null);
    if (voice.status === 'fulfilled') setVoiceRows((voice.value?.data || []).length);
    if (ivr.status === 'fulfilled') setIvrRows((ivr.value?.data || []).length);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchFront(); }, [fetchFront]);

  const rootBg = dark ? 'bg-bg' : 'bg-white';
  const softBg = dark ? 'bg-bgSoft' : 'bg-[#F2F2F5]';
  const textInk = dark ? 'text-ink' : 'text-[#0A0A0D]';
  const textMuted = dark ? 'text-textMuted' : 'text-[#5C5C63]';

  if (loading) {
    return (
      <View className={`flex-1 items-center justify-center ${rootBg}`}>
        <ActivityIndicator color={c.pink} />
        <Text className={`mt-3 text-xs tracking-widest uppercase ${textMuted}`}>loading feed</Text>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${rootBg}`}>
      <ScrollView
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 160 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFront(); }} tintColor={c.pink} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View className="flex-row items-center gap-2.5 px-5 mb-5">
          <View className="w-[46px] h-[46px] rounded-full items-center justify-center" style={{ backgroundColor: c.ink }}>
            <Ionicons name="infinite" size={20} color={c.bg} />
          </View>
          <TouchableOpacity className={`w-[46px] h-[46px] rounded-full items-center justify-center ${softBg}`} activeOpacity={0.7}>
            <Ionicons name="search" size={18} color={c.ink} />
          </TouchableOpacity>
          <View className="flex-1" />
          <View className="relative">
            <TouchableOpacity className={`w-[46px] h-[46px] rounded-full items-center justify-center ${softBg}`} activeOpacity={0.7} onPress={logout}>
              <Ionicons name="log-out-outline" size={18} color={c.ink} />
            </TouchableOpacity>
            <View
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full items-center justify-center border-2"
              style={{ backgroundColor: c.pink, borderColor: c.bg, paddingHorizontal: 4 }}
            >
              <Text className="text-[10px] font-bold" style={{ color: c.ink }}>9</Text>
            </View>
          </View>
        </View>

        {/* Greeting */}
        <View className="px-5 mb-4">
          <Text className={`text-sm font-normal ${textMuted}`}>{greet()},</Text>
          <Text className={`text-3xl font-bold tracking-tight mt-0.5 ${textInk}`}>
            {user?.name || user?.username || 'Editor'}.
          </Text>
        </View>

        {/* Wallet hero card */}
        <View className="mx-5 rounded-[28px] p-5 mb-3 min-h-[170px]" style={{ backgroundColor: c.peach }}>
          <Text className="text-[11px] font-bold tracking-[2px] uppercase" style={{ color: 'rgba(0,0,0,0.55)' }}>№ 01 · Wallet</Text>
          <Text className="text-xs mt-2 font-medium" style={{ color: 'rgba(0,0,0,0.65)' }}>Live balance · gsauth ledger</Text>
          <Text className="text-[46px] font-bold tracking-tight mt-0.5" style={{ color: '#0A0A0D' }}>
            ₹{balance !== null ? Number(balance).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}
          </Text>
          <Text className="text-xs mt-1.5 font-medium" style={{ color: 'rgba(0,0,0,0.55)' }}>Across six channels · updated now</Text>
          <TouchableOpacity
            className="mt-4 self-start rounded-[22px] px-4 py-2.5 flex-row items-center"
            style={{ backgroundColor: '#0A0A0D', gap: 8 }}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ProductIcons')}
          >
            <Text className="text-white text-[13px] font-semibold">Open press room</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Stat tiles */}
        <View className="flex-row px-5 mb-3" style={{ gap: 12 }}>
          <StatTile bg={c.mint} label="Voice · 7d" value={voiceRows} foot="dispatches" />
          <StatTile bg={c.lavender} label="IVR · 7d" value={ivrRows} foot="inbound calls" />
        </View>
        <View className="flex-row px-5 mb-4" style={{ gap: 12 }}>
          <StatTile bg={c.yellow} label="Channels" value="06" foot="live desks" />
          <StatTile bg={c.rose} label="Agents" value="08" foot="on floor" />
        </View>

        {/* CTA — gradient pill */}
        <View className="px-5 mb-5">
          <TouchableOpacity className="rounded-[32px] overflow-hidden" activeOpacity={0.9} onPress={() => navigation.navigate('ProductIcons')}>
            <LinearGradient
              colors={[c.gradA, c.gradB, c.gradC]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 12 }}
            >
              <View className="w-[26px] h-[26px] rounded-full items-center justify-center" style={{ borderWidth: 1.2, borderColor: c.ink }}>
                <Ionicons name="arrow-forward" size={14} color={c.ink} />
              </View>
              <Text className="text-base font-semibold" style={{ color: c.ink }}>Open Press Room</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Feed rows */}
        <View className="px-5 mt-2">
          <Text className={`text-lg font-semibold mb-2.5 ${textInk}`}>Quick feed</Text>

          <FeedRow c={c} softBg={softBg} textInk={textInk} textMuted={textMuted} tint={c.peach} icon="send" name="Send Message" meta="WhatsApp · SMS · RCS · Voice" onPress={() => navigation.navigate('Send')} />
          <FeedRow c={c} softBg={softBg} textInk={textInk} textMuted={textMuted} tint={c.rose} icon="document-text" name="Templates" meta="WhatsApp · SMS · RCS catalogue" onPress={() => navigation.navigate('Templates')} />
          <FeedRow c={c} softBg={softBg} textInk={textInk} textMuted={textMuted} tint={c.lavender} icon="settings" name="Config & Channels" meta="gsauth token · WA · SMS · RCS" onPress={() => navigation.navigate('Config')} />
          <FeedRow c={c} softBg={softBg} textInk={textInk} textMuted={textMuted} tint={c.mint} icon="stats-chart" name="Voice Ledger" meta="OBD + IBD reports · 14-day window" onPress={() => navigation.navigate('Report')} />
          <FeedRow c={c} softBg={softBg} textInk={textInk} textMuted={textMuted} tint={c.yellow} icon="people" name="Agent Floor" meta="Roster · availability · queue" onPress={() => navigation.navigate('Agent')} />
          <FeedRow c={c} softBg={softBg} textInk={textInk} textMuted={textMuted} tint={c.sage} icon="megaphone" name="Campaigns" meta="Plan, segment, launch" onPress={() => navigation.navigate('CampaignStep1')} />
        </View>
      </ScrollView>

      {/* Floating dock */}
      <View
        className={`absolute bottom-6 left-4 right-4 flex-row items-center rounded-[32px] py-2 px-2 ${softBg}`}
        style={{ gap: 6, borderWidth: 1, borderColor: c.bgInput }}
      >
        <TouchableOpacity className="w-12 h-12 rounded-full p-0.5" activeOpacity={0.8} onPress={() => navigation.navigate('Send')}>
          <LinearGradient colors={[c.gradA, c.gradB, c.gradC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderRadius: 24 }}>
            <View className="flex-1 rounded-[22px] items-center justify-center" style={{ backgroundColor: c.bg }}>
              <Ionicons name="send" size={18} color={c.ink} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Templates')} activeOpacity={0.7}>
          <Text className={`text-sm font-medium px-2.5 ${textInk}`}>Templates</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Config')} activeOpacity={0.7}>
          <Text className={`text-sm font-medium px-2.5 ${textInk}`}>Config</Text>
        </TouchableOpacity>
        <View className="flex-1" />
        <TouchableOpacity
          onPress={() => navigation.navigate('ProductIcons')}
          activeOpacity={0.7}
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: c.peach }}
        >
          <Ionicons name="grid" size={20} color="#0A0A0D" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const StatTile = ({ bg, label, value, foot }) => (
  <View className="flex-1 rounded-[22px] p-4 min-h-[120px] justify-between" style={{ backgroundColor: bg }}>
    <Text className="text-[10px] font-bold tracking-[1.8px] uppercase" style={{ color: 'rgba(0,0,0,0.55)' }}>{label}</Text>
    <View>
      <Text className="text-[32px] font-bold tracking-tight" style={{ color: '#0A0A0D' }}>{value}</Text>
      <Text className="text-[11px] font-medium" style={{ color: 'rgba(0,0,0,0.6)' }}>{foot}</Text>
    </View>
  </View>
);

const FeedRow = ({ c, softBg, textInk, textMuted, tint, icon, name, meta, onPress }) => (
  <TouchableOpacity
    className={`flex-row items-center rounded-[20px] p-3.5 mb-2.5 ${softBg}`}
    style={{ gap: 12, borderWidth: 1, borderColor: c.bgInput }}
    activeOpacity={0.8}
    onPress={onPress}
  >
    <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: tint }}>
      <Ionicons name={icon} size={18} color="#0A0A0D" />
    </View>
    <View className="flex-1">
      <Text className={`text-[15px] font-semibold ${textInk}`}>{name}</Text>
      <Text className={`text-xs mt-0.5 ${textMuted}`}>{meta}</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color={c.muted} />
  </TouchableOpacity>
);
