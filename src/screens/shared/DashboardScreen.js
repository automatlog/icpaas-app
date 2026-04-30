// src/screens/DashboardScreen.js — Brand Home (matches Home black/white.png)
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useBrand } from '../../theme';
import { BalanceAPI, VoiceAPI, IVRAPI } from '../../services/api';
import { selectUnreadCount, pushNotification } from '../../store/slices/notificationsSlice';
import Banner from '../../components/Banner';
import toast from '../../services/toast';

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Good Night';
};

const ymd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp',      count: 32 },
  { id: 'rcs',      label: 'RCS',      icon: 'card-outline',       count: 14 },
  { id: 'voice',    label: 'Voice',    icon: 'call',               count: 8  },
  { id: 'sms',      label: 'SMS',      icon: 'chatbubble-outline', count: 21 },
];

const ACTIVITY = [
  { id: '1', icon: 'send',          title: 'Campaign "New Offer" sent',         sub: '1,248 messages sent successfully',         time: '05:34 PM', status: 'Completed' },
  { id: '2', icon: 'chatbubble',    title: 'New chat from +91 98765 43210',     sub: 'Need help with my order',                  time: '04:18 PM', status: 'New' },
  { id: '3', icon: 'flash',         title: 'Automation "Welcome Flow" triggered', sub: 'Sent welcome message to new contact',    time: '02:45 PM', status: 'Completed' },
  { id: '4', icon: 'person-add',    title: 'New contact added',                 sub: 'Rahul Sharma (+91 91234 56789)',           time: '11:20 AM', status: 'Added' },
];

const STATUS_TINT = (c, s) => {
  if (s === 'Completed') return { bg: c.primarySoft, fg: c.primaryDeep };
  if (s === 'New')       return { bg: '#DBEAFE',     fg: '#2563EB' };
  if (s === 'Added')     return { bg: '#FEF3C7',     fg: '#B45309' };
  return { bg: c.bgInput, fg: c.textMuted };
};

