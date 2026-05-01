// src/screens/CampaignStep1Screen.js — Campaign Launch · Step 1 (matches Camapign screen1.png)
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Switch,
  Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useBrand } from '../../../theme';
import { WhatsAppAPI } from '../../../services/api';
import { selectGroups } from '../../../store/slices/groupsSlice';
import AddRecipientsModal from '../../shared/AddRecipientsModal';
import ScheduleModal from '../../shared/ScheduleModal';
import Select from '../../../components/Select';
import ScreenHeader from '../../../components/ScreenHeader';
import useFormDraft from '../../../hooks/useFormDraft';

const fmtNow = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())} ${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const countNumbers = (raw) =>
  String(raw || '').split(/[\n,;\s]+/).map((s) => s.trim()).filter(Boolean).length;

export default function CampaignStep1Screen({ navigation, route }) {
  const c = useBrand();
  const routeDraft = route?.params?.draft || {};
  const groups = useSelector(selectGroups);

  // Persisted draft survives stack pops, app restarts. Route-params draft
  // (passed back from Step2 via Previous) wins when present, since the user
  // explicitly carried newer values backward.
  const [persistedDraft, patchDraft] = useFormDraft('whatsappCampaign', {
    name: '',
    channelId: '',
    numbers: '',
    removeDup: true,
    removeBlack: true,
    scheduleNow: false,
    schedTime: '',
  });
  const initial = { ...persistedDraft, ...routeDraft };

  const [name, setName] = useState(initial.name || fmtNow());
  const [channelId, setChannelId] = useState(initial.channelId || '');
  const [channels, setChannels] = useState([]);
  const [loadingCh, setLoadingCh] = useState(false);
  const [showChannels, setShowChannels] = useState(false);
  const [showRecipients, setShowRecipients] = useState(false);
  const [numbers, setNumbers] = useState(initial.numbers || '');
  const [removeDup, setRemoveDup] = useState(initial.removeDup ?? true);
  const [removeBlack, setRemoveBlack] = useState(initial.removeBlack ?? true);
  const [scheduleNow, setScheduleNow] = useState(initial.scheduleNow ?? false);
  const [schedTime, setSchedTime]     = useState(initial.schedTime || '');
  const [showSchedule, setShowSchedule] = useState(false);

  // Mirror local state into the persisted draft on every change.
  useEffect(() => {
    patchDraft({ name, channelId, numbers, removeDup, removeBlack, scheduleNow, schedTime });
  }, [patchDraft, name, channelId, numbers, removeDup, removeBlack, scheduleNow, schedTime]);

  useEffect(() => {
    setLoadingCh(true);
    WhatsAppAPI.getChannels()
      .then((res) => setChannels(res?.data || []))
      .catch(() => setChannels([]))
      .finally(() => setLoadingCh(false));
  }, []);

  const next = () => {
    if (!name.trim()) { Alert.alert('Required', 'Enter campaign name.'); return; }
    if (!channelId) { Alert.alert('Required', 'Pick a WABA channel.'); return; }
    if (countNumbers(numbers) === 0) { Alert.alert('Required', 'Add recipient numbers.'); return; }
    navigation.navigate('CampaignStep2', {
      draft: { ...routeDraft, name: name.trim(), channelId, channels, numbers, removeDup, removeBlack, scheduleNow, schedTime },
    });
  };

  const channelLabel = channels.find((x) => x.phoneNumberId === channelId)
    ? `${channels.find((x) => x.phoneNumberId === channelId).label || channels.find((x) => x.phoneNumberId === channelId).wabaNumber || channelId}`
    : 'Select Channel';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header c={c} navigation={navigation} title="Campaign Launch" />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Stepper c={c} step={1} />

        <Card c={c}>
          <SectionTitle c={c} icon="document-text" label="Campaign Details" />

          <Field c={c} label="Campaign Name" required>
            <View
              className="flex-row items-center rounded-[10px] px-3 py-0.5"
              style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.bg }}
            >
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Pick a name"
                placeholderTextColor={c.textMuted}
                className="flex-1 text-[14px]"
                style={[
                  { paddingVertical: Platform.OS === 'ios' ? 12 : 10, color: c.text },
                  Platform.select({ web: { outlineStyle: 'none' } }),
                ]}
              />
            </View>
            <Text className="text-[11px] mt-1" style={{ color: c.textMuted }}>Pick something that describes your audience &amp; goals.</Text>
          </Field>

          <Field c={c} label="WABA Channel" required>
            <Select
              c={c}
              icon="logo-whatsapp"
              placeholder={loadingCh ? 'Loading channels…' : 'Select Channel'}
              value={channelLabel === 'Select Channel' ? '' : channelLabel}
              open={showChannels}
              onToggle={() => setShowChannels((v) => !v)}
              options={channels.map((ch) => ({
                id: ch.phoneNumberId,
                label: ch.label || ch.wabaNumber || ch.phoneNumberId,
                sub: `ID: ${ch.phoneNumberId}`,
              }))}
              selectedId={channelId}
              onSelect={(o) => setChannelId(o.id)}
              onClear={() => setChannelId(null)}
              searchable
            />
          </Field>

          <Field
            c={c}
            label="Numbers"
            required
            right={(
              <View className="flex-row items-center" style={{ gap: 4 }}>
                <Ionicons name="chevron-forward" size={11} color={c.textMuted} />
                <Ionicons name="chevron-forward" size={11} color={c.textMuted} style={{ marginLeft: -7 }} />
                <Text className="text-[11px] font-semibold ml-1" style={{ color: c.textMuted }}>
                  Total Count ( {countNumbers(numbers)} )
                </Text>
              </View>
            )}
          >
            <View
              className="rounded-[10px] px-3"
              style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.bg }}
            >
              <TextInput
                value={numbers}
                onChangeText={setNumbers}
                placeholder="Enter up to 5,000 comma-separated mobile numbers"
                placeholderTextColor={c.textMuted}
                multiline
                className="text-[13px]"
                style={[
                  { paddingVertical: 12, minHeight: 110, textAlignVertical: 'top', color: c.text },
                  Platform.select({ web: { outlineStyle: 'none' } }),
                ]}
              />
            </View>
            <Text className="text-[11px] mt-1" style={{ color: c.textMuted }}>
              Enter multiple numbers separated by commas. Max 5,000 allowed.
            </Text>

            <View className="flex-row mt-2.5" style={{ gap: 8 }}>
              <PickerBtn c={c} icon="people" label="Group" onPress={() => setShowRecipients(true)} />
            </View>
          </Field>

          <ToggleRow c={c} label="Remove Duplicates" value={removeDup} onValueChange={setRemoveDup} />
          <ToggleRow c={c} label="Remove BlackList" value={removeBlack} onValueChange={setRemoveBlack} />
          <ScheduleRow
            c={c}
            value={scheduleNow}
            schedTime={schedTime}
            onValueChange={(on) => {
              setScheduleNow(on);
              if (on) setShowSchedule(true);
              else setSchedTime('');
            }}
            onEdit={() => setShowSchedule(true)}
          />
        </Card>

        <PrimaryButton c={c} icon="hand-right" label="Next" onPress={next} />
      </ScrollView>

      <AddRecipientsModal
        visible={showRecipients}
        onClose={() => setShowRecipients(false)}
        onAdd={(nums) => {
          const existing = numbers.split(/[\n,;\s]+/).map((s) => s.trim()).filter(Boolean);
          const merged = [...new Set([...existing, ...nums])];
          setNumbers(merged.join(', '));
        }}
      />

      <ScheduleModal
        visible={showSchedule}
        initialValue={schedTime}
        onClose={() => {
          setShowSchedule(false);
          // If user closed without confirming and nothing was scheduled before, flip the toggle off
          if (!schedTime) setScheduleNow(false);
        }}
        onConfirm={(apiStr) => {
          setSchedTime(apiStr);
          setScheduleNow(true);
          setShowSchedule(false);
        }}
      />
    </View>
  );
}

