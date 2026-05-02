// src/screens/shared/ReportScreen.js — Campaign Activity report
//
// Mobile mirror of icpaas.in's WhatsApp / Campaign Activity report. Five
// sub-tabs (Campaign / Delivery / Schedule / Fallback / API), a date-range
// chip, a Filter Records strip, and a per-campaign card list with all of
// the desktop columns laid out vertically so a phone can read them.
//
// Data sources:
//   - campaignsSlice  → Campaign Report, Schedule Report, Fallback Report
//   - VoiceAPI / IVRAPI → Delivery Report (real call dispositions)
//   - Static placeholder for API Report until the audit endpoint is wired
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useBrand } from '../../theme';
import { VoiceAPI, IVRAPI } from '../../services/api';
import { selectCampaigns } from '../../store/slices/campaignsSlice';
import { formatCurrency } from '../../services/format';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';

const TABS = [
  { id: 'campaign', label: 'Campaign',  icon: 'megaphone-outline' },
  { id: 'delivery', label: 'Delivery',  icon: 'paper-plane-outline' },
  { id: 'schedule', label: 'Schedule',  icon: 'calendar-outline' },
  { id: 'fallback', label: 'Fallback',  icon: 'git-branch-outline' },
  { id: 'api',      label: 'API',       icon: 'code-slash-outline' },
];

const STATUS_TINT = (status, c) => {
  const s = String(status || '').toLowerCase();
  if (s === 'completed' || s.includes('answer')) return { bg: '#D1FAE5', fg: '#047857' };
  if (s === 'live'      || s.includes('runn'))   return { bg: '#DBEAFE', fg: '#1D4ED8' };
  if (s === 'scheduled')                          return { bg: '#FEF3C7', fg: '#B45309' };
  if (s === 'stuck'     || s.includes('partial')) return { bg: '#FEF3C7', fg: '#B45309' };
  if (s === 'failed'    || s.includes('reject') || s.includes('fail')) return { bg: '#FEE2E2', fg: '#B91C1C' };
  return { bg: c.bgInput, fg: c.textMuted };
};

const fmtDateLong = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('en-GB', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return String(iso); }
};

const fmtDateShort = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return String(iso); }
};

const dateOnly = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
};

