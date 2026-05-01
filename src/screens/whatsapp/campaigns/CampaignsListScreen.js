// src/screens/CampaignsListScreen.js — Campaign Reports + Activity hub
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Platform,
  RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useBrand } from '../../../theme';
import {
  selectCampaigns,
  selectCampaignTotals,
  patchCampaign,
  removeCampaign,
  updateCampaignStatus,
} from '../../../store/slices/campaignsSlice';
import { pushNotification } from '../../../store/slices/notificationsSlice';
import BottomTabBar from '../../../components/BottomTabBar';
import ScreenHeader from '../../../components/ScreenHeader';
import toast from '../../../services/toast';

const FILTERS = ['All', 'Live', 'Scheduled', 'Completed', 'Stuck', 'Failed'];

const STATUS_TINT = {
  live:      { bg: '#D1FAE5', fg: '#047857', label: 'Live',      icon: 'pulse' },
  scheduled: { bg: '#DBEAFE', fg: '#1D4ED8', label: 'Scheduled', icon: 'time' },
  completed: { bg: '#E5E7EB', fg: '#374151', label: 'Completed', icon: 'checkmark-done' },
  stuck:     { bg: '#FEF3C7', fg: '#B45309', label: 'Stuck',     icon: 'warning' },
  failed:    { bg: '#FEE2E2', fg: '#B91C1C', label: 'Failed',    icon: 'close-circle' },
  paused:    { bg: '#F3F4F6', fg: '#6B7280', label: 'Paused',    icon: 'pause-circle' },
};

const CHANNEL_ICON = {
  whatsapp: 'logo-whatsapp',
  sms: 'chatbubble-outline',
  rcs: 'card-outline',
  voice: 'call',
};

const fmt = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

