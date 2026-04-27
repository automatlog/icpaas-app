// src/screens/CampaignStep3Screen.js — Campaign wizard · Step 3 · Schedule + launch
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Platform, Alert,
  ActivityIndicator, useColorScheme, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { upsertCampaign } from '../store/slices/campaignsSlice';
import { WhatsAppAPI, SMSAPI, RCSAPI, VoiceAPI } from '../services/api';

const C = {
  dark:  { bg: '#0A0A0D', bgSoft: '#141418', bgInput: '#1C1C22', ink: '#FFFFFF', muted: '#9A9AA2', dim: '#5C5C63', pink: '#FF4D7E', cyan: '#5CD4E0', gradA: '#FF4D7E', gradB: '#FF8A3D', gradC: '#B765E8' },
  light: { bg: '#FAFAFB', bgSoft: '#F2F2F5', bgInput: '#ECECEF', ink: '#0A0A0D', muted: '#5C5C63', dim: '#9A9AA2', pink: '#E6428A', cyan: '#2FB8C4', gradA: '#E6428A', gradB: '#FF7A22', gradC: '#9A47D4' },
};

const toList = (raw) =>
  String(raw || '')
    .split(/[\n,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

export default function CampaignStep3Screen({ navigation, route }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;
  const dispatch = useDispatch();

  const draft = route?.params?.draft || {};
  const numbers = useMemo(() => toList(draft.contacts), [draft.contacts]);

  const [scheduled, setScheduled] = useState(false);
  const [schedTime, setSchedTime] = useState('');
  const [callerId, setCallerId] = useState('');
  const [mediaFileId, setMediaFileId] = useState('');
  const [launching, setLaunching] = useState(false);

  const launch = async () => {
    setLaunching(true);
    try {
      let response = null;
      if (draft.channel === 'whatsapp') {
        response = await Promise.all(
          numbers.map((n) =>
            WhatsAppAPI.sendTemplateAuto({ to: n, templateName: draft.templateName }).catch((e) => ({ error: e?.message })),
          ),
        );
      } else if (draft.channel === 'sms') {
        response = await SMSAPI.sendBulk(numbers, '', undefined, undefined, undefined);
      } else if (draft.channel === 'rcs') {
        response = await RCSAPI.sendBulk(numbers, undefined, draft.templateName);
      } else if (draft.channel === 'voice') {
        if (!callerId.trim()) throw { message: 'Caller ID is required for voice.' };
        response = await VoiceAPI.makeCall({
          numbers,
          callerId: callerId.trim(),
          mediaFileId: mediaFileId ? Number(mediaFileId) : undefined,
          schedTime: scheduled && schedTime ? schedTime : undefined,
        });
      }

      const local = {
        id: `cmp_${Date.now()}`,
        name: draft.name,
        channel: draft.channel,
        status: scheduled ? 'scheduled' : 'live',
        total: numbers.length,
        sent: scheduled ? 0 : numbers.length,
        templateName: draft.templateName,
        schedTime: scheduled ? schedTime : null,
        createdAt: new Date().toISOString(),
      };
      dispatch(upsertCampaign(local));

      Alert.alert(
        scheduled ? 'Scheduled' : 'Launched',
        `${draft.channel.toUpperCase()} · ${numbers.length} recipient${numbers.length === 1 ? '' : 's'}`,
        [{ text: 'OK', onPress: () => navigation.navigate('Dashboard') }],
      );
    } catch (e) {
      Alert.alert('Launch failed', e?.message || 'Unknown error');
    } finally {
      setLaunching(false);
    }
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
            <Text className={`text-[11px] font-semibold tracking-widest uppercase ${textMuted}`}>Step 3 of 3</Text>
            <Text className={`text-[24px] font-bold tracking-tight ${textInk}`}>Review + launch</Text>
          </View>
        </View>

        <Stepper current={3} dark={dark} c={c} />

        {/* Summary card */}
        <View className={`rounded-[20px] p-4 mb-3 ${softBg}`} style={{ borderWidth: 1, borderColor: c.bgInput }}>
          <Row label="Name" value={draft.name} textInk={textInk} textMuted={textMuted} />
          <Row label="Channel" value={String(draft.channel || '').toUpperCase()} textInk={textInk} textMuted={textMuted} />
          <Row label="Recipients" value={`${numbers.length} number${numbers.length === 1 ? '' : 's'}`} textInk={textInk} textMuted={textMuted} />
          {draft.templateName ? <Row label="Template" value={draft.templateName} textInk={textInk} textMuted={textMuted} /> : null}
          {draft.description ? <Row label="Description" value={draft.description} textInk={textInk} textMuted={textMuted} /> : null}
        </View>

        {/* Schedule */}
        <View className={`rounded-[20px] p-4 mb-3 flex-row items-center ${softBg}`} style={{ gap: 12 }}>
          <Ionicons name="time-outline" size={18} color={c.muted} />
          <View className="flex-1">
            <Text className={`text-[14px] font-semibold ${textInk}`}>Schedule for later</Text>
            <Text className={`text-[11px] mt-0.5 ${textMuted}`}>Toggle to send at a future time</Text>
          </View>
          <Switch
            value={scheduled}
            onValueChange={setScheduled}
            trackColor={{ false: c.bgInput, true: c.cyan }}
            thumbColor={c.ink}
          />
        </View>

        {scheduled && (
          <>
            <Label cls={textMuted}>Schedule time (yyyy-MM-dd HH:mm:ss)</Label>
            <View className={`rounded-[18px] px-4 ${softBg}`}>
              <TextInput
                value={schedTime}
                onChangeText={setSchedTime}
                placeholder="2026-05-01 10:00:00"
                placeholderTextColor={c.muted}
                className={`py-3 text-sm font-mono ${textInk}`}
                style={Platform.select({ web: { outlineStyle: 'none' } })}
              />
            </View>
          </>
        )}

        {/* Voice-specific */}
        {draft.channel === 'voice' && (
          <>
            <Label cls={textMuted}>Caller ID</Label>
            <View className={`rounded-[18px] px-4 ${softBg}`}>
              <TextInput
                value={callerId}
                onChangeText={setCallerId}
                placeholder="Your verified caller ID"
                placeholderTextColor={c.muted}
                className={`py-3 text-sm ${textInk}`}
                style={Platform.select({ web: { outlineStyle: 'none' } })}
              />
            </View>
            <Label cls={textMuted}>Media file ID (optional)</Label>
            <View className={`rounded-[18px] px-4 ${softBg}`}>
              <TextInput
                value={mediaFileId}
                onChangeText={setMediaFileId}
                placeholder="Uploaded .wav ID (Media Library)"
                placeholderTextColor={c.muted}
                keyboardType="numeric"
                className={`py-3 text-sm font-mono ${textInk}`}
                style={Platform.select({ web: { outlineStyle: 'none' } })}
              />
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('MediaLibrary')} className="mt-2 self-start flex-row items-center" style={{ gap: 6 }}>
              <Ionicons name="folder-open-outline" size={14} color={c.cyan} />
              <Text className="text-xs font-semibold" style={{ color: c.cyan }}>Browse Media Library</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Launch */}
        <TouchableOpacity onPress={launch} activeOpacity={0.88} disabled={launching} className="mt-6 rounded-[28px] overflow-hidden">
          <LinearGradient
            colors={[c.gradA, c.gradB, c.gradC]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 }}
          >
            {launching ? (
              <ActivityIndicator color={c.ink} />
            ) : (
              <>
                <Ionicons name={scheduled ? 'time-outline' : 'rocket'} size={16} color={c.ink} />
                <Text className="text-[15px] font-bold" style={{ color: c.ink }}>
                  {scheduled ? 'Schedule campaign' : 'Launch now'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text className={`text-[11px] text-center mt-3.5 ${textDim}`}>
          Launching will dispatch via {String(draft.channel || '').toUpperCase()} to {numbers.length} recipient{numbers.length === 1 ? '' : 's'}.
        </Text>
      </ScrollView>
    </View>
  );
}

const Row = ({ label, value, textInk, textMuted }) => (
  <View className="flex-row py-2 border-b border-transparent" style={{ borderBottomColor: 'rgba(255,255,255,0.04)' }}>
    <Text className={`text-[11px] font-semibold uppercase tracking-widest flex-1 ${textMuted}`}>{label}</Text>
    <Text className={`text-sm font-medium ${textInk}`} style={{ flex: 2, textAlign: 'right' }} numberOfLines={2}>{value || '—'}</Text>
  </View>
);

const Label = ({ cls, children }) => (
  <Text className={`text-[11px] font-semibold tracking-widest uppercase mb-2 mt-3 ${cls}`}>{children}</Text>
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