export default function ReportScreen({ navigation }) {
  const c = useBrand();
  const campaigns = useSelector(selectCampaigns);

  const [tab, setTab] = useState('campaign');
  const [range, setRange] = useState({
    from: new Date(Date.now() - 14 * 86400 * 1000),
    to: new Date(),
  });
  const [voiceRows, setVoiceRows] = useState([]);
  const [loadingVoice, setLoadingVoice] = useState(false);
  const [voiceErr, setVoiceErr] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const fromDateStr = range.from.toISOString().slice(0, 10);
  const toDateStr   = range.to.toISOString().slice(0, 10);
  const rangeLabel = `${dateOnly(range.from)} — ${dateOnly(range.to)}`;

  // Voice / IVR delivery report — fetched only when the Delivery tab is on.
  const fetchDelivery = useCallback(async () => {
    setLoadingVoice(true); setVoiceErr(null);
    try {
      const res = await VoiceAPI.getDeliveryReport({ fromDate: fromDateStr, toDate: toDateStr, reportType: 'OBD' });
      setVoiceRows(res?.data || []);
    } catch (e) {
      setVoiceErr(e?.message || 'Failed to load report');
      setVoiceRows([]);
    } finally {
      setLoadingVoice(false); setRefreshing(false);
    }
  }, [fromDateStr, toDateStr]);

  useEffect(() => {
    if (tab === 'delivery') fetchDelivery();
  }, [tab, fetchDelivery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (tab === 'delivery') fetchDelivery();
    else setTimeout(() => setRefreshing(false), 400);
  }, [tab, fetchDelivery]);

  // Per-tab row source.
  const rows = useMemo(() => {
    if (tab === 'campaign') return campaigns;
    if (tab === 'schedule') return campaigns.filter((cmp) => cmp.status === 'scheduled');
    if (tab === 'fallback') return campaigns.filter((cmp) => (cmp.failed || 0) > 0);
    if (tab === 'delivery') return voiceRows;
    return [];
  }, [tab, campaigns, voiceRows]);

  const isLoading = tab === 'delivery' && loadingVoice;
  const tabErr = tab === 'delivery' ? voiceErr : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        icon="bar-chart-outline"
        title="Campaign Activity"
        subtitle="Home · WhatsApp · Reports"
      />

      {/* Sub-tab strip — horizontally scrollable so all 5 tabs stay reachable on narrow screens. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        style={{ borderBottomWidth: 1, borderBottomColor: c.rule, flexGrow: 0 }}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              activeOpacity={0.85}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${t.label} report`}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
                gap: 6,
                backgroundColor: active ? c.primary : c.bgInput,
              }}
            >
              <Ionicons name={t.icon} size={13} color={active ? '#FFFFFF' : c.textMuted} />
              <Text
                style={{
                  color: active ? '#FFFFFF' : c.textMuted,
                  fontSize: 12, fontWeight: active ? '700' : '500',
                }}
              >
                {t.label} Report
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} />}
      >
        {/* Date range chip */}
        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Date range ${rangeLabel}, tap to change`}
          style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
            backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border,
            marginBottom: 12, gap: 10,
          }}
        >
          <Ionicons name="calendar-outline" size={16} color={c.primary} />
          <Text style={{ flex: 1, color: c.text, fontSize: 13, fontWeight: '600' }}>{rangeLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={c.textMuted} />
        </TouchableOpacity>

        {/* Filter Records collapsible */}
        <TouchableOpacity
          onPress={() => setFilterOpen((v) => !v)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ expanded: filterOpen }}
          accessibilityLabel="Filter records"
          style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
            backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border,
            marginBottom: 12, gap: 10,
          }}
        >
          <Ionicons name="funnel-outline" size={16} color={c.primary} />
          <Text style={{ flex: 1, color: c.text, fontSize: 13, fontWeight: '700' }}>Filter Records</Text>
          <Ionicons name={filterOpen ? 'chevron-up' : 'chevron-down'} size={14} color={c.textMuted} />
        </TouchableOpacity>

        {filterOpen ? (
          <View
            style={{
              padding: 12, borderRadius: 14, marginBottom: 12,
              backgroundColor: c.bgInput, gap: 6,
            }}
          >
            <Text style={{ color: c.textMuted, fontSize: 11 }}>
              Filter widgets coming soon — will narrow rows by template, status, channel.
            </Text>
          </View>
        ) : null}

        {/* Result count + tab name */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 2 }}>
          <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 }}>
            {TABS.find((t) => t.id === tab)?.label} · {rows.length} record{rows.length === 1 ? '' : 's'}
          </Text>
        </View>

        {/* Body */}
        {isLoading ? (
          <View>
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} c={c} />)}
          </View>
        ) : tabErr ? (
          <View
            style={{
              padding: 14, borderRadius: 14,
              backgroundColor: c.bgInput,
              borderLeftWidth: 3, borderLeftColor: c.danger,
            }}
          >
            <Text style={{ color: c.danger, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>
              Fetch error
            </Text>
            <Text style={{ color: c.text, fontSize: 13 }}>{tabErr}</Text>
          </View>
        ) : rows.length === 0 ? (
          <EmptyState
            c={c}
            icon="document-text-outline"
            accentIcons={['calendar-outline', 'megaphone-outline']}
            title="No records in this range"
            subtitle="Widen the date range, or launch a campaign to see entries here."
            ctaLabel="Open campaigns"
            onCtaPress={() => navigation.navigate('CampaignsList')}
          />
        ) : tab === 'delivery' ? (
          rows.map((r, i) => <DeliveryCard key={i} c={c} row={r} />)
        ) : tab === 'api' ? (
          <View
            style={{
              padding: 16, borderRadius: 14,
              backgroundColor: c.bgInput, gap: 6,
            }}
          >
            <Text style={{ color: c.text, fontSize: 13, fontWeight: '700' }}>API Report</Text>
            <Text style={{ color: c.textMuted, fontSize: 12 }}>
              Audit endpoint not yet wired. Hooks into gsauth.com /audit/log when available.
            </Text>
          </View>
        ) : (
          rows.map((cmp) => <CampaignCard key={cmp.id} c={c} cmp={cmp} navigation={navigation} />)
        )}
      </ScrollView>
    </View>
  );
}

// Mobile-friendly card mirroring the desktop columns. Each labelled row is
// a key/value pair so the report still reads at narrow widths.
const Field = ({ c, label, value, mono }) => (
  <View style={{ marginBottom: 6 }}>
    <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
      {label}
    </Text>
    <Text
      style={{
        color: c.text,
        fontSize: 12,
        marginTop: 2,
        ...(mono ? { fontFamily: 'monospace' } : {}),
      }}
      numberOfLines={2}
    >
      {value || '—'}
    </Text>
  </View>
);

const ActionBtn = ({ c, icon, tint, accessibilityLabel, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    style={{
      width: 32, height: 32, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: (tint || c.primary) + '22',
      borderWidth: 1, borderColor: (tint || c.primary) + '55',
    }}
  >
    <Ionicons name={icon} size={14} color={tint || c.primary} />
  </TouchableOpacity>
);

const CampaignCard = ({ c, cmp, navigation }) => {
  const status = STATUS_TINT(cmp.status, c);
  const cost = (cmp.sent || 0) * 0.0006; // gsauth WhatsApp marketing approx; replace once /finalCost is wired
  const isJourney = !!cmp.journey || !!cmp.isJourney;

  return (
    <View
      style={{
        padding: 14, marginBottom: 12, borderRadius: 16,
        backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border,
      }}
    >
      {/* Top row: campaign date + status pill */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
            Campaign Date
          </Text>
          <Text style={{ color: c.text, fontSize: 13, fontWeight: '700', marginTop: 2 }}>
            {fmtDateLong(cmp.createdAt)}
          </Text>
        </View>
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: status.bg }}>
          <Text style={{ color: status.fg, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>
            {String(cmp.status || 'unknown').toUpperCase()}
          </Text>
        </View>
      </View>

      <Field c={c} label="Campaign Info" value={`Name: ${cmp.name || '—'}\nType: ${cmp.category || 'Normal'}`} />
      <Field c={c} label="Template Info" value={`Name: ${cmp.templateName || '—'}\nType: ${cmp.category || '—'}`} />
      <Field c={c} label="Interface / Channel" value={`Interface: ${cmp.channel ? String(cmp.channel).toUpperCase() : 'Web'}\nChannel: ${cmp.channelId || '—'}`} mono />
      <Field
        c={c}
        label="Scheduled Info"
        value={cmp.schedTime ? `IsScheduled: Yes\nScheduleDate: ${cmp.schedTime}` : 'IsScheduled: No\nScheduleDate: N/A'}
      />

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
        <View style={{ flex: 1 }}>
          <Field c={c} label="Is Journey" value={isJourney ? 'Yes' : 'No'} />
        </View>
        <View style={{ flex: 1 }}>
          <Field c={c} label="Cost" value={formatCurrency(cost)} />
        </View>
        <View style={{ flex: 1 }}>
          <Field c={c} label="Total" value={String(cmp.total ?? '—')} />
        </View>
      </View>

      {cmp.failed > 0 ? (
        <View
          style={{
            marginTop: 4, padding: 8, borderRadius: 10,
            backgroundColor: c.danger + '15',
            borderLeftWidth: 2, borderLeftColor: c.danger,
          }}
        >
          <Text style={{ color: c.danger, fontSize: 11, fontWeight: '700' }}>
            {cmp.failed} of {cmp.total} failed
          </Text>
        </View>
      ) : null}

      {/* Action row */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.rule }}>
        <ActionBtn c={c} icon="list" accessibilityLabel="View row details" onPress={() => navigation.navigate('CampaignDetail', { id: cmp.id })} />
        <ActionBtn c={c} icon="eye-outline" accessibilityLabel="Preview campaign" onPress={() => navigation.navigate('CampaignDetail', { id: cmp.id })} />
        <ActionBtn c={c} icon="download-outline" accessibilityLabel="Export campaign" onPress={() => {}} />
        <ActionBtn c={c} icon="refresh" tint={c.success} accessibilityLabel="Retry / refresh" onPress={() => {}} />
      </View>
    </View>
  );
};

// Voice / IVR delivery row — same card shape as campaigns so the screen
// reads consistently across tabs.
const DeliveryCard = ({ c, row }) => {
  const number = row.number || row.caller || row.destination || '—';
  const when = row.callInitDate || row.callDateTime || row.startTime || row.answeredTime;
  const status = row.callStatus || row.disposition || '—';
  const dur = row.callDuration ?? row.duration ?? row.ibdBillSec;
  const cost = row.finalCost ?? row.cost;
  const tint = STATUS_TINT(status, c);

  return (
    <View
      style={{
        padding: 14, marginBottom: 12, borderRadius: 16,
        backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: tint.bg }}>
          <Ionicons name="call" size={16} color={tint.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontSize: 14, fontWeight: '700', fontFamily: 'monospace' }}>{String(number)}</Text>
          <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}>{fmtDateShort(when)}</Text>
        </View>
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: tint.bg }}>
          <Text style={{ color: tint.fg, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{String(status)}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field c={c} label="Duration" value={dur != null ? `${Math.round(Number(dur))}s` : '—'} />
        </View>
        <View style={{ flex: 1 }}>
          <Field c={c} label="Cost" value={cost != null ? formatCurrency(cost) : '—'} />
        </View>
      </View>
    </View>
  );
};