export default function CampaignsListScreen({ navigation }) {
  const c = useBrand();
  const dispatch = useDispatch();
  const list = useSelector(selectCampaigns);
  const totals = useSelector(selectCampaignTotals);

  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((cmp) => {
      if (filter !== 'All' && cmp.status !== filter.toLowerCase()) return false;
      if (!q) return true;
      return (
        String(cmp.name || '').toLowerCase().includes(q) ||
        String(cmp.templateName || '').toLowerCase().includes(q)
      );
    });
  }, [list, search, filter]);

  const togglePause = (cmp) => {
    if (cmp.status === 'paused') {
      dispatch(updateCampaignStatus({ campaignId: cmp.id, status: 'live' }));
      toast.success('Resumed', `${cmp.name} is running again.`);
    } else if (cmp.status === 'live' || cmp.status === 'stuck') {
      dispatch(updateCampaignStatus({ campaignId: cmp.id, status: 'paused' }));
      toast.warning('Paused', `${cmp.name} is on hold.`);
    } else {
      toast.info('Cannot pause', `Status "${cmp.status}" is not pausable.`);
    }
  };

  const resendFailed = (cmp) => {
    if (!cmp.failed || cmp.failed === 0) { toast.info('No failures', 'Nothing to resend.'); return; }
    Alert.alert('Resend failed?', `Re-target ${cmp.failed} failed recipient${cmp.failed === 1 ? '' : 's'}?`, [
      { text: 'Cancel' },
      {
        text: 'Resend',
        style: 'default',
        onPress: () => {
          dispatch(patchCampaign({
            id: cmp.id,
            patch: {
              sent: (cmp.sent || 0) + cmp.failed,
              failed: 0,
              status: 'live',
              lastResendAt: new Date().toISOString(),
            },
          }));
          dispatch(pushNotification({
            kind: 'campaign-success',
            title: `Resend queued — ${cmp.name}`,
            body: `${cmp.failed} failed recipient${cmp.failed === 1 ? '' : 's'} are being retried.`,
          }));
          toast.success('Resend queued', `${cmp.failed} numbers retried.`);
        },
      },
    ]);
  };

  const remove = (cmp) =>
    Alert.alert('Delete campaign?', `${cmp.name} will be removed from this list.`, [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(removeCampaign(cmp.id)) },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        icon="megaphone-outline"
        title="Campaigns"
        right={(
          <TouchableOpacity
            onPress={() => navigation.navigate('CampaignStep1')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="New campaign"
            style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
              backgroundColor: c.primary, gap: 4,
            }}
          >
            <Ionicons name="add" size={14} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>New</Text>
          </TouchableOpacity>
        )}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 600); }} tintColor={c.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stat row */}
        <View className="flex-row mb-3" style={{ gap: 8 }}>
          <Stat c={c} icon="megaphone-outline"     label="Total"     value={totals.total}     accent={c.primary} />
          <Stat c={c} icon="pulse"                 label="Live"      value={totals.live}      accent={c.success} />
          <Stat c={c} icon="time-outline"          label="Scheduled" value={totals.scheduled} accent={c.info} />
          <Stat c={c} icon="alert-circle-outline"  label="Failed"    value={totals.failed + (totals.stuck || 0)} accent={c.danger} />
        </View>

        {/* Search */}
        <View className="flex-row items-center rounded-[14px] px-4 mb-3" style={{ backgroundColor: c.bgInput, gap: 10 }}>
          <Ionicons name="search-outline" size={16} color={c.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by campaign name or template…"
            placeholderTextColor={c.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
            className="flex-1 text-[13px]"
            style={[
              { paddingVertical: Platform.OS === 'ios' ? 11 : 9, color: c.text },
              Platform.select({ web: { outlineStyle: 'none' } }),
            ]}
          />
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 10 }}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                activeOpacity={0.85}
                className="flex-row items-center py-2 px-3 rounded-[14px]"
                style={{ backgroundColor: active ? c.primary : c.bgInput, gap: 6 }}
              >
                <Text className="text-[12px]" style={{ color: active ? '#FFFFFF' : c.textMuted, fontWeight: active ? '700' : '500' }}>
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* List */}
        {filtered.length === 0 ? (
          <View className="items-center py-12" style={{ gap: 8 }}>
            <View className="w-20 h-20 rounded-2xl items-center justify-center" style={{ backgroundColor: c.bgInput }}>
              <Ionicons name="megaphone-outline" size={32} color={c.textDim} />
            </View>
            <Text className="text-[15px] font-bold" style={{ color: c.text }}>
              {list.length === 0 ? 'No campaigns yet' : 'No matches'}
            </Text>
            <Text className="text-[12px] text-center" style={{ color: c.textMuted, maxWidth: 280 }}>
              {list.length === 0
                ? 'Tap "New" to launch your first campaign.'
                : 'Try a different filter or search term.'}
            </Text>
            {list.length === 0 ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('CampaignStep1')}
                activeOpacity={0.85}
                className="rounded-[10px] px-4 py-2.5 flex-row items-center mt-2"
                style={{ backgroundColor: c.primary, gap: 6 }}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />
                <Text className="text-[13px] font-bold text-white">New campaign</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          filtered.map((cmp) => (
            <CampaignCard
              key={cmp.id}
              c={c}
              cmp={cmp}
              onOpen={() => navigation.navigate('CampaignDetail', { id: cmp.id })}
              onPause={() => togglePause(cmp)}
              onResend={() => resendFailed(cmp)}
              onDelete={() => remove(cmp)}
            />
          ))
        )}
      </ScrollView>

      <BottomTabBar c={c} navigation={navigation} active="campaign" />
    </View>
  );
}

function Stat({ c, icon, label, value, accent }) {
  return (
    <View
      className="flex-1 rounded-[12px] p-3"
      style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}
    >
      <Ionicons name={icon} size={14} color={accent} />
      <Text className="text-[18px] font-extrabold mt-1" style={{ color: c.text }}>{value}</Text>
      <Text className="text-[10px]" style={{ color: c.textMuted }}>{label}</Text>
    </View>
  );
}

