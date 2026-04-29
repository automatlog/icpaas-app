// src/screens/sms/SenderIdScreen.js — SMS Sender IDs (gsauth.com /api/v1/sms/senderId)
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Platform, RefreshControl, Alert, useColorScheme,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { SMSAPI } from '../../services/api';
import InfoRow from '../../components/InfoRow';

const C = {
  dark:  { bg: '#0A0A0D', bgSoft: '#141418', bgInput: '#1C1C22', ink: '#FFFFFF', muted: '#9A9AA2', dim: '#5C5C63', pink: '#FF4D7E', cyan: '#5CD4E0' },
  light: { bg: '#FAFAFB', bgSoft: '#F2F2F5', bgInput: '#ECECEF', ink: '#0A0A0D', muted: '#5C5C63', dim: '#9A9AA2', pink: '#E6428A', cyan: '#2FB8C4' },
};

const TINTS = ['#F2A8B3', '#8FCFBD', '#D4B3E8', '#E8D080', '#E8B799', '#9CB89A'];

export default function SenderIdScreen({ navigation }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;

  const [senders, setSenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await SMSAPI.getSenderIds();
      const list = res?.senderIds || res?.data?.senderIds || res?.data || [];
      setSenders(Array.isArray(list) ? list : []);
    } catch (e) {
      setSenders([]);
      setErr(e?.message || 'Failed to load sender IDs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const copy = async (value, label) => {
    await Clipboard.setStringAsync(String(value));
    Alert.alert('Copied', `${label}: ${value}`);
  };

  const rootBg = dark ? 'bg-[#0A0A0D]' : 'bg-white';
  const softBg = dark ? 'bg-[#141418]' : 'bg-[#F2F2F5]';
  const inputBg = dark ? 'bg-[#1C1C22]' : 'bg-[#ECECEF]';
  const textInk = dark ? 'text-white' : 'text-[#0A0A0D]';
  const textMuted = dark ? 'text-[#9A9AA2]' : 'text-[#5C5C63]';
  const textDim = dark ? 'text-[#5C5C63]' : 'text-[#9A9AA2]';

  return (
    <View className={`flex-1 ${rootBg}`}>
      <ScrollView
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 22, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.pink} />}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center mb-5" style={{ gap: 10 }}>
          <TouchableOpacity className={`w-[42px] h-[42px] rounded-full items-center justify-center ${softBg}`} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={c.ink} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className={`text-[11px] font-semibold tracking-widest uppercase ${textMuted}`}>SMS</Text>
            <Text className={`text-[24px] font-bold tracking-tight ${textInk}`}>Sender IDs</Text>
          </View>
          <TouchableOpacity className={`w-[42px] h-[42px] rounded-full items-center justify-center ${softBg}`} onPress={load} activeOpacity={0.7}>
            <Ionicons name="refresh" size={18} color={c.ink} />
          </TouchableOpacity>
        </View>

        <View className={`flex-row rounded-[18px] p-4 mb-3 ${softBg}`} style={{ gap: 12 }}>
          <View className="flex-1">
            <Text className={`text-[11px] font-semibold tracking-wider uppercase ${textMuted}`}>Senders</Text>
            <Text className={`text-[22px] font-bold mt-0.5 ${textInk}`}>{senders.length}</Text>
          </View>
          <View className="flex-1">
            <Text className={`text-[11px] font-semibold tracking-wider uppercase ${textMuted}`}>Source</Text>
            <Text className={`text-[11px] font-mono mt-1.5 ${textInk}`}>gsauth.com/v1/sms</Text>
          </View>
        </View>

        {loading ? (
          <View className="py-16 items-center" style={{ gap: 10 }}>
            <ActivityIndicator color={c.pink} />
            <Text className={`text-xs tracking-widest uppercase ${textMuted}`}>loading sender ids</Text>
          </View>
        ) : err ? (
          <View className={`rounded-[16px] p-4 border-l-[3px] ${softBg}`} style={{ borderLeftColor: c.pink }}>
            <Text className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: c.pink }}>Fetch error</Text>
            <Text className={`text-[13px] ${textInk}`}>{err}</Text>
          </View>
        ) : senders.length === 0 ? (
          <View className="py-16 items-center" style={{ gap: 8 }}>
            <Ionicons name="chatbubble-outline" size={44} color={c.dim} />
            <Text className={`text-[15px] font-semibold ${textInk}`}>No SMS senders</Text>
            <Text className={`text-xs ${textDim}`}>Save a gsauth token in Config.</Text>
          </View>
        ) : (
          senders.map((s, i) => {
            const tint = TINTS[i % TINTS.length];
            return (
              <View key={s.senderId || i} className={`rounded-[20px] p-4 mb-3 ${softBg}`} style={{ borderWidth: 1, borderColor: c.bgInput }}>
                <View className="flex-row items-center mb-3" style={{ gap: 12 }}>
                  <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: tint }}>
                    <Ionicons name="chatbubble" size={22} color="#0A0A0D" />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-[15px] font-semibold ${textInk}`} numberOfLines={1}>
                      {s.senderId || 'Sender'}
                    </Text>
                    <Text className={`text-[11px] mt-0.5 ${textMuted}`}>DLT-registered SMS sender</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('SmsTemplates', { senderId: s.senderId })}
                    activeOpacity={0.85}
                    className="rounded-[14px] px-3 py-2 flex-row items-center"
                    style={{ backgroundColor: c.ink, gap: 6 }}
                  >
                    <Ionicons name="document-text-outline" size={12} color={c.bg} />
                    <Text className="text-[11px] font-semibold" style={{ color: c.bg }}>Templates</Text>
                  </TouchableOpacity>
                </View>

                <InfoRow c={c} label="Sender ID"        value={s.senderId}    onCopy={() => copy(s.senderId, 'Sender ID')} />
                <InfoRow c={c} label="Entity ID (PE ID)" value={s.entityId}    onCopy={() => copy(s.entityId, 'Entity ID')} />
                <InfoRow c={c} label="Hash chain ID"     value={s.hashChainId} onCopy={() => copy(s.hashChainId, 'Hash chain')} />
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

