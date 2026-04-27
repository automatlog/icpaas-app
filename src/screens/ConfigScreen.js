// src/screens/ConfigScreen.js — API key + live wallet (NativeWind)
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Platform, RefreshControl, Alert, useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthAPI, BalanceAPI } from '../services/api';

const DEMO_HINT = 'b6f3b11e-…';

const C = {
  dark:  { bg: '#0A0A0D', bgSoft: '#141418', bgInput: '#1C1C22', ink: '#FFFFFF', muted: '#9A9AA2', dim: '#5C5C63', pink: '#FF4D7E', cyan: '#5CD4E0' },
  light: { bg: '#FAFAFB', bgSoft: '#F2F2F5', bgInput: '#ECECEF', ink: '#0A0A0D', muted: '#5C5C63', dim: '#9A9AA2', pink: '#E6428A', cyan: '#2FB8C4' },
};

const mask = (t) => {
  if (!t) return '—';
  const s = String(t);
  return s.length <= 12 ? s : `${s.slice(0, 6)}…${s.slice(-4)}`;
};
const fmtMoney = (n) => n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 4 })}`;

export default function ConfigScreen({ navigation }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;

  const [storedToken, setStoredToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState(null);
  const [balanceErr, setBalanceErr] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadToken = useCallback(async () => {
    const t = await AuthAPI.getToken();
    setStoredToken(t || '');
    return t;
  }, []);

  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true);
    setBalanceErr(null);
    try {
      const res = await BalanceAPI.getBalance();
      setBalance(res?.walletBalance ?? res?.balance ?? null);
    } catch (e) {
      setBalance(null);
      setBalanceErr(e?.message || 'Unable to fetch balance');
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  useEffect(() => { loadToken().then(fetchBalance); }, [loadToken, fetchBalance]);

  const saveToken = async () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) { Alert.alert('Required', 'Paste a bearer API key first.'); return; }
    setSaving(true);
    try {
      const result = await AuthAPI.saveAndTestIcpaas(trimmed);
      setStoredToken(trimmed);
      setTokenInput('');
      if (result.ok) {
        setBalance(result.walletBalance);
        setBalanceErr(null);
        Alert.alert('Saved', `Key verified. Wallet: ${fmtMoney(result.walletBalance)}`);
      } else {
        setBalance(null);
        setBalanceErr(result.error);
        Alert.alert('Saved with warning', `Key stored but balance check failed:\n${result.error}`);
      }
    } catch (e) {
      Alert.alert('Save failed', e?.message || 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const clearToken = async () => {
    await AuthAPI.clearCredentials();
    setStoredToken('');
    setBalance(null);
    setBalanceErr(null);
  };

  const rootBg = dark ? 'bg-bg' : 'bg-white';
  const softBg = dark ? 'bg-bgSoft' : 'bg-[#F2F2F5]';
  const inputBg = dark ? 'bg-bgInput' : 'bg-[#ECECEF]';
  const textInk = dark ? 'text-ink' : 'text-[#0A0A0D]';
  const textMuted = dark ? 'text-textMuted' : 'text-[#5C5C63]';
  const textDim = dark ? 'text-textDim' : 'text-[#9A9AA2]';

  return (
    <View className={`flex-1 ${rootBg}`}>
      <ScrollView
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 22, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); Promise.all([loadToken(), fetchBalance()]).finally(() => setRefreshing(false)); }} tintColor={c.pink} />}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center mb-5" style={{ gap: 10 }}>
          <TouchableOpacity className={`w-[42px] h-[42px] rounded-full items-center justify-center ${softBg}`} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={c.ink} />
          </TouchableOpacity>
          <Text className={`text-[28px] font-bold tracking-tight flex-1 ${textInk}`}>Config</Text>
          <TouchableOpacity className={`w-[42px] h-[42px] rounded-full items-center justify-center ${softBg}`} onPress={fetchBalance} activeOpacity={0.7}>
            <Ionicons name="refresh" size={18} color={c.ink} />
          </TouchableOpacity>
        </View>

        {/* Wallet card */}
        <Label cls={textMuted}>Wallet (icpaas.in)</Label>
        <View className="rounded-[22px] p-5 mb-3" style={{ backgroundColor: '#E8B799' }}>
          <Text className="text-[11px] font-bold tracking-wider uppercase" style={{ color: 'rgba(0,0,0,0.55)' }}>№ 01 · Live balance</Text>
          <Text className="text-[36px] font-bold tracking-tight mt-1" style={{ color: '#0A0A0D' }}>
            {balanceLoading ? '…' : fmtMoney(balance)}
          </Text>
          <Text className="text-xs mt-1 font-medium" style={{ color: 'rgba(0,0,0,0.55)' }}>
            {balanceErr ? `⚠ ${balanceErr}` : storedToken ? 'Fetched from /api/v1/user/balance · live' : 'Save an API key below to enable'}
          </Text>
        </View>

        {/* API key card */}
        <Label cls={textMuted}>API key</Label>
        <View className={`rounded-[18px] p-3.5 ${softBg}`} style={{ gap: 10 }}>
          <View className="flex-row items-center" style={{ gap: 10 }}>
            <Text className={`flex-1 text-[13px] font-mono ${textInk}`}>{mask(storedToken)}</Text>
            <View
              className="rounded-[12px] px-2.5 py-1"
              style={{ backgroundColor: (storedToken ? c.cyan : c.dim) + '22' }}
            >
              <Text className="text-[10px] font-bold tracking-wider uppercase" style={{ color: storedToken ? c.cyan : c.muted }}>
                {storedToken ? 'Saved' : 'Empty'}
              </Text>
            </View>
          </View>
          <View className={`flex-row items-center rounded-[18px] px-4 ${inputBg}`} style={{ gap: 10 }}>
            <Ionicons name="key-outline" size={16} color={c.muted} />
            <TextInput
              value={tokenInput}
              onChangeText={setTokenInput}
              placeholder={DEMO_HINT}
              placeholderTextColor={c.muted}
              autoCapitalize="none"
              autoCorrect={false}
              className={`flex-1 py-3 text-[13px] font-mono ${textInk}`}
              style={Platform.select({ web: { outlineStyle: 'none' } })}
            />
          </View>
          <TouchableOpacity
            onPress={saveToken}
            activeOpacity={0.85}
            disabled={saving}
            className="rounded-[16px] py-3.5 flex-row items-center justify-center"
            style={{ backgroundColor: c.ink, gap: 8 }}
          >
            {saving ? (
              <ActivityIndicator color={c.bg} />
            ) : (
              <>
                <Ionicons name="save-outline" size={16} color={c.bg} />
                <Text className="text-sm font-semibold" style={{ color: c.bg }}>Save & test balance</Text>
              </>
            )}
          </TouchableOpacity>
          {storedToken ? (
            <TouchableOpacity className="py-2 items-center" activeOpacity={0.7} onPress={clearToken}>
              <Text className="text-[13px] font-medium" style={{ color: c.pink }}>Clear saved key</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Quick links */}
        <Label cls={textMuted}>Connected services</Label>
        <QuickLink c={c} softBg={softBg} textInk={textInk} textMuted={textMuted} tint="#8FCFBD" icon="logo-whatsapp" title="WhatsApp channels" subtitle="WABAs + phone numbers" onPress={() => navigation.navigate('WabaChannels')} />
        <QuickLink c={c} softBg={softBg} textInk={textInk} textMuted={textMuted} tint="#E8D080" icon="musical-notes-outline" title="Voice media library" subtitle="Uploaded .wav files + status" onPress={() => navigation.navigate('MediaLibrary')} />
        <QuickLink c={c} softBg={softBg} textInk={textInk} textMuted={textMuted} tint="#F2A8B3" icon="chatbubble-outline" title="SMS sender IDs" subtitle="DLT templates + senders" onPress={() => navigation.navigate('Templates')} />
        <QuickLink c={c} softBg={softBg} textInk={textInk} textMuted={textMuted} tint="#D4B3E8" icon="card-outline" title="RCS bots" subtitle="Bot IDs + templates" onPress={() => navigation.navigate('Templates')} />
      </ScrollView>
    </View>
  );
}

const Label = ({ cls, children }) => (
  <Text className={`text-[11px] font-semibold tracking-widest uppercase mb-2 mt-3 ${cls}`}>{children}</Text>
);

const QuickLink = ({ c, softBg, textInk, textMuted, tint, icon, title, subtitle, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    className={`flex-row items-center rounded-[18px] p-3.5 mb-2 ${softBg}`}
    style={{ gap: 12, borderWidth: 1, borderColor: c.bgInput }}
  >
    <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: tint }}>
      <Ionicons name={icon} size={18} color="#0A0A0D" />
    </View>
    <View className="flex-1">
      <Text className={`text-[14px] font-semibold ${textInk}`}>{title}</Text>
      <Text className={`text-[11px] mt-0.5 ${textMuted}`}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color={c.muted} />
  </TouchableOpacity>
);