function CampaignCard({ c, cmp, onOpen, onPause, onResend, onDelete }) {
  const st = STATUS_TINT[cmp.status] || STATUS_TINT.completed;
  const sent = Number(cmp.sent || 0);
  const total = Number(cmp.total || 0);
  const failed = Number(cmp.failed || 0);
  const delivered = Number(cmp.delivered ?? Math.max(sent - failed, 0));
  const read = Number(cmp.read || 0);
  const pct = total > 0 ? Math.min(1, sent / total) : 0;
  const channelIcon = CHANNEL_ICON[cmp.channel] || 'megaphone';

  return (
    <View
      className="rounded-[16px] p-3.5 mb-3"
      style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}
    >
      {/* Top row */}
      <TouchableOpacity onPress={onOpen} activeOpacity={0.85} className="flex-row items-start" style={{ gap: 12 }}>
        <View className="w-11 h-11 rounded-[12px] items-center justify-center" style={{ backgroundColor: c.primarySoft }}>
          <Ionicons name={channelIcon} size={20} color={c.primary} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Text className="flex-1 text-[14px] font-bold" style={{ color: c.text }} numberOfLines={1}>{cmp.name}</Text>
            <View className="flex-row items-center rounded-full px-2 py-0.5" style={{ backgroundColor: st.bg, gap: 4 }}>
              <Ionicons name={st.icon} size={10} color={st.fg} />
              <Text className="text-[10px] font-bold" style={{ color: st.fg }}>{st.label}</Text>
            </View>
          </View>
          <Text className="text-[11px] mt-0.5" style={{ color: c.textMuted }} numberOfLines={1}>
            {cmp.templateName || '—'}{cmp.category ? `  ·  ${cmp.category}` : ''}{cmp.createdAt ? `  ·  ${fmt(cmp.createdAt)}` : ''}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Progress */}
      <View className="mt-3">
        <View className="flex-row items-baseline" style={{ gap: 6 }}>
          <Text className="text-[20px] font-extrabold" style={{ color: c.text }}>{sent.toLocaleString()}</Text>
          <Text className="text-[12px]" style={{ color: c.textMuted }}>/ {total.toLocaleString()} sent</Text>
          <View className="flex-1" />
          <Text className="text-[11px] font-bold" style={{ color: c.primary }}>{Math.round(pct * 100)}%</Text>
        </View>
        <View className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ backgroundColor: c.bgInput }}>
          <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: c.primary }} />
        </View>
      </View>

      {/* Stats row */}
      <View className="flex-row mt-3" style={{ gap: 8 }}>
        <Mini c={c} label="Delivered" value={delivered} accent={c.success} />
        <Mini c={c} label="Read"      value={read}      accent={c.info} />
        <Mini c={c} label="Failed"    value={failed}    accent={c.danger} />
      </View>

      {/* Action row */}
      <View className="flex-row items-center mt-3" style={{ gap: 8 }}>
        <TouchableOpacity
          onPress={onOpen}
          activeOpacity={0.85}
          className="flex-1 flex-row items-center justify-center rounded-[10px] py-2.5"
          style={{ backgroundColor: c.primary, gap: 6 }}
        >
          <Ionicons name="bar-chart" size={13} color="#FFFFFF" />
          <Text className="text-[12px] font-bold text-white">Details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onPause}
          activeOpacity={0.85}
          className="rounded-[10px] py-2.5 px-3 flex-row items-center"
          style={{ borderWidth: 1, borderColor: c.border, gap: 6 }}
        >
          <Ionicons name={cmp.status === 'paused' ? 'play' : 'pause'} size={13} color={c.text} />
          <Text className="text-[12px] font-semibold" style={{ color: c.text }}>
            {cmp.status === 'paused' ? 'Resume' : 'Pause'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onResend}
          activeOpacity={0.85}
          className="rounded-[10px] py-2.5 px-3 flex-row items-center"
          style={{ borderWidth: 1, borderColor: c.border, gap: 6 }}
        >
          <Ionicons name="refresh" size={13} color={c.text} />
          <Text className="text-[12px] font-semibold" style={{ color: c.text }}>Resend</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          activeOpacity={0.85}
          className="w-9 h-9 rounded-[10px] items-center justify-center"
          style={{ borderWidth: 1, borderColor: c.danger }}
        >
          <Ionicons name="trash-outline" size={13} color={c.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Mini({ c, label, value, accent }) {
  return (
    <View className="flex-1 rounded-[10px] py-1.5 px-2" style={{ backgroundColor: c.bgInput }}>
      <Text className="text-[10px] font-semibold" style={{ color: c.textMuted }}>{label}</Text>
      <Text className="text-[14px] font-extrabold" style={{ color: accent || c.text }}>{Number(value || 0).toLocaleString()}</Text>
    </View>
  );
}