export default function DashboardScreen({ navigation }) {
  const c = useBrand();
  const dark = c.scheme === 'dark';
  const user = useSelector((s) => s.auth.user);
  const unread = useSelector(selectUnreadCount);
  const dispatch = useDispatch();

  const [balance, setBalance] = useState(null);
  const [balanceError, setBalanceError] = useState(null);
  const [voiceRows, setVoiceRows] = useState(0);
  const [ivrRows, setIvrRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // The icpaas.in /user/balance endpoint has surfaced the wallet under a few
  // different keys over time (`walletBalance`, `balance`, sometimes nested
  // under `data`). Try each in order so a server-side rename doesn't blank
  // out the UI.
  const extractBalance = (payload) => {
    if (payload == null) return null;
    if (typeof payload === 'number') return payload;
    const candidates = [
      payload.walletBalance,
      payload.balance,
      payload.amount,
      payload.data?.walletBalance,
      payload.data?.balance,
      payload.data?.amount,
      payload.result?.walletBalance,
      payload.result?.balance,
    ];
    for (const v of candidates) {
      if (v == null) continue;
      const n = typeof v === 'string' ? Number(v) : v;
      if (typeof n === 'number' && !Number.isNaN(n)) return n;
    }
    return null;
  };

  const fetchFront = useCallback(async () => {
    const today = new Date();
    const from = new Date(); from.setDate(today.getDate() - 7);
    const range = { fromDate: ymd(from), toDate: ymd(today) };

    const [bal, voice, ivr] = await Promise.allSettled([
      BalanceAPI.getBalance(),
      VoiceAPI.getDeliveryReport({ ...range, reportType: 'OBD' }),
      IVRAPI.getInboundReports({ ...range, exportToCsv: false }),
    ]);

    if (bal.status === 'fulfilled') {
      const b = extractBalance(bal.value);
      setBalance(b);
      if (b == null) {
        setBalanceError('Balance field missing from API response.');
      } else {
        setBalanceError(null);
        // Auto low-balance alert (threshold ₹1000) — once per refresh
        if (b < 1000) {
          dispatch(pushNotification({
            kind: 'balance',
            title: 'Low wallet balance',
            body: `Wallet at ₹${Number(b).toLocaleString('en-IN', { maximumFractionDigits: 2 })}. Top up to keep campaigns running.`,
          }));
        }
      }
    } else {
      setBalance(null);
      const message = bal.reason?.message || 'Balance request failed.';
      setBalanceError(message);
      toast.error('Wallet unavailable', message);
    }
    if (voice.status === 'fulfilled') setVoiceRows((voice.value?.data || []).length);
    if (ivr.status === 'fulfilled') setIvrRows((ivr.value?.data || []).length);

    setLoading(false);
    setRefreshing(false);
  }, [dispatch]);

  useEffect(() => { fetchFront(); }, [fetchFront]);

  const userName = user?.username || user?.name || 'Omniuser';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 18, paddingBottom: 130 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchFront(); }}
            tintColor={c.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Low-balance Banner — surfaces when wallet < ₹1000 */}
        {!bannerDismissed && typeof balance === 'number' && balance < 1000 ? (
          <Banner
            tone="warning"
            title="Low wallet balance"
            message={`Wallet at ₹${Number(balance).toLocaleString('en-IN', { maximumFractionDigits: 2 })}. Top up to keep campaigns running.`}
            actionText="Top up"
            onAction={() => navigation.navigate('Config')}
            onClose={() => setBannerDismissed(true)}
            style={{ marginBottom: 12 }}
          />
        ) : null}

        {/* Greeting */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1">
            <Text className="text-[14px] font-medium" style={{ color: c.textMuted }}>{greet()},</Text>
            <Text className="text-[28px] font-extrabold tracking-tight mt-0.5" style={{ color: c.text }}>{userName}</Text>
          </View>
          <View className="relative">
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigation.navigate('Notifications')}
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{ borderWidth: 1.5, borderColor: c.primaryMint }}
            >
              <Ionicons name="notifications-outline" size={18} color={c.primary} />
            </TouchableOpacity>
            {unread > 0 ? (
              <View
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full items-center justify-center"
                style={{ backgroundColor: c.danger, paddingHorizontal: 4, borderWidth: 2, borderColor: c.bg }}
              >
                <Text className="text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Wallet balance callout — live from BalanceAPI.getBalance() */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Config')}
          className="flex-row items-center rounded-[16px] p-3.5 mt-2"
          style={{ backgroundColor: c.primarySoft, gap: 12 }}
        >
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: c.primary }}
          >
            <Ionicons name="wallet" size={18} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: c.primaryDeep, opacity: 0.75 }}>
              Wallet Balance
            </Text>
            {loading ? (
              <ActivityIndicator size="small" color={c.primaryDeep} style={{ alignSelf: 'flex-start', marginTop: 2 }} />
            ) : balance != null ? (
              <Text className="text-[20px] font-extrabold mt-0.5" style={{ color: c.primaryDeep }}>
                ₹{Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            ) : (
              <>
                <Text className="text-[16px] font-bold mt-0.5" style={{ color: c.danger }}>
                  Unavailable
                </Text>
                <Text className="text-[10px] mt-0.5" style={{ color: c.primaryDeep, opacity: 0.7 }} numberOfLines={2}>
                  {balanceError || 'Pull to refresh'}
                </Text>
              </>
            )}
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Config')}
            activeOpacity={0.85}
            className="rounded-[10px] flex-row items-center px-3 py-2"
            style={{ backgroundColor: c.primary, gap: 4 }}
          >
            <Ionicons name="add" size={12} color="#FFFFFF" />
            <Text className="text-[11px] font-bold text-white">Top up</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Channels */}
        <View className="flex-row items-center justify-between mt-6 mb-3">
          <Text className="text-[16px] font-bold" style={{ color: c.text }}>Channels</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ProductIcons')}>
            <Text className="text-[12px] font-bold" style={{ color: c.primary }}>View All</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row flex-wrap" style={{ gap: 10 }}>
          {CHANNELS.map((ch) => (
            <ChannelTile
              key={ch.id}
              c={c}
              icon={ch.icon}
              label={ch.label}
              count={ch.count}
              onPress={() => navigation.navigate('Channel', { channel: ch.id })}
            />
          ))}
        </View>

        {/* Recent Activity */}
        <View className="flex-row items-center justify-between mt-6 mb-3">
          <Text className="text-[16px] font-bold" style={{ color: c.text }}>Recent Activity</Text>
          <TouchableOpacity><Text className="text-[12px] font-bold" style={{ color: c.primary }}>View All</Text></TouchableOpacity>
        </View>

        <View className="rounded-[16px] overflow-hidden" style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}>
          {ACTIVITY.map((a, i) => {
            const tint = STATUS_TINT(c, a.status);
            return (
              <View
                key={a.id}
                className="flex-row items-center px-3.5 py-3"
                style={{
                  gap: 12,
                  borderBottomWidth: i === ACTIVITY.length - 1 ? 0 : 1,
                  borderBottomColor: c.rule,
                }}
              >
                <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: c.primarySoft }}>
                  <Ionicons name={a.icon} size={16} color={c.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-semibold" style={{ color: c.text }} numberOfLines={1}>{a.title}</Text>
                  <Text className="text-[11px] mt-0.5" style={{ color: c.textMuted }} numberOfLines={1}>{a.sub}</Text>
                </View>
                <View className="items-end" style={{ gap: 4 }}>
                  <Text className="text-[10px]" style={{ color: c.textMuted }}>{a.time}</Text>
                  <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: tint.bg }}>
                    <Text className="text-[10px] font-bold" style={{ color: tint.fg }}>{a.status}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

      </ScrollView>

      <BottomTabBar c={c} navigation={navigation} active="home" />
    </View>
  );
}

