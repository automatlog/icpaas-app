// src/screens/SendMessageScreen.js — Unified WA/SMS/RCS/Voice composer (NativeWind)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Platform, Alert, useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  WhatsAppAPI, SMSAPI, RCSAPI, VoiceAPI, TemplatesAPI,
} from '../../services/api';
import {
  extractWhatsAppVariables, buildInputData, buildWhatsAppSendPayload, normalizeForMessaging,
} from '../../services/whatsappHelpers';
import {
  countSmsVariables, getSmsTemplateText, buildSmsTemplatePayload,
} from '../../services/smsHelpers';
import {
  extractRcsVariables, getRcsComponent, buildRcsPayload,
} from '../../services/rcsHelpers';
import useFormDraft from '../../hooks/useFormDraft';
import { useBrand } from '../../theme';
import ScreenHeader from '../../components/ScreenHeader';

// Channel chip rail consumes the canonical channel list (single source of
// truth in src/constants/channels.js) and uses the soft tint for chip
// backgrounds rather than the bold dashboard tint.
import { CHANNELS as CANONICAL_CHANNELS } from '../../constants/channels';
const CHANNELS = CANONICAL_CHANNELS.map((ch) => ({
  id: ch.id, label: ch.label, icon: ch.icon, tint: ch.softTint,
}));

const C = {
  dark: { bg: '#0A0A0D', bgSoft: '#141418', bgInput: '#1C1C22', ink: '#FFFFFF', muted: '#9A9AA2', dim: '#5C5C63', pink: '#FF4D7E', cyan: '#5CD4E0' },
  light: { bg: '#FAFAFB', bgSoft: '#F2F2F5', bgInput: '#ECECEF', ink: '#0A0A0D', muted: '#5C5C63', dim: '#9A9AA2', pink: '#E6428A', cyan: '#2FB8C4' },
};

const waVarSpec = (extracted) => {
  const spec = [];
  (extracted.header || []).forEach((h, i) => {
    if (h.type === 'text') spec.push({ key: `header_text_${i}`, label: `Header text ${i + 1}`, group: 'headerText', index: i });
  });
  (extracted.body || []).forEach((b, i) =>
    spec.push({ key: `body_${i}`, label: `Body ${b.placeholder || `{{${i + 1}}}`}`, group: 'body', index: i }),
  );
  (extracted.buttons || []).forEach((btn, i) => {
    if (btn.type === 'url') spec.push({ key: `button_url_${i}`, label: `Button URL ${i + 1}`, group: 'buttonUrl', index: i });
    else if (btn.type === 'copy_code') spec.push({ key: `button_coupon_${i}`, label: `Button coupon ${i + 1}`, group: 'buttonCoupon', index: i });
    else if (btn.type === 'quick_reply') spec.push({ key: `button_payload_${i}`, label: `Quick reply ${i + 1}`, group: 'buttonPayload', index: i });
  });
  return spec;
};

const waToTemplateVariables = (values, spec) => {
  const tv = { headerText: [], body: [], buttonUrl: [], buttonCoupon: [], buttonPayload: [] };
  spec.forEach((s) => {
    const v = values[s.key];
    if (v === undefined) return;
    tv[s.group][s.index] = v;
  });
  return tv;
};

