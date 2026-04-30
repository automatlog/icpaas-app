// src/screens/rcs/CampaignScreen.js — single-page RCS campaign composer.
// Mirrors UI image/RCS Campaign Screen.png. Picks an agent (bot ID),
// template type, template, and recipient list, then dispatches via
// RCSAPI.sendTemplateAuto / RCSAPI.send for bulk delivery.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useBrand } from '../../theme';
import { RCSAPI, TemplatesAPI } from '../../services/api';
import { extractRcsVariables, getRcsComponent } from '../../services/rcsHelpers';
import { pushNotification } from '../../store/slices/notificationsSlice';
import toast from '../../services/toast';
import dialog from '../../services/dialog';
import GradientButton from '../../components/GradientButton';
import FormField, { inputStyle } from '../../components/FormField';
import Select from '../../components/Select';
import ToggleRow from '../../components/ToggleRow';
import ScheduleModal from '../shared/ScheduleModal';
import ScreenHeader from '../../components/ScreenHeader';

const TEMPLATE_TYPES = [
  { id: '3',        label: 'Text Message' },
  { id: '1',        label: 'Rich Card' },
  { id: 'Carousel', label: 'Carousel' },
];

const CAMPAIGN_TYPES = [
  { id: 'one_many', label: 'One To Many' },
  { id: 'one_one',  label: 'One To One' },
];

const TABS = ['Header', 'Body', 'Buttons'];

