// src/screens/sms/SenderIdScreen.js — SMS Sender IDs (gsauth.com /api/v1/sms/senderId)
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Platform, RefreshControl,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { SMSAPI } from '../../services/api';
import { useBrand } from '../../theme';
import dialog from '../../services/dialog';
import InfoRow from '../../components/InfoRow';
import ScreenHeader from '../../components/ScreenHeader';
import { SkeletonCard } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';

const TINTS = ['#F2A8B3', '#8FCFBD', '#D4B3E8', '#E8D080', '#E8B799', '#9CB89A'];

export default function SenderIdScreen({ navigation }) {
  const c = useBrand();
  const dark = c.scheme === 'dark';

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
    dialog.success({ title: 'Copied', message: `${label}: ${value}` });
  };

  const rootBg = dark ? 'bg-[#0A0A0D]' : 'bg-white';
  const softBg = dark ? 'bg-[#141418]' : 'bg-[#F2F2F5]';
  const inputBg = dark ? 'bg-[#1C1C22]' : 'bg-[#ECECEF]';
  const textInk = dark ? 'text-white' : 'text-[#0A0A0D]';
  const textMuted = dark ? 'text-[#9A9AA2]' : 'text-[#5C5C63]';
  const textDim = dark ? 'text-[#5C5C63]' : 'text-[#9A9AA2]';

  return (
    <View className={`flex-1 ${rootBg}`}>
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        icon="chatbubble-outline"
        title="Sender IDs"
        badge="SMS"
        right={(
          <TouchableOpacity
            onPress={load}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Reload sender IDs"
            style={{
              width: 36, height: 36, borderRadius: 18,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: c.bgInput,
            }}
          >
            <Ionicons name="refresh" size={16} color={c.text} />
          </TouchableOpacity>
        )}
      />
      <ScrollView
        contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 22, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.danger} />}
        showsVerticalScrollIndicator={false}
      >
        <View className={`rounded-[18px] p-4 mb-3 ${softBg}`}>
          <Text className={`text-[11px] font-semibold tracking-wider uppercase ${textMuted}`}>Senders</Text>
          <Text className={`text-[22px] font-bold mt-0.5 ${textInk}`}>{senders.length}</Text>
        </View>

        {loading ? (
          <View>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} c={c} />
            ))}
          </View>
        ) : err ? (
          <View className={`rounded-[16px] p-4 border-l-[3px] ${softBg}`} style={{ borderLeftColor: c.danger }}>
            <Text className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: c.danger }}>Fetch error</Text>
            <Text className={`text-[13px] ${textInk}`}>{err}</Text>
          </View>
        ) : senders.length === 0 ? (
          <EmptyState
            c={c}
            icon="chatbubble-outline"
            accentIcons={['checkmark-circle', 'shield-checkmark']}
            title="No SMS senders"
            subtitle="DLT-registered sender IDs from gsauth.com show up here once approved by the regulator."
            ctaLabel="Open Config"
            onCtaPress={() => navigation.navigate('Config')}
          />
        ) : (
          senders.map((s, i) => {
            const tint = TINTS[i % TINTS.length];
            return (
              <View key={`${s.senderId || 'sender'}_${i}`} className={`rounded-[20px] p-4 mb-3 ${softBg}`} style={{ borderWidth: 1, borderColor: c.bgInput }}>
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
                    style={{ backgroundColor: c.text, gap: 6 }}
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

