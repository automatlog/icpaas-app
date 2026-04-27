// src/screens/LoadingScreen.js — NativeWind splash
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, Image, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const LOGO = require('../../logo-icon.png');

export default function LoadingScreen({ onFinish }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(14)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const [barW, setBarW] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: 950, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();

    const done = setTimeout(() => typeof onFinish === 'function' && onFinish(), 1000);
    return () => clearTimeout(done);
  }, []);

  const fillW = progress.interpolate({ inputRange: [0, 1], outputRange: [0, barW || 0] });

  const green = isDark ? '#4BD08D' : '#22C55E';
  const teal = isDark ? '#52D1C6' : '#1BB8A8';
  const blue = isDark ? '#5CD4E0' : '#2563EB';

  return (
    <View className={`flex-1 items-center justify-center px-8 ${isDark ? 'bg-bg' : 'bg-white'}`}>
      <Animated.View
        style={{ opacity: fade, transform: [{ translateY: rise }, { scale }] }}
        className="items-center"
      >
        <View className="w-32 h-32 rounded-full bg-white items-center justify-center mb-6 shadow-lg">
          <Image source={LOGO} className="w-32 h-32 rounded-full" resizeMode="cover" />
        </View>
        <Text
          className="text-4xl font-extrabold tracking-tight text-center"
          style={{ fontFamily: 'System' }}
        >
          <Text style={{ color: green }}>Omni</Text>
          <Text style={{ color: teal }}> Channel </Text>
          <Text style={{ color: blue }}>App</Text>
        </Text>
      </Animated.View>

      <View className="absolute bottom-14 left-10 right-10">
        <View
          onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
          className={`h-[3px] rounded-full overflow-hidden ${isDark ? 'bg-bgInput' : 'bg-gray-200'}`}
        >
          <Animated.View style={{ width: fillW, height: 3 }}>
            <LinearGradient
              colors={[green, teal, blue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </View>
        <Text className={`text-center mt-3 text-[10px] tracking-[2.4px] uppercase ${isDark ? 'text-textDim' : 'text-gray-400'}`}>
          loading
        </Text>
      </View>
    </View>
  );
}
