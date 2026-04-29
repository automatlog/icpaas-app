// src/screens/auth/LoginScreen.js — Brand sign-in (matches Sign In.png / Sign In white.png)
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  KeyboardAvoidingView, Platform, ScrollView, Animated, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useBrand } from '../../theme';
import { login as loginThunk } from '../../store/slices/authSlice';
import GradientButton from '../../components/GradientButton';

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

const ErrorModal = ({ visible, title, message, onClose, dark }) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Animated.View 
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
              style={{ backgroundColor: 'rgba(32, 148, 171, 0.1)' }}
            >
              <Ionicons name="alert-circle" size={48} color="#2094ab" />
            </View>

            <Text className="text-[24px] font-bold mb-3 text-center" style={{ color: dark ? '#ffffff' : '#1a1a1a' }}>
              {title}
            </Text>
            
            <Text className="text-[16px] text-center mb-8 leading-6" style={{ color: dark ? '#a0a0a0' : '#666666' }}>
              {message}
            </Text>

            <TouchableOpacity 
              onPress={onClose}
              activeOpacity={0.8}
              className="w-full"
            >
              <LinearGradient
                colors={['#2094ab', '#175a6e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 20, paddingVertical: 16, alignItems: 'center', shadowColor: '#2094ab', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}
              >
                <Text className="text-white font-bold text-[17px]">Got it</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default function LoginScreen({ navigation }) {
  const c = useBrand();
  const dark = c.scheme === 'dark';
  const dispatch = useDispatch();

  const [username, setUsername] = useState('omniuser');
  const [password, setPassword] = useState('Omni@1234');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '' });
  const [showPassword, setShowPassword] = useState(false);

  const showError = (title, message) => {
    setModalContent({ title, message });
    setModalVisible(true);
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      showError("Details Required", "Please enter your username and password to continue.");
      return;
    }
    setLoading(true);
    const result = await dispatch(loginThunk({ username: username.trim(), password }));
    setLoading(false);
    if (!result.ok) {
      showError("Sign-in Failed", result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[dark ? '#000000' : '#f0f4f5', dark ? '#0f171a' : '#ffffff']}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Background Decorative Icons (Reduced sizes for subtlety) */}
          <FloatingIcon name="chatbubble-ellipses-outline" size={60} top={40} right={20} rotate="15deg" opacity={0.15} duration={4000} dark={dark} />
          <FloatingIcon name="mail-outline" size={40} top={250} left={20} rotate="-15deg" opacity={0.12} duration={3500} dark={dark} />
          <FloatingIcon name="call-outline" size={50} bottom={100} right={20} rotate="-20deg" opacity={0.15} duration={4500} dark={dark} />
          <FloatingIcon name="paper-plane-outline" size={30} top={120} left={60} rotate="-10deg" opacity={0.1} duration={3000} dark={dark} />
          <FloatingIcon name="phone-portrait-outline" size={70} bottom={20} left={20} rotate="10deg" opacity={0.12} duration={5000} dark={dark} />

          {/* Header Section */}
          <View className="items-center" style={{ paddingTop: Platform.OS === 'ios' ? 100 : 70, paddingHorizontal: 24 }}>
            {/* Brand icon - background removed for transparency */}
            <Image 
              source={LOGO} 
              className="w-[100px] h-[100px]" 
              resizeMode="contain" 
            />

            <View className="items-center">
              <Text className="text-[34px] font-extrabold tracking-tight" style={{ color: c.text, fontFamily: 'System' }}>
                icpaas<Text style={{ color: '#2094ab' }}>.ai</Text>
              </Text>
              <Text
                className="text-[12px] font-bold tracking-[4px] mt-1"
                style={{ color: '#2094ab', textTransform: 'uppercase' }}
              >
                Smart Technology
              </Text>
            </View>
          </View>

          {/* Login Card */}
          <View 
            className="mx-6 mt-12 p-8 rounded-[40px] bg-white shadow-2xl"
            style={{
              backgroundColor: dark ? '#17171b' : '#ffffff',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 15 },
              shadowOpacity: 0.08,
              shadowRadius: 30,
              elevation: 10,
              borderWidth: dark ? 1 : 0,
              borderColor: 'rgba(255,255,255,0.1)'
            }}
          >
            <View className="mb-8">
              <Text className="text-[32px] font-bold tracking-tight" style={{ color: c.text }}>
                Welcome Back
              </Text>
              <View
                className="w-12 h-[4px] rounded-full mt-2"
                style={{ backgroundColor: '#2094ab' }}
              />
            </View>

            {/* Input fields */}
            <View style={{ gap: 20 }}>
              <View>
                <Text className="text-[14px] font-bold mb-2 ml-1" style={{ color: c.textMuted }}>USERNAME</Text>
                <View
                  className="flex-row items-center rounded-2xl px-5 border"
                  style={{ 
                    backgroundColor: dark ? '#1f1f24' : '#f8fafb', 
                    borderColor: dark ? '#2d2d35' : '#e2e8f0',
                    gap: 12 
                  }}
                >
                  <Ionicons name="person-outline" size={20} color="#2094ab" />
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter your username"
                    placeholderTextColor={c.textDim}
                    autoCapitalize="none"
                    className="flex-1 text-[16px]"
                    style={[
                      { paddingVertical: 18, color: c.text },
                      Platform.select({ web: { outlineStyle: 'none' } }),
                    ]}
                  />
                </View>
              </View>

              <View>
                <Text className="text-[14px] font-bold mb-2 ml-1" style={{ color: c.textMuted }}>PASSWORD</Text>
                <View
                  className="flex-row items-center rounded-2xl px-5 border"
                  style={{ 
                    backgroundColor: dark ? '#1f1f24' : '#f8fafb', 
                    borderColor: dark ? '#2d2d35' : '#e2e8f0',
                    gap: 12 
                  }}
                >
                  <Ionicons name="lock-closed-outline" size={20} color="#2094ab" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••••••"
                    placeholderTextColor={c.textDim}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    className="flex-1 text-[16px]"
                    style={[
                      { paddingVertical: 18, color: c.text },
                      Platform.select({ web: { outlineStyle: 'none' } }),
                    ]}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.6}
                    style={{ padding: 4 }}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={c.textMuted} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <GradientButton
              title={loading ? 'Signing in...' : 'Sign In'}
              onPress={handleLogin}
              loading={loading}
              icon={loading ? null : 'arrow-forward'}
              iconPosition="right"
              size="lg"
              variant="teal"
              style={{ marginTop: 40 }}
            />
          </View>

          <View className="mt-8 items-center">
            <TouchableOpacity 
              className="mb-6"
              onPress={() => navigation?.navigate('ForgotPassword')}
            >
              <Text style={{ color: '#2094ab', fontWeight: '600' }}>Forgot password?</Text>
            </TouchableOpacity>
            
          
          </View>

          {/* Footer Section */}
          <View className="mt-auto pt-12 items-center opacity-40">
            <Text style={{ color: c.text, fontSize: 12, fontWeight: '500', letterSpacing: 1 }}>
              © 2026 ICPAAS
            </Text>
            <View className="flex-row items-center mt-2" style={{ gap: 8 }}>
              <View className="w-1 h-1 rounded-full bg-current" style={{ backgroundColor: '#2094ab' }} />
              <Text style={{ color: c.textMuted, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
                Omnichannel Platform
              </Text>
              <View className="w-1 h-1 rounded-full bg-current" style={{ backgroundColor: '#2094ab' }} />
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
      <ErrorModal
        visible={modalVisible}
        title={modalContent.title}
        message={modalContent.message}
        onClose={() => setModalVisible(false)}
        dark={dark}
      />
    </KeyboardAvoidingView>
  );
}
