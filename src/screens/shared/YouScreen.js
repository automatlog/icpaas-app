// src/screens/YouScreen.js — Profile / personal info (matches reference screenshot)
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Image,
  Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useDispatch, useSelector } from 'react-redux';
import { useBrand } from '../../theme';
import { AuthAPI } from '../../services/api';
import { logout as logoutAction } from '../../store/slices/authSlice';
import { BottomTabBar } from './DashboardScreen';
import toast from '../../services/toast';

const TABS = [
  { id: 'info',     label: 'Personal Info',     icon: 'person-circle-outline' },
  { id: 'security', label: 'Security & Settings', icon: 'shield-checkmark-outline' },
];

export default function YouScreen({ navigation }) {
  const c = useBrand();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user) || {};

  const [tab, setTab] = useState('info');
  const [username, setUsername]   = useState(user.username || 'omniuser');
  const [mobile, setMobile]       = useState(user.mobile || '');
  const [email, setEmail]         = useState(user.email || '');
  const [address, setAddress]     = useState(user.address || '');
  const [city, setCity]           = useState(user.city || '');
  const [state, setState]         = useState(user.state || '');
  const [pin, setPin]             = useState(user.pin || '');
  const [apiKey, setApiKey]       = useState('');

  useEffect(() => {
    AuthAPI.getToken().then((t) => setApiKey(t || ''));
  }, []);

  const copyKey = async () => {
    if (!apiKey) { toast.warning('No API key', 'Save one in Config first.'); return; }
    await Clipboard.setStringAsync(apiKey);
    toast.success('Copied', 'Public API key copied to clipboard.');
  };

  const save = () => {
    // Demo persistence — toast for now (could dispatch a profile update reducer)
    toast.success('Profile saved', 'Personal info updated.');
  };

  const logout = () =>
    Alert.alert('Sign out?', 'You will be returned to the sign-in screen.', [
      { text: 'Cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => dispatch(logoutAction()) },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="flex-row items-center px-4 mb-3" style={{ gap: 10 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} className="w-9 h-9 items-center justify-center">
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
          <Text className="flex-1 text-[18px] font-bold text-center" style={{ color: c.text }}>Profile</Text>
          <TouchableOpacity onPress={save} activeOpacity={0.85} className="w-9 h-9 items-center justify-center rounded-full" style={{ backgroundColor: c.primary }}>
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Avatar + name card */}
        <View
          className="items-center mx-4 rounded-[20px] py-5 px-4 mb-4"
          style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}
        >
          <View className="relative mb-3">
            <View
              className="w-24 h-24 rounded-full items-center justify-center"
              style={{ backgroundColor: c.primarySoft, borderWidth: 3, borderColor: c.primary }}
            >
              <Ionicons name="person" size={48} color={c.primary} />
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full items-center justify-center"
              style={{ backgroundColor: c.info, borderWidth: 2, borderColor: c.bgCard }}
            >
              <Ionicons name="camera" size={13} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text className="text-[20px] font-extrabold" style={{ color: c.text }}>
            {user.name || username || 'Wunder'}
          </Text>
          <Text className="text-[12px] mt-0.5" style={{ color: c.textMuted }}>{email || 'wundercurrentev@gmail.com'}</Text>
          <View className="rounded-full px-3 py-1 mt-2 flex-row items-center" style={{ backgroundColor: c.primarySoft, gap: 5 }}>
            <Ionicons name="checkmark-circle" size={11} color={c.primaryDeep} />
            <Text className="text-[11px] font-bold" style={{ color: c.primaryDeep }}>Active Member</Text>
          </View>
        </View>

        {/* Tab pills */}
        <View
          className="flex-row mx-4 rounded-[14px] p-1 mb-4"
          style={{ backgroundColor: c.bgInput, gap: 4 }}
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setTab(t.id)}
                activeOpacity={0.85}
                className="flex-1 flex-row items-center justify-center py-2.5 rounded-[10px]"
                style={{ backgroundColor: active ? c.primary : 'transparent', gap: 6 }}
              >
                <Ionicons name={t.icon} size={13} color={active ? '#FFFFFF' : c.textMuted} />
                <Text className="text-[12px]" style={{ color: active ? '#FFFFFF' : c.textMuted, fontWeight: active ? '700' : '500' }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === 'info' ? (
          <>
            {/* Personal Information card */}
            <View
              className="mx-4 rounded-[20px] p-4 mb-4"
              style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}
            >
              <View className="flex-row items-center pb-3 mb-3" style={{ gap: 10, borderBottomWidth: 1, borderBottomColor: c.rule }}>
                <View className="w-10 h-10 rounded-[10px] items-center justify-center" style={{ backgroundColor: c.primarySoft }}>
                  <Ionicons name="card-outline" size={18} color={c.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-bold" style={{ color: c.text }}>Personal Information</Text>
                  <Text className="text-[11px] mt-0.5" style={{ color: c.textMuted }}>Keep your account details up to date.</Text>
                </View>
              </View>

              <Field c={c} label="Username" icon="person-outline">
                <TextInput value={username} onChangeText={setUsername} style={inputStyle(c)} placeholderTextColor={c.textMuted} placeholder="Wunder" autoCapitalize="none" />
              </Field>

              <Field c={c} label="Mobile Number" icon="call-outline">
                <TextInput value={mobile} onChangeText={setMobile} style={inputStyle(c)} placeholderTextColor={c.textMuted} placeholder="919313197730" keyboardType="phone-pad" />
              </Field>

              <Field c={c} label="Email Address" icon="mail-outline">
                <TextInput value={email} onChangeText={setEmail} style={inputStyle(c)} placeholderTextColor={c.textMuted} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />
              </Field>

              <Field c={c} label="Permanent Address">
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  multiline
                  style={[
                    inputStyle(c),
                    { minHeight: 90, textAlignVertical: 'top' },
                  ]}
                  placeholderTextColor={c.textMuted}
                  placeholder="Street, area, landmark"
                />
              </Field>

              <View className="flex-row" style={{ gap: 8 }}>
                <Field c={c} label="City" flex>
                  <TextInput value={city} onChangeText={setCity} style={inputStyle(c)} placeholderTextColor={c.textMuted} placeholder="—" />
                </Field>
                <Field c={c} label="State" flex>
                  <TextInput value={state} onChangeText={setState} style={inputStyle(c)} placeholderTextColor={c.textMuted} placeholder="—" />
                </Field>
                <Field c={c} label="Pin Code" flex>
                  <TextInput value={pin} onChangeText={setPin} style={inputStyle(c)} placeholderTextColor={c.textMuted} placeholder="—" keyboardType="number-pad" />
                </Field>
              </View>

              <Field c={c} label="Public API Key">
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <View
                    className="flex-1 rounded-[10px] px-3 py-3"
                    style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.bgInput }}
                  >
                    <Text className="text-[12px] font-mono" style={{ color: c.text }} numberOfLines={1}>
                      {apiKey || '—'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={copyKey}
                    activeOpacity={0.85}
                    className="w-11 h-11 rounded-[10px] items-center justify-center"
                    style={{ backgroundColor: c.primary }}
                  >
                    <Ionicons name="copy" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </Field>
            </View>

            {/* Quick Summary */}
            <View
              className="mx-4 rounded-[20px] p-4 mb-4"
              style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}
            >
              <View className="flex-row items-center mb-3" style={{ gap: 8 }}>
                <Ionicons name="information-circle" size={16} color={c.info} />
                <Text className="text-[15px] font-bold" style={{ color: c.text }}>Quick Summary</Text>
              </View>
              <Row c={c} label="Member Since" value="Apr 07, 2026" />
              <Row c={c} label="Valid Until"  value="Dec 31, 2040" valueColor={c.danger} last />
            </View>

            {/* Sign out */}
            <View className="mx-4 mb-4">
              <TouchableOpacity
                onPress={logout}
                activeOpacity={0.85}
                className="flex-row items-center justify-center rounded-[14px] py-3.5"
                style={{ borderWidth: 1, borderColor: c.danger, gap: 8 }}
              >
                <Ionicons name="log-out-outline" size={16} color={c.danger} />
                <Text className="text-[14px] font-bold" style={{ color: c.danger }}>Sign out</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View className="mx-4">
            <View
              className="rounded-[20px] p-4 mb-4"
              style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}
            >
              <SecurityRow c={c} icon="key-outline"        title="API key & wallet"     subtitle="Manage gsauth bearer + balance" onPress={() => navigation.navigate('Config')} />
              <SecurityRow c={c} icon="logo-whatsapp"      title="WABA channels"        subtitle="WhatsApp Business numbers"      onPress={() => navigation.navigate('WabaChannels')} />
              <SecurityRow c={c} icon="musical-notes-outline" title="Voice media library" subtitle="Uploaded .wav files"           onPress={() => navigation.navigate('MediaLibrary')} />
              <SecurityRow c={c} icon="lock-closed-outline" title="Change passphrase"   subtitle="Update demo credentials"        onPress={() => toast.info('Coming soon', 'Passphrase change is not wired yet.')} last />
            </View>

            <TouchableOpacity
              onPress={logout}
              activeOpacity={0.85}
              className="flex-row items-center justify-center rounded-[14px] py-3.5"
              style={{ borderWidth: 1, borderColor: c.danger, gap: 8 }}
            >
              <Ionicons name="log-out-outline" size={16} color={c.danger} />
              <Text className="text-[14px] font-bold" style={{ color: c.danger }}>Sign out</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <BottomTabBar c={c} navigation={navigation} active="you" />
    </View>
  );
}

