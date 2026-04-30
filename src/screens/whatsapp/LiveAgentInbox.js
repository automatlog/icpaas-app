// src/screens/whatsapp/LiveAgentInbox.js
//
// Real-data WhatsApp Live Agent inbox. Mirrors the visual language of the
// existing mock InboxScreen but is fully driven by liveChatSlice + OmniApp's
// REST + SignalR. Mock screen stays untouched until v1 ships.
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  RefreshControl, ActivityIndicator, Platform, useColorScheme,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectChannels,
  selectSelectedChannel,
  selectCounts,
  selectChatList,
  selectConnection,
  setSelectedChannel,
  setFilter,
  setSearch as setSearchAction,
} from '../../store/slices/liveChatSlice';
import {
  loadChannels,
  loadCounts,
  loadChatList,
  loadMoreChatList,
} from '../../services/liveChatActions';

const FILTERS = [
  { id: 'All',        label: 'All',        countKey: 'AllCount' },
  { id: 'UnRead',     label: 'Unread',     countKey: 'UnReadChatCount' },
  { id: 'Assigned',   label: 'Assigned',   countKey: 'AssignedCount' },
  { id: 'UnAssigned', label: 'Unassigned', countKey: 'UnAssignedCount' },
  { id: 'Replied',    label: 'Replied',    countKey: 'RepliedChatCount' },
  { id: 'archive',    label: 'Archive',    countKey: null },
];

const C = {
  dark:  { bg: '#0A0A0D', bgSoft: '#141418', bgInput: '#1C1C22', ink: '#FFFFFF', muted: '#9A9AA2', dim: '#5C5C63', pink: '#FF4D7E', green: '#4BD08D', amber: '#F0B95C', red: '#FF5A5F', teal: '#2094ab' },
  light: { bg: '#FAFAFB', bgSoft: '#F2F2F5', bgInput: '#ECECEF', ink: '#0A0A0D', muted: '#5C5C63', dim: '#9A9AA2', pink: '#E6428A', green: '#22C55E', amber: '#D9942C', red: '#E54B4B', teal: '#175a6e' },
};

const initialsOf = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
};

const ConnectionPill = ({ status, c }) => {
  const palette = {
    connected:    { bg: c.green, label: 'live' },
    connecting:   { bg: c.amber, label: 'connecting' },
    reconnecting: { bg: c.amber, label: 'reconnecting' },
    disconnected: { bg: c.red,   label: 'offline' },
    idle:         { bg: c.dim,   label: 'idle' },
  }[status] || { bg: c.dim, label: status || 'idle' };

  return (
    <View
      className="flex-row items-center px-2 py-0.5 rounded-full"
      style={{ backgroundColor: palette.bg + '22', gap: 5 }}
    >
      <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: palette.bg }} />
      <Text className="text-[10px] font-bold" style={{ color: palette.bg, letterSpacing: 0.4, textTransform: 'uppercase' }}>
        {palette.label}
      </Text>
    </View>
  );
};

