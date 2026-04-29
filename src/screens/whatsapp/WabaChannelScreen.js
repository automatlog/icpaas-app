// src/screens/WabaChannelScreen.js — WhatsApp Business channels (NativeWind)
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Platform, RefreshControl, Alert, useColorScheme,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { WhatsAppAPI } from '../../services/api';

const C = {
  dark:  { bg: '#0A0A0D', bgSoft: '#141418', bgInput: '#1C1C22', ink: '#FFFFFF', muted: '#9A9AA2', dim: '#5C5C63', pink: '#FF4D7E', cyan: '#5CD4E0' },
  light: { bg: '#FAFAFB', bgSoft: '#F2F2F5', bgInput: '#ECECEF', ink: '#0A0A0D', muted: '#5C5C63', dim: '#9A9AA2', pink: '#E6428A', cyan: '#2FB8C4' },
};

const TINTS = ['#8FCFBD', '#D4B3E8', '#E8D080', '#E8B799', '#F2A8B3', '#9CB89A'];

export default function WabaChannelScreen({ navigation }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;

  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await WhatsAppAPI.getChannels();
      setChannels(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setChannels([]);
      setErr(e?.message || 'Failed to load channels');
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
            <Text className={`text-[11px] font-semibold tracking-widest uppercase ${textMuted}`}>WhatsApp</Text>
            <Text className={`text-[24px] font-bold tracking-tight ${textInk}`}>Business channels</Text>
          </View>
          <TouchableOpacity className={`w-[42px] h-[42px] rounded-full items-center justify-center ${softBg}`} onPress={load} activeOpacity={0.7}>
            <Ionicons name="refresh" size={18} color={c.ink} />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View className={`flex-row rounded-[18px] p-4 mb-3 ${softBg}`} style={{ gap: 12 }}>
          <View className="flex-1">
            <Text className={`text-[11px] font-semibold tracking-wider uppercase ${textMuted}`}>Channels</Text>
            <Text className={`text-[22px] font-bold mt-0.5 ${textInk}`}>{channels.length}</Text>
          </View>
          <View className="flex-1">
            <Text className={`text-[11px] font-semibold tracking-wider uppercase ${textMuted}`}>Source</Text>
            <Text className={`text-[11px] font-mono mt-1.5 ${textInk}`}>gsauth.com/v23.0</Text>
          </View>
        </View>

        {loading ? (
          <View className="py-16 items-center" style={{ gap: 10 }}>
            <ActivityIndicator color={c.pink} />
            <Text className={`text-xs tracking-widest uppercase ${textMuted}`}>loading channels</Text>
          </View>
        ) : err ? (
          <View className={`rounded-[16px] p-4 border-l-[3px] ${softBg}`} style={{ borderLeftColor: c.pink }}>
            <Text className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: c.pink }}>Fetch error</Text>
            <Text className={`text-[13px] ${textInk}`}>{err}</Text>
          </View>
        ) : channels.length === 0 ? (
          <View className="py-16 items-center" style={{ gap: 8 }}>
            <Ionicons name="logo-whatsapp" size={44} color={c.dim} />
            <Text className={`text-[15px] font-semibold ${textInk}`}>No WhatsApp channels</Text>
            <Text className={`text-xs ${textDim}`}>Save a gsauth token in Config.</Text>
          </View>
        ) : (
          channels.map((ch, i) => {
            const tint = TINTS[i % TINTS.length];
            return (
              <View key={ch.phoneNumberId || i} className={`rounded-[20px] p-4 mb-3 ${softBg}`} style={{ borderWidth: 1, borderColor: c.bgInput }}>
                <View className="flex-row items-center mb-3" style={{ gap: 12 }}>
                  <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: tint }}>
                    <Ionicons name="logo-whatsapp" size={22} color="#0A0A0D" />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-[15px] font-semibold ${textInk}`} numberOfLines={1}>
                      {ch.label || ch.wabaNumber || ch.phoneNumberId || 'Channel'}
                    </Text>
                    <Text className={`text-[11px] mt-0.5 ${textMuted}`}>
                      {ch.wabaNumber ? `+${ch.wabaNumber}` : 'WhatsApp Business'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Templates')}
                    activeOpacity={0.85}
                    className="rounded-[14px] px-3 py-2 flex-row items-center"
                    style={{ backgroundColor: c.ink, gap: 6 }}
                  >
                    <Ionicons name="document-text-outline" size={12} color={c.bg} />
                    <Text className="text-[11px] font-semibold" style={{ color: c.bg }}>Templates</Text>
                  </TouchableOpacity>
                </View>

                <InfoRow
                  label="Phone Number ID" value={ch.phoneNumberId}
                  onCopy={() => copy(ch.phoneNumberId, 'Phone Number ID')}
                  inputBg={inputBg} textInk={textInk} textMuted={textMuted} muted={c.muted}
                />
                <InfoRow
                  label="WABA Business ID" value={ch.wabaBusinessId}
                  onCopy={() => copy(ch.wabaBusinessId, 'WABA Business ID')}
                  inputBg={inputBg} textInk={textInk} textMuted={textMuted} muted={c.muted}
                />
                {ch.wabaNumber ? (
                  <InfoRow
                    label="WABA Number" value={ch.wabaNumber}
                    onCopy={() => copy(ch.wabaNumber, 'WABA Number')}
                    inputBg={inputBg} textInk={textInk} textMuted={textMuted} muted={c.muted}
                  />
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const InfoRow = ({ label, value, onCopy, inputBg, textInk, textMuted, muted }) => (
  <View className="mb-2">
    <Text className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${textMuted}`}>{label}</Text>
    <View className={`flex-row items-center rounded-[14px] px-3 py-2.5 ${inputBg}`} style={{ gap: 8 }}>
      <Text className={`flex-1 text-[12px] font-mono ${textInk}`} numberOfLines={1}>{value || '—'}</Text>
      {value ? (
        <TouchableOpacity onPress={onCopy} activeOpacity={0.7}>
          <Ionicons name="copy-outline" size={14} color={muted} />
        </TouchableOpacity>
      ) : null}
    </View>
  </View>
);
