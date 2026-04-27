// src/screens/ProductIconsScreen.js — Feed (dark social) product hub
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  useWindowDimensions, Platform, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFeed, Fonts } from '../theme';
import { BalanceAPI } from '../services/api';

const PRODUCTS = [
  { n: '01', icon: 'logo-whatsapp',       title: 'WhatsApp',  tag: 'Business',   tint: 'tintPeach',    route: 'Send', params: { channel: 'whatsapp' }, meta: '10.3M' },
  { n: '02', icon: 'chatbubble-outline',  title: 'SMS',       tag: 'Shortcode',  tint: 'tintRose',     route: 'Send', params: { channel: 'sms' },      meta: '9.8M' },
  { n: '03', icon: 'card-outline',        title: 'RCS',       tag: 'Cards',      tint: 'tintMint',     route: 'Send', params: { channel: 'rcs' },      meta: '7.4M' },
  { n: '04', icon: 'call-outline',        title: 'Voice',     tag: 'Outbound',   tint: 'tintYellow',   route: 'Send', params: { channel: 'voice' },    meta: '5.1M' },
  { n: '05', icon: 'keypad-outline',      title: 'IVR',       tag: 'Inbound',    tint: 'tintClay',     route: 'Report',                                 meta: '4.2M' },
  { n: '06', icon: 'megaphone-outline',   title: 'Campaigns', tag: 'Planner',    tint: 'tintLavender', route: 'CampaignStep1',                          meta: '3.6M' },
];

const makeStyles = (c) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 160 },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 18 },
  logoDot: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: c.text,
    alignItems: 'center', justifyContent: 'center',
  },
  logoGlyph: { color: c.bg, fontSize: 18, fontWeight: '700' },
  circleBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: c.bgSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  circleBtnGlyph: { color: c.text, fontSize: 16 },
  grow: { flex: 1 },
  bellWrap: { position: 'relative' },
  bellBadge: {
    position: 'absolute', top: -2, right: -2,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: c.accentPink,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2, borderColor: c.bg,
  },
  bellBadgeText: { color: c.text, fontSize: 10, fontWeight: '700' },

  hero: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 28,
    padding: 22,
    minHeight: 300,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroNum: { color: 'rgba(0,0,0,0.55)', fontSize: 12, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' },
  heroTag: { color: 'rgba(0,0,0,0.55)', fontSize: 12, fontWeight: '500' },
  heroAvatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 30,
  },
  heroTitle: { color: '#0A0A0D', fontSize: 32, fontWeight: '700', letterSpacing: -0.8, marginTop: 16, fontFamily: Fonts.sans },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  heroMetaDot: { color: 'rgba(0,0,0,0.6)', fontSize: 14 },
  heroMetaText: { color: 'rgba(0,0,0,0.65)', fontSize: 14, fontWeight: '500' },

  row: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 12 },
  tile: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    minHeight: 180,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  tileAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  tileNum: { color: 'rgba(0,0,0,0.55)', fontSize: 10, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 10 },
  tileTitle: { color: '#0A0A0D', fontSize: 20, fontWeight: '700', letterSpacing: -0.4, marginTop: 4, fontFamily: Fonts.sans },
  tileMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  tileMetaDot: { color: 'rgba(0,0,0,0.6)', fontSize: 11 },
  tileMetaText: { color: 'rgba(0,0,0,0.65)', fontSize: 12, fontWeight: '500' },

  dock: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bgSoft,
    borderRadius: 32,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: c.border,
    gap: 6,
  },
  dockPlus: {
    width: 48, height: 48, borderRadius: 24,
    padding: 2,
  },
  dockPlusInner: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: c.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  dockPlusGlyph: { color: c.text, fontSize: 24, fontWeight: '300' },
  dockLabel: { color: c.text, fontSize: 14, fontWeight: '500', fontFamily: Fonts.sans, paddingHorizontal: 10 },
  dockAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: c.tintPeach,
    alignItems: 'center', justifyContent: 'center',
  },
  dockAvatarLetter: { color: '#0A0A0D', fontSize: 20, fontWeight: '700', fontFamily: Fonts.display },

  balanceChip: {
    position: 'absolute',
    right: 12, top: 12,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  balanceChipText: { color: '#0A0A0D', fontSize: 11, fontWeight: '700' },
});

