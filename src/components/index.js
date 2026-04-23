// src/components/index.js
// Shared UI Components for icpaas.ai App

import React from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, TextInput, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts, FontSizes, Spacing, Radii, Shadows } from '../theme';

// ── GRADIENT BUTTON ────────────────────────────────────────
export const GradientButton = ({ title, onPress, loading, style, small }) => (
  <TouchableOpacity onPress={onPress} disabled={loading} activeOpacity={0.85} style={style}>
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientEnd]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[styles.gradBtn, small && styles.gradBtnSm]}
    >
      {loading
        ? <ActivityIndicator color={Colors.white} size="small" />
        : <Text style={[styles.gradBtnText, small && { fontSize: FontSizes.sm }]}>{title}</Text>
      }
    </LinearGradient>
  </TouchableOpacity>
);

// ── OUTLINE BUTTON ─────────────────────────────────────────
export const OutlineButton = ({ title, onPress, style, small }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={[styles.outlineBtn, small && styles.outlineBtnSm, style]}
  >
    <Text style={[styles.outlineBtnText, small && { fontSize: FontSizes.sm }]}>{title}</Text>
  </TouchableOpacity>
);

// ── CARD ───────────────────────────────────────────────────
export const Card = ({ children, style, onPress }) => {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap onPress={onPress} activeOpacity={0.8} style={[styles.card, style]}>
      {children}
    </Wrap>
  );
};

// ── STAT CARD ──────────────────────────────────────────────
export const StatCard = ({ value, label, delta, deltaPositive = true, color, style }) => (
  <View style={[styles.statCard, style]}>
    <Text style={[styles.statVal, color && { color }]}>{value}</Text>
    <Text style={styles.statLbl}>{label}</Text>
    {delta && (
      <Text style={[styles.statDelta, { color: deltaPositive ? Colors.success : Colors.danger }]}>
        {deltaPositive ? '↑' : '↓'} {delta}
      </Text>
    )}
  </View>
);

// ── PILL / BADGE ───────────────────────────────────────────
export const Pill = ({ label, type = 'primary', style }) => {
  const pillColors = {
    primary: { bg: Colors.primaryLight, text: Colors.primary },
    success: { bg: 'rgba(34,197,94,0.12)', text: Colors.success },
    danger: { bg: 'rgba(239,68,68,0.12)', text: Colors.danger },
    warning: { bg: 'rgba(245,158,11,0.12)', text: Colors.warning },
    whatsapp: { bg: 'rgba(37,211,102,0.12)', text: '#16a34a' },
    rcs: { bg: 'rgba(245,158,11,0.12)', text: Colors.rcs },
  };
  const c = pillColors[type] || pillColors.primary;
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }, style]}>
      <Text style={[styles.pillText, { color: c.text }]}>{label}</Text>
    </View>
  );
};

