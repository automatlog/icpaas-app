// src/screens/whatsapp/InboxScreen.js — Live Agent Inbox.
// Mirrors the icpaas.in WAMessage/UserLiveChat/Index layout:
//   - Top header (channel avatar + name + active filter chip + kebab)
//   - Filter row: "All (N)" dropdown + search input
//   - Conversation list: tinted-bg circular avatar + name + last message,
//     time top-right, red unread badge bottom-right
//   - Active row gets a green left-edge accent
//   - Pagination footer "1 - N of M"
//
// Accepts optional `route.params.channel` ('whatsapp' | 'rcs' | 'sms' |
// 'voice') to lock the inbox to a single product. Defaults to omni view.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  RefreshControl, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useBrand } from '../../theme';
import { WhatsAppAPI } from '../../services/api';
import { setConversations as setConversationsAction } from '../../store/slices/conversationsSlice';
import ScreenHeader from '../../components/ScreenHeader';

const PRODUCT = {
  whatsapp: { label: 'WhatsApp', icon: 'logo-whatsapp', tint: '#10B981' },
  rcs:      { label: 'RCS',      icon: 'logo-google',   tint: '#8B5CF6' },
  sms:      { label: 'SMS',      icon: 'chatbubble-outline', tint: '#0B8A6F' },
  voice:    { label: 'Voice',    icon: 'mic-outline',   tint: '#F59E0B' },
};

const FILTER_OPTIONS = [
  { id: 'All',      label: 'All' },
  { id: 'WhatsApp', label: 'WhatsApp' },
  { id: 'SMS',      label: 'SMS' },
  { id: 'RCS',      label: 'RCS' },
  { id: 'Unread',   label: 'Unread' },
];

// Avatar tints used by the icpaas.in conversation list. Stable per
// initials so the same contact reads the same colour across loads.
const AVATAR_TINTS = ['#0BB783', '#D4B500', '#5BA0E5', '#EF4444', '#10B981', '#A855F7', '#F59E0B'];

const MOCK_CONVERSATIONS = [
  { id: '1', name: 'Yogeshwar R Sharma',     channel: 'whatsapp', lastMsg: 'Welcome to the RDS Group Of...',  time: '46 min ago', unread: 2, online: true  },
  { id: '2', name: 'talent',                 channel: 'whatsapp', lastMsg: 'Hello',                            time: '12:43 PM',   unread: 0, online: false },
  { id: '3', name: 'CSC Computer Education', channel: 'whatsapp', lastMsg: 'Thank you for contacting...',     time: '08:49 AM',   unread: 1, online: false },
  { id: '4', name: 'Supportybs',             channel: 'whatsapp', lastMsg: 'Hi',                               time: 'Yesterday',  unread: 1, online: false },
  { id: '5', name: 'Amit',                   channel: 'whatsapp', lastMsg: 'https://icpaas.in',                time: 'Yesterday',  unread: 2, online: false },
];

const initialsOf = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

const tintFor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
};

