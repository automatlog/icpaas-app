// src/screens/auth/LoadingScreen.js — Brand splash (matches Loading.png / Loading white.png)
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, Image, Platform } from 'react-native';
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

export default function LoadingScreen({ onFinish }) {
  const c = useBrand();
  const dark = c.scheme === 'dark';

  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const [barW, setBarW] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ]).start();

    const done = setTimeout(() => typeof onFinish === 'function' && onFinish(), 2000);
    return () => clearTimeout(done);
  }, []);

  const fillW = progress.interpolate({ inputRange: [0, 1], outputRange: [0, barW || 0] });

  return (
    <LinearGradient
      colors={[dark ? '#000000' : '#f0f4f5', dark ? '#0f171a' : '#ffffff']}
      style={{ flex: 1 }}
    >
      {/* Background Decorative Icons */}
      <FloatingIcon name="chatbubble-ellipses-outline" size={60} top={40} right={20} rotate="15deg" opacity={0.15} duration={4000} dark={dark} />
      <FloatingIcon name="mail-outline" size={40} top={250} left={20} rotate="-15deg" opacity={0.12} duration={3500} dark={dark} />
      <FloatingIcon name="call-outline" size={50} bottom={100} right={20} rotate="-20deg" opacity={0.15} duration={4500} dark={dark} />
      <FloatingIcon name="paper-plane-outline" size={30} top={120} left={60} rotate="-10deg" opacity={0.1} duration={3000} dark={dark} />
      <FloatingIcon name="phone-portrait-outline" size={70} bottom={20} left={20} rotate="10deg" opacity={0.12} duration={5000} dark={dark} />

      <View className="flex-1 items-center justify-center px-8">
        <Animated.View style={{ opacity: fade, transform: [{ scale }] }} className="items-center">
          {/* Brand icon */}
          <Image 
            source={LOGO} 
            className="w-[120px] h-[120px] mb-6" 
            resizeMode="contain" 
          />

          <View className="items-center">
            <Text className="text-[42px] font-extrabold tracking-tight" style={{ color: dark ? '#ffffff' : '#1f2937', fontFamily: 'System' }}>
              icpaas<Text style={{ color: '#2094ab' }}>.ai</Text>
            </Text>
            <Text
              className="text-[14px] font-bold tracking-[6px] mt-1"
              style={{ color: '#2094ab', textTransform: 'uppercase' }}
            >
              Smart Technology
            </Text>
          </View>
        </Animated.View>

        {/* Loading Progress */}
        <View className="absolute bottom-32 left-12 right-12 items-center">
          <View
            onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
            className="w-full h-[4px] rounded-full overflow-hidden"
            style={{ backgroundColor: dark ? '#1f1f24' : '#e2e8f0' }}
          >
            <Animated.View style={{ width: fillW, height: 4 }}>
              <LinearGradient
                colors={['#2094ab', '#175a6e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          </View>
          <Text 
            className="mt-4 text-[12px] font-bold tracking-[2px] uppercase opacity-60" 
            style={{ color: dark ? '#ffffff' : '#1f2937' }}
          >
            Initializing Platform...
          </Text>
        </View>

        {/* Footer Section */}
        <View className="absolute bottom-10 items-center opacity-40">
          <Text style={{ color: dark ? '#ffffff' : '#1f2937', fontSize: 11, fontWeight: '600', letterSpacing: 1 }}>
            © 2026 ICPAAS
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

