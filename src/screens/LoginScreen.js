// src/screens/LoginScreen.js — Feed minimal sign-in (username + password)
import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Image,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useFeed, Fonts } from '../theme';
import { login as loginThunk } from '../store/slices/authSlice';

const LOGO = require('../../logo-icon.png');

const makeStyles = (c) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { flexGrow: 1, paddingTop: Platform.OS === 'ios' ? 64 : 48, paddingHorizontal: 28, paddingBottom: 40 },

  brandBlock: { alignItems: 'center', marginTop: 8, marginBottom: 24 },
  logoRing: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  logoImage: { width: 88, height: 88, borderRadius: 44 },
  brandName: { color: c.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.4, fontFamily: Fonts.sans },
  brandTag: { color: c.textMuted, fontSize: 12, marginTop: 4, fontFamily: Fonts.sans },

  heroBlock: { alignItems: 'center', marginBottom: 28 },
  heroTitle: { color: c.text, fontSize: 44, fontWeight: '700', letterSpacing: -1.2, lineHeight: 50, fontFamily: Fonts.sans },
  accentLine: {
    width: 180, height: 3, borderRadius: 2, marginTop: 6,
    backgroundColor: c.accentOrange,
  },

  fieldBlock: { marginTop: 16 },
  fieldLabel: { color: c.text, fontSize: 14, fontFamily: Fonts.sans, fontWeight: '500', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: c.bgInput, borderRadius: 28,
    paddingHorizontal: 18,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 18 : 14,
    color: c.text,
    fontSize: 15,
    fontFamily: Fonts.sans,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },

  cta: {
    marginTop: 32,
    borderRadius: 36,
    padding: 2,
    overflow: 'hidden',
  },
  ctaInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: c.bg,
    borderRadius: 34,
    paddingVertical: 18,
  },
  ctaArrow: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1.2, borderColor: c.text,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaLabel: { color: c.text, fontSize: 16, fontFamily: Fonts.sans, fontWeight: '600' },

  helper: { color: c.textDim, fontSize: 12, fontFamily: Fonts.sans, marginTop: 22, textAlign: 'center' },
});

export default function LoginScreen() {
  const c = useFeed();
  const styles = useMemo(() => makeStyles(c), [c]);

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
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.brandBlock}>
          <View style={styles.logoRing}>
            <Image source={LOGO} style={styles.logoImage} resizeMode="cover" />
          </View>
          <Text style={styles.brandName}>icpaas.ai</Text>
          <Text style={styles.brandTag}>Omnichannel Communication</Text>
        </View>

        <View style={styles.heroBlock}>
          <Text style={styles.heroTitle}>Sign In</Text>
          <LinearGradient
            colors={[c.gradA, c.gradB, c.gradC]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentLine}
          />
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Username</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={16} color={c.textMuted} />
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="admin"
              placeholderTextColor={c.textMuted}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={16} color={c.textMuted} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••••••"
              placeholderTextColor={c.textMuted}
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85} style={[styles.cta, loading && { opacity: 0.7 }]}>
          <LinearGradient
            colors={[c.gradA, c.gradB, c.gradC]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 36 }}
          >
            <View style={styles.ctaInner}>
              <View style={styles.ctaArrow}><Ionicons name="arrow-forward" size={14} color={c.text} /></View>
              <Text style={styles.ctaLabel}>{loading ? 'Signing in…' : 'Sign In'}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.helper}>Demo · admin / Pass@1234</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
