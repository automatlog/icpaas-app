// src/components/Skeleton.js
//
// Animated shimmer placeholder. Pulses opacity instead of running a
// gradient sweep so it stays cheap on lower-end Android (no overdraw,
// no requestAnimationFrame layout work).
//
// Use Skeleton for individual blocks, SkeletonRow for a typical
// avatar + two-line list row (e.g. inbox rows, ID list rows).
//
// Usage:
//   <Skeleton c={c} width={120} height={14} />
//   <Skeleton c={c} width="60%" height={12} radius={6} />
//
//   {loading
//     ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} c={c} />)
//     : items.map(...)}
import React, { useEffect, useRef } from 'react';
import { Animated, View, Easing } from 'react-native';

export default function Skeleton({ c, width = '100%', height = 14, radius = 8, style }) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { backgroundColor: c.bgInput, width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

// Common pattern: circular avatar + two text lines, matches the inbox row.
export function SkeletonRow({ c }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
      }}
    >
      <Skeleton c={c} width={44} height={44} radius={22} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton c={c} width="55%" height={12} />
        <Skeleton c={c} width="80%" height={10} />
      </View>
    </View>
  );
}

// Identity-screen card shape: tile + title row + a couple of "labelled value"
// rows beneath. Used by WabaChannel / BotId / SenderId / CallerId screens.
export function SkeletonCard({ c }) {
  return (
    <View
      style={{
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        backgroundColor: c.bgCard,
        borderWidth: 1,
        borderColor: c.border,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Skeleton c={c} width={48} height={48} radius={24} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton c={c} width="60%" height={14} />
          <Skeleton c={c} width="40%" height={10} />
        </View>
      </View>
      <Skeleton c={c} width="100%" height={36} radius={12} />
      <Skeleton c={c} width="100%" height={36} radius={12} />
    </View>
  );
}
