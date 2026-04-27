// src/screens/CampaignStep2Screen.js — Campaign wizard · Step 2 · Audience + template
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Platform, Alert,
  ActivityIndicator, useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { TemplatesAPI } from '../services/api';

const C = {
  dark:  { bg: '#0A0A0D', bgSoft: '#141418', bgInput: '#1C1C22', ink: '#FFFFFF', muted: '#9A9AA2', dim: '#5C5C63', pink: '#FF4D7E' },
  light: { bg: '#FAFAFB', bgSoft: '#F2F2F5', bgInput: '#ECECEF', ink: '#0A0A0D', muted: '#5C5C63', dim: '#9A9AA2', pink: '#E6428A' },
};

const countNumbers = (raw) =>
  String(raw || '')
    .split(/[\n,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean).length;

export default function CampaignStep2Screen({ navigation, route }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;

  const draft = route?.params?.draft || {};
  const [contacts, setContacts] = useState(draft.contacts || '');
  const [templateName, setTemplateName] = useState(draft.templateName || '');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    if (draft.channel === 'voice') { setTemplates([]); return; }
    setLoading(true);
    setErr(null);
    try {
      const res = await TemplatesAPI.getByChannel(draft.channel, {});
      setTemplates(res?.data || []);
    } catch (e) {
      setErr(e?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [draft.channel]);

  useEffect(() => { load(); }, [load]);

  const count = useMemo(() => countNumbers(contacts), [contacts]);

  const next = () => {
    if (count === 0) { Alert.alert('Required', 'Add at least one recipient number.'); return; }
    if (draft.channel !== 'voice' && !templateName) {
      Alert.alert('Required', 'Pick a template.');
      return;
    }
    navigation.navigate('CampaignStep3', { draft: { ...draft, contacts, templateName } });
  };

  const rootBg = dark ? 'bg-bg' : 'bg-white';
  const softBg = dark ? 'bg-bgSoft' : 'bg-[#F2F2F5]';
  const textInk = dark ? 'text-ink' : 'text-[#0A0A0D]';
  const textMuted = dark ? 'text-textMuted' : 'text-[#5C5C63]';
  const textDim = dark ? 'text-textDim' : 'text-[#9A9AA2]';

  return (
    <View className={`flex-1 ${rootBg}`}>
      <ScrollView contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 22, paddingBottom: 140 }}>
        <View className="flex-row items-center mb-5" style={{ gap: 10 }}>
          <TouchableOpacity className={`w-[42px] h-[42px] rounded-full items-center justify-center ${softBg}`} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={c.ink} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className={`text-[11px] font-semibold tracking-widest uppercase ${textMuted}`}>Step 2 of 3</Text>
            <Text className={`text-[24px] font-bold tracking-tight ${textInk}`}>Audience + template</Text>
          </View>
        </View>

        <Stepper current={2} dark={dark} c={c} />

        <Label cls={textMuted}>Recipients · {count} number{count === 1 ? '' : 's'}</Label>
        <View className={`rounded-[18px] px-4 ${softBg}`}>
          <TextInput
            value={contacts}
            onChangeText={setContacts}
            placeholder="919876543210, 918765432109 …"
            placeholderTextColor={c.muted}
            multiline
            className={`py-3 text-sm ${textInk}`}
            style={[{ minHeight: 110, textAlignVertical: 'top' }, Platform.select({ web: { outlineStyle: 'none' } })]}
          />
        </View>
        <Text className={`text-[11px] mt-1.5 px-1 ${textDim}`}>Paste comma- or newline-separated numbers. Max 5,000.</Text>

        <View className="flex-row mt-2.5 mb-2" style={{ gap: 8 }}>
          <PickerBtn
            icon="people-outline"
            label="From contacts"
            onPress={async () => {
              try {
                const { status } = await Contacts.requestPermissionsAsync();
                if (status !== 'granted') { Alert.alert('Permission needed', 'Allow contacts access.'); return; }
                const { data } = await Contacts.getContactsAsync({
                  fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
                  sort: Contacts.SortTypes.FirstName,
                });
                const numbers = data
                  .flatMap((p) => (p.phoneNumbers || []).map((n) => (n.number || '').replace(/[^\d+]/g, '')))
                  .filter(Boolean);
                const merged = [...new Set([...String(contacts || '').split(/[\n,;\s]+/).map((s) => s.trim()).filter(Boolean), ...numbers])];
                setContacts(merged.join(', '));
                Alert.alert('Imported', `Added ${numbers.length} contact number${numbers.length === 1 ? '' : 's'}.`);
              } catch (e) {
                Alert.alert('Contacts error', e?.message || 'Unable to read contacts.');
              }
            }}
            c={c} dark={dark} textInk={textInk}
          />
          <PickerBtn
            icon="document-attach-outline"
            label="Upload CSV"
            onPress={async () => {
              try {
                const res = await DocumentPicker.getDocumentAsync({
                  type: ['text/csv', 'text/plain', 'application/csv', '*/*'],
                  multiple: false,
                  copyToCacheDirectory: true,
                });
                if (res.canceled) return;
                const file = res.assets?.[0];
                if (!file) return;
                const body = await FileSystem.readAsStringAsync(file.uri, { encoding: 'utf8' });
                const numbers = body
                  .split(/[\r\n,;]+/)
                  .map((s) => s.trim().replace(/^["']|["']$/g, ''))
                  .filter((s) => /^\+?\d{6,15}$/.test(s));
                if (numbers.length === 0) { Alert.alert('Empty', 'No valid numbers found in file.'); return; }
                const merged = [...new Set([...String(contacts || '').split(/[\n,;\s]+/).map((s) => s.trim()).filter(Boolean), ...numbers])];
                setContacts(merged.join(', '));
                Alert.alert('Imported', `Added ${numbers.length} number${numbers.length === 1 ? '' : 's'} from ${file.name || 'file'}.`);
              } catch (e) {
                Alert.alert('Upload failed', e?.message || 'Unable to parse file.');
              }
            }}
            c={c} dark={dark} textInk={textInk}
          />
        </View>

        {draft.channel !== 'voice' && (
          <>
            <Label cls={textMuted}>Template {templates.length ? `(${templates.length})` : ''}</Label>
            {loading ? (
              <View className="py-4 items-center"><ActivityIndicator color={c.pink} /></View>
            ) : err ? (
              <View className={`rounded-[14px] p-3 border-l-[3px] ${softBg}`} style={{ borderLeftColor: c.pink }}>
                <Text className={`text-xs ${textInk}`}>{err}</Text>
              </View>
            ) : templates.length === 0 ? (
              <Text className={`text-xs italic ${textDim}`}>No templates available for {draft.channel}.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                {templates.map((t) => {
                  const name = t.name || t.id;
                  const active = templateName === name;
                  return (
                    <TouchableOpacity
                      key={t.id || name}
                      onPress={() => setTemplateName(active ? '' : name)}
                      activeOpacity={0.85}
                      className="rounded-[14px] px-3 py-2 flex-row items-center"
                      style={{ backgroundColor: active ? c.ink : (dark ? '#141418' : '#F2F2F5'), gap: 8 }}
                    >
                      <Ionicons name="document-text-outline" size={12} color={active ? c.bg : c.muted} />
                      <Text className="text-xs" style={{ color: active ? c.bg : c.muted, fontWeight: active ? '700' : '500' }}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </>
        )}

        {draft.channel === 'voice' && (
          <View className={`rounded-[18px] p-4 mt-3 ${softBg}`}>
            <View className="flex-row items-center mb-1.5" style={{ gap: 8 }}>
              <Ionicons name="call-outline" size={16} color={c.muted} />
              <Text className={`text-[13px] font-semibold ${textInk}`}>Voice campaign</Text>
            </View>
            <Text className={`text-xs ${textMuted}`}>Media file and caller ID are set in Step 3.</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={next}
          activeOpacity={0.88}
          className="mt-6 rounded-[28px] py-4 items-center justify-center flex-row"
          style={{ backgroundColor: c.ink, gap: 10 }}
        >
          <Text className="text-[15px] font-bold" style={{ color: c.bg }}>Continue</Text>
          <Ionicons name="arrow-forward" size={16} color={c.bg} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const Label = ({ cls, children }) => (
  <Text className={`text-[11px] font-semibold tracking-widest uppercase mb-2 mt-3 ${cls}`}>{children}</Text>
);

const PickerBtn = ({ icon, label, onPress, c, dark, textInk }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    className="flex-1 flex-row items-center justify-center py-2.5 rounded-[16px]"
    style={{ backgroundColor: dark ? '#1C1C22' : '#ECECEF', gap: 8 }}
  >
    <Ionicons name={icon} size={14} color={c.muted} />
    <Text className={`text-xs font-semibold ${textInk}`}>{label}</Text>
  </TouchableOpacity>
);

const Stepper = ({ current, dark, c }) => (
  <View className="flex-row mb-5" style={{ gap: 6 }}>
    {[1, 2, 3].map((n) => (
      <View
        key={n}
        className="flex-1 h-1 rounded-full"
        style={{ backgroundColor: n <= current ? c.ink : (dark ? '#1C1C22' : '#ECECEF') }}
      />
    ))}
  </View>
);
