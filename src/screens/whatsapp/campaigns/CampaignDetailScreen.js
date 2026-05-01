// src/screens/CampaignDetailScreen.js — Per-campaign drilldown
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Platform, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useBrand } from '../../../theme';
import {
  selectCampaignById,
  patchCampaign,
  removeCampaign,
  updateCampaignStatus,
} from '../../../store/slices/campaignsSlice';
import { pushNotification } from '../../../store/slices/notificationsSlice';
import BottomTabBar from '../../../components/BottomTabBar';
import ScreenHeader from '../../../components/ScreenHeader';
import toast from '../../../services/toast';
import dialog from '../../../services/dialog';

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
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
};

// Demo recipient feed — generated from campaign aggregate so the user can see
// what a real per-recipient drilldown looks like. Replace with /CampaignReport
// API once the backend endpoint is exposed for mobile.
const seedRecipients = (cmp) => {
  if (!cmp) return [];
  const sample = [
    '919876543210', '918765432109', '917654321098', '916543210987',
    '915432109876', '914321098765', '913210987654', '912109876543',
  ];
  const total = Math.min(Math.max(Number(cmp.total) || 0, 0), 12);
  const failed = Math.min(Number(cmp.failed) || 0, total);
  const list = [];
  for (let i = 0; i < total; i += 1) {
    const isFailed = i < failed;
    list.push({
      id: `${cmp.id}_${i}`,
      number: sample[i % sample.length],
      status: isFailed ? 'failed' : (cmp.status === 'live' ? (i < 3 ? 'sent' : 'delivered') : 'delivered'),
      ts: cmp.createdAt,
      error: isFailed ? 'Recipient not on WhatsApp' : null,
    });
  }
  return list;
};

const RECIPIENT_TINT = {
  delivered: { bg: '#D1FAE5', fg: '#047857', icon: 'checkmark-done' },
  read:      { bg: '#DBEAFE', fg: '#1D4ED8', icon: 'eye' },
  sent:      { bg: '#FEF3C7', fg: '#B45309', icon: 'paper-plane' },
  failed:    { bg: '#FEE2E2', fg: '#B91C1C', icon: 'close-circle' },
  pending:   { bg: '#F3F4F6', fg: '#6B7280', icon: 'time' },
};