export default function InboxScreen({ navigation, route }) {
  const c = useBrand();

  const lockedChannel = route?.params?.channel; // 'whatsapp' | 'rcs' | 'sms' | 'voice'
  const product = lockedChannel ? PRODUCT[lockedChannel] : null;

  const dispatch = useDispatch();
  const conversations = useSelector((s) => s.conversations.list);
  const setConversations = (list) => dispatch(setConversationsAction(list));

  const [filter, setFilter] = useState('All');
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(conversations.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await WhatsAppAPI.getConversations({
        channel: filter === 'All' ? undefined : filter.toLowerCase(),
      });
      setConversations(res?.data || MOCK_CONVERSATIONS);
    } catch {
      setConversations(MOCK_CONVERSATIONS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const filtered = useMemo(() => conversations.filter((cv) => {
    const matchSearch = !search || cv.name.toLowerCase().includes(search.toLowerCase());
    const matchProduct = !lockedChannel || cv.channel?.toLowerCase() === lockedChannel.toLowerCase();
    const matchFilter =
      filter === 'All' ||
      (filter === 'Unread' && cv.unread > 0) ||
      cv.channel?.toLowerCase() === filter.toLowerCase();
    return matchSearch && matchProduct && matchFilter;
  }), [conversations, search, filter, lockedChannel]);

  const filterCount = filtered.length;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        icon={product?.icon || 'chatbubbles-outline'}
        iconBg={product ? `${product.tint}22` : c.primarySoft}
        iconFg={product?.tint || c.primary}
        title={product?.label || 'Live Agent'}
        subtitle={{ text: 'All', dotColor: c.primary }}
        right={
          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={c.textMuted} />
          </TouchableOpacity>
        }
      />

      {/* Filter dropdown + search row (mirrors icpaas.in WALiveAgent header) */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setShowFilter((v) => !v)}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.bgCard,
              gap: 6,
              minWidth: 110,
            }}
          >
            <Text style={{ color: c.text, fontSize: 13, fontWeight: '600', flex: 1 }}>
              {filter} ({filterCount})
            </Text>
            <Ionicons name={showFilter ? 'chevron-up' : 'chevron-down'} size={14} color={c.textMuted} />
          </TouchableOpacity>

          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.bgCard,
              paddingHorizontal: 12,
              gap: 8,
            }}
          >
            <Ionicons name="search-outline" size={15} color={c.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search conversations..."
              placeholderTextColor={c.textMuted}
              style={[
                { flex: 1, fontSize: 13, color: c.text, paddingVertical: 10 },
                Platform.select({ web: { outlineStyle: 'none' } }),
              ]}
            />
          </View>
        </View>

        {showFilter ? (
          <View
            style={{
              backgroundColor: c.bgCard,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {FILTER_OPTIONS.map((opt, i) => {
              const active = filter === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => { setFilter(opt.id); setShowFilter(false); }}
                  activeOpacity={0.85}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: active ? c.primarySoft : 'transparent',
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: c.rule,
                    gap: 8,
                  }}
                >
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={14}
                    color={active ? c.primary : c.textMuted}
                  />
                  <Text style={{ color: c.text, fontSize: 13, fontWeight: active ? '700' : '500' }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* Conversation list */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <ActivityIndicator color={c.primary} />
          <Text style={{ color: c.textMuted, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }}>
            loading inbox
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 130 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchConversations(); }}
              tintColor={c.primary}
            />
          }
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: c.rule, marginLeft: 76 }} />
          )}
          renderItem={({ item }) => {
            const isActive = activeId === item.id;
            const tint = tintFor(item.name);
            return (
              <TouchableOpacity
                onPress={() => {
                  setActiveId(item.id);
                  navigation.navigate('Chat', { conversation: item });
                }}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  gap: 12,
                  backgroundColor: isActive ? c.primarySoft : 'transparent',
                  borderLeftWidth: isActive ? 3 : 0,
                  borderLeftColor: c.primary,
                }}
              >
                <View style={{ position: 'relative' }}>
                  <View
                    style={{
                      width: 44, height: 44, borderRadius: 22,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: tint,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                      {initialsOf(item.name)}
                    </Text>
                  </View>
                  {item.online ? (
                    <View
                      style={{
                        position: 'absolute',
                        bottom: -1, right: -1,
                        width: 11, height: 11, borderRadius: 6,
                        backgroundColor: c.success,
                        borderWidth: 2,
                        borderColor: c.bg,
                      }}
                    />
                  ) : null}
                </View>

                <View style={{ flex: 1, justifyContent: 'center', gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        color: c.text,
                        fontSize: 14,
                        fontWeight: '700',
                      }}
                    >
                      {item.name}
                    </Text>
                    <Text style={{ color: c.textMuted, fontSize: 11 }}>{item.time}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text
                      numberOfLines={1}
                      style={{ flex: 1, color: c.textMuted, fontSize: 12 }}
                    >
                      {item.lastMsg}
                    </Text>
                    {item.unread > 0 ? (
                      <View
                        style={{
                          minWidth: 20, height: 20, borderRadius: 10,
                          paddingHorizontal: 6,
                          backgroundColor: c.danger,
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>
                          {item.unread > 99 ? '99+' : item.unread}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 64, gap: 8 }}>
              <Ionicons name="mail-outline" size={36} color={c.textDim} />
              <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }}>No conversations</Text>
              <Text style={{ color: c.textDim, fontSize: 12 }}>Messages will appear here</Text>
            </View>
          }
          ListFooterComponent={
            filtered.length > 0 ? (
              <View
                style={{
                  paddingVertical: 14,
                  alignItems: 'center',
                  backgroundColor: c.bgSoft,
                  borderTopWidth: 1,
                  borderTopColor: c.rule,
                }}
              >
                <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: '600' }}>
                  1 - {filtered.length} of {conversations.length}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
