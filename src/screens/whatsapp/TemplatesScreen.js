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
import BottomTabBar from '../../components/BottomTabBar';
import ScreenHeader from '../../components/ScreenHeader';
import TemplatePreviewModal from '../../components/TemplatePreviewModal';
import toast from '../../services/toast';
import { getChannel } from '../../constants/channels';

// Maps a channel id to the campaign composer route. Used by the "send"
// action on each template card so tapping the icon lands the user in the
// campaign for *that* product with the template pre-selected.
const CAMPAIGN_ROUTE = {
  whatsapp: 'WhatsAppCampaignStep1',
  rcs: 'RcsCampaign',
  sms: 'SmsCampaign',
};

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
  const [preview, setPreview] = useState(null); // { template } or null

  // Display-only pagination: gsauth doesn't paginate the template list, so
  // we load everything once and reveal 8 cards at a time as the user
  // scrolls. Search / category changes reset back to the first page so
  // matches don't sit hidden below the fold.
  const PAGE_SIZE = 8;
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

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

  // Whenever the filtered set changes (new query, new filter, or fresh
  // fetch), rewind pagination to the first page.
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [search, category, templates]);

  // Slice of `filtered` actually rendered. The full list still exists in
  // memory so search continues to span everything — only the paint count
  // is gated.
  const visible = useMemo(() => filtered.slice(0, displayCount), [filtered, displayCount]);
  const hasMore = filtered.length > displayCount;
  const loadMore = useCallback(() => {
    if (!hasMore) return;
    setDisplayCount((n) => Math.min(n + PAGE_SIZE, filtered.length));
  }, [hasMore, filtered.length]);

  const handleCopy = async (item) => {
    await Clipboard.setStringAsync(item.body || item.name || '');
    toast.success('Copied', `${item.name} copied to clipboard.`);
  };

  // Mirror Step2's Flows-template detector so the wizard's "Template Type"
  // dropdown lands on the correct option (Flows vs Default) without the
  // user having to set it manually.
  const isFlowsTemplate = (t) => {
    if (!t) return false;
    if (String(t.template_type || t.templateType || t.type || '').toLowerCase().includes('flow')) return true;
    if (t.category && String(t.category).toLowerCase().includes('flow')) return true;
    if (Array.isArray(t.components)) {
      return t.components.some((cmp) => {
        const buttons = cmp.buttons || cmp.Buttons;
        if (!Array.isArray(buttons)) return false;
        return buttons.some((b) => String(b.type || '').toUpperCase() === 'FLOW');
      });
    }
    return false;
  };

  // Send icon on a template card → land the user in the campaign composer
  // for THIS channel with everything we already know pre-filled: WABA
  // channel (phoneNumberId), Template Category, Template Type, and the
  // template name itself. Saves the user from re-picking three dropdowns
  // they already implicitly chose by tapping send on a specific row.
  const handleUse = (item) => {
    const ch = String(item.channel || channel).toLowerCase();
    const route = CAMPAIGN_ROUTE[ch];
    if (!route) {
      navigation.navigate('Send', { channel: ch, templateName: item.name });
      return;
    }
    if (ch === 'whatsapp') {
      // The WhatsApp composer is a 3-step wizard. Step1's `routeDraft`
      // is spread into the draft handed to Step2 via `next()`, so any
      // fields we set here propagate through the wizard.
      const draft = {
        templateName: item.name,
        // phoneNumberId is what Step1 stores as `channelId`; the field
        // is added in TemplatesAPI.getWhatsApp() when no specific WABA
        // is requested (the standard case from this screen).
        channelId: item.phoneNumberId || '',
        category: item.category || '',
        type: isFlowsTemplate(item) ? 'Flows' : 'Default',
      };
      navigation.navigate(route, { draft });
    } else {
      // RCS / SMS campaigns are single-screen — accept a templateName
      // route param and pre-select on first render.
      navigation.navigate(route, { templateName: item.name });
    }
  };

  // Tap card → open preview modal.
  const handlePreview = (item) => setPreview(item);

  // Channel-specific connection chip in the header subtitle.
  const channelMeta = getChannel(channel) || { label: channel?.toUpperCase() };
  const headerTitle = channel === 'whatsapp' ? 'Templates' : `${channelMeta.label} Templates`;

  const Header = (
    <View style={{ backgroundColor: c.bg }}>
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        title={headerTitle}
        badge="Active"
        subtitle={{ text: `Connected · ${channelMeta.label}`, dotColor: c.success }}
        right={(
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={fetchTemplates}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Reload templates"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                width: 36, height: 36, borderRadius: 18,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: c.bgInput,
              }}
            >
              <Ionicons name="refresh" size={16} color={c.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('CreateTemplate', { channel })}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="New template"
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                backgroundColor: c.primary, gap: 4,
              }}
            >
              <Ionicons name="add" size={14} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>New</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <View style={{ paddingHorizontal: 18, paddingTop: 12 }}>
        <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: 12 }}>
          Create, manage and personalize message templates
        </Text>

        {/* Search */}
        <View
          style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: c.bgInput, borderRadius: 14,
            paddingHorizontal: 16, gap: 10, marginBottom: 12,
          }}
        >
          <Ionicons name="search-outline" size={16} color={c.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search templates, messages…"
            placeholderTextColor={c.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
            style={[
              {
                flex: 1, fontSize: 13, color: c.text,
                paddingVertical: Platform.OS === 'ios' ? 11 : 9,
              },
              Platform.select({ web: { outlineStyle: 'none' } }),
            ]}
          />
          <Ionicons name="options-outline" size={16} color={c.textMuted} />
        </View>

        {/* Category filter chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {CATEGORY_FILTERS.map((f) => {
            const active = category === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setCategory(f.id)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Filter ${f.label}`}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14,
                  backgroundColor: active ? c.primary : c.bgInput, gap: 6,
                }}
              >
                <Ionicons name={f.icon} size={12} color={active ? '#FFFFFF' : c.textMuted} />
                <Text style={{ color: active ? '#FFFFFF' : c.textMuted, fontSize: 12, fontWeight: active ? '700' : '500' }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {err ? (
          <View
            style={{
              padding: 12, marginTop: 8, marginBottom: 8,
              borderRadius: 14,
              backgroundColor: c.bgInput,
              borderLeftWidth: 3, borderLeftColor: c.danger,
            }}
          >
            <Text style={{ color: c.danger, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 }}>
              Error
            </Text>
            <Text style={{ color: c.text, fontSize: 12 }}>{err}</Text>
          </View>
        ) : null}
      </View>
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
        data={visible}
        keyExtractor={(item, i) => String(item.id ?? item.name ?? i)}
        renderItem={({ item }) => (
          <TemplateCard
            item={item}
            onCopy={handleCopy}
            onUse={handleUse}
            onPreview={handlePreview}
            c={c}
          />
        )}
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
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          hasMore ? (
            // Tappable fallback in case the user wants to advance manually
            // (or onEndReached doesn't fire on a short list).
            <TouchableOpacity
              onPress={loadMore}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Load more templates"
              style={{
                marginTop: 8,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: c.bgInput,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: c.text, fontSize: 12, fontWeight: '700' }}>
                Load more · {filtered.length - displayCount} remaining
              </Text>
            </TouchableOpacity>
          ) : filtered.length > 0 ? (
            <Text style={{ textAlign: 'center', color: c.textDim, fontSize: 11, marginTop: 12 }}>
              {filtered.length} template{filtered.length === 1 ? '' : 's'} · end of list
            </Text>
          ) : null
        }
        ListEmptyComponent={
          !err ? (
            <View className="items-center py-12" style={{ gap: 8 }}>
              <View className="w-20 h-20 rounded-2xl items-center justify-center" style={{ backgroundColor: c.bgInput }}>
                <Ionicons name="document-outline" size={32} color={c.textDim} />
              </View>
              <Text className="text-[15px] font-bold" style={{ color: c.text }}>No templates</Text>
              <Text className="text-[12px] text-center" style={{ color: c.textMuted, maxWidth: 280 }}>
                {search ? 'No matches for that search.' : 'Save an API key in Config, then pull down to refresh.'}
              </Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
      <BottomTabBar c={c} navigation={navigation} active="home" />

      <TemplatePreviewModal
        c={c}
        visible={preview != null}
        template={preview}
        onClose={() => setPreview(null)}
        onUse={() => {
          const item = preview;
          setPreview(null);
          if (item) handleUse(item);
        }}
      />
    </View>
  );
}

function TemplateCard({ item, onCopy, onUse, onPreview, c }) {
  const cat = CATEGORY_TINT(item.category);
  const st = STATUS_TINT(item.status, c);
  const updated = fmtDate(item.updatedAt || item.modifiedAt || item.createdAt);

  return (
    <TouchableOpacity
      onPress={() => onPreview?.(item)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Preview template ${item.name}`}
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
        <ActionBtn c={c} icon="create-outline"  tint={c.primary} onPress={() => {}} accessibilityLabel="Edit template" />
        <ActionBtn c={c} icon="copy-outline"    tint={c.primary} onPress={() => onCopy(item)} accessibilityLabel="Copy template body" />
        <ActionBtn c={c} icon="paper-plane-outline" tint={c.primary} onPress={() => onUse(item)} accessibilityLabel="Use in campaign" />
        <ActionBtn c={c} icon="trash-outline"   tint={c.danger}  onPress={() => {}} accessibilityLabel="Delete template" />
      </View>
    </TouchableOpacity>
  );
}

function ActionBtn({ c, icon, tint, onPress, accessibilityLabel }) {
  return (
    <TouchableOpacity
      onPress={(e) => {
        // Prevent the row's outer Pressable (preview opener) from also
        // firing when the user taps an action icon.
        e?.stopPropagation?.();
        onPress?.();
      }}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="flex-1 h-8 rounded-[8px] items-center justify-center"
      style={{ borderWidth: 1, borderColor: tint + '55', backgroundColor: tint + '10' }}
    >
      <Ionicons name={icon} size={13} color={tint} />
    </TouchableOpacity>
  );
}
