// src/screens/sms/CampaignScreen.js — single-page SMS campaign composer.
// Mirrors UI image/SMS Campaign Screen.png. Picks route, sender ID, language,
// DLT template ID, then sends bulk SMS via SMSAPI.send.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useBrand } from '../../theme';
import { SMSAPI, TemplatesAPI } from '../../services/api';
import { countSmsVariables, replaceSmsVariables } from '../../services/smsHelpers';
import { pushNotification } from '../../store/slices/notificationsSlice';
import toast from '../../services/toast';
import dialog from '../../services/dialog';
import GradientButton from '../../components/GradientButton';
import FormField, { inputStyle } from '../../components/FormField';
import Dropdown from '../../components/Dropdown';
import ToggleRow from '../../components/ToggleRow';
import Pill from '../../components/Pill';
import ScheduleModal from '../shared/ScheduleModal';
import ScreenHeader from '../../components/ScreenHeader';

const ROUTES = [
  { id: 'master',        label: 'Master' },
  { id: 'transactional', label: 'Transactional' },
  { id: 'promotional',   label: 'Promotional' },
];

const LANGUAGES = [
  { id: 'en', label: 'ENGLISH' },
  { id: 'hi', label: 'HINDI' },
  { id: 'mr', label: 'MARATHI' },
  { id: 'gu', label: 'GUJARATI' },
  { id: 'ta', label: 'TAMIL' },
  { id: 'te', label: 'TELUGU' },
];

const CAMPAIGN_TYPES = [
  { id: 'one_many', label: 'One To Many' },
  { id: 'one_one',  label: 'One To One' },
];

