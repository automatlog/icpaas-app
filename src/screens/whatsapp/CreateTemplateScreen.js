// src/screens/CreateTemplateScreen.js — Create WhatsApp Cloud API template
// POST /v23.0/{wabaId}/message_templates
// Categories: MARKETING · UTILITY · AUTHENTICATION
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Switch,
  ActivityIndicator, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useBrand } from '../../theme';
import { WhatsAppAPI, ChannelsAPI } from '../../services/api';
import { pushNotification } from '../../store/slices/notificationsSlice';
import { BottomTabBar } from '../shared/DashboardScreen';
import toast from '../../services/toast';
import FormField from '../../components/FormField';
import ScreenHeader from '../../components/ScreenHeader';

const CATEGORIES = [
  { id: 'MARKETING',     label: 'Marketing',     icon: 'megaphone',           desc: 'Promos, offers, retargeting.' },
  { id: 'UTILITY',       label: 'Utility',       icon: 'construct',           desc: 'Order updates, account alerts.' },
  { id: 'AUTHENTICATION', label: 'Authentication', icon: 'shield-checkmark', desc: 'OTP / login codes only.' },
];

const LANGUAGES = ['en', 'en_US', 'en_GB', 'hi', 'mr', 'gu', 'ta', 'te', 'kn', 'bn', 'ar', 'fr', 'es'];

const BUTTON_TYPES = [
  { id: 'QUICK_REPLY', label: 'Quick reply', icon: 'chatbubble-ellipses-outline' },
  { id: 'URL',         label: 'Visit URL',    icon: 'link' },
  { id: 'PHONE_NUMBER', label: 'Call phone',  icon: 'call' },
];

const countVars = (s) => (String(s || '').match(/\{\{\d+\}\}/g) || []).length;

