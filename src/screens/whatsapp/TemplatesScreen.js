// src/screens/whatsapp/TemplatesScreen.js — Live template list (brand palette).
// Accepts route.params.channel ('whatsapp' | 'rcs' | 'sms') to fetch templates
// for a specific product. Defaults to WhatsApp.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  RefreshControl, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrand } from '../../theme';
import { TemplatesAPI } from '../../services/api';
import { BottomTabBar } from '../shared/DashboardScreen';
import toast from '../../services/toast';

// Category filters per WhatsApp template taxonomy.
const CATEGORY_FILTERS = [
  { id: 'all',           label: 'All',           icon: 'apps-outline' },
  { id: 'marketing',     label: 'Marketing',     icon: 'megaphone-outline' },
  { id: 'utility',       label: 'Utility',       icon: 'construct-outline' },
  { id: 'authentication', label: 'Authentication', icon: 'shield-checkmark-outline' },
];

const matchCategory = (cat, filterId) => {
  if (filterId === 'all') return true;
  const k = String(cat || '').toUpperCase();
  if (filterId === 'marketing')      return k.includes('MARKET');
  if (filterId === 'utility')        return k.includes('UTIL');
  if (filterId === 'authentication') return k.includes('AUTH');
  return false;
};

const CATEGORY_TINT = (cat) => {
  const k = String(cat || '').toUpperCase();
  if (k.includes('MARKET')) return { bg: '#FCE7F3', fg: '#BE185D' };
  if (k.includes('UTIL'))   return { bg: '#DBEAFE', fg: '#1D4ED8' };
  if (k.includes('AUTH'))   return { bg: '#FEF3C7', fg: '#B45309' };
  if (k.includes('TRANSACT')) return { bg: '#EDE9FE', fg: '#6D28D9' };
  return { bg: '#D1FAE5', fg: '#047857' };
};

const STATUS_TINT = (s, c) => {
  const v = String(s || '').toUpperCase();
  if (v === 'APPROVED') return { bg: '#D1FAE5', fg: '#047857', icon: 'checkmark-circle' };
  if (v === 'PENDING')  return { bg: '#FEF3C7', fg: '#B45309', icon: 'time' };
  if (v === 'REJECTED') return { bg: '#FEE2E2', fg: '#B91C1C', icon: 'close-circle' };
  return { bg: c.bgInput, fg: c.textMuted, icon: 'ellipse' };
};

const fmtDate = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

