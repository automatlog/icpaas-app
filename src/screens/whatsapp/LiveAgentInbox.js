// src/screens/whatsapp/LiveAgentInbox.js
//
// Live Agent inbox — the canonical inbox for WhatsApp + RCS conversations.
// Real-data, fully wired to liveChatSlice + OmniApp REST + SignalR.
//
// Visual language matches icpaas.in /WAMessage/UserLiveChat/Index:
//   - ScreenHeader (channel-tinted icon + "Live Agent" title + connection
//     pill in the right slot)
//   - Channel chip row (per WABA channel)
//   - Search with clear button
//   - Filter chip row (All / Unread / Assigned / Unassigned / Replied / Archive)
//   - List rows: tinted-bg circular avatar + name + last message + time
//     top-right + red unread badge bottom-right
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  RefreshControl, ActivityIndicator, Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useBrand } from '../../theme';
import ScreenHeader from '../../components/ScreenHeader';
import { SkeletonRow } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
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

// Avatar tints per the icpaas.in conversation list — deterministic per
// contact name so the same person reads the same colour across reloads.
const AVATAR_TINTS = ['#0BB783', '#D4B500', '#5BA0E5', '#EF4444', '#10B981', '#A855F7', '#F59E0B'];
const tintFor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
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
    connected:    { bg: c.success || '#22C55E', label: 'live' },
    connecting:   { bg: '#F0B95C',              label: 'connecting' },
    reconnecting: { bg: '#F0B95C',              label: 'reconnecting' },
    disconnected: { bg: c.danger  || '#E54B4B', label: 'offline' },
    idle:         { bg: c.textMuted,            label: 'idle' },
  }[status] || { bg: c.textMuted, label: status || 'idle' };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        gap: 5,
        backgroundColor: palette.bg + '22',
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: palette.bg }} />
      <Text style={{ color: palette.bg, fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' }}>
        {palette.label}
      </Text>
    </View>
  );
};

export default function LiveAgentInbox({ navigation, route }) {
  const c = useBrand();
  const channelKey = route?.params?.channel || 'whatsapp';

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

  const totalUnread = counts.UnReadChatCount || 0;
  const isWhatsApp = channelKey === 'whatsapp';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        icon={isWhatsApp ? 'logo-whatsapp' : 'logo-google'}
        title="Live Agent"
        badge={isWhatsApp ? 'WhatsApp' : 'RCS'}
        subtitle={`${totalUnread} unread · ${selectedChannel === 'All' ? 'all channels' : selectedChannel}`}
        right={<ConnectionPill status={connection.status} c={c} />}
      />

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        {/* Channel selector — visible only when more than one WABA is wired */}
        {channelOptions.length > 1 ? (
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
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 7,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    backgroundColor: active ? c.primarySoft : c.bgInput,
                    borderWidth: 1,
                    borderColor: active ? c.primary : 'transparent',
                    gap: 6,
                  }}
                >
                  <Ionicons name="logo-whatsapp" size={11} color={active ? c.primary : c.textMuted} />
                  <Text style={{ color: active ? c.primary : c.textMuted, fontSize: 11, fontWeight: active ? '700' : '500' }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        {/* Search */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.bgCard,
            paddingHorizontal: 12,
            marginBottom: 8,
            gap: 8,
          }}
        >
          <Ionicons name="search-outline" size={15} color={c.textMuted} />
          <TextInput
            value={searchInput}
            onChangeText={onSearchChange}
            placeholder="Search by name or number"
            placeholderTextColor={c.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              { flex: 1, fontSize: 13, color: c.text, paddingVertical: 10 },
              Platform.select({ web: { outlineStyle: 'none' } }),
            ]}
          />
          {searchInput.length > 0 ? (
            <TouchableOpacity onPress={() => onSearchChange('')} activeOpacity={0.6}>
              <Ionicons name="close-circle" size={16} color={c.textMuted} />
            </TouchableOpacity>
          ) : null}
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
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 7,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  gap: 6,
                  backgroundColor: active ? c.text : c.bgInput,
                }}
              >
                <Text style={{ color: active ? c.bg : c.textMuted, fontSize: 12, fontWeight: active ? '700' : '500' }}>
                  {item.label}
                </Text>
                {count != null && count > 0 ? (
                  <View
                    style={{
                      paddingHorizontal: 6,
                      borderRadius: 999,
                      backgroundColor: active ? c.bg + '33' : c.textMuted + '22',
                    }}
                  >
                    <Text style={{ color: active ? c.bg : c.textMuted, fontSize: 10, fontWeight: '700' }}>
                      {count}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      {chatList.loading && chatList.items.length === 0 ? (
        <View style={{ flex: 1 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonRow key={i} c={c} />
          ))}
        </View>
      ) : (
        <FlatList
          data={chatList.items}
          keyExtractor={(item, idx) => String(item.WANumber || item.wa_id || item.WAInboxId || idx)}
          contentContainerStyle={{ paddingBottom: 130 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          // Each row is a fixed-height card (avatar 44 + paddingVertical 14×2
          // = 72) plus a 1-px separator between rows. Hard-coding the layout
          // lets RN skip the measure pass on every scroll tick — meaningful
          // for inboxes with hundreds of rows.
          getItemLayout={(_, index) => ({ length: 72, offset: 73 * index, index })}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: c.rule, marginLeft: 76 }} />
          )}
          ListFooterComponent={
            chatList.loading && chatList.items.length > 0 ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator color={c.primary} />
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
            const tint = tintFor(name || '');
            return (
              <TouchableOpacity
                onPress={() => navigation.navigate('LiveAgentChat', {
                  waId, channel, profileName: name,
                })}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 44, height: 44, borderRadius: 22,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: tint,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                    {initialsOf(name)}
                  </Text>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text numberOfLines={1} style={{ flex: 1, color: c.text, fontSize: 14, fontWeight: '700' }}>
                      {name}
                    </Text>
                    <Text style={{ color: c.textMuted, fontSize: 11 }}>{time}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text numberOfLines={1} style={{ flex: 1, color: c.textMuted, fontSize: 12 }}>
                      {last}
                    </Text>
                    {unread > 0 ? (
                      <View
                        style={{
                          minWidth: 20, height: 20, borderRadius: 10,
                          paddingHorizontal: 6,
                          backgroundColor: c.danger,
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>
                          {unread > 99 ? '99+' : unread}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              c={c}
              icon="chatbubble-ellipses-outline"
              accentIcons={['logo-whatsapp', 'logo-google']}
              title="No conversations yet"
              subtitle={
                connection.status === 'disconnected'
                  ? 'Offline — pull to retry when the connection comes back.'
                  : 'Inbound WhatsApp and RCS messages will appear here in real time.'
              }
            />
          }
        />
      )}
    </View>
  );
}
