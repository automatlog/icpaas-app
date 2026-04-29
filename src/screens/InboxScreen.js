// src/screens/InboxScreen.js — WhatsApp/omni inbox (NativeWind)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  RefreshControl, ActivityIndicator, Platform, useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { WhatsAppAPI } from '../services/api';
import { setConversations as setConversationsAction } from '../store/slices/conversationsSlice';

const FILTERS = [
  { id: 'All', icon: 'apps-outline' },
  { id: 'WhatsApp', icon: 'logo-whatsapp' },
  { id: 'SMS', icon: 'chatbubble-outline' },
  { id: 'RCS', icon: 'card-outline' },
  { id: 'Unread', icon: 'mail-unread-outline' },
];

const CHANNEL_TINT = {
  whatsapp: '#8FCFBD',
  sms: '#F2A8B3',
  rcs: '#D4B3E8',
  ivr: '#E8D080',
};

const CHANNEL_ICON = {
  whatsapp: 'logo-whatsapp',
  sms: 'chatbubble-outline',
  rcs: 'card-outline',
  ivr: 'call-outline',
};

const MOCK_CONVERSATIONS = [
  { id: '1', name: 'Acme Corp',             channel: 'whatsapp', lastMsg: 'Hi, we need to renew our WhatsApp API plan…', time: 'Just now', unread: 3, online: true },
  { id: '2', name: 'Riya Sharma',           channel: 'sms',      lastMsg: 'Your OTP is 847261. Do not share.',           time: '2m',       unread: 0, online: false },
  { id: '3', name: 'Priya — ExtraEdge',     channel: 'whatsapp', lastMsg: 'Is the IVR flow active for Maharashtra?',     time: '14m',      unread: 1, online: true },
  { id: '4', name: 'HDFC Integration',      channel: 'rcs',      lastMsg: 'Webhook delivery logs for March batch ✓',     time: '1h',       unread: 0, online: false },
  { id: '5', name: 'Flipkart Campaign',     channel: 'whatsapp', lastMsg: 'Campaign delivered to 45,200 users — 94%',    time: '3h',       unread: 0, online: false },
  { id: '6', name: 'Apollo Hospital',       channel: 'sms',      lastMsg: 'Appointment reminders sent for tomorrow',     time: '5h',       unread: 0, online: false },
  { id: '7', name: 'LeadSquared Bot',       channel: 'whatsapp', lastMsg: 'New lead: +91 8765432109 from Gujarat',       time: 'Yesterday', unread: 0, online: false },
  { id: '8', name: 'Jio OTP Gateway',       channel: 'sms',      lastMsg: 'OTP delivered: 2,147 messages · 99.1%',       time: 'Yesterday', unread: 0, online: false },
];

const C = {
  dark:  { bg: '#0A0A0D', bgSoft: '#141418', bgInput: '#1C1C22', ink: '#FFFFFF', muted: '#9A9AA2', dim: '#5C5C63', pink: '#FF4D7E', green: '#4BD08D', gradA: '#FF4D7E', gradB: '#FF8A3D', gradC: '#B765E8' },
  light: { bg: '#FAFAFB', bgSoft: '#F2F2F5', bgInput: '#ECECEF', ink: '#0A0A0D', muted: '#5C5C63', dim: '#9A9AA2', pink: '#E6428A', green: '#22C55E', gradA: '#E6428A', gradB: '#FF7A22', gradC: '#9A47D4' },
};

const initialsOf = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