// ── CHANNEL TAG ────────────────────────────────────────────
export const ChannelTag = ({ channel }) => {
  const map = {
    whatsapp: { label: 'WhatsApp', bg: 'rgba(37,211,102,0.12)', color: '#16a34a' },
    sms: { label: 'SMS', bg: Colors.primaryLight, color: Colors.primary },
    rcs: { label: 'RCS', bg: 'rgba(245,158,11,0.1)', color: Colors.warning },
    ivr: { label: 'IVR', bg: 'rgba(59,130,246,0.1)', color: Colors.ivr },
    voice: { label: 'Voice', bg: 'rgba(59,130,246,0.1)', color: Colors.ivr },
  };
  const c = map[channel?.toLowerCase()] || map.sms;
  return (
    <View style={[styles.channelTag, { backgroundColor: c.bg }]}>
      <Text style={[styles.channelTagText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
};

// ── AVATAR ─────────────────────────────────────────────────
export const Avatar = ({ emoji, color = Colors.primaryLight, size = 44, radius = 14 }) => (
  <View style={{
    width: size, height: size, borderRadius: radius,
    backgroundColor: color,
    alignItems: 'center', justifyContent: 'center',
  }}>
    <Text style={{ fontSize: size * 0.44 }}>{emoji}</Text>
  </View>
);

// ── SEARCH BAR ─────────────────────────────────────────────
export const SearchBar = ({ value, onChangeText, placeholder }) => (
  <View style={styles.searchBar}>
    <Text style={styles.searchIcon}>🔍</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || 'Search…'}
      placeholderTextColor={Colors.textLight}
      style={styles.searchInput}
    />
  </View>
);

// ── SECTION LABEL ──────────────────────────────────────────
export const SectionLabel = ({ label, style }) => (
  <Text style={[styles.sectionLabel, style]}>{label}</Text>
);

// ── DIVIDER ────────────────────────────────────────────────
export const Divider = ({ style }) => (
  <View style={[styles.divider, style]} />
);

// ── EMPTY STATE ────────────────────────────────────────────
export const EmptyState = ({ emoji = '📭', title, subtitle }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyEmoji}>{emoji}</Text>
    <Text style={styles.emptyTitle}>{title}</Text>
    {subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
  </View>
);

// ── LOADING SPINNER ────────────────────────────────────────
export const LoadingSpinner = ({ size = 'large' }) => (
  <View style={styles.loadingWrap}>
    <ActivityIndicator size={size} color={Colors.primary} />
  </View>
);

// ── LIVE INDICATOR ─────────────────────────────────────────
export const LiveBadge = () => (
  <View style={styles.liveBadge}>
    <View style={styles.liveDot} />
    <Text style={styles.liveText}>LIVE</Text>
  </View>
);

// ── METRIC ROW ─────────────────────────────────────────────
export const MetricRow = ({ metrics }) => (
  <View style={styles.metricRow}>
    {metrics.map((m, i) => (
      <View key={i} style={styles.metricItem}>
        <Text style={styles.metricVal}>{m.value}</Text>
        <Text style={styles.metricLbl}>{m.label}</Text>
      </View>
    ))}
  </View>
);

// ── PROGRESS BAR ───────────────────────────────────────────
export const ProgressBar = ({ progress, style }) => (
  <View style={[styles.progressBg, style]}>
    <LinearGradient
      colors={[Colors.primary, Colors.secondary]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]}
    />
  </View>
);

// ══════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  // Buttons
  gradBtn: {
    paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center',
  },
  gradBtnSm: { paddingVertical: 10, paddingHorizontal: 18 },
  gradBtnText: { color: Colors.white, fontSize: FontSizes.md, fontFamily: Fonts.bold },
  outlineBtn: {
    paddingVertical: 13, paddingHorizontal: 22,
    borderRadius: Radii.lg, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white,
  },
  outlineBtnSm: { paddingVertical: 9, paddingHorizontal: 16 },
  outlineBtnText: { color: Colors.primary, fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  // Card
  card: {
    backgroundColor: Colors.card, borderRadius: Radii.xl,
    padding: Spacing.base, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.sm,
  },
  // Stat card
  statCard: {
    backgroundColor: Colors.card, borderRadius: Radii.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm,
  },
  statVal: {
    fontSize: FontSizes.xxl, fontFamily: Fonts.bold, color: Colors.textDark, lineHeight: 30,
  },
  statLbl: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2, fontFamily: Fonts.medium },
  statDelta: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, marginTop: 4 },
  // Pill
  pill: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: Radii.full },
  pillText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  // Channel tag
  channelTag: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8 },
  channelTagText: { fontSize: 10, fontFamily: Fonts.semiBold },
  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.background, borderRadius: Radii.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    marginHorizontal: Spacing.base, marginVertical: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchIcon: { fontSize: 15 },
  searchInput: {
    flex: 1, fontSize: FontSizes.md, color: Colors.textDark,
    fontFamily: Fonts.regular,
  },
  // Section label
  sectionLabel: {
    fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1.5,
    textTransform: 'uppercase', color: Colors.textMuted,
    marginTop: Spacing.base, marginBottom: Spacing.sm,
  },
  // Divider
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.sm },
  // Empty
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, color: Colors.textDark },
  emptySub: { fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: 6, textAlign: 'center' },
  // Loading
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Live badge
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(34,197,94,0.12)', paddingVertical: 4,
    paddingHorizontal: 10, borderRadius: Radii.full,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  liveText: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.success },
  // Metrics
  metricRow: { flexDirection: 'row', marginTop: Spacing.sm },
  metricItem: { flex: 1, alignItems: 'center' },
  metricVal: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, color: Colors.textDark },
  metricLbl: { fontSize: 9, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  // Progress
  progressBg: { height: 6, backgroundColor: Colors.background, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
});
