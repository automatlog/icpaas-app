// src/screens/CampaignStep1Screen.js — Make Campaign · Step 1 (matches Camapign screen1.png)
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Switch,
  Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useBrand } from '../theme';
import { WhatsAppAPI } from '../services/api';

const fmtNow = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())} ${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const countNumbers = (raw) =>
  String(raw || '').split(/[\n,;\s]+/).map((s) => s.trim()).filter(Boolean).length;

export default function CampaignStep1Screen({ navigation, route }) {
  const c = useBrand();
  const draft = route?.params?.draft || {};

  const [name, setName] = useState(draft.name || fmtNow());
  const [channelId, setChannelId] = useState(draft.channelId || '');
  const [channels, setChannels] = useState([]);
  const [loadingCh, setLoadingCh] = useState(false);
  const [showChannels, setShowChannels] = useState(false);
  const [numbers, setNumbers] = useState(draft.numbers || '');
  const [removeDup, setRemoveDup] = useState(draft.removeDup ?? true);
  const [removeBlack, setRemoveBlack] = useState(draft.removeBlack ?? true);
  const [scheduleNow, setScheduleNow] = useState(draft.scheduleNow ?? false);

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
      draft: { ...draft, name: name.trim(), channelId, channels, numbers, removeDup, removeBlack, scheduleNow },
    });
  };

  const pickContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission', 'Allow contacts access.'); return; }
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
      const nums = data
        .flatMap((p) => (p.phoneNumbers || []).map((n) => (n.number || '').replace(/[^\d+]/g, '')))
        .filter(Boolean);
      const merged = [...new Set([...countNumbers(numbers) ? numbers.split(/[\n,;\s]+/).map((s) => s.trim()).filter(Boolean) : [], ...nums])];
      setNumbers(merged.join(', '));
      Alert.alert('Imported', `Added ${nums.length} number${nums.length === 1 ? '' : 's'}.`);
    } catch (e) {
      Alert.alert('Contacts error', e?.message || 'Unable to read contacts.');
    }
  };

  const uploadCsv = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const f = res.assets?.[0];
      if (!f) return;
      const body = await FileSystem.readAsStringAsync(f.uri, { encoding: 'utf8' });
      const nums = body
        .split(/[\r\n,;]+/)
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter((s) => /^\+?\d{6,15}$/.test(s));
      const merged = [...new Set([...numbers.split(/[\n,;\s]+/).map((s) => s.trim()).filter(Boolean), ...nums])];
      setNumbers(merged.join(', '));
      Alert.alert('Imported', `Added ${nums.length} number${nums.length === 1 ? '' : 's'}.`);
    } catch (e) {
      Alert.alert('Upload failed', e?.message || 'Unable to parse file.');
    }
  };

  const channelLabel = channels.find((x) => x.phoneNumberId === channelId)
    ? `${channels.find((x) => x.phoneNumberId === channelId).label || channels.find((x) => x.phoneNumberId === channelId).wabaNumber || channelId}`
    : 'Select Channel';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header c={c} navigation={navigation} title="Make Campaign" />
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
            <TouchableOpacity
              onPress={() => setShowChannels((v) => !v)}
              activeOpacity={0.85}
              className="flex-row items-center rounded-[10px] px-3 py-3"
              style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.bg }}
            >
              <Ionicons name="logo-whatsapp" size={14} color={c.textMuted} />
              <Text className="flex-1 text-[14px] ml-2" style={{ color: channelId ? c.text : c.textMuted }}>
                {loadingCh ? 'Loading channels…' : channelLabel}
              </Text>
              <Ionicons name={showChannels ? 'chevron-up' : 'chevron-down'} size={14} color={c.textMuted} />
            </TouchableOpacity>
            {showChannels && channels.length > 0 ? (
              <View className="rounded-[10px] mt-1.5 overflow-hidden" style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.bgCard }}>
                {channels.map((ch, i) => (
                  <TouchableOpacity
                    key={ch.phoneNumberId || i}
                    onPress={() => { setChannelId(ch.phoneNumberId); setShowChannels(false); }}
                    activeOpacity={0.8}
                    className="px-3 py-3 flex-row items-center"
                    style={{ gap: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.rule }}
                  >
                    <Ionicons name="logo-whatsapp" size={14} color={c.primary} />
                    <View className="flex-1">
                      <Text className="text-[13px] font-semibold" style={{ color: c.text }} numberOfLines={1}>
                        {ch.label || ch.wabaNumber || ch.phoneNumberId}
                      </Text>
                      <Text className="text-[10px]" style={{ color: c.textMuted }} numberOfLines={1}>
                        ID: {ch.phoneNumberId}
                      </Text>
                    </View>
                    {channelId === ch.phoneNumberId ? <Ionicons name="checkmark" size={16} color={c.primary} /> : null}
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
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
              <PickerBtn c={c} icon="people" label="Group" onPress={pickContacts} />
              <PickerBtn c={c} icon="cloud-upload-outline" label="Upload File" onPress={uploadCsv} />
            </View>
          </Field>

          <ToggleRow c={c} label="Remove Duplicates" value={removeDup} onValueChange={setRemoveDup} />
          <ToggleRow c={c} label="Remove BlackList" value={removeBlack} onValueChange={setRemoveBlack} />
          <ToggleRow c={c} label="Schedule Now" value={scheduleNow} onValueChange={setScheduleNow} />
        </Card>

        <PrimaryButton c={c} icon="hand-right" label="Next" onPress={next} />
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

function Field({ c, label, required, right, children }) {
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
    <View className="flex-row items-center py-2" style={{ gap: 10 }}>
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
