// src/screens/NotificationsScreen.js — Notifications inbox
// Each row has a × to delete. Driven by Redux notificationsSlice.
import React, { useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useBrand } from '../../theme';
import {
  selectNotifications,
  removeNotification,
  markAllRead,
  clearNotifications,
} from '../../store/slices/notificationsSlice';
import ScreenHeader from '../../components/ScreenHeader';

const KIND_STYLES = (c) => ({
  'balance': {
    icon: 'wallet-outline', tint: c.warning, tintBg: '#FEF3C7',
  },
  'campaign-success': {
    icon: 'checkmark-circle', tint: c.success, tintBg: '#D1FAE5',
  },
  'campaign-stuck': {
    icon: 'time', tint: '#B45309', tintBg: '#FEF3C7',
  },
  'campaign-failed': {
    icon: 'alert-circle', tint: c.danger, tintBg: '#FEE2E2',
  },
  'template-created': {
    icon: 'document-text', tint: c.info, tintBg: '#DBEAFE',
  },
  'system': {
    icon: 'settings', tint: c.textMuted, tintBg: c.bgInput,
  },
  'info': {
    icon: 'information-circle', tint: c.info, tintBg: '#DBEAFE',
  },
});

const fmtAge = (ts) => {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  return `${d}d`;
};

export default function NotificationsScreen({ navigation }) {
  const c = useBrand();
  const dispatch = useDispatch();
  const list = useSelector(selectNotifications);
  const styles = KIND_STYLES(c);

  // Mark everything read when this screen mounts
  useEffect(() => { dispatch(markAllRead()); }, [dispatch]);

  const grouped = useMemo(() => {
    const today = [];
    const earlier = [];
    const cutoff = Date.now() - 24 * 3600 * 1000;
    list.forEach((n) => (n.ts >= cutoff ? today : earlier).push(n));
    return { today, earlier };
  }, [list]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        title="Notifications"
        icon="notifications"
        right={
          list.length > 0 ? (
            <TouchableOpacity onPress={() => dispatch(clearNotifications())} activeOpacity={0.7}>
              <Text className="text-[12px] font-bold" style={{ color: c.danger }}>Clear all</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 ? (
          <View className="items-center py-16" style={{ gap: 8 }}>
            <View className="w-20 h-20 rounded-2xl items-center justify-center" style={{ backgroundColor: c.bgInput }}>
              <Ionicons name="notifications-off-outline" size={32} color={c.textDim} />
            </View>
            <Text className="text-[15px] font-bold" style={{ color: c.text }}>No notifications</Text>
            <Text className="text-[12px] text-center" style={{ color: c.textMuted, maxWidth: 280 }}>
              You'll see balance alerts, campaign updates and system notices here.
            </Text>
          </View>
        ) : null}

        {grouped.today.length > 0 ? (
          <>
            <SectionLabel c={c} label="Today" />
            {grouped.today.map((n) => (
              <Row key={n.id} c={c} n={n} styles={styles} onDismiss={() => dispatch(removeNotification(n.id))} />
            ))}
          </>
        ) : null}

        {grouped.earlier.length > 0 ? (
          <>
            <SectionLabel c={c} label="Earlier" />
            {grouped.earlier.map((n) => (
              <Row key={n.id} c={c} n={n} styles={styles} onDismiss={() => dispatch(removeNotification(n.id))} />
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function SectionLabel({ c, label }) {
  return (
    <Text
      className="text-[10px] font-bold tracking-widest uppercase mt-2 mb-2"
      style={{ color: c.textMuted }}
    >
      {label}
    </Text>
  );
}

function Row({ c, n, styles, onDismiss }) {
  const style = styles[n.kind] || styles.info;
  return (
    <View
      className="rounded-[14px] p-3 mb-2 flex-row items-start"
      style={{
        backgroundColor: c.bgCard,
        borderWidth: 1,
        borderColor: n.read ? c.border : style.tint,
        gap: 12,
      }}
    >
      <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: style.tintBg }}>
        <Ionicons name={style.icon} size={18} color={style.tint} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Text className="text-[13px] font-bold flex-1" style={{ color: c.text }} numberOfLines={1}>{n.title}</Text>
          <Text className="text-[10px]" style={{ color: c.textMuted }}>{fmtAge(n.ts)}</Text>
        </View>
        {n.body ? (
          <Text className="text-[12px] mt-1" style={{ color: c.textMuted }} numberOfLines={3}>{n.body}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={onDismiss} activeOpacity={0.7} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Ionicons name="close" size={16} color={c.textMuted} />
      </TouchableOpacity>
    </View>
  );
}