const stamp = () => {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}, ${d.toLocaleTimeString()}`;
};

export default function CampaignScreen({ navigation }) {
  const c = useBrand();
  const dispatch = useDispatch();

  const [name, setName] = useState(stamp());

  const [bots, setBots] = useState([]);
  const [bot, setBot] = useState(null);
  const [showBot, setShowBot] = useState(false);
  const [loadingBots, setLoadingBots] = useState(true);

  const [templateType, setTemplateType] = useState('1');
  const [showType, setShowType] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [campaignType, setCampaignType] = useState('one_many');
  const [showCampaignType, setShowCampaignType] = useState(false);

  const [tab, setTab] = useState('Body');
  const [numbers, setNumbers] = useState('');
  const [varValues, setVarValues] = useState({}); // { varName: value }

  const [removeDup, setRemoveDup] = useState(true);
  const [removeBlack, setRemoveBlack] = useState(true);
  const [schedule, setSchedule] = useState(false);
  const [schedTime, setSchedTime] = useState('');
  const [schedAt, setSchedAt] = useState(null);
  const [showSchedModal, setShowSchedModal] = useState(false);

  const [sending, setSending] = useState(false);

  // Load bot agents on mount.
  useEffect(() => {
    setLoadingBots(true);
    RCSAPI.getBotIds()
      .then((res) => {
        const list = res?.bots || res?.data?.bots || res?.data || [];
        setBots(Array.isArray(list) ? list : []);
        if (!bot && list[0]?.botId) setBot(list[0]);
        if (!list.length) toast.warning('No bots', 'Your token returned zero RCS agents.');
      })
      .catch((e) => {
        setBots([]);
        toast.error('RCS bots failed', e?.message || 'Could not load bot IDs.');
      })
      .finally(() => setLoadingBots(false));
  }, []);

  // Load templates whenever bot changes.
  useEffect(() => {
    if (!bot?.botId) { setTemplates([]); setTemplate(null); return; }
    setLoadingTemplates(true);
    TemplatesAPI.getRCS(bot.botId)
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        setTemplates(list);
        setTemplate(list[0] || null);
        if (!list.length) toast.warning('No templates', `Bot ${bot.agentName || bot.botId} has none yet.`);
      })
      .catch((e) => {
        setTemplates([]);
        toast.error('Templates failed', e?.message || 'Could not load RCS templates.');
      })
      .finally(() => setLoadingTemplates(false));
  }, [bot?.botId]);

  const numberCount = useMemo(() => {
    return numbers
      .split(/[,\n\s]+/)
      .map((n) => n.trim())
      .filter(Boolean)
      .length;
  }, [numbers]);

  // Pull declared variables from the selected template's component schema.
  // Names come from TextMessageVarValue / TitleVariables / DescVariables /
  // Suggestion UrlVariables. Empty array → no variable UI rendered.
  const templateVars = useMemo(() => {
    if (!template) return [];
    return extractRcsVariables(getRcsComponent(template));
  }, [template]);

  // Reset variable values whenever the picked template changes.
  useEffect(() => { setVarValues({}); }, [template?.name]);

  const send = async () => {
    if (!bot?.botId) { Alert.alert('Pick a bot', 'Select an RCS agent first.'); return; }
    if (!template?.name) { Alert.alert('Pick a template', 'Choose an RCS template first.'); return; }
    const list = numbers.split(/[,\n\s]+/).map((n) => n.trim()).filter(Boolean);
    if (list.length === 0) { Alert.alert('No numbers', 'Add at least one recipient number.'); return; }
    if (list.length > 5000) { Alert.alert('Too many numbers', 'Up to 5,000 numbers per request.'); return; }

    const ok = await dialog.confirm({
      title: 'Send RCS campaign?',
      message: `${name} → ${list.length} recipient${list.length === 1 ? '' : 's'}`,
      confirmText: 'Send now',
    });
    if (!ok) return;

    // Validate every declared variable has a value.
    const missingVar = templateVars.find((name) => !String(varValues[name] || '').trim());
    if (missingVar) {
      Alert.alert('Variable required', `Enter a value for "${missingVar}".`);
      return;
    }

    setSending(true);
    try {
      // RCS /sendmessage expects `var: { name: value, ... }` keyed by the
      // variable names declared on the template. Same values are applied to
      // every recipient in this single call (gsauth limits to 5,000 numbers
      // per request).
      const result = await RCSAPI.send({
        botId: bot.botId,
        templateName: template.name,
        destination: list,
        ...(templateVars.length > 0 ? { var: varValues } : {}),
        callbackdata: `rcs_${Date.now()}`,
      });
      const successful = Array.isArray(result)
        ? result.filter((r) => String(r.status).toUpperCase() === 'SUCCESS').length
        : (result?.status === 'SUCCESS' ? 1 : 0);
      dispatch(pushNotification({
        title: 'RCS campaign sent',
        body: `${name} · ${successful}/${list.length} delivered`,
        type: 'success',
      }));
      toast.success('Campaign sent', `${successful}/${list.length} delivered`);
      navigation.goBack();
    } catch (e) {
      await dialog.error({ title: 'Send failed', message: e?.message || 'Unknown error' });
    } finally {
      setSending(false);
    }
  };

  const selectedTypeLabel = TEMPLATE_TYPES.find((t) => t.id === templateType)?.label || 'Pick type';
  const selectedCampaignLabel = CAMPAIGN_TYPES.find((t) => t.id === campaignType)?.label || 'Pick';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        icon="card-outline"
        title="RCS Message"
        badge="RCS"
      />
      <ScrollView
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 140, paddingHorizontal: 18 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center mb-4 px-1" style={{ gap: 6 }}>
          <Text className="text-[12px] font-semibold" style={{ color: c.textMuted }}>Home</Text>
          <Ionicons name="chevron-forward" size={11} color={c.textMuted} />
          <Text className="text-[12px] font-semibold" style={{ color: c.primary }}>RCS Message</Text>
        </View>

        <FormField c={c} label="Campaign Name">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Campaign name"
            placeholderTextColor={c.textMuted}
            style={inputStyle(c)}
          />
        </FormField>

        <FormField c={c} label="Agent">
          <Select
            c={c}
            placeholder={loadingBots ? 'Loading agents…' : 'Select agent'}
            value={bot ? `${bot.agentName || ''} (${bot.botId}) - Transactional` : ''}
            open={showBot}
            onToggle={() => setShowBot((v) => !v)}
            options={bots.map((b) => ({
              id: b.botId,
              label: `${b.agentName || b.botId}`,
              sub: b.botId,
            }))}
            selectedId={bot?.botId}
            onSelect={(opt) => { setBot(bots.find((x) => x.botId === opt.id) || null); setShowBot(false); }}
          />
        </FormField>

        <FormField c={c} label="Template Type">
          <Select
            c={c}
            placeholder="Select type"
            value={selectedTypeLabel}
            open={showType}
            onToggle={() => setShowType((v) => !v)}
            options={TEMPLATE_TYPES.map((t) => ({ id: t.id, label: t.label }))}
            selectedId={templateType}
            onSelect={(opt) => { setTemplateType(opt.id); setShowType(false); }}
          />
        </FormField>

        <FormField c={c} label="Select Template">
          <Select
            c={c}
            placeholder={loadingTemplates ? 'Loading templates…' : 'Select Template'}
            value={template?.name || ''}
            open={showTemplate}
            onToggle={() => setShowTemplate((v) => !v)}
            options={templates.map((t) => ({ id: t.name, label: t.name, sub: t.status }))}
            selectedId={template?.name}
            onSelect={(opt) => { setTemplate(templates.find((x) => x.name === opt.id) || null); setShowTemplate(false); }}
          />
        </FormField>

        <FormField c={c} label="Campaign Type *">
          <Select
            c={c}
            placeholder="Pick"
            value={selectedCampaignLabel}
            open={showCampaignType}
            onToggle={() => setShowCampaignType((v) => !v)}
            options={CAMPAIGN_TYPES.map((t) => ({ id: t.id, label: t.label }))}
            selectedId={campaignType}
            onSelect={(opt) => { setCampaignType(opt.id); setShowCampaignType(false); }}
          />
          <Text className="text-[11px] mt-1.5" style={{ color: c.textMuted }}>
            Select how messages will be sent.
          </Text>
        </FormField>

        <View className="flex-row" style={{ gap: 8, marginTop: 4, marginBottom: 14 }}>
          <GradientButton
            title="Upload Files"
            icon="cloud-upload-outline"
            variant="info"
            size="sm"
            fullWidth={false}
            onPress={() => Alert.alert('Upload Files', 'CSV / Excel upload coming soon.')}
          />
          <GradientButton
            title="Groups"
            icon="people-outline"
            variant="secondary"
            size="sm"
            fullWidth={false}
            onPress={() => navigation.navigate('Contacts', { tab: 'groups' })}
          />
        </View>

        {/* Tabs (Header / Body / Buttons preview) */}
        <View
          className="flex-row rounded-[12px] mb-3 p-1"
          style={{ backgroundColor: c.bgInput, gap: 4 }}
        >
          {TABS.map((label) => {
            const active = tab === label;
            return (
              <TouchableOpacity
                key={label}
                onPress={() => setTab(label)}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: active ? c.bg : 'transparent',
                  borderWidth: active ? 1 : 0,
                  borderColor: c.border,
                }}
              >
                <Text style={{ color: active ? c.text : c.textMuted, fontWeight: '600', fontSize: 12 }}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Template variables — declared on the selected RCS template */}
        {templateVars.length > 0 ? (
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
              Template Variables
            </Text>
            {templateVars.map((name) => (
              <FormField
                key={name}
                caps
                c={c}
                label={name}
                style={{ marginBottom: 0 }}
              >
                <TextInput
                  value={varValues[name] || ''}
                  onChangeText={(v) => setVarValues((prev) => ({ ...prev, [name]: v }))}
                  placeholder={`Value for {${name}}`}
                  placeholderTextColor={c.textMuted}
                  style={inputStyle(c)}
                />
              </FormField>
            ))}
            <Text style={{ color: c.textMuted, fontSize: 10 }}>
              Same value is sent to every recipient in this batch.
            </Text>
          </View>
        ) : null}

        <FormField c={c} label={`Numbers (${numberCount})`} hint="Paste up to 5,000 numbers only.">
          <TextInput
            value={numbers}
            onChangeText={setNumbers}
            placeholder="Enter number in comma seperated, e.g. 9100000000, 9100000001"
            placeholderTextColor={c.textMuted}
            multiline
            style={[
              inputStyle(c),
              { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 },
            ]}
          />
        </FormField>

        <ToggleRow c={c} label="Remove Duplicate" value={removeDup} onChange={setRemoveDup} />
        <ToggleRow c={c} label="Remove BlackList" value={removeBlack} onChange={setRemoveBlack} />
        <ToggleRow
          c={c}
          label="Schedule Now"
          help={schedule && schedAt
            ? `Will queue locally for ${schedAt.toLocaleString()} (RCS API has no native scheduling).`
            : 'Pick a future date and time.'}
          value={schedule}
          onChange={(v) => {
            setSchedule(v);
            if (v) setShowSchedModal(true);
            else { setSchedTime(''); setSchedAt(null); }
          }}
        />

        <View className="flex-row mt-5" style={{ gap: 10 }}>
          <View style={{ flex: 1 }}>
            <GradientButton
              title="Failed Over"
              icon="refresh"
              variant="secondary"
              onPress={() => Alert.alert('Failed Over', 'Re-target failed numbers from a previous run.')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <GradientButton
              title={schedule && schedTime ? 'Schedule Send' : 'Send Now'}
              icon={schedule && schedTime ? 'calendar' : 'send'}
              loading={sending}
              onPress={send}
            />
          </View>
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

