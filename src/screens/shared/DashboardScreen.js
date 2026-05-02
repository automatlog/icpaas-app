// src/screens/DashboardScreen.js — Brand Home (matches Home black/white.png)
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, RefreshControl,
  Animated, Pressable,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { useBrand } from '../../theme';
import { BalanceAPI, VoiceAPI, IVRAPI } from '../../services/api';
import { selectUnreadCount, selectNotifications, pushNotification } from '../../store/slices/notificationsSlice';
import { selectConnection, selectUnreadBadgeTotal, selectChatList } from '../../store/slices/liveChatSlice';
import { selectCampaigns } from '../../store/slices/campaignsSlice';
import Banner from '../../components/Banner';
import BottomTabBar from '../../components/BottomTabBar';
import ActivityDetailModal from '../../components/ActivityDetailModal';
import toast from '../../services/toast';
import dialog from '../../services/dialog';
import { CHANNELS } from '../../constants/channels';
import { formatCurrency } from '../../services/format';

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

// Maps a redux notification kind → activity row icon + status pill.
// Live chat + campaign + notification rows all flow through this so the
// pill colours stay consistent.
const NOTIF_META = {
  'campaign-success': { icon: 'send',                status: 'Completed' },
  'campaign-stuck':   { icon: 'time',                status: 'Stuck' },
  'campaign-failed':  { icon: 'alert-circle',        status: 'Failed' },
  'template-created': { icon: 'document-text',       status: 'Submitted' },
  'balance':          { icon: 'wallet',              status: 'Alert' },
  'system':           { icon: 'settings',            status: 'System' },
  'info':             { icon: 'information-circle',  status: 'Info' },
};

const STATUS_TINT = (c, s) => {
  if (s === 'Completed') return { bg: c.primarySoft, fg: c.primaryDeep };
  if (s === 'New')       return { bg: '#DBEAFE',     fg: '#2563EB' };
  if (s === 'Submitted') return { bg: '#DBEAFE',     fg: '#1D4ED8' };
  if (s === 'Stuck')     return { bg: '#FEF3C7',     fg: '#B45309' };
  if (s === 'Alert')     return { bg: '#FEF3C7',     fg: '#B45309' };
  if (s === 'Failed')    return { bg: '#FEE2E2',     fg: '#B91C1C' };
  if (s === 'Added')     return { bg: '#FEF3C7',     fg: '#B45309' };
  if (s === 'Live')      return { bg: '#D1FAE5',     fg: '#047857' };
  if (s === 'Scheduled') return { bg: '#FEF3C7',     fg: '#B45309' };
  return { bg: c.bgInput, fg: c.textMuted };
};

