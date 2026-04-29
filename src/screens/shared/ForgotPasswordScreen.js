// src/screens/shared/ForgotPasswordScreen.js — Password recovery flow
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  KeyboardAvoidingView, Platform, ScrollView, Animated, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useBrand } from '../../theme';

const LOGO = require('../../../logo-icon.png');

const FloatingIcon = ({ name, size, top, left, right, bottom, rotate, opacity = 0.12, duration = 3000, dark }) => {
  const translateY = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -20,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [translateY, duration]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top, left, right, bottom,
        transform: [{ rotate: rotate || '0deg' }, { translateY }],
        opacity,
      }}
    >
      <Ionicons 
        name={name} 
        size={size} 
        color={dark ? '#2094ab' : '#175a6e'} 
      />
    </Animated.View>
  );
};

const StatusModal = ({ visible, title, message, type, onClose, dark }) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View 
          className="w-full max-w-[340px] rounded-[40px] overflow-hidden"
          style={{ 
            backgroundColor: dark ? '#17171b' : '#ffffff',
            borderWidth: 1,
            borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          }}
        >
          <LinearGradient
            colors={dark ? ['#1f1f24', '#17171b'] : ['#ffffff', '#f8fafb']}
            style={{ padding: 32, alignItems: 'center' }}
          >
            <View 
              className="w-20 h-20 rounded-full items-center justify-center mb-6"
              style={{ backgroundColor: type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(32, 148, 171, 0.1)' }}
            >
              <Ionicons 
                name={type === 'success' ? "checkmark-circle" : "alert-circle"} 
                size={48} 
                color={type === 'success' ? "#22c55e" : "#2094ab"} 
              />
            </View>
            <Text className="text-[24px] font-bold mb-3 text-center" style={{ color: dark ? '#ffffff' : '#1a1a1a' }}>{title}</Text>
            <Text className="text-[16px] text-center mb-8 leading-6" style={{ color: dark ? '#a0a0a0' : '#666666' }}>{message}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.8} className="w-full">
              <LinearGradient
                colors={['#2094ab', '#175a6e']}
                style={{ borderRadius: 20, paddingVertical: 16, alignItems: 'center' }}
              >
                <Text className="text-white font-bold text-[17px]">Got it</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

export default function ForgotPasswordScreen({ navigation }) {
  const c = useBrand();
  const dark = c.scheme === 'dark';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, title: '', message: '', type: 'info' });

  const handleReset = () => {
    if (!email.trim() || !email.includes('@')) {
      setModal({ visible: true, title: 'Invalid Email', message: 'Please enter a valid email address.', type: 'error' });
      return;
    }
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setModal({ 
        visible: true, 
        title: 'Check Your Inbox', 
        message: `We've sent password recovery instructions to ${email}.`, 
        type: 'success' 
      });
    }, 1500);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={[dark ? '#000000' : '#f0f4f5', dark ? '#0f171a' : '#ffffff']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
          <TouchableOpacity 
            onPress={() => navigation?.goBack()}
            style={{ position: 'absolute', top: 50, left: 24, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="arrow-back" size={24} color={c.text} />
          </TouchableOpacity>

          <FloatingIcon name="mail-open-outline" size={60} top={100} right={20} rotate="15deg" opacity={0.1} duration={4000} dark={dark} />
          <FloatingIcon name="key-outline" size={40} bottom={100} left={20} rotate="-15deg" opacity={0.1} duration={3500} dark={dark} />

          <View className="items-center" style={{ paddingTop: 120, paddingHorizontal: 24 }}>
            <Image source={LOGO} className="w-[80px] h-[80px]" resizeMode="contain" />
            <Text className="text-[32px] font-bold mt-6" style={{ color: c.text }}>Recover Access</Text>
            <Text className="text-[16px] text-center mt-2" style={{ color: c.textMuted }}>Enter your email to reset your password</Text>
          </View>

          <View className="mx-6 mt-12 p-8 rounded-[40px]" style={{ backgroundColor: dark ? '#17171b' : '#ffffff', elevation: 10 }}>
            <View>
              <Text className="text-[14px] font-bold mb-2 ml-1" style={{ color: c.textMuted }}>EMAIL ADDRESS</Text>
              <View className="flex-row items-center rounded-2xl px-5 border" style={{ backgroundColor: dark ? '#1f1f24' : '#f8fafb', borderColor: dark ? '#2d2d35' : '#e2e8f0', gap: 12 }}>
                <Ionicons name="mail-outline" size={20} color="#2094ab" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  placeholderTextColor={c.textDim}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="flex-1 text-[16px]"
                  style={{ paddingVertical: 18, color: c.text }}
                />
              </View>
            </View>

            <TouchableOpacity onPress={handleReset} disabled={loading} activeOpacity={0.8} className="mt-10">
              <LinearGradient colors={['#2094ab', '#175a6e']} style={{ borderRadius: 20, paddingVertical: 18, alignItems: 'center' }}>
                <Text className="text-white font-bold text-[17px]">{loading ? 'Sending...' : 'Send Reset Link'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
      <StatusModal 
        {...modal} 
        dark={dark} 
        onClose={() => {
          setModal({ ...modal, visible: false });
          if (modal.type === 'success') navigation?.goBack();
        }} 
      />
    </KeyboardAvoidingView>
  );
}
