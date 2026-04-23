// src/screens/InboxScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, Radii } from '../theme';
import { SearchBar, ChannelTag, Avatar, EmptyState, LoadingSpinner } from '../components';
import { useDispatch, useSelector } from 'react-redux';
import { WhatsAppAPI } from '../services/api';
import { setConversations as setConversationsAction } from '../store/slices/conversationsSlice';

const FILTERS = ['All', 'WhatsApp', 'RCS', 'SMS', 'Unread', 'Mine'];

const MOCK_CONVERSATIONS = [
  { id: '1', name: 'Acme Corp', emoji: '🏢', avatarColor: 'rgba(37,211,102,0.12)', channel: 'whatsapp', lastMsg: 'Hi, we need to renew our WhatsApp API plan…', time: 'Just now', unread: 3, online: true },
  { id: '2', name: 'Riya Sharma', emoji: '👩‍💼', avatarColor: 'rgba(83,74,183,0.12)', channel: 'sms', lastMsg: 'Your OTP is 847261. Do not share with anyone.', time: '2m', unread: 0, online: false },
  { id: '3', name: 'Priya — ExtraEdge', emoji: '🎓', avatarColor: 'rgba(240,150,50,0.12)', channel: 'whatsapp', lastMsg: 'Is the IVR flow active for Maharashtra circle?', time: '14m', unread: 1, online: true },
  { id: '4', name: 'HDFC Integration', emoji: '🏦', avatarColor: 'rgba(59,130,246,0.12)', channel: 'rcs', lastMsg: 'Webhook delivery logs for March batch ✓', time: '1h', unread: 0, online: false },
  { id: '5', name: 'Flipkart Campaign', emoji: '🛒', avatarColor: 'rgba(212,83,126,0.12)', channel: 'whatsapp', lastMsg: 'Campaign delivered to 45,200 users — 94% open', time: '3h', unread: 0, online: false },
  { id: '6', name: 'Apollo Hospital', emoji: '🏥', avatarColor: 'rgba(37,211,102,0.12)', channel: 'sms', lastMsg: 'Appointment reminders sent for tomorrow slots', time: '5h', unread: 0, online: false },
  { id: '7', name: 'LeadSquared Bot', emoji: '🎯', avatarColor: 'rgba(83,74,183,0.12)', channel: 'whatsapp', lastMsg: 'New lead: +91 8765432109 from Gujarat', time: 'Yesterday', unread: 0, online: false },
  { id: '8', name: 'Jio OTP Gateway', emoji: '📱', avatarColor: 'rgba(240,150,50,0.12)', channel: 'sms', lastMsg: 'OTP delivered: 2,147 messages today · 99.1%', time: 'Yesterday', unread: 0, online: false },
];

// ── Chat Row ───────────────────────────────────────────────
const ChatRow = ({ item, onPress }) => (
  <TouchableOpacity style={styles.chatRow} onPress={onPress} activeOpacity={0.75}>
    <View style={{ position: 'relative' }}>
      <Avatar emoji={item.emoji} color={item.avatarColor} size={50} radius={16} />
      {item.online && <View style={styles.onlineDot} />}
    </View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <View style={styles.chatRowTop}>
        <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.chatTime}>{item.time}</Text>
      </View>
      <Text style={styles.chatMsg} numberOfLines={1}>{item.lastMsg}</Text>
      <View style={styles.chatRowBottom}>
        <ChannelTag channel={item.channel} />
        {item.unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unread}</Text>
          </View>
        )}
      </View>
    </View>
  </TouchableOpacity>
);

// ── Main Inbox ─────────────────────────────────────────────
export default function InboxScreen({ navigation }) {
  const dispatch = useDispatch();
  const conversations = useSelector((s) => s.conversations.list);
  const setConversations = (list) => dispatch(setConversationsAction(list));
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(conversations.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await WhatsAppAPI.getConversations({ channel: filter.toLowerCase() === 'all' ? undefined : filter.toLowerCase() });
      setConversations(res?.data || MOCK_CONVERSATIONS);
    } catch {
      setConversations(MOCK_CONVERSATIONS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const filtered = conversations.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All'
      || (filter === 'Unread' && c.unread > 0)
      || c.channel.toLowerCase() === filter.toLowerCase();
    return matchSearch && matchFilter;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inbox</Text>
          <Text style={styles.subtitle}>
            {conversations.filter(c => c.unread > 0).length} unread · All channels
          </Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon}><Text style={{ fontSize: 16 }}>🔍</Text></TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}><Text style={{ fontSize: 16 }}>⚙️</Text></TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search contacts, messages…"
      />

      {/* Filter chips */}
      <View style={styles.filterRow}>
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={i => i}
          contentContainerStyle={{ paddingHorizontal: Spacing.base, gap: 6 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, filter === item && styles.filterChipActive]}
              onPress={() => setFilter(item)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipText, filter === item && styles.filterChipTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Chat list */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <ChatRow
            item={item}
            onPress={() => navigation.navigate('Chat', { conversation: item })}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchConversations(); }} tintColor={Colors.primary} />}
        ListEmptyComponent={<EmptyState emoji="📭" title="No conversations" subtitle="Messages will appear here" />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Chat', { newChat: true })}
        activeOpacity={0.85}
      >
        <Text style={{ fontSize: 22, color: Colors.white }}>✏️</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: 56, paddingBottom: 8, backgroundColor: Colors.card },
  title: { fontSize: FontSizes.xxl, fontFamily: Fonts.bold, color: Colors.textDark },
  subtitle: { fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: 2 },
  headerIcons: { flexDirection: 'row', gap: 8 },
  headerIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  filterRow: { paddingVertical: 6, backgroundColor: Colors.card },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: Radii.full, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.textMuted },
  filterChipTextActive: { color: Colors.white },
  chatRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.base, paddingVertical: 12, backgroundColor: Colors.card },
  chatRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: Colors.textDark, flex: 1 },
  chatTime: { fontSize: FontSizes.xs, color: Colors.textMuted },
  chatMsg: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  chatRowBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.whatsapp, borderWidth: 2, borderColor: Colors.card },
  unreadBadge: { backgroundColor: Colors.whatsapp, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  unreadText: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.white },
  separator: { height: 1, backgroundColor: Colors.divider, marginLeft: 78 },
  fab: { position: 'absolute', bottom: 90, right: 20, width: 54, height: 54, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8 },
});
