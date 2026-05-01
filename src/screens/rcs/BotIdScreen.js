// src/screens/rcs/BotIdScreen.js — RCS Bot IDs (gsauth.com /api/v1/rcs/getBotIds)
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Platform, RefreshControl,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { RCSAPI } from '../../services/api';
import { useBrand } from '../../theme';
import dialog from '../../services/dialog';
import InfoRow from '../../components/InfoRow';
import ScreenHeader from '../../components/ScreenHeader';
import { SkeletonCard } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';

const TINTS = ['#D4B3E8', '#8FCFBD', '#E8D080', '#E8B799', '#F2A8B3', '#9CB89A'];

export default function BotIdScreen({ navigation }) {
  const c = useBrand();
  const dark = c.scheme === 'dark';

  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await RCSAPI.getBotIds();
      const list = res?.bots || res?.data?.bots || res?.data || [];
      setBots(Array.isArray(list) ? list : []);
    } catch (e) {
      setBots([]);
      setErr(e?.message || 'Failed to load bot IDs');
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
        icon="card-outline"
        title="Bot IDs"
        badge="RCS"
        right={(
          <TouchableOpacity
            onPress={load}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Reload bot IDs"
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
        <View className={`flex-row rounded-[18px] p-4 mb-3 ${softBg}`} style={{ gap: 12 }}>
          <View className="flex-1">
            <Text className={`text-[11px] font-semibold tracking-wider uppercase ${textMuted}`}>Bots</Text>
            <Text className={`text-[22px] font-bold mt-0.5 ${textInk}`}>{bots.length}</Text>
          </View>
          <View className="flex-1">
            <Text className={`text-[11px] font-semibold tracking-wider uppercase ${textMuted}`}>Source</Text>
            <Text className={`text-[11px] font-mono mt-1.5 ${textInk}`}>gsauth.com/v1/rcs</Text>
          </View>
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
        ) : bots.length === 0 ? (
          <EmptyState
            c={c}
            icon="card-outline"
            accentIcons={['logo-google', 'shield-checkmark']}
            title="No RCS bots"
            subtitle="Once your gsauth.com RCS bot is approved, it'll appear here ready to send rich card messages."
            ctaLabel="Open Config"
            onCtaPress={() => navigation.navigate('Config')}
          />
        ) : (
          bots.map((bot, i) => {
            const tint = TINTS[i % TINTS.length];
            return (
              <View key={bot.botId || i} className={`rounded-[20px] p-4 mb-3 ${softBg}`} style={{ borderWidth: 1, borderColor: c.bgInput }}>
                <View className="flex-row items-center mb-3" style={{ gap: 12 }}>
                  <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: tint }}>
                    <Ionicons name="card" size={22} color="#0A0A0D" />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-[15px] font-semibold ${textInk}`} numberOfLines={1}>
                      {bot.agentName || bot.botId || 'Bot'}
                    </Text>
                    <Text className={`text-[11px] mt-0.5 ${textMuted}`}>RCS Business Messaging</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('RcsTemplates', { botId: bot.botId })}
                    activeOpacity={0.85}
                    className="rounded-[14px] px-3 py-2 flex-row items-center"
                    style={{ backgroundColor: c.text, gap: 6 }}
                  >
                    <Ionicons name="document-text-outline" size={12} color={c.bg} />
                    <Text className="text-[11px] font-semibold" style={{ color: c.bg }}>Templates</Text>
                  </TouchableOpacity>
                </View>

                <InfoRow c={c} label="Bot ID"     value={bot.botId}     onCopy={() => copy(bot.botId, 'Bot ID')} />
                <InfoRow c={c} label="Agent Name" value={bot.agentName} onCopy={() => copy(bot.agentName, 'Agent Name')} />
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