const stamp = () => {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}, ${d.toLocaleTimeString()}`;
};

export default function CampaignScreen({ navigation }) {
  const c = useBrand();
  const dispatch = useDispatch();

  const [name, setName] = useState(stamp());

  const [route, setRoute] = useState('master');
  const [showRoute, setShowRoute] = useState(false);

  const [senders, setSenders] = useState([]);
  const [sender, setSender] = useState(null);
  const [showSender, setShowSender] = useState(false);
  const [loadingSenders, setLoadingSenders] = useState(true);

  const [language, setLanguage] = useState('en');
  const [showLanguage, setShowLanguage] = useState(false);

  const [dltId, setDltId] = useState('');

  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState(null);
  const [showTemplate, setShowTemplate] = useState(false);

  const [messageText, setMessageText] = useState('');
  const [varValues, setVarValues] = useState([]); // ordered list, one per {#var#}

  const [campaignType, setCampaignType] = useState('one_many');
  const [showCampaignType, setShowCampaignType] = useState(false);

  const [group, setGroup] = useState(null);
  const [showGroup, setShowGroup] = useState(false);
  const [groupFrom, setGroupFrom] = useState('');
  const [groupTo, setGroupTo] = useState('');

  const [numbers, setNumbers] = useState('');

  const [removeDup, setRemoveDup] = useState(true);
  const [flashSms, setFlashSms] = useState(false);
  const [tinyCampaign, setTinyCampaign] = useState(false);
  const [schedule, setSchedule] = useState(false);
  const [schedTime, setSchedTime] = useState('');     // API yyyy-MM-dd HH:mm:ss string
  const [schedAt, setSchedAt] = useState(null);       // Date object for display
  const [showSchedModal, setShowSchedModal] = useState(false);

  const [sending, setSending] = useState(false);

  // Load sender IDs.
  useEffect(() => {
    setLoadingSenders(true);
    SMSAPI.getSenderIds()
      .then((res) => {
        const list = res?.senderIds || res?.data?.senderIds || res?.data || [];
        setSenders(Array.isArray(list) ? list : []);
        if (!sender && list[0]?.senderId) {
          setSender(list[0]);
          if (list[0].entityId) setDltId('');
        }
        if (!list.length) toast.warning('No senders', 'Your token returned zero sender IDs.');
      })
      .catch((e) => {
        setSenders([]);
        toast.error('SMS senders failed', e?.message || 'Could not load sender IDs.');
      })
      .finally(() => setLoadingSenders(false));
  }, []);

  // Load templates whenever sender changes.
  useEffect(() => {
    if (!sender?.senderId) { setTemplates([]); return; }
    TemplatesAPI.getSMS(sender.senderId)
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        setTemplates(list);
        if (!list.length) toast.warning('No templates', `Sender ${sender.senderId} has no approved templates yet.`);
      })
      .catch((e) => {
        setTemplates([]);
        toast.error('Templates failed', e?.message || 'Could not load SMS templates.');
      });
  }, [sender?.senderId]);

  const numberCount = useMemo(() => {
    return numbers
      .split(/[,\n\s]+/)
      .map((n) => n.trim())
      .filter(Boolean)
      .length;
  }, [numbers]);

  // Number of {#var#} placeholders in the current message body.
  const varCount = useMemo(() => countSmsVariables(messageText), [messageText]);

  // The text that will actually leave the device after substituting var
  // values into {#var#} placeholders. Empty values render as empty strings.
  const previewText = useMemo(
    () => replaceSmsVariables(messageText, varValues),
    [messageText, varValues],
  );

  // Resize var values array when count changes (template switch / typing).
  useEffect(() => {
    setVarValues((prev) => {
      const next = prev.slice(0, varCount);
      while (next.length < varCount) next.push('');
      return next;
    });
  }, [varCount]);

  // SMS segment math: 160 chars for plain GSM, 153 per segment after first.
  // Counted on the resolved text since DLT validates the final payload.
  const stats = useMemo(() => {
    const len = previewText.length;
    const maxLen = 160;
    const segments = len === 0 ? 0 : (len <= 160 ? 1 : Math.ceil(len / 153));
    const charsLeft = segments === 0 ? 160 : (segments === 1 ? 160 - len : (153 * segments) - len);
    return { length: len, maxLength: maxLen, segments, charsLeft };
  }, [previewText]);

  const send = async () => {
    if (!sender?.senderId) { Alert.alert('Pick sender', 'Select a sender ID first.'); return; }
    if (!messageText.trim() && !template) { Alert.alert('No message', 'Pick a template or type a message.'); return; }

    const list = numbers.split(/[,\n\s]+/).map((n) => n.trim()).filter(Boolean);
    if (list.length === 0) { Alert.alert('No numbers', 'Add at least one recipient number.'); return; }
    if (list.length > 5000) { Alert.alert('Too many numbers', 'Up to 5,000 numbers per request.'); return; }

    const ok = await dialog.confirm({
      title: 'Send SMS campaign?',
      message: `${name} → ${list.length} recipient${list.length === 1 ? '' : 's'}`,
      confirmText: 'Send now',
    });
    if (!ok) return;

    // Every {#var#} placeholder must have a non-empty value before send,
    // otherwise the carrier will reject as a DLT mismatch.
    if (varCount > 0) {
      const emptyIdx = varValues.findIndex((v) => !String(v || '').trim());
      if (emptyIdx !== -1) {
        Alert.alert('Variable required', `Fill variable #${emptyIdx + 1} before sending.`);
        return;
      }
    }

    setSending(true);
    try {
      const result = await SMSAPI.send({
        senderId: sender.senderId,
        peId: sender.entityId,
        chainValue: sender.hashChainId,
        dltTemplateId: dltId || (template?.dltTemplateId || ''),
        text: (previewText || messageText || template?.body || '').trim(),
        flashSms: flashSms ? 1 : 0,
        schedTime: schedule && schedTime ? schedTime : '',
        numbers: list,
        messageId: `cmp_${Date.now()}`,
      });
      dispatch(pushNotification({
        title: 'SMS campaign sent',
        body: `${name} · ${list.length} recipients`,
        type: 'success',
      }));
      toast.success('Campaign sent', `${list.length} recipients queued`);
      navigation.goBack();
    } catch (e) {
      await dialog.error({ title: 'Send failed', message: e?.message || 'Unknown error' });
    } finally {
      setSending(false);
    }
  };

  const routeLabel = ROUTES.find((r) => r.id === route)?.label || 'Pick route';
  const langLabel = LANGUAGES.find((l) => l.id === language)?.label || 'Pick language';
  const campaignLabel = CAMPAIGN_TYPES.find((t) => t.id === campaignType)?.label || 'Pick';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        icon="chatbubble-outline"
        title="SMS Campaign"
        badge="SMS"
      />
      <ScrollView
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 140, paddingHorizontal: 18 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FormField
          c={c}
          label="Campaign Name *"
          icon="megaphone-outline"
          hint="User-defined campaign name."
        >
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Campaign name"
            placeholderTextColor={c.textMuted}
            style={inputStyle(c)}
          />
        </FormField>

        <Row>
          <FormField c={c} label="Route *" hint="Select the route for delivering messages." flex>
            <Dropdown
              c={c}
              placeholder="Pick route"
              value={routeLabel}
              open={showRoute}
              onToggle={() => setShowRoute((v) => !v)}
              options={ROUTES}
              selectedId={route}
              onSelect={(opt) => { setRoute(opt.id); setShowRoute(false); }}
            />
          </FormField>
          <FormField c={c} label="SenderId *" hint="Enter a valid 6-character SenderID from this list." flex>
            <Dropdown
              c={c}
              placeholder={loadingSenders ? 'Loading…' : 'Pick sender'}
              value={sender?.senderId || ''}
              open={showSender}
              onToggle={() => setShowSender((v) => !v)}
              options={senders.map((s) => ({ id: s.senderId, label: s.senderId, sub: `PE: ${s.entityId}` }))}
              selectedId={sender?.senderId}
              onSelect={(opt) => { setSender(senders.find((x) => x.senderId === opt.id) || null); setShowSender(false); }}
            />
          </FormField>
        </Row>

        <Row>
          <FormField c={c} label="Language" hint="Select preferred language." flex>
            <Dropdown
              c={c}
              placeholder="Pick"
              value={langLabel}
              open={showLanguage}
              onToggle={() => setShowLanguage((v) => !v)}
              options={LANGUAGES}
              selectedId={language}
              onSelect={(opt) => { setLanguage(opt.id); setShowLanguage(false); }}
            />
          </FormField>
          <FormField c={c} label="DLT TemplateId *" hint="Enter the DLT-approved template ID" flex>
            <TextInput
              value={dltId}
              onChangeText={setDltId}
              placeholder="1234567890"
              placeholderTextColor={c.textMuted}
              keyboardType="number-pad"
              style={[inputStyle(c), { fontFamily: 'monospace' }]}
            />
          </FormField>
        </Row>

        {/* Select Template (full-width dark button) */}
        <TouchableOpacity
          onPress={() => setShowTemplate((v) => !v)}
          activeOpacity={0.85}
          style={{
            backgroundColor: c.text,
            borderRadius: 10,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 6,
          }}
        >
          <Ionicons name="document-text-outline" size={14} color={c.bg} />
          <Text style={{ color: c.bg, fontSize: 13, fontWeight: '700' }}>
            {template?.name ? `Template: ${template.name}` : 'Select Template'}
          </Text>
          <Ionicons name={showTemplate ? 'chevron-up' : 'chevron-down'} size={14} color={c.bg} />
        </TouchableOpacity>
        {showTemplate ? (
          <View
            style={{
              backgroundColor: c.bgCard,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 10,
              maxHeight: 220,
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            <ScrollView nestedScrollEnabled>
              {templates.length === 0 ? (
                <Text style={{ color: c.textMuted, padding: 14, fontSize: 12 }}>
                  No templates for this sender.
                </Text>
              ) : (
                templates.map((t, i) => (
                  <TouchableOpacity
                    key={`${t.id || t.name || 'tpl'}_${i}`}
                    onPress={() => {
                      setTemplate(t);
                      setMessageText(t.body || '');
                      if (t.dltTemplateId) setDltId(t.dltTemplateId);
                      setShowTemplate(false);
                    }}
                    style={{
                      padding: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: c.border,
                      gap: 4,
                    }}
                  >
                    <Text style={{ color: c.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{t.name}</Text>
                    <Text style={{ color: c.textMuted, fontSize: 11 }} numberOfLines={1}>{t.body}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        ) : null}
        <Text style={{ color: c.textMuted, fontSize: 11, marginBottom: 14 }}>Select a predefined message template.</Text>

        <FormField c={c} label={`Message Text   ${stats.length}/${stats.maxLength}  ·  Segments: ${stats.segments}  ·  Chars Left: ${stats.charsLeft}`}
          hint="This is your SMS content preview. The text is auto-filled from the template.">
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Auto-filled from selected template…"
            placeholderTextColor={c.textMuted}
            multiline
            style={[
              inputStyle(c),
              { minHeight: 110, textAlignVertical: 'top', paddingTop: 12 },
            ]}
          />
        </FormField>

        {/* Per-template variable inputs ({#var#} placeholders) */}
        {varCount > 0 ? (
          <View
            style={{
              backgroundColor: c.bgCard,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 14,
              padding: 12,
              marginBottom: 14,
              gap: 8,
            }}
          >
            <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 }}>
              Variables ({varCount})
            </Text>
            {Array.from({ length: varCount }).map((_, i) => (
              <FormField
                key={`var_${i}`}
                caps
                c={c}
                label={`Variable #${i + 1}`}
                style={{ marginBottom: 0 }}
              >
                <TextInput
                  value={varValues[i] || ''}
                  onChangeText={(v) => setVarValues((prev) => {
                    const next = prev.slice();
                    next[i] = v;
                    return next;
                  })}
                  placeholder={`Replaces the ${i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}th`} {#var#}`}
                  placeholderTextColor={c.textMuted}
                  style={inputStyle(c)}
                />
              </FormField>
            ))}
            <Text style={{ color: c.textMuted, fontSize: 10 }}>
              Resolved preview: <Text style={{ color: c.text, fontWeight: '600' }}>{previewText || '—'}</Text>
            </Text>
          </View>
        ) : null}

        <Row>
          <FormField c={c} label="Campaign Type *" flex>
            <Dropdown
              c={c}
              placeholder="Pick"
              value={campaignLabel}
              open={showCampaignType}
              onToggle={() => setShowCampaignType((v) => !v)}
              options={CAMPAIGN_TYPES}
              selectedId={campaignType}
              onSelect={(opt) => { setCampaignType(opt.id); setShowCampaignType(false); }}
            />
          </FormField>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
              Total Counts: {numberCount}
            </Text>
            <GradientButton
              title="Upload Files"
              icon="cloud-upload-outline"
              variant="info"
              size="sm"
              onPress={() => Alert.alert('Upload Files', 'CSV / Excel upload coming soon.')}
            />
          </View>
        </Row>

        <Row>
          <FormField c={c} label="Group" hint="Select contact group for messaging." flex>
            <Dropdown
              c={c}
              placeholder="Select Group"
              value={group?.name || ''}
              open={showGroup}
              onToggle={() => setShowGroup((v) => !v)}
              options={[]}
              selectedId={group?.id}
              onSelect={(opt) => { setGroup(opt); setShowGroup(false); }}
            />
          </FormField>
          <FormField c={c} label="Group Range" hint="Range within the group" flex>
            <View className="flex-row" style={{ gap: 6 }}>
              <TextInput
                value={groupFrom}
                onChangeText={setGroupFrom}
                placeholder="From"
                placeholderTextColor={c.textMuted}
                keyboardType="number-pad"
                style={[inputStyle(c), { flex: 1 }]}
              />
              <Text style={{ color: c.textMuted, alignSelf: 'center' }}>to</Text>
              <TextInput
                value={groupTo}
                onChangeText={setGroupTo}
                placeholder="To"
                placeholderTextColor={c.textMuted}
                keyboardType="number-pad"
                style={[inputStyle(c), { flex: 1 }]}
              />
            </View>
          </FormField>
        </Row>

        <FormField c={c} label={`Numbers (Max: 5,000 numbers only)  ·  ${numberCount} entered`}
          hint="Enter multiple numbers separated by commas.">
          <TextInput
            value={numbers}
            onChangeText={setNumbers}
            placeholder="Enter up to 5,000 comma-separated mobile numbers."
            placeholderTextColor={c.textMuted}
            multiline
            style={[
              inputStyle(c),
              { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 },
            ]}
          />
        </FormField>

        {/* Contact & File Upload */}
        <Text style={{ color: c.text, fontSize: 12, fontWeight: '700', marginTop: 4, marginBottom: 8 }}>
          Contact & File Upload
        </Text>
        <View
          className="flex-row"
          style={{
            backgroundColor: c.bgCard,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 10,
            padding: 8,
            gap: 6,
            marginBottom: 14,
          }}
        >
          <Pill c={c} layout="stacked" label="Total" value={numberCount} />
          <Pill c={c} layout="stacked" label="Duplicates" value={0} />
          <Pill c={c} layout="stacked" label="BlackList" value={0} />
        </View>

        <ToggleRow c={c} label="Remove Duplicates" value={removeDup} onChange={setRemoveDup} />
        <ToggleRow c={c} label="Flash Sms"        value={flashSms}  onChange={setFlashSms} />
        <ToggleRow c={c} label="Tiny Campaign"    value={tinyCampaign} onChange={setTinyCampaign} />
        <ToggleRow
          c={c}
          label="Schedule Now"
          help={schedule && schedAt
            ? `Scheduled for ${schedAt.toLocaleString()}`
            : 'Pick a future date and time.'}
          value={schedule}
          onChange={(v) => {
            setSchedule(v);
            if (v) setShowSchedModal(true);
            else { setSchedTime(''); setSchedAt(null); }
          }}
        />

        <View style={{ marginTop: 16 }}>
          <GradientButton
            title={schedule && schedTime ? 'Schedule Send' : 'Send Now'}
            icon={schedule && schedTime ? 'calendar' : 'send'}
            loading={sending}
            onPress={send}
          />
        </View>
      </ScrollView>

      <ScheduleModal
        visible={showSchedModal}
        initialValue={schedAt}
        onConfirm={(api, date) => {
          setSchedTime(api);
          setSchedAt(date);
          setShowSchedModal(false);
          setSchedule(true);
        }}
        onClose={() => {
          setShowSchedModal(false);
          if (!schedTime) setSchedule(false);
        }}
      />
    </View>
  );
}

const Row = ({ children }) => (
  <View className="flex-row" style={{ gap: 10 }}>{children}</View>
);
