// src/screens/shared/ProfileScreen.js — Profile / personal info (matches reference screenshot)
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Image,
  Alert, Platform, ActivityIndicator, Switch, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBrand } from '../../theme';
import { AuthAPI, UserAPI } from '../../services/api';
import { logoutAndCleanup, updateUser } from '../../store/slices/authSlice';
import { selectThemeMode, setThemeMode } from '../../store/slices/themeSlice';
import { BottomTabBar } from './DashboardScreen';
import toast from '../../services/toast';
import dialog from '../../services/dialog';
import FormField from '../../components/FormField';
import ScreenHeader from '../../components/ScreenHeader';
import Select from '../../components/Select';
import { COUNTRIES, getStates, getCities } from '../../constants/locations';

const TABS = [
  { id: 'info',     label: 'Personal Info',     icon: 'person-circle-outline' },
  { id: 'security', label: 'Security & Settings', icon: 'shield-checkmark-outline' },
];

export default function ProfileScreen({ navigation }) {
  const c = useBrand();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user) || {};
  const themeMode = useSelector(selectThemeMode);
  const isDark = themeMode === 'dark';

  const [tab, setTab] = useState('info');
  const [username, setUsername]   = useState(user.username || 'omniuser');
  const [mobile, setMobile]       = useState(user.mobile || '');
  const [email, setEmail]         = useState(user.email || '');
  const [address, setAddress]     = useState(user.address || '');
  const [country, setCountry]     = useState(user.country || 'IN');
  const [state, setState]         = useState(user.state || ''); // state id
  const [city, setCity]           = useState(user.city || '');  // city id
  const [pin, setPin]             = useState(user.pin || '');
  const [showCountry, setShowCountry] = useState(false);
  const [showState, setShowState]     = useState(false);
  const [showCity, setShowCity]       = useState(false);
  const [apiKey, setApiKey]           = useState('');
  const [apiKeyDirty, setApiKeyDirty] = useState(false);
  const [testingKey, setTestingKey]   = useState(false);
  const [keyScopes, setKeyScopes]     = useState(null); // { whatsapp, sms, rcs }
  const [uploading, setUploading]     = useState(false);

  useEffect(() => {
    AuthAPI.getToken().then((t) => setApiKey(t || ''));
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.error('Permission denied', 'We need access to your gallery to upload a photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const selected = result.assets[0];
      handleUpload(selected);
    }
  };

  const handleUpload = async (fileAsset) => {
    setUploading(true);
    try {
      const res = await UserAPI.uploadAvatar(fileAsset);
      if (res.ok) {
        dispatch(updateUser({ avatarUrl: res.avatarUrl }));
        toast.success('Photo updated', 'Your profile picture has been changed.');
      }
    } catch (e) {
      toast.error('Upload failed', e.message || 'Could not upload photo.');
    } finally {
      setUploading(false);
    }
  };

  const copyKey = async () => {
    if (!apiKey) { toast.warning('No API key', 'Save one in Config first.'); return; }
    await Clipboard.setStringAsync(apiKey);
    toast.success('Copied', 'Public API key copied to clipboard.');
  };

  const saveAndTestKey = async () => {
    const token = apiKey.trim();
    if (!token) { toast.warning('Required', 'Paste an API key first.'); return; }
    setTestingKey(true);
    try {
      const result = await AuthAPI.saveAndVerifyCredentials(token);
      const scopes = {
        whatsapp: result?.whatsapp?.ok || false,
        sms:      result?.sms?.ok      || false,
        rcs:      result?.rcs?.ok      || false,
      };
      setKeyScopes(scopes);
      setApiKeyDirty(false);
      const ok = Object.values(scopes).filter(Boolean).length;
      if (ok === 0) {
        toast.error('Token saved · 0 scopes', 'No channels accept this token.');
      } else {
        toast.success(
          `Token saved · ${ok}/3 scopes`,
          `Active: ${Object.entries(scopes).filter(([, v]) => v).map(([k]) => k.toUpperCase()).join(', ')}`,
        );
      }
    } catch (e) {
      toast.error('Save failed', e?.message || 'Could not verify token.');
    } finally {
      setTestingKey(false);
    }
  };

  const save = () => {
    // Demo persistence — toast for now (could dispatch a profile update reducer)
    toast.success('Profile saved', 'Personal info updated.');
  };

  const logout = async () => {
    const ok = await dialog.confirm({
      title: 'Sign out?',
      message: 'You will be returned to the sign-in screen.',
      confirmText: 'Sign out',
      cancelText: 'Cancel',
      danger: true,
    });
    if (ok) {
      await dispatch(logoutAndCleanup());
      toast.success('Signed out', 'See you again soon.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        title="Profile"
        right={
          <TouchableOpacity
            onPress={save}
            activeOpacity={0.85}
            style={{
              width: 36, height: 36, borderRadius: 18,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: c.primary,
            }}
          >
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar + name card */}
        <View
          className="items-center mx-4 rounded-[20px] py-5 px-4 mb-4"
          style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}
        >
          <View className="relative mb-3">
            <View
              className="w-24 h-24 rounded-full items-center justify-center overflow-hidden"
              style={{ backgroundColor: c.primarySoft, borderWidth: 3, borderColor: c.primary }}
            >
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Ionicons name="person" size={48} color={c.primary} />
              )}
              {uploading && (
                <View className="absolute inset-0 items-center justify-center bg-black/30">
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={pickImage}
              disabled={uploading}
              activeOpacity={0.85}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full items-center justify-center shadow-sm"
              style={{ backgroundColor: c.info, borderWidth: 2, borderColor: c.bgCard }}
            >
              <Ionicons name="camera" size={14} color="#FFFFFF" />
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

              <FormField caps c={c} label="Username" icon="person-outline">
                <TextInput value={username} onChangeText={setUsername} style={inputStyle(c)} placeholderTextColor={c.textMuted} placeholder="Wunder" autoCapitalize="none" />
              </FormField>

              <FormField caps c={c} label="Mobile Number" icon="call-outline">
                <TextInput value={mobile} onChangeText={setMobile} style={inputStyle(c)} placeholderTextColor={c.textMuted} placeholder="919313197730" keyboardType="phone-pad" />
              </FormField>

              <FormField caps c={c} label="Email Address" icon="mail-outline">
                <TextInput value={email} onChangeText={setEmail} style={inputStyle(c)} placeholderTextColor={c.textMuted} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />
              </FormField>

              <FormField caps c={c} label="Permanent Address">
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
              </FormField>

              {/* Country → State → City: each dropdown filters the next */}
              <FormField caps c={c} label="Country">
                <Select
                  c={c}
                  placeholder="Select country"
                  value={COUNTRIES.find((co) => co.id === country)?.label || ''}
                  open={showCountry}
                  onToggle={() => setShowCountry((v) => !v)}
                  options={COUNTRIES}
                  selectedId={country}
                  onSelect={(opt) => {
                    setCountry(opt.id);
                    // Country changed → state + city no longer valid
                    setState('');
                    setCity('');
                    setShowCountry(false);
                  }}
                />
              </FormField>

              <View className="flex-row" style={{ gap: 8 }}>
                <FormField caps c={c} label="State" flex>
                  <Select
                    c={c}
                    placeholder={getStates(country).length ? 'Select state' : 'Pick a country first'}
                    value={getStates(country).find((s) => s.id === state)?.label || ''}
                    open={showState}
                    onToggle={() => getStates(country).length && setShowState((v) => !v)}
                    options={getStates(country)}
                    selectedId={state}
                    onSelect={(opt) => {
                      setState(opt.id);
                      // State changed → city no longer valid
                      setCity('');
                      setShowState(false);
                    }}
                  />
                </FormField>
                <FormField caps c={c} label="City" flex>
                  <Select
                    c={c}
                    placeholder={state ? 'Select city' : 'Pick a state first'}
                    value={getCities(state).find((ci) => ci.id === city)?.label || ''}
                    open={showCity}
                    onToggle={() => state && setShowCity((v) => !v)}
                    options={getCities(state)}
                    selectedId={city}
                    onSelect={(opt) => { setCity(opt.id); setShowCity(false); }}
                  />
                </FormField>
              </View>

              <FormField caps c={c} label="Pin Code">
                <TextInput value={pin} onChangeText={setPin} style={inputStyle(c)} placeholderTextColor={c.textMuted} placeholder="—" keyboardType="number-pad" />
              </FormField>

              <FormField caps c={c} label="Public API Key" hint="Used for gsauth.com (WhatsApp / SMS / RCS) + icpaas.in (Voice / wallet).">
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <TextInput
                    value={apiKey}
                    onChangeText={(t) => { setApiKey(t); setApiKeyDirty(true); setKeyScopes(null); }}
                    style={[inputStyle(c), { flex: 1, fontFamily: 'monospace', fontSize: 12 }]}
                    placeholderTextColor={c.textMuted}
                    placeholder="Paste your gsauth bearer here"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={copyKey}
                    activeOpacity={0.85}
                    className="w-11 h-11 rounded-[10px] items-center justify-center"
                    style={{ backgroundColor: c.bgInput }}
                  >
                    <Ionicons name="copy" size={16} color={c.text} />
                  </TouchableOpacity>
                </View>

                {/* Scope chips after a successful test */}
                {keyScopes ? (
                  <View className="flex-row mt-2" style={{ gap: 6 }}>
                    {['whatsapp', 'sms', 'rcs'].map((k) => {
                      const ok = keyScopes[k];
                      return (
                        <View
                          key={k}
                          style={{
                            paddingHorizontal: 8, paddingVertical: 4,
                            borderRadius: 6,
                            flexDirection: 'row', alignItems: 'center', gap: 4,
                            backgroundColor: ok ? '#D1FAE5' : '#FEE2E2',
                          }}
                        >
                          <Ionicons
                            name={ok ? 'checkmark-circle' : 'close-circle'}
                            size={11}
                            color={ok ? '#047857' : '#B91C1C'}
                          />
                          <Text style={{ color: ok ? '#047857' : '#B91C1C', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                            {k}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={saveAndTestKey}
                  disabled={testingKey || !apiKeyDirty}
                  activeOpacity={0.85}
                  className="rounded-[10px] flex-row items-center justify-center mt-2 py-2.5"
                  style={{
                    backgroundColor: apiKeyDirty ? c.primary : c.bgInput,
                    opacity: testingKey ? 0.6 : 1,
                    gap: 6,
                  }}
                >
                  {testingKey ? (
                    <ActivityIndicator size="small" color={apiKeyDirty ? '#FFFFFF' : c.textMuted} />
                  ) : (
                    <Ionicons
                      name={apiKeyDirty ? 'shield-checkmark' : 'checkmark-circle'}
                      size={14}
                      color={apiKeyDirty ? '#FFFFFF' : c.textMuted}
                    />
                  )}
                  <Text
                    style={{
                      color: apiKeyDirty ? '#FFFFFF' : c.textMuted,
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {apiKeyDirty ? 'Save & Test Token' : 'Token saved'}
                  </Text>
                </TouchableOpacity>
              </FormField>
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
            {/* Appearance */}
            <View
              className="rounded-[20px] p-4 mb-4"
              style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}
            >
              <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 }}>
                Appearance
              </Text>
              <View className="flex-row items-center py-3" style={{ gap: 12 }}>
                <View className="w-10 h-10 rounded-[10px] items-center justify-center" style={{ backgroundColor: c.primarySoft }}>
                  <Ionicons name={isDark ? 'moon' : 'sunny'} size={16} color={c.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-[14px] font-bold" style={{ color: c.text }}>Dark Mode</Text>
                  <Text className="text-[11px] mt-0.5" style={{ color: c.textMuted }}>
                    {isDark ? 'Dark theme is active.' : 'Light theme is active (default).'}
                  </Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={(v) => dispatch(setThemeMode(v ? 'dark' : 'light'))}
                  trackColor={{ false: c.bgInput, true: c.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

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
    </KeyboardAvoidingView>
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