// Pretty-prints a wall-clock time like the original mock did ("05:34 PM").
const fmtClock = (ts) => {
  if (!ts) return '';
  try {
    const d = ts instanceof Date ? ts : new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

const WalletCard = ({ c, balance, balanceError, loading, navigation }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const hIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const hOut = () => Animated.spring(scale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={hIn}
        onPressOut={hOut}
        onPress={() => navigation.navigate('Config')}
        className="flex-row items-center rounded-[16px] p-3.5 mt-2"
        style={{ backgroundColor: c.primarySoft, gap: 12 }}
      >
        <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: c.primary }}>
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
              {formatCurrency(balance)}
            </Text>
          ) : (
            <>
              <Text className="text-[16px] font-bold mt-0.5" style={{ color: c.danger }}>Unavailable</Text>
              <Text className="text-[10px] mt-0.5" style={{ color: c.primaryDeep, opacity: 0.7 }} numberOfLines={2}>
                {balanceError || 'Pull to refresh'}
              </Text>
            </>
          )}
        </View>
        <View
          className="rounded-[10px] flex-row items-center px-3 py-2"
          style={{ backgroundColor: c.primary, gap: 4 }}
        >
          <Ionicons name="add" size={12} color="#FFFFFF" />
          <Text className="text-[11px] font-bold text-white">Top up</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function DashboardScreen({ navigation }) {
  const c = useBrand();
  const dark = c.scheme === 'dark';
  const user = useSelector((s) => s.auth.user);
  const unread = useSelector(selectUnreadCount);
  const liveConnection = useSelector(selectConnection);
  const liveUnread = useSelector(selectUnreadBadgeTotal);
  const liveChatList = useSelector(selectChatList);
  const notifications = useSelector(selectNotifications);
  const campaigns = useSelector(selectCampaigns);
  const dispatch = useDispatch();

  const [balance, setBalance] = useState(null);
  const [balanceError, setBalanceError] = useState(null);
  const [voiceRows, setVoiceRows] = useState(0);
  const [ivrRows, setIvrRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  // Selected Recent Activity row — when set, opens the detail modal.
  const [activeActivity, setActiveActivity] = useState(null);
  // Per-channel active state — tap the badge on a Channels tile to flip.
  // SMS off by default to match the design reference; the rest start active.
  const [channelActive, setChannelActive] = useState({
    whatsapp: true, rcs: true, voice: true, sms: false,
  });
  const toggleChannel = (id) =>
    setChannelActive((prev) => ({ ...prev, [id]: !prev[id] }));

  // Merged Recent Activity feed.
  //
  // Three live sources stitched into one timeline so the dashboard reflects
  // what's actually happening on the account (no more mock rows):
  //   1. notificationsSlice — campaign-success / failed / template-created /
  //      balance alerts dispatched throughout the app.
  //   2. liveChatSlice.chatList — most recent inbound conversations, used
  //      to surface "New chat from <number>" rows even before they're read.
  //   3. campaignsSlice — recent launches, in case a campaign succeeded
  //      without a notification (e.g. an older replay).
  //
  // We tag every row with `ts` (epoch ms) and merge-sort, then take the
  // 4 most recent. Each row carries an `onPress` so taps deep-link to the
  // right screen instead of just toasting the title.
  const recentActivity = useMemo(() => {
    const rows = [];

    (notifications || []).forEach((n) => {
      const meta = NOTIF_META[n.kind] || NOTIF_META.info;
      rows.push({
        id: `notif:${n.id}`,
        icon: meta.icon,
        title: n.title || 'Notification',
        sub: n.body || '',
        time: fmtClock(n.ts),
        ts: n.ts || 0,
        status: meta.status,
        onPress: () => navigation.navigate('Notifications'),
      });
    });

    (liveChatList?.items || []).forEach((row) => {
      const ts = row.LastMessageOn ? new Date(row.LastMessageOn).getTime() : 0;
      if (!ts) return;
      const name = row.ProfileName || row.WANumber || row.wa_id || 'customer';
      rows.push({
        id: `chat:${row.WANumber || row.wa_id || row.WAInboxId}`,
        icon: 'chatbubble',
        title: `New chat from ${name}`,
        sub: row.LastUserMessage || 'Tap to open the conversation.',
        time: fmtClock(ts),
        ts,
        status: 'New',
        onPress: () => navigation.navigate('LiveAgentChat', {
          waId: row.WANumber || row.wa_id,
          channel: row.WABANumber,
          profileName: name,
        }),
      });
    });

    (campaigns || []).forEach((cmp) => {
      const ts = cmp.createdAt ? new Date(cmp.createdAt).getTime() : 0;
      if (!ts) return;
      const status =
        cmp.status === 'completed' ? 'Completed' :
        cmp.status === 'live'      ? 'Live' :
        cmp.status === 'scheduled' ? 'Scheduled' :
        cmp.status === 'failed'    ? 'Failed' :
        cmp.status === 'stuck'     ? 'Stuck' : 'Completed';
      rows.push({
        id: `cmp:${cmp.id}`,
        icon: 'send',
        title: `Campaign "${cmp.name || 'untitled'}" ${cmp.status || 'sent'}`,
        sub: `${cmp.sent || 0} of ${cmp.total || 0} dispatched${cmp.failed ? ` · ${cmp.failed} failed` : ''}`,
        time: fmtClock(ts),
        ts,
        status,
        onPress: () => navigation.navigate('CampaignDetail', { id: cmp.id }),
      });
    });

    // Dedupe: a campaign launch produces both a notification AND a
    // campaign row — prefer the notification (user-friendlier copy)
    // when both exist with the same name.
    const seenCampaignNames = new Set();
    rows.forEach((r) => {
      if (r.id.startsWith('notif:') && /^Campaign/.test(r.title)) {
        const m = r.title.match(/Campaign "([^"]+)"/);
        if (m) seenCampaignNames.add(m[1]);
      }
    });
    const filtered = rows.filter((r) => {
      if (!r.id.startsWith('cmp:')) return true;
      const m = r.title.match(/Campaign "([^"]+)"/);
      return m ? !seenCampaignNames.has(m[1]) : true;
    });

    return filtered.sort((a, b) => b.ts - a.ts).slice(0, 4);
  }, [notifications, liveChatList, campaigns, navigation]);

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
            body: `Wallet at ${formatCurrency(b)}. Top up to keep campaigns running.`,
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
        contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 18, paddingBottom: 110 }}
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
            message={`Wallet at ${formatCurrency(balance)}. Top up to keep campaigns running.`}
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
              accessibilityRole="button"
              accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{
                backgroundColor: unread > 0 ? c.primarySoft : c.bgCard,
                borderWidth: 1.5,
                borderColor: unread > 0 ? c.primary : c.border,
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Ionicons
                name={unread > 0 ? 'notifications' : 'notifications-outline'}
                size={20}
                color={c.primary}
              />
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

        {/* Wallet balance callout — live from BalanceAPI.getBalance().
            Card itself is non-interactive; only the Top up button navigates. */}
        <WalletCard c={c} balance={balance} balanceError={balanceError} loading={loading} navigation={navigation} />

        <View className="flex-row items-center justify-between mt-6 mb-3">
          <Text className="text-[16px] font-bold" style={{ color: c.text }}>Channels</Text>
        </View>

        <View className="flex-row flex-wrap" style={{ gap: 10 }}>
          {CHANNELS.map((ch) => {
            const isActive = !!channelActive[ch.id];
            return (
              <ChannelTile
                key={ch.id}
                c={c}
                icon={ch.icon}
                label={ch.label}
                active={isActive}
                onToggle={() => toggleChannel(ch.id)}
                onPress={() => {
                  // Inactive channels are gated behind the plan upgrade —
                  // show the SweetAlert-style notice instead of navigating.
                  if (!isActive) {
                    dialog.warning({
                      title: '🖥️  Please Update Your Plan',
                      message: 'Reach out to the administrator for access.',
                      confirmText: 'OK',
                    });
                    return;
                  }
                  navigation.navigate('Channel', { channel: ch.id });
                }}
              />
            );
          })}
        </View>

        <View className="flex-row items-center justify-between mt-6 mb-3">
          <Text className="text-[16px] font-bold" style={{ color: c.text }}>Recent Activity</Text>
        </View>

        <View className="rounded-[16px] overflow-hidden" style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}>
          {/* WhatsApp Live Agent — pinned as the first activity row, since
              live conversations are the most time-sensitive thing on the
              page. Connection-status dot + unread badge match the
              standalone card it replaced. */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('LiveAgentInbox')}
            accessibilityRole="button"
            accessibilityLabel={liveUnread > 0 ? `WhatsApp Live Agent, ${liveUnread} unread` : 'WhatsApp Live Agent'}
            className="flex-row items-center px-3.5 py-3"
            style={{ gap: 12, borderBottomWidth: 1, borderBottomColor: c.rule }}
          >
            <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: c.primarySoft }}>
              <Ionicons name="chatbubbles" size={18} color={c.primary} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <Text className="text-[13px] font-semibold" style={{ color: c.text }} numberOfLines={1}>
                  WhatsApp Live Agent
                </Text>
                <LiveStatusDot status={liveConnection.status} c={c} />
              </View>
              <Text className="text-[11px] mt-0.5" style={{ color: c.textMuted }} numberOfLines={1}>
                {liveConnection.status === 'connected'
                  ? 'Real-time customer conversations'
                  : liveConnection.status === 'reconnecting'
                    ? 'Reconnecting to live channel…'
                    : liveConnection.status === 'disconnected'
                      ? 'Offline — tap to retry'
                      : 'Tap to open live inbox'}
              </Text>
            </View>
            {liveUnread > 0 ? (
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: c.primary }}>
                <Text className="text-[11px] font-bold text-white">{liveUnread > 99 ? '99+' : liveUnread}</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            )}
          </TouchableOpacity>

          {recentActivity.length === 0 ? (
            <View style={{ paddingVertical: 22, paddingHorizontal: 14, alignItems: 'center', gap: 6 }}>
              <Ionicons name="pulse-outline" size={20} color={c.textDim} />
              <Text style={{ color: c.text, fontSize: 13, fontWeight: '700' }}>No activity yet</Text>
              <Text style={{ color: c.textMuted, fontSize: 11, textAlign: 'center', maxWidth: 260 }}>
                Launch a campaign or wait for an inbound chat — events show up here in real time.
              </Text>
            </View>
          ) : (
            recentActivity.map((a, i) => {
              const tint = STATUS_TINT(c, a.status);
              return (
                <TouchableOpacity
                  key={a.id}
                  activeOpacity={0.7}
                  onPress={() => setActiveActivity(a)}
                  accessibilityRole="button"
                  accessibilityLabel={`${a.title}, ${a.status}`}
                  className="flex-row items-center px-3.5 py-3"
                  style={{
                    gap: 12,
                    borderBottomWidth: i === recentActivity.length - 1 ? 0 : 1,
                    borderBottomColor: c.rule,
                  }}
                >
                  <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: c.primarySoft }}>
                    <Ionicons name={a.icon} size={18} color={c.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[13px] font-semibold" style={{ color: c.text }} numberOfLines={1}>{a.title}</Text>
                    {a.sub ? (
                      <Text className="text-[11px] mt-0.5" style={{ color: c.textMuted }} numberOfLines={1}>{a.sub}</Text>
                    ) : null}
                  </View>
                  <View className="items-end" style={{ gap: 4 }}>
                    {a.time ? <Text className="text-[10px]" style={{ color: c.textMuted }}>{a.time}</Text> : null}
                    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: tint.bg }}>
                      <Text className="text-[10px] font-bold" style={{ color: tint.fg }}>{a.status}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

      </ScrollView>

      <BottomTabBar c={c} navigation={navigation} active="home" />

      <ActivityDetailModal
        c={c}
        visible={activeActivity != null}
        activity={activeActivity}
        onClose={() => setActiveActivity(null)}
        onOpen={() => activeActivity?.onPress?.()}
      />
    </View>
  );
}

