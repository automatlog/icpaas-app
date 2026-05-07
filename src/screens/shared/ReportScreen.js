// src/screens/ReportScreen.js — Multi-service campaign report viewer
// Top: service tabs (WhatsApp · RCS · SMS · Voice)
// Sub-tabs per service (Campaign Report · Delivery Report · Schedule Report · etc.)
// Date range picker + data table with service-specific columns
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Platform, RefreshControl, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrand } from '../../theme';
import { VoiceAPI, IVRAPI } from '../../services/api';
import ScreenHeader from '../../components/ScreenHeader';

/* ───────── helpers ───────── */
const ymd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };
const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso).slice(0, 16);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return String(iso); }
};

/* ───────── service config ───────── */
const SERVICES = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
  { id: 'rcs',      label: 'RCS',      icon: 'logo-google'   },
  { id: 'sms',      label: 'SMS',      icon: 'chatbubble-outline' },
  { id: 'voice',    label: 'Voice',    icon: 'mic-outline'   },
];

const SUB_TABS = {
  whatsapp: [
    { id: 'campaign',  label: 'Campaign Report',  icon: 'megaphone-outline' },
    { id: 'delivery',  label: 'Delivery Report',  icon: 'checkmark-done-outline' },
    { id: 'schedule',  label: 'Schedule Report',  icon: 'calendar-outline' },
    { id: 'fallback',  label: 'Fallback Report',  icon: 'swap-horizontal-outline' },
    { id: 'api',       label: 'API Report',       icon: 'code-slash-outline' },
  ],
  rcs: [
    { id: 'campaign',  label: 'Campaign Report',  icon: 'megaphone-outline' },
    { id: 'delivery',  label: 'Delivery Report',  icon: 'checkmark-done-outline' },
    { id: 'schedule',  label: 'Schedule Report',  icon: 'calendar-outline' },
    { id: 'fallback',  label: 'Fallback Report',  icon: 'swap-horizontal-outline' },
  ],
  sms: [
    { id: 'campaign',  label: 'Campaign Report',  icon: 'megaphone-outline' },
    { id: 'delivery',  label: 'Delivery Report',  icon: 'checkmark-done-outline' },
    { id: 'schedule',  label: 'Schedule Report',  icon: 'calendar-outline' },
    { id: 'fallback',  label: 'Fallback Report',  icon: 'swap-horizontal-outline' },
  ],
  voice: [
    { id: 'campaign',  label: 'Campaign Report',  icon: 'megaphone-outline' },
    { id: 'delivery',  label: 'Delivery Report',  icon: 'checkmark-done-outline' },
    { id: 'schedule',  label: 'Schedule Report',  icon: 'calendar-outline' },
    { id: 'api',       label: 'API Report',       icon: 'code-slash-outline' },
  ],
};

/* columns per service + sub-tab */
const COLUMNS = {
  whatsapp: {
    campaign:  ['Campaign Date', 'Campaign Info', 'Template Info', 'Interface / Channel', 'Scheduled Info', 'Is Journey', 'Cost', 'Total Count', 'Error', 'Status'],
    delivery:  ['Date', 'Campaign', 'Mobile', 'Template', 'Status', 'Sent At', 'Delivered At', 'Read At', 'Cost'],
    schedule:  ['Campaign Date', 'Campaign Info', 'Template', 'Scheduled Time', 'Total Count', 'Status'],
    fallback:  ['Date', 'Campaign', 'Original Channel', 'Fallback Channel', 'Mobile', 'Status', 'Cost'],
    api:       ['Date', 'API Key', 'Template', 'Destination', 'Status', 'Message ID', 'Cost'],
  },
  rcs: {
    campaign:  ['Campaign Date', 'Campaign Name', 'Template Name', 'Agent Info', 'Interface', 'Message Type', 'Scheduled Info', 'Is Journey', 'Total Count', 'Credit Used', 'Status'],
    delivery:  ['Date', 'Campaign', 'Mobile', 'Template', 'Bot ID', 'Status', 'Delivered At', 'Cost'],
    schedule:  ['Campaign Date', 'Campaign Name', 'Template', 'Scheduled Time', 'Total Count', 'Status'],
    fallback:  ['Date', 'Campaign', 'Original Channel', 'Fallback Channel', 'Mobile', 'Status', 'Cost'],
  },
  sms: {
    campaign:  ['Campaign Date', 'Campaign Name', 'SenderID', 'Spent', 'Message', 'Campaign Flow', 'Scheduled Info', 'Is Journey', 'Total Count', 'Status'],
    delivery:  ['Date', 'Campaign', 'Mobile', 'Sender ID', 'Message', 'DLR Status', 'Sent At', 'Delivered At', 'Cost'],
    schedule:  ['Campaign Date', 'Campaign Name', 'SenderID', 'Scheduled Time', 'Total Count', 'Status'],
    fallback:  ['Date', 'Campaign', 'Original Channel', 'Fallback Channel', 'Mobile', 'Status', 'Cost'],
  },
  voice: {
    campaign:  ['Campaign Date', 'Campaign Name', 'Caller ID', 'Plan Name', 'Sound File', 'Botflow', 'DTMF Enabled', 'Scheduled Info', 'Total Contacts', 'Progress', 'Base', 'Retry Count', 'Delay (min)', 'Before Credits'],
    delivery:  ['Date', 'Campaign', 'Number', 'Caller ID', 'Duration', 'Status', 'Cost'],
    schedule:  ['Campaign Date', 'Campaign Name', 'Caller ID', 'Scheduled Time', 'Total Count', 'Status'],
    api:       ['Date', 'API Key', 'Caller ID', 'Destination', 'Duration', 'Status', 'Cost'],
  },
};

