// src/screens/LoadingScreen.js — Opening splash (light/dark adaptive)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFeed, Fonts } from '../theme';

const LOGO = require('../../logo-icon.png');

const makeStyles = (c) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  brand: { alignItems: 'center' },
  logoRing: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  logoImage: { width: 120, height: 120, borderRadius: 60 },

  wordmark: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
    fontFamily: Fonts.sans,
    textAlign: 'center',
  },

  barWrap: { position: 'absolute', bottom: 56, left: 48, right: 48 },
  barTrack: { height: 3, borderRadius: 2, backgroundColor: c.bgInput, overflow: 'hidden' },
  bootLabel: { color: c.textDim, fontSize: 10, fontFamily: Fonts.sans, marginTop: 14, textAlign: 'center', letterSpacing: 2.4, textTransform: 'uppercase' },
});

export default function LoadingScreen({ onFinish }) {
  const c = useFeed();
  const styles = useMemo(() => makeStyles(c), [c]);

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

  const green = c.scheme === 'dark' ? '#4BD08D' : '#22C55E';
  const teal  = c.scheme === 'dark' ? '#52D1C6' : '#1BB8A8';
  const blue  = c.scheme === 'dark' ? '#5CD4E0' : '#2563EB';

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.brand, { opacity: fade, transform: [{ translateY: rise }, { scale }] }]}>
        <View style={styles.logoRing}>
          <Image source={LOGO} style={styles.logoImage} resizeMode="cover" />
        </View>
        <Text style={styles.wordmark}>
          <Text style={{ color: green }}>Omni</Text>
          <Text style={{ color: teal }}> Channel </Text>
          <Text style={{ color: blue }}>App</Text>
        </Text>
      </Animated.View>

      <View style={styles.barWrap}>
        <View style={styles.barTrack} onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
          <Animated.View style={{ width: fillW, height: 3 }}>
            <LinearGradient
              colors={[green, teal, blue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </View>
        <Text style={styles.bootLabel}>loading</Text>
      </View>
    </View>
  );
}