const inputStyle = (c) => ({
  borderWidth: 1,
  borderColor: c.border,
  backgroundColor: c.bg,
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  fontSize: 13,
  color: c.text,
  ...Platform.select({ web: { outlineStyle: 'none' } }),
});

function Field({ c, label, icon, children, flex }) {
  return (
    <View className="mb-3" style={flex ? { flex: 1 } : {}}>
      <View className="flex-row items-center mb-1.5" style={{ gap: 6 }}>
        {icon ? <Ionicons name={icon} size={11} color={c.textMuted} /> : null}
        <Text className="text-[10px] font-bold uppercase tracking-widest" style={{ color: c.textMuted }}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

function Row({ c, label, value, valueColor, last }) {
  return (
    <View
      className="flex-row items-center py-2.5"
      style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: c.rule }}
    >
      <Text className="flex-1 text-[12px]" style={{ color: c.textMuted }}>{label}</Text>
      <Text className="text-[13px] font-bold" style={{ color: valueColor || c.text }}>{value}</Text>
    </View>
  );
}

function SecurityRow({ c, icon, title, subtitle, onPress, last }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="flex-row items-center py-3"
      style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: c.rule, gap: 12 }}
    >
      <View className="w-10 h-10 rounded-[10px] items-center justify-center" style={{ backgroundColor: c.primarySoft }}>
        <Ionicons name={icon} size={16} color={c.primary} />
      </View>
      <View className="flex-1">
        <Text className="text-[13px] font-bold" style={{ color: c.text }}>{title}</Text>
        <Text className="text-[11px] mt-0.5" style={{ color: c.textMuted }}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
    </TouchableOpacity>
  );
}