/* ───────── component ───────── */
export default function ReportScreen({ navigation }) {
  const c = useBrand();

  const [service, setService] = useState('whatsapp');
  const [subTab, setSubTab] = useState('campaign');
  const [fromDate, setFromDate] = useState(daysAgo(1));
  const [toDate, setToDate] = useState(ymd(new Date()));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(null);

  // Reset sub-tab when service changes
  useEffect(() => {
    const tabs = SUB_TABS[service] || [];
    if (!tabs.find(t => t.id === subTab)) setSubTab(tabs[0]?.id || 'campaign');
  }, [service]);

  const fetchRows = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      // Only voice has real APIs wired up right now
      if (service === 'voice') {
        if (subTab === 'campaign' || subTab === 'delivery') {
          const res = await VoiceAPI.getDeliveryReport({ fromDate, toDate, reportType: 'OBD' });
          setRows(res?.data || []);
        } else {
          setRows([]);
        }
      } else {
        // WhatsApp / RCS / SMS — stub (no report API in api.js yet)
        setRows([]);
      }
    } catch (e) {
      setErr(e?.message || 'Failed to load report');
      setRows([]);
    } finally { setLoading(false); setRefreshing(false); }
  }, [service, subTab, fromDate, toDate]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const currentColumns = useMemo(
    () => COLUMNS[service]?.[subTab] || [],
    [service, subTab],
  );
  const currentSubTabs = SUB_TABS[service] || [];

  /* ───────── render helpers ───────── */
  const renderTableHeader = () => (
    <View style={{
      flexDirection: 'row', backgroundColor: c.primarySoft, borderRadius: 10,
      marginBottom: 2, paddingVertical: 10, paddingHorizontal: 8,
    }}>
      {currentColumns.map((col, i) => (
        <Text key={i} numberOfLines={2} style={{
          width: 120, color: c.primaryDeep, fontSize: 11, fontWeight: '700',
          paddingHorizontal: 4, textTransform: 'uppercase', letterSpacing: 0.3,
        }}>{col}</Text>
      ))}
    </View>
  );

  const getCellValue = (row, colName) => {
    const key = colName.toLowerCase().replace(/[\s\/()]+/g, '');
    // Try common field mappings
    const map = {
      campaigndate: row.campaignDate || row.callInitDate || row.date || row.createdAt,
      campaigninfo: row.campaignInfo || row.campaignName || row.campaign,
      campaignname: row.campaignName || row.campaign || row.name,
      templateinfo: row.templateInfo || row.templateName || row.template,
      templatename: row.templateName || row.template,
      interfacechannel: row.interface || row.channel || row.interfaceChannel,
      interface: row.interface || row.channel,
      scheduledinfo: row.scheduledInfo || row.schedTime || (row.isScheduled ? 'Yes' : 'No'),
      isjourney: row.isJourneyCampaign ? 'Yes' : 'No',
      isjournycampaign: row.isJourneyCampaign ? 'Yes' : 'No',
      cost: row.cost != null ? `₹${Number(row.cost).toFixed(3)}` : '—',
      spent: row.spent != null ? `₹${Number(row.spent).toFixed(3)}` : '—',
      totalcount: row.totalCount ?? row.total ?? '—',
      totalcontacts: row.totalContacts ?? row.totalCount ?? '—',
      error: row.error || '—',
      status: row.campaignStatus || row.callStatus || row.status || row.disposition || '—',
      date: row.date || row.callInitDate || row.createdAt,
      campaign: row.campaignName || row.campaign,
      mobile: row.mobile || row.number || row.destination || row.caller,
      template: row.templateName || row.template,
      senderid: row.senderId || row.senderID || '—',
      message: row.message || row.text || '—',
      messagetype: row.messageType || '—',
      agentinfo: row.agentInfo || row.agentName || '—',
      botid: row.botId || row.botid || '—',
      callerid: row.callerId || row.callerID || '—',
      planname: row.planName || '—',
      soundfile: row.soundFile || row.mediaFile || '—',
      botflow: row.botFlow || row.botFlowId || '—',
      dtmfenabled: row.dtmfEnabled ? 'Yes' : 'No',
      number: row.number || row.destination || '—',
      duration: row.callDuration ?? row.duration ?? '—',
      dlrstatus: row.dlrStatus || row.deliveryStatus || row.status || '—',
      sentat: fmtDate(row.sentAt || row.sendTime),
      deliveredat: fmtDate(row.deliveredAt || row.deliveryTime),
      readat: fmtDate(row.readAt),
      scheduledtime: fmtDate(row.scheduledTime || row.schedTime),
      originalchannel: row.originalChannel || '—',
      fallbackchannel: row.fallbackChannel || '—',
      apikey: row.apiKey || '—',
      messageid: row.messageId || row.msgId || '—',
      destination: row.destination || row.number || '—',
      creditused: row.creditUsed ?? row.credit ?? '—',
      progress: row.progress ?? '—',
      base: row.base ?? '—',
      retrycount: row.retryCount ?? '—',
      'delay(min)': row.delay ?? row.delayMin ?? '—',
      delaymin: row.delay ?? row.delayMin ?? '—',
      beforecredits: row.beforeCredits ?? '—',
      campaignflow: row.campaignFlow || row.interface || '—',
      view: '👁',
    };
    return map[key] ?? row[colName] ?? '—';
  };

  const renderRow = (row, idx) => (
    <View key={idx} style={{
      flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8,
      backgroundColor: idx % 2 === 0 ? c.bg : c.bgSoft,
      borderBottomWidth: 1, borderBottomColor: c.rule,
    }}>
      {currentColumns.map((col, i) => {
        const val = getCellValue(row, col);
        const isStatus = col.toLowerCase().includes('status');
        return (
          <View key={i} style={{ width: 120, paddingHorizontal: 4 }}>
            {isStatus ? (
              <View style={{
                backgroundColor: String(val).toUpperCase().includes('COMPLETED') || String(val).toUpperCase().includes('DELIVERED') || String(val).toUpperCase().includes('ANSWER')
                  ? c.success + '22' : String(val).toUpperCase().includes('FAIL') || String(val).toUpperCase().includes('REJECT')
                  ? c.danger + '22' : c.warning + '22',
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start',
              }}>
                <Text style={{
                  fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
                  color: String(val).toUpperCase().includes('COMPLETED') || String(val).toUpperCase().includes('DELIVERED') || String(val).toUpperCase().includes('ANSWER')
                    ? c.success : String(val).toUpperCase().includes('FAIL') || String(val).toUpperCase().includes('REJECT')
                    ? c.danger : c.warning,
                }}>{String(val)}</Text>
              </View>
            ) : (
              <Text numberOfLines={2} style={{ color: c.text, fontSize: 12 }}>{String(val)}</Text>
            )}
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        icon="bar-chart-outline"
        title="Reports"
        right={
          <TouchableOpacity onPress={fetchRows} activeOpacity={0.7}
            style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bgInput }}>
            <Ionicons name="refresh" size={16} color={c.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRows(); }} tintColor={c.primary} />}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ══════ Service Tabs ══════ */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 6 }}>
          {SERVICES.map(svc => {
            const active = service === svc.id;
            return (
              <TouchableOpacity key={svc.id} activeOpacity={0.8}
                onPress={() => setService(svc.id)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
                  backgroundColor: active ? c.primary : c.bgInput,
                  borderWidth: active ? 0 : 1, borderColor: c.border,
                }}>
                <Ionicons name={svc.icon} size={14} color={active ? '#FFF' : c.textMuted} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFF' : c.text }}>{svc.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ══════ Sub Tabs ══════ */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 6 }}>
          {currentSubTabs.map(st => {
            const active = subTab === st.id;
            return (
              <TouchableOpacity key={st.id} activeOpacity={0.8}
                onPress={() => setSubTab(st.id)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
                  backgroundColor: active ? c.primary + '18' : 'transparent',
                  borderWidth: 1, borderColor: active ? c.primary : c.border,
                }}>
                <Ionicons name={st.icon} size={12} color={active ? c.primary : c.textMuted} />
                <Text style={{ fontSize: 11, fontWeight: active ? '700' : '500', color: active ? c.primary : c.textMuted }}>{st.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ══════ Date Range ══════ */}
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.textMuted, fontSize: 11, marginBottom: 4, fontWeight: '600', letterSpacing: 0.4 }}>From</Text>
            <TextInput value={fromDate} onChangeText={setFromDate}
              placeholder="yyyy-mm-dd" placeholderTextColor={c.textDim}
              style={{
                backgroundColor: c.bgInput, borderRadius: 12, paddingHorizontal: 12,
                paddingVertical: Platform.OS === 'ios' ? 12 : 9, color: c.text, fontSize: 13,
                fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                ...Platform.select({ web: { outlineStyle: 'none' } }),
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.textMuted, fontSize: 11, marginBottom: 4, fontWeight: '600', letterSpacing: 0.4 }}>To</Text>
            <TextInput value={toDate} onChangeText={setToDate}
              placeholder="yyyy-mm-dd" placeholderTextColor={c.textDim}
              style={{
                backgroundColor: c.bgInput, borderRadius: 12, paddingHorizontal: 12,
                paddingVertical: Platform.OS === 'ios' ? 12 : 9, color: c.text, fontSize: 13,
                fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                ...Platform.select({ web: { outlineStyle: 'none' } }),
              }}
            />
          </View>
          <TouchableOpacity onPress={fetchRows} activeOpacity={0.85}
            style={{
              backgroundColor: c.primary, borderRadius: 12,
              paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center',
              alignSelf: 'flex-end', paddingVertical: 10,
            }}>
            <Ionicons name="search" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* ══════ Filter Records header ══════ */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 16,
          backgroundColor: c.bgInput, borderRadius: 12, marginBottom: 6,
        }}>
          <Ionicons name="filter-outline" size={14} color={c.textMuted} />
          <Text style={{ color: c.text, fontSize: 13, fontWeight: '600', flex: 1 }}>Filter Records</Text>
          <Text style={{ color: c.primary, fontSize: 12, fontWeight: '700' }}>
            {rows.length} {rows.length === 1 ? 'record' : 'records'}
          </Text>
        </View>

        {/* ══════ Data Table ══════ */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          {loading ? (
            <View style={{ paddingVertical: 60, alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color={c.primary} size="large" />
              <Text style={{ color: c.textMuted, fontSize: 13 }}>Loading report…</Text>
            </View>
          ) : err ? (
            <View style={{
              backgroundColor: c.danger + '12', borderRadius: 14, padding: 16,
              borderLeftWidth: 3, borderLeftColor: c.danger,
            }}>
              <Text style={{ color: c.danger, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Error</Text>
              <Text style={{ color: c.text, fontSize: 13 }}>{err}</Text>
            </View>
          ) : rows.length === 0 ? (
            <View style={{ paddingVertical: 50, alignItems: 'center', gap: 10 }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: c.primary + '15',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="document-text-outline" size={28} color={c.primary} />
              </View>
              <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>No data found</Text>
              <Text style={{ color: c.textMuted, fontSize: 13, textAlign: 'center', maxWidth: 260 }}>
                No records for this date range. Try widening your dates or switch the report type.
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 4 }}>
                Showing 1 to 0 of 0 records
              </Text>
            </View>
          ) : (
            <View style={{
              borderRadius: 14, overflow: 'hidden',
              borderWidth: 1, borderColor: c.border,
            }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View>
                  {renderTableHeader()}
                  {rows.map((row, i) => renderRow(row, i))}
                </View>
              </ScrollView>
              {/* Pagination info */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                padding: 12, backgroundColor: c.bgSoft, borderTopWidth: 1, borderTopColor: c.rule,
              }}>
                <Text style={{ color: c.primary, fontSize: 12, fontWeight: '600' }}>
                  Showing 1 to {rows.length} of {rows.length} records
                </Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {['«', '‹', '1', '›', '»'].map((lbl, i) => (
                    <View key={i} style={{
                      width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: lbl === '1' ? c.primary : c.bgInput,
                    }}>
                      <Text style={{ color: lbl === '1' ? '#FFF' : c.textMuted, fontSize: 11, fontWeight: '700' }}>{lbl}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
