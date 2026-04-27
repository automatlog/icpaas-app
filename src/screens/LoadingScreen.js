// src/screens/LoadingScreen.js — Brand splash (matches Loading.png / Loading white.png)
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, Image, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useBrand } from '../theme';

const LOGO = require('../../logo-icon.png');

export default function LoadingScreen({ onFinish }) {
  const c = useBrand();
  const isDark = c.scheme === 'dark';

  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const dotGlow = useRef(new Animated.Value(0.6)).current;
  const [barW, setBarW] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: 950, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(dotGlow, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(dotGlow, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    ).start();

    const done = setTimeout(() => typeof onFinish === 'function' && onFinish(), 1000);
    return () => clearTimeout(done);
  }, []);

  const fillW = progress.interpolate({ inputRange: [0, 1], outputRange: [0, barW || 0] });

  return (
    <View className={`flex-1 items-center justify-center px-8 ${isDark ? 'bg-nightBg' : 'bg-white'}`}>
      <Animated.View style={{ opacity: fade, transform: [{ scale }] }} className="items-center">
        <View
          className={`w-32 h-32 rounded-[28px] items-center justify-center mb-7 ${isDark ? 'bg-white' : 'bg-white'}`}
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 4 }}
        >
          <Image source={LOGO} className="w-28 h-28 rounded-[22px]" resizeMode="contain" />
        </View>
        <Text className="text-3xl font-extrabold tracking-tight text-center" style={{ fontFamily: 'System' }}>
          <Text style={{ color: c.gWordA }}>Omni </Text>
          <Text style={{ color: c.gWordB }}>Channel </Text>
          <Text style={{ color: c.gWordC }}>App</Text>
        </Text>
      </Animated.View>

      <View className="absolute bottom-20 left-10 right-10 items-center">
        <View
          onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
          className={`w-full h-[3px] rounded-full overflow-hidden ${isDark ? 'bg-nightInput' : 'bg-rule'}`}
        >
          <Animated.View style={{ width: fillW, height: 3 }}>
            <LinearGradient
              colors={[c.gWordA, c.gWordB, c.gWordC]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: 0,
              top: -3,
              width: 9,
              height: 9,
              borderRadius: 5,
              backgroundColor: c.gWordC,
              opacity: dotGlow,
              transform: [{ translateY: 0 }],
              shadowColor: c.gWordC,
              shadowOpacity: 0.8,
              shadowRadius: 6,
            }}
          />
        </View>
        <Text className={`mt-3 text-[13px] font-medium ${isDark ? 'text-nightMute' : 'text-inkMute'}`}>Loading...</Text>
      </View>
    </View>
  );
}