export default function InboxScreen({ navigation }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;

  const dispatch = useDispatch();
  const conversations = useSelector((s) => s.conversations.list);
  const setConversations = (list) => dispatch(setConversationsAction(list));

  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(conversations.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await WhatsAppAPI.getConversations({ channel: filter === 'All' ? undefined : filter.toLowerCase() });
      setConversations(res?.data || MOCK_CONVERSATIONS);
    } catch {
      setConversations(MOCK_CONVERSATIONS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const filtered = conversations.filter((cv) => {
    const matchSearch = !search || cv.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'All' ||
      (filter === 'Unread' && cv.unread > 0) ||
      cv.channel?.toLowerCase() === filter.toLowerCase();
    return matchSearch && matchFilter;
  });

  const unreadCount = conversations.filter((cv) => cv.unread > 0).length;

  const rootBg = dark ? 'bg-[#0A0A0D]' : 'bg-white';
  const softBg = dark ? 'bg-[#141418]' : 'bg-[#F2F2F5]';
  const textInk = dark ? 'text-white' : 'text-[#0A0A0D]';
  const textMuted = dark ? 'text-[#9A9AA2]' : 'text-[#5C5C63]';
  const textDim = dark ? 'text-[#5C5C63]' : 'text-[#9A9AA2]';

  return (
    <View className={`flex-1 ${rootBg}`}>
      <View style={{ paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 22 }}>
        {/* Header */}
        <View className="flex-row items-center mb-4" style={{ gap: 10 }}>
          <TouchableOpacity className={`w-[42px] h-[42px] rounded-full items-center justify-center ${softBg}`} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={c.ink} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className={`text-[28px] font-bold tracking-tight ${textInk}`}>Inbox</Text>
            <Text className={`text-xs ${textMuted}`}>{unreadCount} unread · All channels</Text>
          </View>
          <TouchableOpacity className={`w-[42px] h-[42px] rounded-full items-center justify-center ${softBg}`} activeOpacity={0.7} onPress={() => navigation.navigate('Send')}>
            <Ionicons name="create-outline" size={18} color={c.ink} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className={`flex-row items-center rounded-[20px] px-4 mb-3 ${softBg}`} style={{ gap: 10 }}>
          <Ionicons name="search-outline" size={16} color={c.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search contacts or messages"
            placeholderTextColor={c.muted}
            className={`flex-1 py-3 text-sm ${textInk}`}
            style={Platform.select({ web: { outlineStyle: 'none' } })}
          />
        </View>

        {/* Filter chips */}
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ gap: 6, paddingBottom: 10 }}
          renderItem={({ item }) => {
            const active = filter === item.id;
            return (
              <TouchableOpacity
                onPress={() => setFilter(item.id)}
                activeOpacity={0.8}
                className="flex-row items-center py-2 px-3.5 rounded-[16px]"
                style={{ backgroundColor: active ? c.ink : (dark ? '#141418' : '#F2F2F5'), gap: 6 }}
              >
                <Ionicons name={item.icon} size={12} color={active ? c.bg : c.muted} />
                <Text className="text-xs" style={{ color: active ? c.bg : c.muted, fontWeight: active ? '700' : '500' }}>
                  {item.id}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      {loading ? (
        <View className="flex-1 items-center justify-center" style={{ gap: 10 }}>
          <ActivityIndicator color={c.pink} />
          <Text className={`text-xs tracking-widest uppercase ${textMuted}`}>loading inbox</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 120, paddingTop: 4 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchConversations(); }} tintColor={c.pink} />}
          renderItem={({ item }) => {
            const ch = String(item.channel || '').toLowerCase();
            const tint = CHANNEL_TINT[ch] || '#E8B799';
            const icon = CHANNEL_ICON[ch] || 'chatbubble-outline';
            return (
              <TouchableOpacity
                onPress={() => navigation.navigate('Chat', { conversation: item })}
                activeOpacity={0.8}
                className={`flex-row items-center rounded-[20px] p-3 mb-2.5 ${softBg}`}
                style={{ gap: 12, borderWidth: 1, borderColor: c.bgInput }}
              >
                <View className="relative">
                  <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: tint }}>
                    <Text className="text-sm font-bold" style={{ color: '#0A0A0D' }}>{initialsOf(item.name)}</Text>
                  </View>
                  {item.online && (
                    <View
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
                      style={{ backgroundColor: c.green, borderWidth: 2, borderColor: c.bgSoft }}
                    />
                  )}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className={`text-[15px] font-semibold flex-1 ${textInk}`} numberOfLines={1}>{item.name}</Text>
                    <Text className={`text-[11px] ${textMuted}`}>{item.time}</Text>
                  </View>
                  <View className="flex-row items-center mt-0.5" style={{ gap: 6 }}>
                    <Ionicons name={icon} size={11} color={c.muted} />
                    <Text className={`flex-1 text-xs ${textMuted}`} numberOfLines={1}>{item.lastMsg}</Text>
                    {item.unread > 0 && (
                      <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: c.green }}>
                        <Text className="text-[10px] font-bold" style={{ color: '#0A0A0D' }}>{item.unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="items-center py-16" style={{ gap: 8 }}>
              <Ionicons name="mail-outline" size={36} color={c.dim} />
              <Text className={`text-[15px] font-semibold ${textInk}`}>No conversations</Text>
              <Text className={`text-xs ${textDim}`}>Messages will appear here</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Send')}
        activeOpacity={0.88}
        className="absolute bottom-8 right-6 w-14 h-14 rounded-[18px] items-center justify-center"
        style={{ backgroundColor: c.ink, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8 }}
      >
        <Ionicons name="create" size={22} color={c.bg} />
      </TouchableOpacity>
    </View>
  );
}