export default function CampaignDetailScreen({ navigation, route }) {
  const c = useBrand();
  const dispatch = useDispatch();
  const id = route?.params?.id;
  const cmp = useSelector(selectCampaignById(id));
  const [recipFilter, setRecipFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const recipients = useMemo(() => seedRecipients(cmp), [cmp]);
  const filteredRecipients = useMemo(() => {
    if (recipFilter === 'all') return recipients;
    return recipients.filter((r) => r.status === recipFilter);
  }, [recipients, recipFilter]);

  if (!cmp) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header c={c} navigation={navigation} title="Campaign" />
        <View className="flex-1 items-center justify-center" style={{ gap: 8 }}>
          <Ionicons name="megaphone-outline" size={36} color={c.textDim} />
          <Text className="text-[15px] font-bold" style={{ color: c.text }}>Campaign not found</Text>
          <Text className="text-[12px]" style={{ color: c.textMuted }}>It may have been deleted.</Text>
        </View>
        <BottomTabBar c={c} navigation={navigation} active="campaign" />
      </View>
    );
  }

  const st = STATUS_TINT[cmp.status] || STATUS_TINT.completed;
  const channelIcon = CHANNEL_ICON[cmp.channel] || 'megaphone';
  const sent = Number(cmp.sent || 0);
  const total = Number(cmp.total || 0);
  const failed = Number(cmp.failed || 0);
  const delivered = Number(cmp.delivered ?? Math.max(sent - failed, 0));
  const read = Number(cmp.read || 0);
  const pct = total > 0 ? Math.min(1, sent / total) : 0;

  const togglePause = () => {
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

  const resendFailed = async () => {
    if (failed === 0) { toast.info('No failures', 'Nothing to resend.'); return; }
    const ok = await dialog.confirm({
      title: 'Resend failed?',
      message: `Re-target ${failed} failed recipient${failed === 1 ? '' : 's'}?`,
      confirmText: 'Resend',
      cancelText: 'Cancel',
      tone: 'warning',
    });
    if (!ok) return;
    dispatch(patchCampaign({
      id: cmp.id,
      patch: {
        sent: sent + failed,
        failed: 0,
        status: 'live',
        lastResendAt: new Date().toISOString(),
      },
    }));
    dispatch(pushNotification({
      kind: 'campaign-success',
      title: `Resend queued — ${cmp.name}`,
      body: `${failed} failed recipient${failed === 1 ? '' : 's'} are being retried.`,
    }));
    toast.success('Resend queued', `${failed} numbers retried.`);
  };

  const cancel = async () => {
    const ok = await dialog.confirm({
      title: 'Cancel campaign?',
      message: `${cmp.name} will be marked completed and stopped.`,
      confirmText: 'Cancel campaign',
      cancelText: 'Back',
      danger: true,
    });
    if (!ok) return;
    dispatch(updateCampaignStatus({ campaignId: cmp.id, status: 'completed' }));
    toast.info('Cancelled', `${cmp.name} marked complete.`);
  };

  const remove = async () => {
    const ok = await dialog.confirm({
      title: 'Delete campaign?',
      message: `${cmp.name} will be removed.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      danger: true,
    });
    if (!ok) return;
    dispatch(removeCampaign(cmp.id));
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header c={c} navigation={navigation} title="Campaign" onMore={remove} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 600); }} tintColor={c.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View className="rounded-[16px] p-4 mb-3" style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}>
          <View className="flex-row items-start" style={{ gap: 12 }}>
            <View className="w-12 h-12 rounded-[14px] items-center justify-center" style={{ backgroundColor: c.primarySoft }}>
              <Ionicons name={channelIcon} size={22} color={c.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-[16px] font-extrabold" style={{ color: c.text }}>{cmp.name}</Text>
              <Text className="text-[12px] mt-0.5" style={{ color: c.textMuted }}>{cmp.templateName || '—'}</Text>
            </View>
            <View className="flex-row items-center rounded-full px-2 py-1" style={{ backgroundColor: st.bg, gap: 4 }}>
              <Ionicons name={st.icon} size={10} color={st.fg} />
              <Text className="text-[10px] font-bold" style={{ color: st.fg }}>{st.label}</Text>
            </View>
          </View>

          <View className="mt-4">
            <View className="flex-row items-baseline" style={{ gap: 6 }}>
              <Text className="text-[26px] font-extrabold" style={{ color: c.text }}>{sent.toLocaleString()}</Text>
              <Text className="text-[12px]" style={{ color: c.textMuted }}>/ {total.toLocaleString()} dispatched</Text>
              <View className="flex-1" />
              <Text className="text-[12px] font-bold" style={{ color: c.primary }}>{Math.round(pct * 100)}%</Text>
            </View>
            <View className="h-2 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: c.bgInput }}>
              <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: c.primary }} />
            </View>
          </View>
        </View>

        {/* Stat grid */}
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          <BigStat c={c} label="Delivered" value={delivered} accent={c.success} icon="checkmark-done" />
          <BigStat c={c} label="Read"      value={read}      accent={c.info}    icon="eye" />
          <BigStat c={c} label="Failed"    value={failed}    accent={c.danger}  icon="close-circle" />
          <BigStat c={c} label="Pending"   value={Math.max(total - sent, 0)} accent={c.warning} icon="time" />
        </View>

        {/* Meta card */}
        <View className="rounded-[16px] p-4 my-3" style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}>
          <SectionHead c={c} icon="information-circle" label="Campaign Info" />
          <Row c={c} label="Channel"      value={String(cmp.channel || 'whatsapp').toUpperCase()} />
          <Row c={c} label="Template"     value={cmp.templateName || '—'} />
          <Row c={c} label="Category"     value={cmp.category || '—'} pill={cmp.category ? c.primarySoft : null} pillFg={c.primaryDeep} />
          <Row c={c} label="Created"      value={fmt(cmp.createdAt)} />
          {cmp.schedTime ? <Row c={c} label="Scheduled" value={fmt(cmp.schedTime)} /> : null}
          {cmp.lastResendAt ? <Row c={c} label="Last Resend" value={fmt(cmp.lastResendAt)} /> : null}
          <Row c={c} label="Channel ID"   value={cmp.channelId || '—'} mono last />
        </View>

        {/* Recipient drilldown */}
        <View className="rounded-[16px] p-4 mb-3" style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}>
          <SectionHead c={c} icon="people" label={`Recipients (${recipients.length})`} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 8 }}>
            {['all', 'delivered', 'read', 'sent', 'failed'].map((f) => {
              const active = recipFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setRecipFilter(f)}
                  activeOpacity={0.85}
                  className="rounded-full py-1 px-3"
                  style={{ backgroundColor: active ? c.primary : c.bgInput }}
                >
                  <Text className="text-[11px]" style={{ color: active ? '#FFFFFF' : c.textMuted, fontWeight: active ? '700' : '500' }}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {filteredRecipients.length === 0 ? (
            <Text className="text-[12px] py-6 text-center italic" style={{ color: c.textDim }}>
              No recipients match this filter.
            </Text>
          ) : (
            filteredRecipients.map((r, i) => {
              const tint = RECIPIENT_TINT[r.status] || RECIPIENT_TINT.pending;
              return (
                <View
                  key={r.id}
                  className="flex-row items-center py-2.5"
                  style={{ borderBottomWidth: i === filteredRecipients.length - 1 ? 0 : 1, borderBottomColor: c.rule, gap: 10 }}
                >
                  <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: tint.bg }}>
                    <Ionicons name={tint.icon} size={13} color={tint.fg} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[12px] font-bold" style={{ color: c.text }}>{r.number}</Text>
                    {r.error ? (
                      <Text className="text-[10px] mt-0.5" style={{ color: c.danger }}>{r.error}</Text>
                    ) : null}
                  </View>
                  <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: tint.bg }}>
                    <Text className="text-[9px] font-bold" style={{ color: tint.fg }}>{r.status.toUpperCase()}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Action row */}
        <View className="flex-row" style={{ gap: 8 }}>
          <TouchableOpacity
            onPress={togglePause}
            activeOpacity={0.85}
            className="flex-1 flex-row items-center justify-center rounded-[12px] py-3"
            style={{ backgroundColor: c.primary, gap: 6 }}
          >
            <Ionicons name={cmp.status === 'paused' ? 'play' : 'pause'} size={14} color="#FFFFFF" />
            <Text className="text-[13px] font-bold text-white">
              {cmp.status === 'paused' ? 'Resume' : 'Pause'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={resendFailed}
            activeOpacity={0.85}
            className="flex-1 flex-row items-center justify-center rounded-[12px] py-3"
            style={{ borderWidth: 1, borderColor: c.warning, gap: 6 }}
          >
            <Ionicons name="refresh" size={14} color={c.warning} />
            <Text className="text-[13px] font-bold" style={{ color: c.warning }}>Resend ({failed})</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={cancel}
          activeOpacity={0.85}
          className="flex-row items-center justify-center rounded-[12px] py-3 mt-2"
          style={{ borderWidth: 1, borderColor: c.border, gap: 6 }}
        >
          <Ionicons name="stop-circle-outline" size={14} color={c.text} />
          <Text className="text-[13px] font-semibold" style={{ color: c.text }}>Cancel campaign</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomTabBar c={c} navigation={navigation} active="campaign" />
    </View>
  );
}

function Header({ c, navigation, title, onMore }) {
  return (
    <ScreenHeader
      c={c}
      onBack={() => navigation.goBack()}
      icon="megaphone-outline"
      title={title}
      right={onMore ? (
        <TouchableOpacity
          onPress={onMore}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Delete campaign"
          style={{
            width: 36, height: 36, borderRadius: 18,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: c.bgInput,
          }}
        >
          <Ionicons name="trash-outline" size={18} color={c.danger} />
        </TouchableOpacity>
      ) : null}
    />
  );
}

function BigStat({ c, label, value, accent, icon }) {
  return (
    <View
      className="rounded-[14px] p-3"
      style={{ width: '48%', backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}
    >
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <Ionicons name={icon} size={13} color={accent} />
        <Text className="text-[11px] font-semibold" style={{ color: c.textMuted }}>{label}</Text>
      </View>
      <Text className="text-[22px] font-extrabold mt-1" style={{ color: accent || c.text }}>
        {Number(value || 0).toLocaleString()}
      </Text>
    </View>
  );
}

function SectionHead({ c, icon, label }) {
  return (
    <View className="flex-row items-center pb-3 mb-2" style={{ gap: 8, borderBottomWidth: 1, borderBottomColor: c.rule }}>
      <Ionicons name={icon} size={14} color={c.primary} />
      <Text className="text-[14px] font-bold" style={{ color: c.text }}>{label}</Text>
    </View>
  );
}

function Row({ c, label, value, mono, last, pill, pillFg }) {
  return (
    <View
      className="flex-row items-center py-2"
      style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: c.rule }}
    >
      <Text className="flex-1 text-[12px]" style={{ color: c.textMuted }}>{label}</Text>
      {pill ? (
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: pill }}>
          <Text className="text-[11px] font-bold" style={{ color: pillFg || c.text }}>{value}</Text>
        </View>
      ) : (
        <Text
          className="text-[12px] font-semibold"
          style={mono ? { color: c.text, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) } : { color: c.text }}
          numberOfLines={1}
        >
          {value}
        </Text>
      )}
    </View>
  );
}