// Tiny dot + label that mirrors the SignalR connection status from
// liveChatSlice. Used on the dashboard's Live Agent entry point so users
// see realtime health at a glance.
const LiveStatusDot = ({ status, c }) => {
  const palette = {
    connected:    { bg: c.success || '#22C55E', label: 'live' },
    connecting:   { bg: '#F0B95C',              label: 'connecting' },
    reconnecting: { bg: '#F0B95C',              label: 'reconnecting' },
    disconnected: { bg: c.danger || '#E54B4B', label: 'offline' },
    idle:         { bg: c.textMuted,            label: 'idle' },
  }[status] || { bg: c.textMuted, label: status || 'idle' };

  return (
    <View
      className="flex-row items-center px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: palette.bg + '22', gap: 4 }}
    >
      <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: palette.bg }} />
      <Text className="text-[9px] font-bold" style={{ color: palette.bg, letterSpacing: 0.4, textTransform: 'uppercase' }}>
        {palette.label}
      </Text>
    </View>
  );
};

const ChannelTile = ({ c, icon, label, active, onToggle, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const hIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const hOut = () => Animated.spring(scale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();

  const badgeColor = active ? c.success : c.danger;
  const badgeIcon  = active ? 'checkmark' : 'close';

  return (
    <Animated.View style={{ width: '48%', transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={hIn}
        onPressOut={hOut}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${active ? 'active' : 'inactive'}`}
        className="rounded-[16px] p-3"
        style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border, width: '100%' }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: c.primarySoft }}>
            <Ionicons name={icon} size={20} color={c.primary} />
          </View>
          {/* Tap-to-toggle active/inactive badge — solid circle with check
              when active, X when inactive. stopPropagation so the row's
              navigate-to-channel press doesn't also fire. */}
          <TouchableOpacity
            onPress={(e) => { e?.stopPropagation?.(); onToggle?.(); }}
            activeOpacity={0.85}
            accessibilityRole="switch"
            accessibilityState={{ checked: !!active }}
            accessibilityLabel={`${label} ${active ? 'active' : 'inactive'} — tap to toggle`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: badgeColor,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: badgeColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.35,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Ionicons name={badgeIcon} size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text className="text-[14px] font-bold" style={{ color: c.text }}>{label}</Text>
        <View className="flex-row items-center mt-1" style={{ gap: 5 }}>
          <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: badgeColor }} />
          <Text className="text-[11px] font-semibold" style={{ color: badgeColor }}>
            {active ? 'Active' : 'Inactive'}
          </Text>
          <View className="flex-1" />
          <Ionicons name="arrow-forward" size={12} color={c.textMuted} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// BottomTabBar lives in src/components/BottomTabBar.js now. Re-exported
// here so existing `import { BottomTabBar } from './DashboardScreen'`
// callers keep working until they migrate to the components path.
// New code should import directly from '../../components/BottomTabBar'.
export { default as BottomTabBar, BAR_HEIGHT } from '../../components/BottomTabBar';