const ChannelTile = ({ c, icon, label, count, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    className="rounded-[16px] p-3"
    style={{ width: '48%', backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}
  >
    <View className="flex-row items-center justify-between mb-2">
      <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: c.primarySoft }}>
        <Ionicons name={icon} size={18} color={c.primary} />
      </View>
      <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: c.primarySoft }}>
        <Text className="text-[10px] font-bold" style={{ color: c.primaryDeep }}>{count}</Text>
      </View>
    </View>
    <Text className="text-[14px] font-bold" style={{ color: c.text }}>{label}</Text>
    <View className="flex-row items-center mt-1" style={{ gap: 5 }}>
      <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.success }} />
      <Text className="text-[11px] font-semibold" style={{ color: c.success }}>Active</Text>
      <View className="flex-1" />
      <Ionicons name="arrow-forward" size={12} color={c.textMuted} />
    </View>
  </TouchableOpacity>
);

// Bottom tab bar with raised center Campaign FAB.
// Sits above the OS gesture bar via safe-area inset.
export function BottomTabBar({ c, navigation, active = 'home' }) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'ios' ? 18 : 12) + 6;

  const tab = (key, icon, label, onPress) => {
    const isActive = active === key;
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="items-center justify-center" style={{ flex: 1 }}>
        <Ionicons name={icon} size={20} color={isActive ? c.primary : c.textMuted} />
        <Text className="text-[10px] mt-1 font-semibold" style={{ color: isActive ? c.primary : c.textMuted }}>{label}</Text>
        {isActive ? (
          <View className="absolute -bottom-1.5 w-6 h-0.5 rounded-full" style={{ backgroundColor: c.primary }} />
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View
      className="absolute left-0 right-0 bottom-0 flex-row items-center"
      style={{
        paddingHorizontal: 12,
        paddingTop: 14,
        paddingBottom: bottomPad,
        backgroundColor: c.bgSoft,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        borderTopWidth: 1,
        borderTopColor: c.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 16,
      }}
    >
      {tab('home', 'home', 'Home', () => navigation.navigate('Dashboard'))}
      {tab('chats', 'chatbubbles-outline', 'Chats', () => navigation.navigate('Inbox'))}

      {/* Centered raised Campaign FAB */}
      <View className="items-center justify-center" style={{ flex: 1 }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('CampaignsList')}
          activeOpacity={0.88}
          className="w-14 h-14 rounded-full items-center justify-center"
          style={{
            backgroundColor: c.primary,
            marginTop: -28,
            shadowColor: c.primary,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 14,
            elevation: 8,
            borderWidth: 4,
            borderColor: c.bgSoft,
          }}
        >
          <Ionicons name="megaphone" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-[10px] mt-1 font-semibold" style={{ color: active === 'campaign' ? c.primary : c.textMuted }}>
          Campaign
        </Text>
      </View>

      {tab('reports', 'bar-chart-outline', 'Reports', () => navigation.navigate('Report'))}
      {tab('you', 'person-outline', 'Profile', () => navigation.navigate('Profile'))}
    </View>
  );
}
