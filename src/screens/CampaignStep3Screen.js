// src/screens/CampaignStep3Screen.js — Campaign Launch · Step 3 (matches Camapign screen3.png)
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useBrand } from '../theme';
import { upsertCampaign } from '../store/slices/campaignsSlice';
import { pushNotification } from '../store/slices/notificationsSlice';
import { WhatsAppAPI } from '../services/api';
import toast from '../services/toast';
import {
  Stepper, Card, SectionTitle, PrimaryButton, SecondaryButton,
} from './CampaignStep1Screen';

const toList = (raw) =>
  String(raw || '').split(/[\n,;\s]+/).map((s) => s.trim()).filter(Boolean);

const dedup = (arr) => [...new Set(arr)];

export default function CampaignStep3Screen({ navigation, route }) {
  const c = useBrand();
  const dispatch = useDispatch();
  const draft = route?.params?.draft || {};
  const [launching, setLaunching] = useState(false);

  const numbersRaw = useMemo(() => toList(draft.numbers), [draft.numbers]);
  const numbers = useMemo(() => (draft.removeDup ? dedup(numbersRaw) : numbersRaw), [numbersRaw, draft.removeDup]);
  const dupCount = numbersRaw.length - numbers.length;

  const channelObj = (draft.channels || []).find((x) => x.phoneNumberId === draft.channelId);
  const channelLabel = channelObj
    ? `${channelObj.wabaBusinessId || ''}-${channelObj.wabaNumber || channelObj.phoneNumberId || ''}`
    : draft.channelId || '—';

  // Convert flat values { body_0, header_text_0, button_url_0, ... }
  // into the grouped shape expected by buildInputData.
  const templateVariables = useMemo(() => {
    const tv = { headerText: [], body: [], buttonUrl: [], buttonCoupon: [], buttonPayload: [] };
    (draft.varSpec || []).forEach((s) => {
      const v = (draft.values || {})[s.key];
      if (v === undefined) return;
      tv[s.group][s.index] = v;
    });
    return tv;
  }, [draft.varSpec, draft.values]);

  const launch = async () => {
    if (!draft.templateName) { toast.warning('Pick a template', 'A template is required to launch.'); return; }
    if (numbers.length === 0) { toast.warning('No recipients', 'Add at least one number.'); return; }
    setLaunching(true);
    try {
      const results = await Promise.all(
        numbers.map((n) =>
          WhatsAppAPI.sendTemplateAuto({
            to: n,
            phoneNumberId: draft.channelId,
            wabaBusinessId: channelObj?.wabaBusinessId,
            templateName: draft.templateName,
            templateVariables,
          }).then((r) => ({ ok: true, r })).catch((e) => ({ ok: false, e })),
        ),
      );

      const failed = results.filter((r) => !r.ok).length;
      const sent = results.length - failed;

      dispatch(upsertCampaign({
        id: `cmp_${Date.now()}`,
        name: draft.name,
        channel: 'whatsapp',
        channelId: draft.channelId,
        templateName: draft.templateName,
        category: draft.category,
        total: numbers.length,
        sent,
        failed,
        status: failed === numbers.length ? 'failed' : (failed > 0 ? 'stuck' : (draft.scheduleNow && draft.schedTime ? 'scheduled' : 'live')),
        schedTime: draft.scheduleNow && draft.schedTime ? draft.schedTime : null,
        createdAt: new Date().toISOString(),
      }));

      if (failed === 0) {
        toast.success('Campaign launched', `${sent} message${sent === 1 ? '' : 's'} dispatched.`);
        dispatch(pushNotification({
          kind: 'campaign-success',
          title: `Campaign "${draft.name}" launched`,
          body: `${sent} message${sent === 1 ? '' : 's'} dispatched on WhatsApp.`,
        }));
      } else if (sent === 0) {
        toast.error('Campaign failed', 'No messages were dispatched.');
        dispatch(pushNotification({
          kind: 'campaign-failed',
          title: `Campaign "${draft.name}" failed`,
          body: 'All recipients rejected. Check the bearer token and template approval status.',
        }));
      } else {
        toast.warning('Campaign partially sent', `${sent}/${numbers.length} delivered, ${failed} failed.`);
        dispatch(pushNotification({
          kind: 'campaign-stuck',
          title: `Campaign "${draft.name}" stuck`,
          body: `${sent} of ${numbers.length} delivered. ${failed} attempts failed.`,
        }));
      }

      navigation.navigate('CampaignsList');
    } catch (e) {
      toast.error('Launch failed', e?.message || 'Unknown error');
      dispatch(pushNotification({
        kind: 'campaign-failed',
        title: `Campaign "${draft.name}" failed`,
        body: e?.message || 'Unknown error during launch.',
      }));
    } finally {
      setLaunching(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header c={c} navigation={navigation} title="Campaign Launch" />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Stepper c={c} step={3} />

        <Card c={c}>
          <SectionTitle c={c} icon="document-text" label="Campaign Summary" />

          <SummaryRow c={c} icon="megaphone"          label="Campaign Name"  value={draft.name || '—'} />
          <SummaryRow c={c} icon="wifi"               label="Channel"        value={channelLabel} />
          <SummaryRow c={c} icon="document-text"      label="Template Name"  value={draft.templateName || '—'} />
          <SummaryRow c={c} icon="options"            label="Category"       pill={draft.category || null} value={draft.category ? null : '—'} />
          <SummaryRow c={c} icon="people"             label="Total Numbers"  value={String(numbers.length)} />
          <SummaryRow c={c} icon="filter"             label="Duplicates"     value={String(dupCount)} />
          <SummaryRow
            c={c}
            icon="code-slash"
            label="Variables"
            value={(draft.varSpec || []).length === 0
              ? 'None — template static'
              : `${Object.values(draft.values || {}).filter((v) => v).length} of ${(draft.varSpec || []).length} filled`}
          />
          <SummaryRow
            c={c}
            icon="time-outline"
            label="Schedule"
            value={draft.scheduleNow && draft.schedTime ? draft.schedTime : 'Send immediately'}
            last
          />
        </Card>

        <View className="flex-row" style={{ gap: 10 }}>
          <SecondaryButton c={c} icon="hand-left" label="Previous" onPress={() => navigation.goBack()} />
          <View style={{ flex: 1 }}>
            <PrimaryButton c={c} icon="send" label={launching ? 'Launching…' : 'Launch Campaign'} onPress={launch} disabled={launching} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Header({ c, navigation, title }) {
  return (
    <View
      className="flex-row items-center px-4"
      style={{
        paddingTop: Platform.OS === 'ios' ? 56 : 36,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: c.rule,
        backgroundColor: c.bg,
      }}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} className="w-10 h-10 items-center justify-center">
        <Ionicons name="arrow-back" size={22} color={c.text} />
      </TouchableOpacity>
      <Text className="flex-1 text-[18px] font-bold text-center" style={{ color: c.text }}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function SummaryRow({ c, icon, label, value, pill, last }) {
  return (
    <View
      className="flex-row items-center rounded-[12px] px-3 py-3 mb-2"
      style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.bg, gap: 12 }}
    >
      <View className="w-9 h-9 rounded-[10px] items-center justify-center" style={{ backgroundColor: c.primarySoft }}>
        <Ionicons name={icon} size={16} color={c.primary} />
      </View>
      <View className="flex-1">
        <Text className="text-[12px] font-semibold" style={{ color: c.text }}>{label}</Text>
        {value ? <Text className="text-[12px] mt-0.5" style={{ color: c.textMuted }} numberOfLines={1}>{value}</Text> : null}
        {pill ? (
          <View className="flex-row mt-1">
            <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: c.primarySoft }}>
              <Text className="text-[10px] font-bold" style={{ color: c.primaryDeep }}>{pill}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