export default function CreateTemplateScreen({ navigation, route }) {
  const c = useBrand();
  const dispatch = useDispatch();

  const [channels, setChannels] = useState([]);
  const [channelId, setChannelId] = useState(route?.params?.wabaBusinessId || '');
  const [showChannel, setShowChannel] = useState(false);
  const [loadingCh, setLoadingCh] = useState(true);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('MARKETING');
  const [language, setLanguage] = useState('en');
  const [showLang, setShowLang] = useState(false);

  const [useHeader, setUseHeader] = useState(false);
  const [headerText, setHeaderText] = useState('');
  const [headerExample, setHeaderExample] = useState('');

  const [bodyText, setBodyText] = useState('');
  const [bodyExamples, setBodyExamples] = useState([]);

  const [useFooter, setUseFooter] = useState(false);
  const [footerText, setFooterText] = useState('');

  const [buttons, setButtons] = useState([]);

  const [submitting, setSubmitting] = useState(false);

  // Auth-only mode rules: no URLs / media / emojis in body, params capped 15 chars.
  const isAuth = category === 'AUTHENTICATION';

  useEffect(() => {
    setLoadingCh(true);
    WhatsAppAPI.getChannels()
      .then((res) => {
        const list = res?.data || [];
        setChannels(list);
        if (!channelId && list[0]?.wabaBusinessId) setChannelId(list[0].wabaBusinessId);
      })
      .catch(() => setChannels([]))
      .finally(() => setLoadingCh(false));
  }, []);

  // Resize examples array to match number of body variables
  useEffect(() => {
    const n = countVars(bodyText);
    setBodyExamples((prev) => {
      const next = prev.slice(0, n);
      while (next.length < n) next.push('');
      return next;
    });
  }, [bodyText]);

  const headerVarCount = countVars(headerText);
  const bodyVarCount   = countVars(bodyText);

  const previewBody = useMemo(() => {
    let out = bodyText;
    bodyExamples.forEach((v, i) => {
      out = out.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, 'g'), v || `{{${i + 1}}}`);
    });
    return out;
  }, [bodyText, bodyExamples]);

  const addButton = (type) => {
    if (buttons.length >= 3) { toast.warning('Max 3 buttons', 'Meta caps button rows at three.'); return; }
    setButtons((prev) => [...prev, { type, text: '', url: '', phone: '' }]);
  };
  const updateButton = (i, patch) => setButtons((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const removeButton = (i) => setButtons((prev) => prev.filter((_, idx) => idx !== i));

  const channelLabel = useMemo(() => {
    const ch = channels.find((x) => x.wabaBusinessId === channelId);
    return ch ? `${ch.label || ch.wabaNumber || ch.phoneNumberId}  ·  ${ch.wabaBusinessId}` : 'Select WABA channel';
  }, [channels, channelId]);

  const submit = async () => {
    if (!channelId) { toast.warning('Required', 'Pick a WABA channel.'); return; }
    if (!name.trim()) { toast.warning('Required', 'Template name is required.'); return; }
    if (!bodyText.trim()) { toast.warning('Required', 'Body text is required.'); return; }
    if (bodyVarCount > 0 && bodyExamples.some((v) => !v.trim())) {
      toast.warning('Examples missing', 'Provide a sample for every body variable.');
      return;
    }
    if (headerVarCount > 1) { toast.warning('Header limit', 'Header allows only one {{1}} variable.'); return; }

    const payload = WhatsAppAPI.buildCreatePayload({
      name,
      category,
      language,
      headerText: useHeader ? headerText : '',
      headerExample,
      bodyText,
      bodyExamples,
      footerText: useFooter ? footerText : '',
      buttons,
    });

    setSubmitting(true);
    try {
      const res = await WhatsAppAPI.createTemplate(payload, channelId);
      const id = res?.id || res?.data?.id;
      toast.success('Submitted', `${payload.name} sent for approval${id ? ` (#${id})` : ''}.`);
      dispatch(pushNotification({
        kind: 'template-created',
        title: `Template "${payload.name}" submitted`,
        body: `Pending Meta review. Category: ${category}. Language: ${language}.`,
      }));
      navigation.goBack();
    } catch (e) {
      toast.error('Submit failed', e?.message || 'Meta rejected the template.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header c={c} navigation={navigation} title="Create Template" onSave={submit} saving={submitting} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Live preview */}
        <View
          className="rounded-[16px] mb-3 overflow-hidden"
          style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}
        >
          <View className="flex-row items-center px-3 py-2.5" style={{ borderBottomWidth: 1, borderBottomColor: c.rule, gap: 6 }}>
            <Ionicons name="phone-portrait" size={13} color={c.primary} />
            <Text className="text-[12px] font-bold" style={{ color: c.text }}>Preview</Text>
          </View>
          <View className="p-3" style={{ backgroundColor: c.bgInput }}>
            <View className="rounded-[10px] p-3" style={{ backgroundColor: '#D1FAE5', maxWidth: '85%' }}>
              {useHeader && headerText ? (
                <Text className="text-[13px] font-extrabold mb-1" style={{ color: '#0A0A0D' }}>
                  {headerVarCount > 0 ? headerText.replace('{{1}}', headerExample || '{{1}}') : headerText}
                </Text>
              ) : null}
              <Text className="text-[13px] leading-[19px]" style={{ color: '#0A0A0D' }}>
                {previewBody || 'Body text will appear here.'}
              </Text>
              {useFooter && footerText ? (
                <Text className="text-[10px] mt-2" style={{ color: 'rgba(0,0,0,0.5)' }}>{footerText}</Text>
              ) : null}
            </View>
            {buttons.length > 0 ? (
              <View className="mt-2" style={{ gap: 4 }}>
                {buttons.map((b, i) => (
                  <View key={i} className="rounded-[8px] py-2 items-center" style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}>
                    <Text className="text-[12px] font-semibold" style={{ color: c.primary }}>{b.text || '(button label)'}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {/* WABA channel */}
        <Section c={c} icon="logo-whatsapp" label="WABA channel">
          <DropdownTrigger c={c} value={loadingCh ? 'Loading channels…' : channelLabel} open={showChannel} onPress={() => setShowChannel((v) => !v)} icon="logo-whatsapp" />
          {showChannel ? (
            <View className="rounded-[10px] mt-1.5 overflow-hidden" style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.bgCard }}>
              {channels.length === 0 ? (
                <Text className="px-3 py-3 text-[12px] italic" style={{ color: c.textDim }}>No WhatsApp channels available.</Text>
              ) : channels.map((ch, i) => (
                <TouchableOpacity
                  key={ch.wabaBusinessId || i}
                  onPress={() => { setChannelId(ch.wabaBusinessId); setShowChannel(false); }}
                  activeOpacity={0.85}
                  className="px-3 py-2.5 flex-row items-center"
                  style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.rule, gap: 10 }}
                >
                  <Ionicons name="logo-whatsapp" size={14} color={c.primary} />
                  <View className="flex-1">
                    <Text className="text-[13px] font-bold" style={{ color: c.text }}>{ch.label || ch.wabaNumber || ch.phoneNumberId}</Text>
                    <Text className="text-[10px] font-mono" style={{ color: c.textMuted }} numberOfLines={1}>WABA: {ch.wabaBusinessId}</Text>
                  </View>
                  {channelId === ch.wabaBusinessId ? <Ionicons name="checkmark" size={14} color={c.primary} /> : null}
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </Section>

        {/* Name + language */}
        <Section c={c} icon="text" label="Template basics">
          <FormField caps c={c} label="Template name" required hint="lowercase + underscores; e.g. order_update_v1">
            <Input c={c} value={name} onChangeText={(v) => setName(v.toLowerCase().replace(/\s+/g, '_'))} placeholder="order_update_v1" autoCapitalize="none" />
          </FormField>
          <FormField caps c={c} label="Language" hint="Locale code per Meta">
            <DropdownTrigger c={c} value={language} icon="globe-outline" open={showLang} onPress={() => setShowLang((v) => !v)} />
            {showLang ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 6 }}>
                {LANGUAGES.map((l) => (
                  <TouchableOpacity
                    key={l}
                    onPress={() => { setLanguage(l); setShowLang(false); }}
                    activeOpacity={0.85}
                    className="rounded-[10px] px-3 py-1.5"
                    style={{ backgroundColor: language === l ? c.primary : c.bgInput }}
                  >
                    <Text className="text-[12px] font-bold font-mono" style={{ color: language === l ? '#FFFFFF' : c.textMuted }}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}
          </FormField>
        </Section>

        {/* Category */}
        <Section c={c} icon="options" label="Category">
          {CATEGORIES.map((cat) => {
            const sel = category === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategory(cat.id)}
                activeOpacity={0.85}
                className="flex-row items-center rounded-[12px] px-3 py-3 mb-2"
                style={{ borderWidth: 1, borderColor: sel ? c.primary : c.border, backgroundColor: sel ? c.primarySoft : c.bgCard, gap: 12 }}
              >
                <View className="w-10 h-10 rounded-[10px] items-center justify-center" style={{ backgroundColor: sel ? c.primary : c.bgInput }}>
                  <Ionicons name={cat.icon} size={16} color={sel ? '#FFFFFF' : c.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-bold" style={{ color: sel ? c.primaryDeep : c.text }}>{cat.label}</Text>
                  <Text className="text-[11px] mt-0.5" style={{ color: sel ? c.primaryDeep : c.textMuted }}>{cat.desc}</Text>
                </View>
                {sel ? <Ionicons name="checkmark-circle" size={18} color={c.primary} /> : null}
              </TouchableOpacity>
            );
          })}
          {isAuth ? (
            <View className="rounded-[10px] p-3 flex-row" style={{ backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A', gap: 8 }}>
              <Ionicons name="warning" size={14} color="#B45309" style={{ marginTop: 1 }} />
              <Text className="flex-1 text-[11px] leading-[17px]" style={{ color: '#854D0E' }}>
                Authentication templates: no URLs / media / emojis in body, params ≤ 15 chars, must include a one-tap or copy-code button.
              </Text>
            </View>
          ) : null}
        </Section>

        {/* Header */}
        <Section c={c} icon="layers" label="Header (optional)" toggleValue={useHeader} onToggle={setUseHeader}>
          {useHeader ? (
            <>
              <FormField caps c={c} label="Header text" hint="Up to 60 chars · max one {{1}} variable">
                <Input c={c} value={headerText} onChangeText={setHeaderText} placeholder="Hello {{1}}!" />
              </FormField>
              {headerVarCount > 0 ? (
                <FormField caps c={c} label="{{1}} example value" required>
                  <Input c={c} value={headerExample} onChangeText={setHeaderExample} placeholder="David" />
                </FormField>
              ) : null}
            </>
          ) : null}
        </Section>

        {/* Body */}
        <Section c={c} icon="document-text" label="Body" required>
          <FormField caps c={c} label="Body text" required hint="Up to 1024 chars. Use {{1}}, {{2}}, … for variables.">
            <Input c={c} value={bodyText} onChangeText={setBodyText} placeholder="Hi {{1}}, your order #{{2}} ships on {{3}}." multiline minHeight={110} />
          </FormField>
          {bodyVarCount > 0 ? (
            <View>
              <Text className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: c.textMuted }}>
                Body variable examples ({bodyVarCount})
              </Text>
              {bodyExamples.map((v, i) => (
                <View key={i} className="mb-2">
                  <Text className="text-[10px] font-mono mb-1" style={{ color: c.primary }}>{`{{${i + 1}}}`}</Text>
                  <Input
                    c={c}
                    value={v}
                    onChangeText={(val) => setBodyExamples((prev) => prev.map((p, idx) => (idx === i ? val : p)))}
                    placeholder={`Sample for {{${i + 1}}}`}
                  />
                </View>
              ))}
            </View>
          ) : null}
        </Section>

        {/* Footer */}
        <Section c={c} icon="chatbox-ellipses-outline" label="Footer (optional)" toggleValue={useFooter} onToggle={setUseFooter}>
          {useFooter ? (
            <FormField caps c={c} label="Footer text" hint="Up to 60 chars · no variables">
              <Input c={c} value={footerText} onChangeText={setFooterText} placeholder="Reply STOP to opt out" />
            </FormField>
          ) : null}
        </Section>

        {/* Buttons */}
        <Section c={c} icon="apps" label={`Buttons (${buttons.length}/3, optional)`}>
          {buttons.map((b, i) => {
            const t = String(b.type || 'QUICK_REPLY').toUpperCase();
            return (
              <View key={i} className="rounded-[12px] p-3 mb-2" style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}>
                <View className="flex-row items-center mb-2" style={{ gap: 8 }}>
                  <Ionicons name={(BUTTON_TYPES.find((x) => x.id === t) || BUTTON_TYPES[0]).icon} size={13} color={c.primary} />
                  <Text className="text-[12px] font-bold flex-1" style={{ color: c.text }}>{(BUTTON_TYPES.find((x) => x.id === t) || BUTTON_TYPES[0]).label}</Text>
                  <TouchableOpacity onPress={() => removeButton(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={16} color={c.danger} />
                  </TouchableOpacity>
                </View>
                <FormField caps c={c} label="Button label">
                  <Input c={c} value={b.text} onChangeText={(v) => updateButton(i, { text: v })} placeholder="Visit shop" />
                </FormField>
                {t === 'URL' ? (
                  <FormField caps c={c} label="URL">
                    <Input c={c} value={b.url} onChangeText={(v) => updateButton(i, { url: v })} placeholder="https://example.com" autoCapitalize="none" />
                  </FormField>
                ) : null}
                {t === 'PHONE_NUMBER' ? (
                  <FormField caps c={c} label="Phone">
                    <Input c={c} value={b.phone} onChangeText={(v) => updateButton(i, { phone: v })} placeholder="+919876543210" keyboardType="phone-pad" />
                  </FormField>
                ) : null}
              </View>
            );
          })}

          {buttons.length < 3 ? (
            <View className="flex-row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {BUTTON_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => addButton(t.id)}
                  activeOpacity={0.85}
                  className="flex-row items-center rounded-[10px] px-3 py-2"
                  style={{ borderWidth: 1, borderColor: c.primary, gap: 6 }}
                >
                  <Ionicons name={t.icon} size={12} color={c.primary} />
                  <Text className="text-[12px] font-bold" style={{ color: c.primary }}>+ {t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </Section>

        {/* Submit */}
        <TouchableOpacity
          onPress={submit}
          disabled={submitting}
          activeOpacity={0.85}
          className="flex-row items-center justify-center rounded-[12px] py-3.5 mt-2"
          style={{ backgroundColor: c.primary, gap: 8 }}
        >
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="cloud-upload" size={14} color="#FFFFFF" />}
          <Text className="text-[14px] font-bold text-white">{submitting ? 'Submitting…' : 'Submit for review'}</Text>
        </TouchableOpacity>

        <Text className="text-[11px] text-center mt-2" style={{ color: c.textDim }}>
          POST /v23.0/{'{wabaId}'}/message_templates  ·  Meta reviews within 24 hours.
        </Text>
      </ScrollView>

      <BottomTabBar c={c} navigation={navigation} active="campaign" />
    </View>
  );
}

function Header({ c, navigation, title, onSave, saving }) {
  return (
    <ScreenHeader
      c={c}
      onBack={() => navigation.goBack()}
      title={title}
      icon="document-text"
      right={
        <TouchableOpacity onPress={onSave} disabled={saving} className="w-10 h-10 items-center justify-center" activeOpacity={0.7}>
          {saving ? <ActivityIndicator color={c.primary} size="small" /> : <Ionicons name="checkmark" size={22} color={c.primary} />}
        </TouchableOpacity>
      }
    />
  );
}

function Section({ c, icon, label, required, toggleValue, onToggle, children }) {
  return (
    <View className="mb-3">
      <View className="flex-row items-center mb-2" style={{ gap: 8 }}>
        <Ionicons name={icon} size={14} color={c.primary} />
        <Text className="text-[13px] font-bold flex-1" style={{ color: c.text }}>
          {label}{required ? <Text style={{ color: c.danger }}>  *</Text> : null}
        </Text>
        {typeof onToggle === 'function' ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ false: c.border, true: c.primary }}
            thumbColor="#FFFFFF"
            style={Platform.OS === 'ios' ? { transform: [{ scale: 0.85 }] } : {}}
          />
        ) : null}
      </View>
      {children}
    </View>
  );
}


function Input({ c, value, onChangeText, placeholder, keyboardType, autoCapitalize, multiline, minHeight }) {
  return (
    <View className="rounded-[10px] px-3" style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.bg }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize || 'sentences'}
        autoCorrect={false}
        multiline={!!multiline}
        className="text-[13px]"
        style={[
          { paddingVertical: Platform.OS === 'ios' ? 11 : 9, color: c.text },
          multiline ? { minHeight: minHeight || 80, textAlignVertical: 'top' } : {},
          Platform.select({ web: { outlineStyle: 'none' } }),
        ]}
      />
    </View>
  );
}

function DropdownTrigger({ c, value, icon, open, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="flex-row items-center rounded-[10px] px-3 py-3"
      style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.bg, gap: 8 }}
    >
      {icon ? <Ionicons name={icon} size={13} color={c.textMuted} /> : null}
      <Text className="flex-1 text-[13px]" style={{ color: c.text }} numberOfLines={1}>{value}</Text>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={c.textMuted} />
    </TouchableOpacity>
  );
}