function Header({ c, navigation, title }) {
  return (
    <ScreenHeader
      c={c}
      onBack={() => navigation.goBack()}
      icon="megaphone-outline"
      title={title}
      badge="WhatsApp"
    />
  );
}

export function Stepper({ c, step }) {
  const items = [
    { n: 1, icon: 'person', label: 'Campaign' },
    { n: 2, icon: 'grid', label: 'Template' },
    { n: 3, icon: 'send', label: 'Verify & Send' },
  ];
  return (
    <View
      className="flex-row items-center rounded-[16px] px-4 py-3 mb-4"
      style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}
    >
      {items.map((it, i) => {
        const done = step > it.n;
        const active = step === it.n;
        const ring = active || done ? c.primary : c.border;
        const bg = active || done ? c.primary : c.bgInput;
        const lineActive = step > it.n ? c.primary : c.border;
        return (
          <React.Fragment key={it.n}>
            <View className="items-center" style={{ width: 80 }}>
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: bg, borderWidth: 1.5, borderColor: ring }}
              >
                <Ionicons name={it.icon} size={16} color={active || done ? '#FFFFFF' : c.textMuted} />
              </View>
              <Text
                className="text-[11px] font-semibold mt-1.5"
                style={{ color: active || done ? c.primary : c.textMuted }}
              >
                {it.label}
              </Text>
            </View>
            {i < items.length - 1 ? (
              <View className="flex-1 h-[2px]" style={{ backgroundColor: lineActive, marginTop: -16 }} />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

export function Card({ c, children }) {
  return (
    <View
      className="rounded-[16px] p-4 mb-4"
      style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ c, icon, label }) {
  return (
    <View className="flex-row items-center pb-3 mb-3" style={{ gap: 8, borderBottomWidth: 1, borderBottomColor: c.rule }}>
      <Ionicons name={icon} size={16} color={c.primary} />
      <Text className="text-[15px] font-bold" style={{ color: c.text }}>{label}</Text>
    </View>
  );
}

export function Field({ c, label, required, right, children }) {
  return (
    <View className="mb-3.5">
      <View className="flex-row items-center justify-between mb-1.5">
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Ionicons name="ellipse" size={6} color={c.textMuted} />
          <Text className="text-[13px] font-bold" style={{ color: c.text }}>
            {label}{required ? <Text style={{ color: c.danger }}>  *</Text> : null}
          </Text>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

function PickerBtn({ c, icon, label, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="flex-1 flex-row items-center justify-center rounded-[10px] py-2.5"
      style={{ borderWidth: 1, borderColor: c.primary, gap: 6 }}
    >
      <Ionicons name={icon} size={14} color={c.primary} />
      <Text className="text-[12px] font-semibold" style={{ color: c.primary }}>{label}</Text>
    </TouchableOpacity>
  );
}

function ToggleRow({ c, label, value, onValueChange }) {
  return (
    <View className="flex-row items-center py-1" style={{ gap: 10 }}>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: c.border, true: c.primary }}
        thumbColor={'#FFFFFF'}
        style={Platform.OS === 'ios' ? { transform: [{ scale: 0.9 }] } : {}}
      />
      <Text className="text-[13px] font-semibold" style={{ color: c.text }}>{label}</Text>
    </View>
  );
}

// Schedule row: toggle + chosen-time pill that taps to re-edit.
function ScheduleRow({ c, value, schedTime, onValueChange, onEdit }) {
  // Format yyyy-MM-dd HH:mm:ss → "27 Apr 2026 · 10:30 AM"
  const display = (() => {
    if (!schedTime) return '';
    try {
      const d = new Date(schedTime.replace(' ', 'T'));
      if (Number.isNaN(d.getTime())) return schedTime;
      const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${date} · ${time}`;
    } catch { return schedTime; }
  })();

  return (
    <View className="py-1" style={{ gap: 8 }}>
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: c.border, true: c.primary }}
          thumbColor={'#FFFFFF'}
          style={Platform.OS === 'ios' ? { transform: [{ scale: 0.9 }] } : {}}
        />
        <Text className="text-[13px] font-semibold flex-1" style={{ color: c.text }}>Schedule Now</Text>
        {value ? (
          <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text className="text-[11px] font-bold" style={{ color: c.primary }}>{schedTime ? 'Edit' : 'Pick time'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {value && schedTime ? (
        <TouchableOpacity
          onPress={onEdit}
          activeOpacity={0.85}
          className="flex-row items-center rounded-[10px] px-3 py-2.5"
          style={{ backgroundColor: c.primarySoft, gap: 8 }}
        >
          <Ionicons name="calendar" size={13} color={c.primaryDeep} />
          <Text className="text-[12px] font-bold" style={{ color: c.primaryDeep }} numberOfLines={1}>
            Sends on {display}
          </Text>
          <View className="flex-1" />
          <Ionicons name="pencil" size={12} color={c.primaryDeep} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function PrimaryButton({ c, icon, label, onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.88}
      className="rounded-[10px] flex-row items-center justify-center"
      style={{ backgroundColor: c.primary, paddingVertical: 14, gap: 8, opacity: disabled ? 0.6 : 1 }}
    >
      {disabled ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={16} color="#FFFFFF" /> : null}
          <Text className="text-[15px] font-bold text-white">{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function SecondaryButton({ c, icon, label, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="flex-1 rounded-[10px] flex-row items-center justify-center"
      style={{ backgroundColor: c.bgInput, paddingVertical: 14, gap: 8 }}
    >
      {icon ? <Ionicons name={icon} size={16} color={c.text} /> : null}
      <Text className="text-[14px] font-semibold" style={{ color: c.text }}>{label}</Text>
    </TouchableOpacity>
  );
}
