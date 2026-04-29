// src/screens/voice/CallerIdScreen.js — Voice caller IDs (manual config)
// Voice MakeCall expects a CallerId field. This screen lists the caller IDs
// configured for the account. Add / edit happens via Config until the gsauth
// caller-ID endpoint is wired up.
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Platform, useColorScheme, Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import InfoRow from '../../components/InfoRow';

const C = {
  dark:  { bg: '#0A0A0D', bgSoft: '#141418', bgInput: '#1C1C22', ink: '#FFFFFF', muted: '#9A9AA2', dim: '#5C5C63', pink: '#FF4D7E', cyan: '#5CD4E0' },
  light: { bg: '#FAFAFB', bgSoft: '#F2F2F5', bgInput: '#ECECEF', ink: '#0A0A0D', muted: '#5C5C63', dim: '#9A9AA2', pink: '#E6428A', cyan: '#2FB8C4' },
};

const TINTS = ['#E8D080', '#8FCFBD', '#D4B3E8', '#F2A8B3', '#E8B799', '#9CB89A'];

const PLACEHOLDER_CALLER_IDS = [
  { id: '011-49000000', label: 'Primary OBD',     subtitle: 'Outbound dialer · Delhi' },
  { id: '022-71778899', label: 'Mumbai support',  subtitle: 'Inbound IVR · Mumbai' },
];

export default function CallerIdScreen({ navigation }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;

  const [callers] = useState(PLACEHOLDER_CALLER_IDS);
  const [loading] = useState(false);

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
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center mb-5" style={{ gap: 10 }}>
          <TouchableOpacity className={`w-[42px] h-[42px] rounded-full items-center justify-center ${softBg}`} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={c.ink} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className={`text-[11px] font-semibold tracking-widest uppercase ${textMuted}`}>Voice</Text>
            <Text className={`text-[24px] font-bold tracking-tight ${textInk}`}>Caller IDs</Text>
          </View>
        </View>

        <View className={`flex-row rounded-[18px] p-4 mb-3 ${softBg}`} style={{ gap: 12 }}>
          <View className="flex-1">
            <Text className={`text-[11px] font-semibold tracking-wider uppercase ${textMuted}`}>Numbers</Text>
            <Text className={`text-[22px] font-bold mt-0.5 ${textInk}`}>{callers.length}</Text>
          </View>
          <View className="flex-1">
            <Text className={`text-[11px] font-semibold tracking-wider uppercase ${textMuted}`}>Source</Text>
            <Text className={`text-[11px] font-mono mt-1.5 ${textInk}`}>icpaas.in/Voice</Text>
          </View>
        </View>

        {loading ? (
          <View className="py-16 items-center" style={{ gap: 10 }}>
            <ActivityIndicator color={c.pink} />
            <Text className={`text-xs tracking-widest uppercase ${textMuted}`}>loading caller ids</Text>
          </View>
        ) : (
          callers.map((cid, i) => {
            const tint = TINTS[i % TINTS.length];
            return (
              <View key={cid.id} className={`rounded-[20px] p-4 mb-3 ${softBg}`} style={{ borderWidth: 1, borderColor: c.bgInput }}>
                <View className="flex-row items-center mb-3" style={{ gap: 12 }}>
                  <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: tint }}>
                    <Ionicons name="call" size={22} color="#0A0A0D" />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-[15px] font-semibold ${textInk}`} numberOfLines={1}>{cid.label}</Text>
                    <Text className={`text-[11px] mt-0.5 ${textMuted}`}>{cid.subtitle}</Text>
                  </View>
                </View>

                <InfoRow c={c} label="Caller ID" value={cid.id} onCopy={() => copy(cid.id, 'Caller ID')} />
              </View>
            );
          })
        )}

        <Text className={`text-[11px] mt-2 ${textDim}`}>
          Static placeholder. Wire to gsauth.com caller-ID endpoint when available.
        </Text>
      </ScrollView>
    </View>
  );
}