export default function SendMessageScreen({ navigation, route }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;
  // Brand palette is used by the unified ScreenHeader. Local palette `c`
  // continues to drive the rest of this composer until it gets a full
  // useBrand migration in a future pass.
  const brand = useBrand();

  // User-facing fields are mirrored to redux via useFormDraft so the composer
  // survives navigation pops and app restarts. Server-fetched lists and
  // ephemeral UI flags stay as plain useState.
  const [draft, patchDraft, clearDraft] = useFormDraft('sendMessage', {
    channel: route?.params?.channel || 'whatsapp',
    to: '',
    text: '',
    templateName: route?.params?.templateName || '',
    values: {},
    rcsValues: {},
    smsValues: [],
  });
  const channel = draft.channel;
  const setChannel = (v) => patchDraft({ channel: typeof v === 'function' ? v(channel) : v });
  const to = draft.to;
  const setTo = (v) => patchDraft({ to: typeof v === 'function' ? v(to) : v });
  const text = draft.text;
  const setText = (v) => patchDraft({ text: typeof v === 'function' ? v(text) : v });
  const templateName = draft.templateName;
  const setTemplateName = (v) => patchDraft({ templateName: typeof v === 'function' ? v(templateName) : v });
  const values = draft.values;
  const setValues = (v) => patchDraft({ values: typeof v === 'function' ? v(values) : v });
  const rcsValues = draft.rcsValues;
  const setRcsValues = (v) => patchDraft({ rcsValues: typeof v === 'function' ? v(rcsValues) : v });
  const smsValues = draft.smsValues;
  const setSmsValues = (v) => patchDraft({ smsValues: typeof v === 'function' ? v(smsValues) : v });

  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateErr, setTemplateErr] = useState(null);
  const [sending, setSending] = useState(false);
  const [showPayload, setShowPayload] = useState(true);

  useEffect(() => {
    setTemplateName((prev) => (channel === 'voice' ? '' : prev));
    setValues({});
    setRcsValues({});
    setSmsValues([]);
  }, [channel]);

  const loadTemplates = useCallback(async () => {
    if (channel === 'voice') { setTemplates([]); return; }
    setLoadingTemplates(true);
    setTemplateErr(null);
    try {
      const res = await TemplatesAPI.getByChannel(channel, {});
      setTemplates(res?.data || []);
    } catch (e) {
      setTemplates([]);
      setTemplateErr(e?.message || 'Failed to load templates');
    } finally {
      setLoadingTemplates(false);
    }
  }, [channel]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const template = useMemo(
    () => templates.find((t) => (t.name || t.id) === templateName) || null,
    [templates, templateName],
  );

  const waSpec = useMemo(() => {
    if (channel !== 'whatsapp' || !template?.components) return [];
    return waVarSpec(extractWhatsAppVariables(template.components));
  }, [channel, template]);

  const smsVarCount = useMemo(() => {
    if (channel !== 'sms' || !template) return 0;
    return countSmsVariables(template.body || getSmsTemplateText(template.raw || {}));
  }, [channel, template]);

  const rcsVarNames = useMemo(() => {
    if (channel !== 'rcs' || !template) return [];
    return extractRcsVariables(template.component || getRcsComponent(template.raw || {}));
  }, [channel, template]);

  const payload = useMemo(() => {
    try {
      if (channel === 'whatsapp' && template) {
        const phone = normalizeForMessaging(to || '', 'IN') || to || '{{recipient}}';
        const extracted = extractWhatsAppVariables(template.components || []);
        const inputData = buildInputData(waToTemplateVariables(values, waSpec));
        return buildWhatsAppSendPayload(template, inputData, extracted, phone);
      }
      if (channel === 'sms' && template) {
        return buildSmsTemplatePayload({
          template: template.raw || template,
          senderId: template.senderId,
          phoneNumber: to || '{{recipient}}',
          variables: smsValues,
        });
      }
      if (channel === 'rcs' && template) {
        return buildRcsPayload(template.raw || template, to || '{{recipient}}', {
          botId: template.botId,
          templateName: template.name,
          values: rcsValues,
        });
      }
      if (channel === 'voice') {
        return { Number: to || '{{recipient}}', CallerId: text || 'TEST', MediaFileId: 1 };
      }
    } catch { return null; }
    return null;
  }, [channel, template, to, values, waSpec, smsValues, rcsValues, text]);

  const handleSend = async () => {
    const toNum = to.trim();
    if (!toNum) { Alert.alert('Required', 'Enter a recipient number.'); return; }
    setSending(true);
    try {
      if (channel === 'whatsapp') {
        if (templateName) {
          await WhatsAppAPI.sendTemplateAuto({
            to: toNum, templateName, template,
            templateVariables: waToTemplateVariables(values, waSpec),
          });
        } else if (text.trim()) {
          await WhatsAppAPI.sendText(toNum, text.trim());
        } else throw { message: 'Pick a template or type freeform text.' };
      } else if (channel === 'sms') {
        if (!templateName) throw { message: 'Pick an SMS template.' };
        await SMSAPI.sendTemplateAuto({ senderId: template?.senderId, phone: toNum, templateName, variables: smsValues });
      } else if (channel === 'rcs') {
        if (!templateName) throw { message: 'Pick an RCS template.' };
        await RCSAPI.sendTemplateAuto({ botId: template?.botId, templateName, destination: toNum, values: rcsValues });
      } else if (channel === 'voice') {
        await VoiceAPI.makeCall({ number: toNum, callerId: text.trim() || 'TEST', mediaFileId: 1 });
      }
      Alert.alert('Sent', `${channel.toUpperCase()} dispatched to ${toNum}`);
      // Composer succeeded — wipe the draft so the next visit starts blank.
      clearDraft();
    } catch (e) {
      Alert.alert('Send failed', e?.message || 'Unknown error');
    } finally {
      setSending(false);
    }
  };

  const chTint = CHANNELS.find((x) => x.id === channel)?.tint;
  const rootBg = dark ? 'bg-[#0A0A0D]' : 'bg-white';
  const softBg = dark ? 'bg-[#141418]' : 'bg-[#F2F2F5]';
  const inputBg = dark ? 'bg-[#1C1C22]' : 'bg-[#ECECEF]';
  const textInk = dark ? 'text-white' : 'text-[#0A0A0D]';
  const textMuted = dark ? 'text-[#9A9AA2]' : 'text-[#5C5C63]';
  const textDim = dark ? 'text-[#5C5C63]' : 'text-[#9A9AA2]';

  return (
    <View className={`flex-1 ${rootBg}`}>
      <ScreenHeader
        c={brand}
        onBack={() => navigation.goBack()}
        icon="paper-plane-outline"
        title="Send"
      />
      <ScrollView
        contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 22, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Channel chips */}
        <Label cls={textMuted}>Channel</Label>
        <View className="flex-row flex-wrap mb-3.5" style={{ gap: 8 }}>
          {CHANNELS.map((ch) => {
            const active = channel === ch.id;
            return (
              <TouchableOpacity
                key={ch.id}
                onPress={() => setChannel(ch.id)}
                activeOpacity={0.8}
                className="flex-row items-center py-2.5 px-3.5 rounded-[18px]"
                style={{ backgroundColor: active ? ch.tint : (dark ? '#141418' : '#F2F2F5'), gap: 8 }}
              >
                <Ionicons name={ch.icon} size={14} color={active ? '#0A0A0D' : c.muted} />
                <Text
                  className="text-sm"
                  style={{ color: active ? '#0A0A0D' : c.muted, fontWeight: active ? '700' : '500' }}
                >
                  {ch.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recipient */}
        <Label cls={textMuted}>Recipient</Label>
        <View className={`rounded-[18px] px-4 py-1 mb-2.5 ${softBg}`}>
          <TextInput
            value={to}
            onChangeText={setTo}
            placeholder="919876543210"
            placeholderTextColor={c.muted}
            className={`py-3 text-sm ${textInk}`}
            keyboardType="phone-pad"
            autoCapitalize="none"
            style={Platform.select({ web: { outlineStyle: 'none' } })}
          />
        </View>

        {/* Template picker */}
        {channel !== 'voice' && (
          <>
            <Label cls={textMuted}>Template {templates.length ? `(${templates.length})` : ''}</Label>
            {loadingTemplates ? (
              <View className="py-3 items-center"><ActivityIndicator color={c.pink} /></View>
            ) : templateErr ? (
              <View className={`rounded-[14px] p-3 mb-2.5 border-l-[3px] ${softBg}`} style={{ borderLeftColor: c.pink }}>
                <Text className={`text-xs ${textInk}`}>{templateErr}</Text>
              </View>
            ) : templates.length === 0 ? (
              <Text className={`text-xs italic ${textDim}`}>No templates available.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 10 }}>
                {templates.map((t) => {
                  const name = t.name || t.id;
                  const active = templateName === name;
                  return (
                    <TouchableOpacity
                      key={t.id || name}
                      onPress={() => setTemplateName(active ? '' : name)}
                      activeOpacity={0.8}
                      className="flex-row items-center py-2 px-3 rounded-[14px]"
                      style={{ backgroundColor: active ? c.ink : (dark ? '#141418' : '#F2F2F5'), gap: 8 }}
                    >
                      <Ionicons name="document-text-outline" size={12} color={active ? c.bg : c.muted} />
                      <Text className="text-xs" style={{ color: active ? c.bg : c.muted, fontWeight: active ? '600' : '500' }}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {template && (
              <View className={`rounded-[14px] p-3 mb-3 ${inputBg}`}>
                <Text className={`text-[13px] leading-5 ${textInk}`}>{template.body || '—'}</Text>
                <Text className={`text-[11px] mt-1.5 font-mono ${textDim}`}>
                  {String(template.channel || '').toUpperCase()} · {template.status || '—'}
                  {template.language ? ` · ${template.language}` : ''}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Variables — WhatsApp */}
        {channel === 'whatsapp' && template && waSpec.length > 0 && (
          <>
            <Label cls={textMuted}>Variables ({waSpec.length})</Label>
            {waSpec.map((s) => (
              <VarInput
                key={s.key}
                label={s.label}
                value={values[s.key] || ''}
                onChange={(v) => setValues((prev) => ({ ...prev, [s.key]: v }))}
                softBg={softBg} textInk={textInk} textMuted={textMuted} mutedColor={c.muted}
              />
            ))}
          </>
        )}

        {/* Variables — SMS */}
        {channel === 'sms' && smsVarCount > 0 && (
          <>
            <Label cls={textMuted}>Variables ({smsVarCount})</Label>
            {Array.from({ length: smsVarCount }).map((_, i) => (
              <VarInput
                key={i}
                label={`{#var#} ${i + 1}`}
                value={smsValues[i] || ''}
                onChange={(v) => setSmsValues((prev) => { const n = prev.slice(); n[i] = v; return n; })}
                softBg={softBg} textInk={textInk} textMuted={textMuted} mutedColor={c.muted}
              />
            ))}
          </>
        )}

        {/* Variables — RCS */}
        {channel === 'rcs' && rcsVarNames.length > 0 && (
          <>
            <Label cls={textMuted}>Variables ({rcsVarNames.length})</Label>
            {rcsVarNames.map((name) => (
              <VarInput
                key={name}
                label={name}
                value={rcsValues[name] || ''}
                onChange={(v) => setRcsValues((prev) => ({ ...prev, [name]: v }))}
                softBg={softBg} textInk={textInk} textMuted={textMuted} mutedColor={c.muted}
              />
            ))}
          </>
        )}

        {/* Freeform / Caller ID */}
        <Label cls={textMuted}>{channel === 'voice' ? 'Caller ID' : 'Freeform text (WhatsApp only)'}</Label>
        <View className={`rounded-[18px] px-4 py-1 mb-2.5 ${softBg}`}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={channel === 'voice' ? 'CALLER_ID' : 'Plain message (leave empty for template)'}
            placeholderTextColor={c.muted}
            className={`py-3 text-sm ${textInk}`}
            multiline={channel !== 'voice'}
            style={[
              channel !== 'voice' ? { minHeight: 90, textAlignVertical: 'top' } : {},
              Platform.select({ web: { outlineStyle: 'none' } }),
            ]}
          />
        </View>

        {/* Payload preview */}
        <TouchableOpacity onPress={() => setShowPayload((v) => !v)} activeOpacity={0.85} className={`rounded-[16px] mb-3.5 overflow-hidden ${softBg}`}>
          <View className="flex-row items-center p-3" style={{ gap: 8 }}>
            <Ionicons name="code-slash-outline" size={16} color={c.muted} />
            <Text className={`text-[13px] font-semibold flex-1 ${textInk}`}>Payload preview</Text>
            <Ionicons name={showPayload ? 'chevron-up' : 'chevron-down'} size={16} color={c.muted} />
          </View>
          {showPayload && (
            <View className="px-3 pb-3 pt-0" style={{ borderTopWidth: 1, borderTopColor: c.bgInput }}>
              {payload ? (
                <Text className="text-[11px] leading-4 font-mono" style={{ color: c.cyan }}>
                  {JSON.stringify(payload, null, 2)}
                </Text>
              ) : (
                <Text className={`text-[11px] italic ${textDim}`}>Pick a template and fill values to see payload.</Text>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* CTA */}
        <TouchableOpacity className="rounded-[28px] overflow-hidden mt-2" activeOpacity={0.88} disabled={sending} onPress={handleSend}>
          <View
            className="flex-row items-center justify-center py-4"
            style={{ backgroundColor: chTint, gap: 10 }}
          >
            {sending ? (
              <ActivityIndicator color="#0A0A0D" />
            ) : (
              <>
                <Ionicons name="send" size={15} color="#0A0A0D" />
                <Text className="text-[15px] font-bold" style={{ color: '#0A0A0D' }}>Send via {channel.toUpperCase()}</Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        <Text className={`text-[11px] text-center mt-3.5 ${textDim}`}>
          Variables are substituted server-side. Preview is the exact JSON body.
        </Text>
      </ScrollView>
    </View>
  );
}

const Label = ({ cls, children }) => (
  <Text className={`text-[11px] font-semibold tracking-widest uppercase mb-2 mt-2 ${cls}`}>{children}</Text>
);

const VarInput = ({ label, value, onChange, softBg, textInk, textMuted, mutedColor }) => (
  <View className="mb-2.5">
    <Text className={`text-[11px] mb-1 ml-0.5 font-medium ${textMuted}`}>{label}</Text>
    <View className={`rounded-[18px] px-4 py-1 ${softBg}`}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={`Value for ${label}`}
        placeholderTextColor={mutedColor}
        className={`py-3 text-sm ${textInk}`}
        style={Platform.select({ web: { outlineStyle: 'none' } })}
      />
    </View>
  </View>
);
