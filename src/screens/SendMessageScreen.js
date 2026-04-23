// src/screens/SendMessageScreen.js — Compose + variable mapping + live payload preview
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFeed, Fonts } from '../theme';
import {
  WhatsAppAPI, SMSAPI, RCSAPI, VoiceAPI, TemplatesAPI,
} from '../services/api';
import {
  extractWhatsAppVariables, buildInputData, buildWhatsAppSendPayload, normalizeForMessaging,
} from '../services/whatsappHelpers';
import {
  countSmsVariables, getSmsTemplateText, buildSmsTemplatePayload,
} from '../services/smsHelpers';
import {
  extractRcsVariables, getRcsComponent, buildRcsPayload,
} from '../services/rcsHelpers';

const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp',      tint: 'tintMint' },
  { id: 'sms',      label: 'SMS',      icon: 'chatbubble-outline', tint: 'tintRose' },
  { id: 'rcs',      label: 'RCS',      icon: 'card-outline',       tint: 'tintLavender' },
  { id: 'voice',    label: 'Voice',    icon: 'call-outline',       tint: 'tintYellow' },
];

// Build label + preset key for each WhatsApp variable slot
const waVarSpec = (extracted) => {
  const spec = [];
  (extracted.header || []).forEach((h, i) => {
    if (h.type === 'text') {
      spec.push({ key: `header_text_${i}`, label: `Header text ${i + 1}`, group: 'headerText', index: i });
    }
  });
  (extracted.body || []).forEach((b, i) => {
    spec.push({ key: `body_${i}`, label: `Body ${b.placeholder || `{{${i + 1}}}`}`, group: 'body', index: i });
  });
  (extracted.buttons || []).forEach((btn, i) => {
    if (btn.type === 'url') {
      spec.push({ key: `button_url_${i}`, label: `Button URL ${i + 1}`, group: 'buttonUrl', index: i });
    } else if (btn.type === 'copy_code') {
      spec.push({ key: `button_coupon_${i}`, label: `Button coupon ${i + 1}`, group: 'buttonCoupon', index: i });
    } else if (btn.type === 'quick_reply') {
      spec.push({ key: `button_payload_${i}`, label: `Quick reply payload ${i + 1}`, group: 'buttonPayload', index: i });
    }
  });
  return spec;
};

// Convert flat {key:value} map into the shape buildInputData expects
const waToTemplateVariables = (values, spec) => {
  const tv = { headerText: [], body: [], buttonUrl: [], buttonCoupon: [], buttonPayload: [] };
  spec.forEach((s) => {
    const v = values[s.key];
    if (v === undefined) return;
    tv[s.group][s.index] = v;
  });
  return tv;
};

