// src/screens/LoginScreen.js — Brand sign-in (matches Sign In.png / Sign In white.png)
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useBrand } from '../theme';
import { login as loginThunk } from '../store/slices/authSlice';

const LOGO = require('../../logo-icon.png');

export default function LoginScreen() {
  const c = useBrand();
  const dark = c.scheme === 'dark';
  const dispatch = useDispatch();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Required', 'Enter username and password.');
      return;
    }
    setLoading(true);
    const result = await dispatch(loginThunk({ username: username.trim(), password }));
    setLoading(false);
    if (!result.ok) Alert.alert('Sign-in refused', result.error);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: Platform.OS === 'ios' ? 80 : 60, paddingHorizontal: 24, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand lockup — icon + wordmark */}
        <View className="flex-row items-center justify-center mb-12" style={{ gap: 14 }}>
          <View
            className="w-[88px] h-[88px] rounded-[20px] items-center justify-center bg-white"
            style={{ borderWidth: 1.5, borderColor: c.primary }}
          >
            <Image source={LOGO} className="w-[80px] h-[80px] rounded-[18px]" resizeMode="contain" />
          </View>
          <View>
            <Text className="text-[34px] font-extrabold tracking-tight" style={{ color: c.text, fontFamily: 'System' }}>
              icpaas<Text style={{ color: c.primary }}>.ai</Text>
            </Text>
            <Text
              className="text-[12px] font-bold tracking-[3px] mt-1"
              style={{ color: dark ? '#A78BFA' : '#7C3AED', letterSpacing: 3 }}
            >
              SMART TECHNOLOGY
            </Text>
          </View>
        </View>

        {/* Sign In headline + gradient underline */}
        <View className="items-center mb-10">
          <Text className="text-[44px] font-extrabold tracking-tight" style={{ color: c.text, fontFamily: 'System' }}>
            Sign In
          </Text>
          <LinearGradient
            colors={[c.gCtaA, c.gCtaB, c.gCtaC]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: 200, height: 3, borderRadius: 2, marginTop: 6 }}
          />
        </View>

        {/* Username */}
        <Text className="text-[15px] font-semibold mb-2" style={{ color: c.text }}>Username</Text>
        <View
          className="flex-row items-center rounded-[28px] px-5 mb-5"
          style={{ backgroundColor: c.bgInput, gap: 12 }}
        >
          <Ionicons name="person-outline" size={18} color={c.textMuted} />
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="omniuser"
            placeholderTextColor={c.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-1 text-[15px]"
            style={[
              { paddingVertical: Platform.OS === 'ios' ? 18 : 14, color: c.text },
              Platform.select({ web: { outlineStyle: 'none' } }),
            ]}
          />
        </View>

        {/* Password */}
        <Text className="text-[15px] font-semibold mb-2" style={{ color: c.text }}>Password</Text>
        <View
          className="flex-row items-center rounded-[28px] px-5 mb-8"
          style={{ backgroundColor: c.bgInput, gap: 12 }}
        >
          <Ionicons name="lock-closed-outline" size={18} color={c.textMuted} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••••••"
            placeholderTextColor={c.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-1 text-[15px]"
            style={[
              { paddingVertical: Platform.OS === 'ios' ? 18 : 14, color: c.text },
              Platform.select({ web: { outlineStyle: 'none' } }),
            ]}
          />
        </View>

        {/* Outline gradient Sign In button — bg interior with circle arrow */}
        <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
          <LinearGradient
            colors={[c.gCtaA, c.gCtaB, c.gCtaC]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: 32, padding: 1.6 }}
          >
            <View
              className="rounded-[30px] flex-row items-center justify-center"
              style={{ backgroundColor: c.bg, paddingVertical: 16, gap: 12, opacity: loading ? 0.7 : 1 }}
            >
              <View
                className="w-[28px] h-[28px] rounded-full items-center justify-center"
                style={{ borderWidth: 1.5, borderColor: c.primaryMint }}
              >
                <Ionicons name="arrow-forward" size={14} color={c.primaryMint} />
              </View>
              <Text className="text-[16px] font-semibold" style={{ color: c.text }}>
                {loading ? 'Signing in…' : 'Sign In'}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <Text className="text-center text-[13px] mt-5" style={{ color: c.textMuted }}>
          Demo · omniuser / Omni@1234
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