const Tile = ({ p, onPress, c, styles, delay }) => {
  const rise = useRef(new Animated.Value(14)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(rise, { toValue: 0, duration: 460, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 460, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: rise }] }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.82}
        style={[styles.tile, { backgroundColor: c[p.tint] }]}
      >
        <View>
          <View style={styles.tileAvatar}>
            <Ionicons name={p.icon} size={22} color="rgba(0,0,0,0.85)" />
          </View>
          <Text style={styles.tileNum}>№ {p.n}</Text>
        </View>
        <View>
          <Text style={styles.tileTitle}>{p.title}</Text>
          <View style={styles.tileMeta}>
            <Ionicons name="people-outline" size={12} color="rgba(0,0,0,0.6)" />
            <Text style={styles.tileMetaText}>{p.meta}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ProductIconsScreen({ navigation }) {
  const c = useFeed();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { width } = useWindowDimensions();
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    BalanceAPI.getBalance()
      .then((res) => setBalance(res?.walletBalance ?? res?.balance))
      .catch(() => setBalance(null));
  }, []);

  const [featured, ...rest] = PRODUCTS;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.circleBtn} activeOpacity={0.7} onPress={() => navigation.navigate('Dashboard')}>
            <Ionicons name="chevron-back" size={20} color={c.text} />
          </TouchableOpacity>
          <View style={styles.logoDot}><Ionicons name="infinite" size={18} color={c.bg} /></View>
          <View style={styles.grow} />
          <TouchableOpacity style={styles.circleBtn} activeOpacity={0.7}>
            <Ionicons name="search" size={18} color={c.text} />
          </TouchableOpacity>
          <View style={styles.bellWrap}>
            <TouchableOpacity style={styles.circleBtn} activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={18} color={c.text} />
            </TouchableOpacity>
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>6</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate(featured.route, featured.params)}
          activeOpacity={0.9}
          style={[styles.hero, { backgroundColor: c[featured.tint] }]}
        >
          {balance !== null && (
            <View style={styles.balanceChip}>
              <Text style={styles.balanceChipText}>₹{Number(balance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
            </View>
          )}
          <View style={styles.heroTop}>
            <Text style={styles.heroNum}>№ {featured.n}</Text>
            <Text style={styles.heroTag}>{featured.tag}</Text>
          </View>
          <View style={styles.heroAvatar}>
            <Ionicons name={featured.icon} size={36} color="rgba(0,0,0,0.85)" />
          </View>
          <View>
            <Text style={styles.heroTitle}>{featured.title}</Text>
            <View style={styles.heroMeta}>
              <Ionicons name="people-outline" size={13} color="rgba(0,0,0,0.6)" />
              <Text style={styles.heroMetaText}>{featured.meta}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {[0, 2].map((start) => {
          const pair = rest.slice(start, start + 2);
          return (
            <View key={start} style={styles.row}>
              {pair.map((p, i) => (
                <Tile
                  key={p.n}
                  p={p}
                  c={c}
                  styles={styles}
                  delay={100 + (start + i) * 80}
                  onPress={() => navigation.navigate(p.route, p.params)}
                />
              ))}
              {pair.length === 1 && <View style={{ flex: 1 }} />}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.dock}>
        <TouchableOpacity style={styles.dockPlus} activeOpacity={0.8} onPress={() => navigation.navigate('Send')}>
          <LinearGradient
            colors={[c.gradA, c.gradB, c.gradC]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, borderRadius: 24 }}
          >
            <View style={styles.dockPlusInner}><Ionicons name="send" size={18} color={c.text} /></View>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Templates')} activeOpacity={0.7}><Text style={styles.dockLabel}>Templates</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Config')} activeOpacity={0.7}><Text style={styles.dockLabel}>Config</Text></TouchableOpacity>
        <View style={styles.grow} />
        <TouchableOpacity onPress={() => navigation.navigate('Dashboard')} activeOpacity={0.7} style={styles.dockAvatar}>
          <Ionicons name="home" size={20} color="#0A0A0D" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