const makeStyles = (c) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 22, paddingBottom: 140 },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.bgSoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: c.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.6, flex: 1, fontFamily: Fonts.sans },

  sectionLabel: { color: c.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 8 },

  channelRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  channelChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, backgroundColor: c.bgSoft },
  channelChipLabel: { color: c.textMuted, fontSize: 13, fontWeight: '500' },
  channelChipLabelActive: { color: '#0A0A0D', fontSize: 13, fontWeight: '700' },

  inputWrap: { backgroundColor: c.bgSoft, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 10 },
  input: {
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    color: c.text, fontSize: 14, fontFamily: Fonts.sans,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  inputArea: { minHeight: 90, textAlignVertical: 'top' },

  templatePill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: c.bgSoft, flexDirection: 'row', alignItems: 'center', gap: 8 },
  templatePillActive: { backgroundColor: c.text },
  templatePillText: { color: c.textMuted, fontSize: 12, fontWeight: '500' },
  templatePillTextActive: { color: c.bg, fontSize: 12, fontWeight: '600' },

  templateBody: { backgroundColor: c.bgInput, borderRadius: 14, padding: 12, marginBottom: 12 },
  templateBodyText: { color: c.text, fontSize: 13, lineHeight: 19 },
  templateMeta: { color: c.textDim, fontSize: 11, marginTop: 6, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },

  varBlock: { marginBottom: 10 },
  varLabel: { color: c.textMuted, fontSize: 11, fontWeight: '500', marginBottom: 4, marginLeft: 2 },

  previewCard: { backgroundColor: c.bgSoft, borderRadius: 16, marginBottom: 14, overflow: 'hidden' },
  previewHead: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  previewLabel: { color: c.text, fontSize: 13, fontWeight: '600', flex: 1 },
  previewBody: { padding: 12, paddingTop: 0, borderTopWidth: 1, borderTopColor: c.rule },
  previewJson: { color: c.accentCyan, fontSize: 11, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), lineHeight: 16 },
  previewHint: { color: c.textDim, fontSize: 11, fontStyle: 'italic' },

  cta: { marginTop: 8, borderRadius: 28, overflow: 'hidden', backgroundColor: c.text },
  ctaInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  ctaLabel: { color: c.bg, fontSize: 15, fontWeight: '700' },

  hint: { color: c.textDim, fontSize: 11, textAlign: 'center', marginTop: 14 },

  templatesLoading: { paddingVertical: 12, alignItems: 'center' },
  templatesEmpty: { color: c.textDim, fontSize: 12, fontStyle: 'italic' },

  errBlock: { backgroundColor: c.bgSoft, borderRadius: 14, padding: 12, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: c.accentPink },
  errText: { color: c.text, fontSize: 12 },
});