export default function TemplatesScreen({ navigation, route }) {
  const c = useBrand();
  const channel = route?.params?.channel || 'whatsapp';

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const fetchTemplates = useCallback(async () => {
    setErr(null);
    try {
      const res = await TemplatesAPI.getByChannel(channel);
      const list = Array.isArray(res?.data) ? res.data : [];
      setTemplates(list);
      if (!list.length) {
        toast.info('No templates', `${channel.toUpperCase()} returned an empty list.`);
      }
    } catch (e) {
      setTemplates([]);
      const message = e?.message || 'Failed to fetch templates';
      setErr(message);
      toast.error(`${channel.toUpperCase()} templates failed`, message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [channel]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (!matchCategory(t.category, category)) return false;
      if (!q) return true;
      return (
        String(t.name || '').toLowerCase().includes(q) ||
        String(t.body || '').toLowerCase().includes(q)
      );
    });
  }, [templates, search, category]);

  const handleCopy = async (item) => {
    await Clipboard.setStringAsync(item.body || item.name || '');
    toast.success('Copied', `${item.name} copied to clipboard.`);
  };

  const handleUse = (item) => {
    navigation.navigate('Send', {
      channel: String(item.channel || 'whatsapp').toLowerCase(),
      templateName: item.name,
    });
  };

  const Header = (
    <View style={{ paddingHorizontal: 18, paddingTop: Platform.OS === 'ios' ? 56 : 36, backgroundColor: c.bg }}>
      {/* Top bar */}
      <View className="flex-row items-center mb-4" style={{ gap: 10 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} className="w-9 h-9 items-center justify-center">
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </TouchableOpacity>
        <View className="flex-row items-center" style={{ gap: 8, flex: 1 }}>
          <Text className="text-[18px] font-extrabold" style={{ color: c.text }}>
            {channel === 'whatsapp' ? 'Templates' : `${channel.toUpperCase()} Templates`}
          </Text>
          <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: c.primarySoft }}>
            <Text className="text-[10px] font-bold" style={{ color: c.primaryDeep }}>Active</Text>
          </View>
        </View>
        <TouchableOpacity onPress={fetchTemplates} activeOpacity={0.7} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: c.bgInput }}>
          <Ionicons name="refresh" size={16} color={c.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateTemplate', { channel })}
          activeOpacity={0.85}
          className="rounded-[10px] flex-row items-center px-3 py-2 ml-2"
          style={{ backgroundColor: c.primary, gap: 4 }}
        >
          <Ionicons name="add" size={14} color="#FFFFFF" />
          <Text className="text-[12px] font-bold text-white">New</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center mb-3" style={{ gap: 6 }}>
        <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.success }} />
        <Text className="text-[12px] font-semibold" style={{ color: c.success }}>Connected · WhatsApp</Text>
      </View>

      <Text className="text-[12px] mb-3" style={{ color: c.textMuted }}>
        Create, manage and personalize message templates
      </Text>

      {/* Search */}
      <View
        className="flex-row items-center rounded-[14px] px-4 mb-3"
        style={{ backgroundColor: c.bgInput, gap: 10 }}
      >
        <Ionicons name="search-outline" size={16} color={c.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search templates, messages…"
          placeholderTextColor={c.textMuted}
          className="flex-1 text-[13px]"
          autoCorrect={false}
          autoCapitalize="none"
          style={[
            { paddingVertical: Platform.OS === 'ios' ? 11 : 9, color: c.text },
            Platform.select({ web: { outlineStyle: 'none' } }),
          ]}
        />
        <Ionicons name="options-outline" size={16} color={c.textMuted} />
      </View>

      {/* Category filter chips */}
      <View className="flex-row flex-wrap mb-2" style={{ gap: 6 }}>
        {CATEGORY_FILTERS.map((f) => {
          const active = category === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setCategory(f.id)}
              activeOpacity={0.85}
              className="flex-row items-center py-2 px-3 rounded-[14px]"
              style={{ backgroundColor: active ? c.primary : c.bgInput, gap: 6 }}
            >
              <Ionicons name={f.icon} size={12} color={active ? '#FFFFFF' : c.textMuted} />
              <Text className="text-[12px]" style={{ color: active ? '#FFFFFF' : c.textMuted, fontWeight: active ? '700' : '500' }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {err ? (
        <View className="rounded-[14px] p-3 mt-2 mb-2 border-l-[3px]" style={{ backgroundColor: c.bgInput, borderLeftColor: c.danger }}>
          <Text className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: c.danger }}>Error</Text>
          <Text className="text-[12px]" style={{ color: c.text }}>{err}</Text>
        </View>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        {Header}
        <View className="flex-1 items-center justify-center" style={{ gap: 10 }}>
          <ActivityIndicator color={c.primary} />
          <Text className="text-[12px] tracking-widest uppercase" style={{ color: c.textMuted }}>loading templates</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {Header}
      <FlatList
        data={filtered}
        keyExtractor={(item, i) => String(item.id ?? item.name ?? i)}
        renderItem={({ item }) => <TemplateCard item={item} onCopy={handleCopy} onUse={handleUse} c={c} />}
        keyboardShouldPersistTaps="handled"
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 130 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchTemplates(); }}
            tintColor={c.primary}
          />
        }
        ListEmptyComponent={
          !err ? (
            <View className="items-center py-12" style={{ gap: 8 }}>
              <View className="w-20 h-20 rounded-2xl items-center justify-center" style={{ backgroundColor: c.bgInput }}>
                <Ionicons name="document-outline" size={32} color={c.textDim} />
              </View>
              <Text className="text-[15px] font-bold" style={{ color: c.text }}>No templates</Text>
              <Text className="text-[12px] text-center" style={{ color: c.textMuted, maxWidth: 280 }}>
                Save an API key in Config, then pull down to refresh.
              </Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
      <BottomTabBar c={c} navigation={navigation} active="home" />
    </View>
  );
}

function TemplateCard({ item, onCopy, onUse, c }) {
  const cat = CATEGORY_TINT(item.category);
  const st = STATUS_TINT(item.status, c);
  const updated = fmtDate(item.updatedAt || item.modifiedAt || item.createdAt);

  return (
    <View
      className="rounded-[14px] p-3 mb-2.5"
      style={{ flex: 1, backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border, minHeight: 168 }}
    >
      {/* Top: category pill + status pill */}
      <View className="flex-row items-center justify-between mb-2" style={{ gap: 6 }}>
        <View className="rounded-full px-2 py-0.5 flex-row items-center" style={{ backgroundColor: cat.bg, gap: 3 }}>
          <Ionicons name="ellipse" size={5} color={cat.fg} />
          <Text className="text-[9px] font-bold" style={{ color: cat.fg }} numberOfLines={1}>
            {String(item.category || 'TEMPLATE').toUpperCase()}
          </Text>
        </View>
        <View className="flex-row items-center rounded-full px-2 py-0.5" style={{ backgroundColor: st.bg, gap: 3 }}>
          <Ionicons name={st.icon} size={9} color={st.fg} />
          <Text className="text-[9px] font-bold" style={{ color: st.fg }}>
            {String(item.status || '—').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Template name */}
      <Text className="text-[13px] font-extrabold mb-2" style={{ color: c.text }} numberOfLines={2}>{item.name}</Text>

      {/* Lang Code + Updated stacked */}
      <View style={{ gap: 4 }}>
        <View className="flex-row items-baseline" style={{ gap: 4 }}>
          <Text className="text-[10px] font-semibold" style={{ color: c.textMuted }}>Lang Code:</Text>
          <Text className="text-[10px] font-bold" style={{ color: c.text }} numberOfLines={1}>{item.language || 'en'}</Text>
        </View>
        {updated ? (
          <View className="flex-row items-baseline" style={{ gap: 4 }}>
            <Text className="text-[10px] font-semibold" style={{ color: c.textMuted }}>Updated:</Text>
            <Text className="text-[10px]" style={{ color: c.text }} numberOfLines={1}>{updated}</Text>
          </View>
        ) : null}
      </View>

      {/* 4 small action icons */}
      <View className="flex-row mt-auto pt-3" style={{ gap: 6 }}>
        <ActionBtn c={c} icon="create-outline"  tint={c.primary} onPress={() => {}} />
        <ActionBtn c={c} icon="copy-outline"    tint={c.primary} onPress={() => onCopy(item)} />
        <ActionBtn c={c} icon="paper-plane-outline" tint={c.primary} onPress={() => onUse(item)} />
        <ActionBtn c={c} icon="trash-outline"   tint={c.danger}  onPress={() => {}} />
      </View>
    </View>
  );
}

function ActionBtn({ c, icon, tint, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="flex-1 h-8 rounded-[8px] items-center justify-center"
      style={{ borderWidth: 1, borderColor: tint + '55', backgroundColor: tint + '10' }}
    >
      <Ionicons name={icon} size={13} color={tint} />
    </TouchableOpacity>
  );
}