export default function LiveAgentInbox({ navigation }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;

  const dispatch = useDispatch();
  const channels = useSelector(selectChannels);
  const selectedChannel = useSelector(selectSelectedChannel);
  const counts = useSelector(selectCounts);
  const chatList = useSelector(selectChatList);
  const connection = useSelector(selectConnection);

  const [searchInput, setSearchInput] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const debounceRef = useRef(null);

  const filter = chatList.filter;

  // First load: channels + initial chat data.
  useEffect(() => {
    dispatch(loadChannels());
    dispatch(loadCounts({ channel: selectedChannel, chatType: filter }));
    dispatch(loadChatList({ channel: selectedChannel, chatType: filter, search: '' }));
    // We intentionally only run this on mount; later effects react to filter/channel/search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to filter/channel/search changes.
  const refetch = useCallback((overrides = {}) => {
    const channel  = overrides.channel  ?? selectedChannel;
    const chatType = overrides.chatType ?? filter;
    const search   = overrides.search   ?? chatList.search;
    dispatch(loadCounts({ channel, chatType }));
    dispatch(loadChatList({ channel, chatType, search }));
  }, [dispatch, selectedChannel, filter, chatList.search]);

  const onChannelChange = (waba) => {
    if (waba === selectedChannel) return;
    dispatch(setSelectedChannel(waba));
    refetch({ channel: waba });
  };

  const onFilterChange = (id) => {
    if (id === filter) return;
    dispatch(setFilter(id));
    refetch({ chatType: id });
  };

  const onSearchChange = (text) => {
    setSearchInput(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatch(setSearchAction(text));
      refetch({ search: text });
    }, 300);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(loadCounts({ channel: selectedChannel, chatType: filter })),
      dispatch(loadChatList({ channel: selectedChannel, chatType: filter, search: chatList.search })),
    ]);
    setRefreshing(false);
  };

  const onEndReached = () => {
    if (chatList.loading) return;
    if (chatList.pageIndex >= chatList.totalPages) return;
    dispatch(loadMoreChatList({
      channel: selectedChannel,
      chatType: filter,
      search: chatList.search,
      pageIndex: chatList.pageIndex + 1,
    }));
  };

  const channelOptions = useMemo(() => {
    return [{ id: 'All', label: 'All channels' },
      ...channels.map((ch) => ({
        id: ch.WABANumber || ch.wabaNumber || ch.PhoneNumber || ch.phoneNumber,
        label: ch.DisplayName || ch.displayName || ch.WABANumber || ch.wabaNumber,
      })).filter((opt) => opt.id),
    ];
  }, [channels]);

  const rootBg = dark ? 'bg-[#0A0A0D]' : 'bg-white';
  const softBg = dark ? 'bg-[#141418]' : 'bg-[#F2F2F5]';
  const textInk = dark ? 'text-white' : 'text-[#0A0A0D]';
  const textMuted = dark ? 'text-[#9A9AA2]' : 'text-[#5C5C63]';
  const textDim = dark ? 'text-[#5C5C63]' : 'text-[#9A9AA2]';

  const totalUnread = counts.UnReadChatCount || 0;

  return (
    <View className={`flex-1 ${rootBg}`}>
      <View style={{ paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 22 }}>
        {/* Header */}
        <View className="flex-row items-center mb-4" style={{ gap: 10 }}>
          <TouchableOpacity
            className={`w-[42px] h-[42px] rounded-full items-center justify-center ${softBg}`}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={c.ink} />
          </TouchableOpacity>
          <View className="flex-1">
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Text className={`text-[26px] font-bold tracking-tight ${textInk}`}>WhatsApp Live</Text>
              <ConnectionPill status={connection.status} c={c} />
            </View>
            <Text className={`text-[11px] ${textMuted}`}>
              {totalUnread} unread · {selectedChannel === 'All' ? 'all channels' : selectedChannel}
            </Text>
          </View>
        </View>

        {/* Channel selector */}
        {channelOptions.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingBottom: 10 }}
          >
            {channelOptions.map((opt) => {
              const active = opt.id === selectedChannel;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => onChannelChange(opt.id)}
                  activeOpacity={0.85}
                  className="flex-row items-center py-2 px-3 rounded-[14px]"
                  style={{
                    backgroundColor: active ? c.teal + '22' : (dark ? '#141418' : '#F2F2F5'),
                    borderWidth: 1,
                    borderColor: active ? c.teal : 'transparent',
                    gap: 6,
                  }}
                >
                  <Ionicons name="logo-whatsapp" size={11} color={active ? c.teal : c.muted} />
                  <Text
                    className="text-[11px]"
                    style={{ color: active ? c.teal : c.muted, fontWeight: active ? '700' : '500' }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Search */}
        <View className={`flex-row items-center rounded-[20px] px-4 mb-3 ${softBg}`} style={{ gap: 10 }}>
          <Ionicons name="search-outline" size={16} color={c.muted} />
          <TextInput
            value={searchInput}
            onChangeText={onSearchChange}
            placeholder="Search by name or number"
            placeholderTextColor={c.muted}
            className={`flex-1 py-3 text-sm ${textInk}`}
            style={Platform.select({ web: { outlineStyle: 'none' } })}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')} activeOpacity={0.6}>
              <Ionicons name="close-circle" size={16} color={c.muted} />
            </TouchableOpacity>
          )}
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
            const count = item.countKey ? counts[item.countKey] || 0 : null;
            return (
              <TouchableOpacity
                onPress={() => onFilterChange(item.id)}
                activeOpacity={0.85}
                className="flex-row items-center py-2 px-3.5 rounded-[16px]"
                style={{ backgroundColor: active ? c.ink : (dark ? '#141418' : '#F2F2F5'), gap: 6 }}
              >
                <Text className="text-xs" style={{ color: active ? c.bg : c.muted, fontWeight: active ? '700' : '500' }}>
                  {item.label}
                </Text>
                {count != null && count > 0 && (
                  <View
                    className="rounded-full px-1.5"
                    style={{ backgroundColor: active ? c.bg + '22' : c.muted + '22' }}
                  >
                    <Text className="text-[10px] font-bold" style={{ color: active ? c.bg : c.muted }}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      {chatList.loading && chatList.items.length === 0 ? (
        <View className="flex-1 items-center justify-center" style={{ gap: 10 }}>
          <ActivityIndicator color={c.teal} />
          <Text className={`text-xs tracking-widest uppercase ${textMuted}`}>loading inbox</Text>
        </View>
      ) : (
        <FlatList
          data={chatList.items}
          keyExtractor={(item, idx) => String(item.WANumber || item.wa_id || item.WAInboxId || idx)}
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 120, paddingTop: 4 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.teal} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            chatList.loading && chatList.items.length > 0 ? (
              <View className="py-4 items-center">
                <ActivityIndicator color={c.teal} />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const waId   = item.WANumber || item.wa_id;
            const name   = item.ProfileName || waId;
            const last   = item.LastUserMessage || '';
            const time   = formatTime(item.LastMessageOn);
            const unread = item.UnReadCount || 0;
            const channel = item.WABANumber;
            return (
              <TouchableOpacity
                onPress={() => navigation.navigate('LiveAgentChat', {
                  waId, channel, profileName: name,
                })}
                activeOpacity={0.85}
                className={`flex-row items-center rounded-[20px] p-3 mb-2.5 ${softBg}`}
                style={{ gap: 12, borderWidth: 1, borderColor: c.bgInput }}
              >
                <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: c.teal + '33' }}>
                  <Text className="text-sm font-bold" style={{ color: c.teal }}>{initialsOf(name)}</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className={`text-[15px] font-semibold flex-1 ${textInk}`} numberOfLines={1}>{name}</Text>
                    <Text className={`text-[11px] ${textMuted}`}>{time}</Text>
                  </View>
                  <View className="flex-row items-center mt-0.5" style={{ gap: 6 }}>
                    <Ionicons name="logo-whatsapp" size={11} color={c.muted} />
                    <Text className={`flex-1 text-xs ${textMuted}`} numberOfLines={1}>{last}</Text>
                    {unread > 0 && (
                      <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: c.teal }}>
                        <Text className="text-[10px] font-bold" style={{ color: '#FFFFFF' }}>{unread}</Text>
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
              <Text className={`text-xs ${textDim}`}>
                {connection.status === 'disconnected'
                  ? 'Offline — pull to retry when connection returns.'
                  : 'New chats appear here in real time.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