export default function SendMessageScreen({ navigation, route }) {
  const c = useFeed();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [channel, setChannel] = useState(route?.params?.channel || 'whatsapp');
  const [to, setTo] = useState('');
  const [text, setText] = useState('');
  const [templateName, setTemplateName] = useState(route?.params?.templateName || '');
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateErr, setTemplateErr] = useState(null);
  const [sending, setSending] = useState(false);
  const [values, setValues] = useState({});      // variable values: { key: string }
  const [rcsValues, setRcsValues] = useState({}); // {varName: string} for RCS
  const [smsValues, setSmsValues] = useState([]); // ['v1','v2'] for SMS
  const [showPayload, setShowPayload] = useState(true);

  // Reset vars when channel or template changes
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

  // --- Variable spec per channel ---
  const waSpec = useMemo(() => {
    if (channel !== 'whatsapp' || !template?.components) return [];
    const extracted = extractWhatsAppVariables(template.components);
    return waVarSpec(extracted);
  }, [channel, template]);

  const smsVarCount = useMemo(() => {
    if (channel !== 'sms' || !template) return 0;
    const text = template.body || getSmsTemplateText(template.raw || {});
    return countSmsVariables(text);
  }, [channel, template]);

  const rcsVarNames = useMemo(() => {
    if (channel !== 'rcs' || !template) return [];
    const comp = template.component || getRcsComponent(template.raw || {});
    return extractRcsVariables(comp);
  }, [channel, template]);

  // --- Payload builder (live) ---
  const payload = useMemo(() => {
    try {
      if (channel === 'whatsapp') {
        if (!template) return null;
        const phone = normalizeForMessaging(to || '', 'IN') || to || '{{recipient}}';
        const extracted = extractWhatsAppVariables(template.components || []);
        const tv = waToTemplateVariables(values, waSpec);
        const inputData = buildInputData(tv);
        return buildWhatsAppSendPayload(template, inputData, extracted, phone);
      }
      if (channel === 'sms') {
        if (!template) return null;
        return buildSmsTemplatePayload({
          template: template.raw || template,
          senderId: template.senderId,
          phoneNumber: to || '{{recipient}}',
          variables: smsValues,
        });
      }
      if (channel === 'rcs') {
        if (!template) return null;
        return buildRcsPayload(template.raw || template, to || '{{recipient}}', {
          botId: template.botId,
          templateName: template.name,
          values: rcsValues,
        });
      }
      if (channel === 'voice') {
        return {
          Number: to || '{{recipient}}',
          CallerId: text || 'TEST',
          MediaFileId: 1,
        };
      }
    } catch {
      return null;
    }
    return null;
  }, [channel, template, to, values, waSpec, smsValues, rcsValues, text]);

  // --- Send ---
  const handleSend = async () => {
    const toNum = to.trim();
    if (!toNum) { Alert.alert('Required', 'Enter a recipient number.'); return; }

    setSending(true);
    try {
      if (channel === 'whatsapp') {
        if (templateName) {
          const tv = waToTemplateVariables(values, waSpec);
          await WhatsAppAPI.sendTemplateAuto({
            to: toNum,
            templateName,
            template,
            templateVariables: tv,
          });
        } else if (text.trim()) {
          await WhatsAppAPI.sendText(toNum, text.trim());
        } else {
          throw { message: 'Pick a template or type freeform text.' };
        }
      } else if (channel === 'sms') {
        if (!templateName) throw { message: 'Pick an SMS template.' };
        await SMSAPI.sendTemplateAuto({
          senderId: template?.senderId,
          phone: toNum,
          templateName,
          variables: smsValues,
        });
      } else if (channel === 'rcs') {
        if (!templateName) throw { message: 'Pick an RCS template.' };
        await RCSAPI.sendTemplateAuto({
          botId: template?.botId,
          templateName,
          destination: toNum,
          values: rcsValues,
        });
      } else if (channel === 'voice') {
        await VoiceAPI.makeCall({ number: toNum, callerId: text.trim() || 'TEST', mediaFileId: 1 });
      }
      Alert.alert('Sent', `${channel.toUpperCase()} dispatched to ${toNum}`);
    } catch (e) {
      Alert.alert('Send failed', e?.message || 'Unknown error');
    } finally {
      setSending(false);
    }
  };

  const chTint = CHANNELS.find((x) => x.id === channel)?.tint;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={c.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Send</Text>
        </View>

        <Text style={styles.sectionLabel}>Channel</Text>
        <View style={styles.channelRow}>
          {CHANNELS.map((ch) => {
            const active = channel === ch.id;
            return (
              <TouchableOpacity
                key={ch.id}
                onPress={() => setChannel(ch.id)}
                activeOpacity={0.8}
                style={[styles.channelChip, active && { backgroundColor: c[ch.tint] }]}
              >
                <Ionicons name={ch.icon} size={14} color={active ? '#0A0A0D' : c.textMuted} />
                <Text style={active ? styles.channelChipLabelActive : styles.channelChipLabel}>{ch.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Recipient</Text>
        <View style={styles.inputWrap}>
          <TextInput
            value={to}
            onChangeText={setTo}
            placeholder="919876543210"
            placeholderTextColor={c.textMuted}
            style={styles.input}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
        </View>

        {channel !== 'voice' && (
          <>
            <Text style={styles.sectionLabel}>Template {templates.length ? `(${templates.length})` : ''}</Text>
            {loadingTemplates ? (
              <View style={styles.templatesLoading}>
                <ActivityIndicator color={c.accentPink} />
              </View>
            ) : templateErr ? (
              <View style={styles.errBlock}>
                <Text style={styles.errText}>{templateErr}</Text>
              </View>
            ) : templates.length === 0 ? (
              <Text style={styles.templatesEmpty}>No templates available for this channel.</Text>
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
                      style={active ? [styles.templatePill, styles.templatePillActive] : styles.templatePill}
                    >
                      <Ionicons name="document-text-outline" size={12} color={active ? c.bg : c.textMuted} />
                      <Text style={active ? styles.templatePillTextActive : styles.templatePillText}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {template ? (
              <View style={styles.templateBody}>
                <Text style={styles.templateBodyText}>{template.body || '—'}</Text>
                <Text style={styles.templateMeta}>
                  {String(template.channel || '').toUpperCase()} · {template.status || '—'}
                  {template.language ? ` · ${template.language}` : ''}
                </Text>
              </View>
            ) : null}
          </>
        )}

        {/* Variable mapping */}
        {channel === 'whatsapp' && template && waSpec.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Variables ({waSpec.length})</Text>
            {waSpec.map((s) => (
              <View key={s.key} style={styles.varBlock}>
                <Text style={styles.varLabel}>{s.label}</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={values[s.key] || ''}
                    onChangeText={(v) => setValues((prev) => ({ ...prev, [s.key]: v }))}
                    placeholder={`Value for ${s.label}`}
                    placeholderTextColor={c.textMuted}
                    style={styles.input}
                  />
                </View>
              </View>
            ))}
          </>
        )}

        {channel === 'sms' && smsVarCount > 0 && (
          <>
            <Text style={styles.sectionLabel}>Variables ({smsVarCount})</Text>
            {Array.from({ length: smsVarCount }).map((_, i) => (
              <View key={i} style={styles.varBlock}>
                <Text style={styles.varLabel}>{`{#var#} ${i + 1}`}</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={smsValues[i] || ''}
                    onChangeText={(v) => {
                      setSmsValues((prev) => {
                        const next = prev.slice();
                        next[i] = v;
                        return next;
                      });
                    }}
                    placeholder={`Value ${i + 1}`}
                    placeholderTextColor={c.textMuted}
                    style={styles.input}
                  />
                </View>
              </View>
            ))}
          </>
        )}

        {channel === 'rcs' && rcsVarNames.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Variables ({rcsVarNames.length})</Text>
            {rcsVarNames.map((name) => (
              <View key={name} style={styles.varBlock}>
                <Text style={styles.varLabel}>{name}</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={rcsValues[name] || ''}
                    onChangeText={(v) => setRcsValues((prev) => ({ ...prev, [name]: v }))}
                    placeholder={`Value for ${name}`}
                    placeholderTextColor={c.textMuted}
                    style={styles.input}
                  />
                </View>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionLabel}>{channel === 'voice' ? 'Caller ID' : 'Freeform text (WhatsApp only — overrides template)'}</Text>
        <View style={styles.inputWrap}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={channel === 'voice' ? 'CALLER_ID' : 'Plain message (leave empty to use template)'}
            placeholderTextColor={c.textMuted}
            style={[styles.input, channel !== 'voice' && styles.inputArea]}
            multiline={channel !== 'voice'}
          />
        </View>

        {/* Payload preview */}
        <TouchableOpacity onPress={() => setShowPayload((v) => !v)} activeOpacity={0.85} style={styles.previewCard}>
          <View style={styles.previewHead}>
            <Ionicons name="code-slash-outline" size={16} color={c.textMuted} />
            <Text style={styles.previewLabel}>Payload preview</Text>
            <Ionicons name={showPayload ? 'chevron-up' : 'chevron-down'} size={16} color={c.textMuted} />
          </View>
          {showPayload && (
            <View style={styles.previewBody}>
              {payload ? (
                <Text style={styles.previewJson}>{JSON.stringify(payload, null, 2)}</Text>
              ) : (
                <Text style={styles.previewHint}>Pick a template and fill values to see the built payload.</Text>
              )}
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cta} activeOpacity={0.88} disabled={sending} onPress={handleSend}>
          <View style={[styles.ctaInner, chTint && { backgroundColor: c[chTint] }]}>
            {sending ? (
              <ActivityIndicator color="#0A0A0D" />
            ) : (
              <>
                <Ionicons name="send" size={15} color="#0A0A0D" />
                <Text style={styles.ctaLabel}>Send via {channel.toUpperCase()}</Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Variables are substituted server-side. Preview shows the exact JSON body sent to gsauth / icpaas.
        </Text>
      </ScrollView>
    </View>
  );
}
