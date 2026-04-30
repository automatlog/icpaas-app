// src/screens/whatsapp/LiveAgentChat.js
//
// Real-data WhatsApp Live Agent conversation. Cursor-paginated history
// (loadOlderMessages on scroll-up), optimistic send via OmniApp's
// SendChatMessage multipart endpoint, delivery-status icons that upgrade
// in place as DeliveryStatusUpdate SignalR events arrive.
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import { LiveChatAPI, buildLiveChatTextForm } from '../../services/api';
import {
  selectThread,
  selectConnection,
  setActive,
  optimisticSend,
  sendResolved,
  sendFailed,
} from '../../store/slices/liveChatSlice';
import { loadMessages, loadOlderMessages } from '../../services/liveChatActions';

const C = {
  dark:  { bg: '#0A0A0D', bgSoft: '#141418', bgInput: '#1C1C22', ink: '#FFFFFF', muted: '#9A9AA2', dim: '#5C5C63', green: '#4BD08D', red: '#FF5A5F', cyan: '#5CD4E0', amber: '#F0B95C', teal: '#2094ab', bubbleMe: '#2094ab', bubbleMeText: '#FFFFFF' },
  light: { bg: '#FAFAFB', bgSoft: '#F2F2F5', bgInput: '#ECECEF', ink: '#0A0A0D', muted: '#5C5C63', dim: '#9A9AA2', green: '#22C55E', red: '#E54B4B', cyan: '#2FB8C4', amber: '#D9942C', teal: '#175a6e', bubbleMe: '#175a6e', bubbleMeText: '#FFFFFF' },
};

const initialsOf = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

// Maps OmniApp's DeliveryStatus enum to an icon + colour.
const StatusIcon = ({ status, c }) => {
  switch (status) {
    case 'Sending':
      return <ActivityIndicator size="small" color={c.muted} style={{ transform: [{ scale: 0.6 }] }} />;
    case 'Sent':
      return <Ionicons name="checkmark" size={13} color={c.muted} />;
    case 'Delivered':
      return <Ionicons name="checkmark-done" size={13} color={c.muted} />;
    case 'Read':
      return <Ionicons name="checkmark-done" size={13} color={c.cyan} />;
    case 'Failed':
      return <Ionicons name="alert-circle" size={13} color={c.red} />;
    default:
      return <Ionicons name="time-outline" size={12} color={c.muted} />;
  }
};

const EMPTY_THREAD = { messages: [], hasMore: false, loading: false, oldestId: null, channel: null };

// WhatsApp Cloud API allows free-form messages only within 24 h of the
// customer's last inbound. After that, only Meta-approved templates can be
// sent. Returns null when there's no inbound to anchor on.
//   open    → still inside the window, no banner
//   closing → less than 1 h remaining, amber warning
//   closed  → window expired, red banner; templates only
const computeServiceWindow = (messages = []) => {
  let lastInbound = null;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.ChatType === 'IN' && messages[i]?.ReceivedDate) {
      lastInbound = new Date(messages[i].ReceivedDate);
      break;
    }
  }
  if (!lastInbound || Number.isNaN(lastInbound.getTime())) return null;

  const elapsedMs = Date.now() - lastInbound.getTime();
  const windowMs = 24 * 60 * 60 * 1000;
  const remaining = windowMs - elapsedMs;

  if (remaining <= 0) return { state: 'closed', remainingMs: 0 };
  if (remaining <= 60 * 60 * 1000) return { state: 'closing', remainingMs: remaining };
  return { state: 'open', remainingMs: remaining };
};

const formatRemaining = (ms) => {
  const mins = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export default function LiveAgentChat({ route, navigation }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;

  const { waId, channel, profileName } = route?.params || {};
  const dispatch = useDispatch();
  const thread = useSelector(selectThread(waId)) || EMPTY_THREAD;
  const connection = useSelector(selectConnection);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const flatRef = useRef(null);

  // Mark this conversation active so the slice suppresses unread bumps for
  // incoming messages addressed to it. Reset on unmount.
  useEffect(() => {
    if (!waId) return;
    dispatch(setActive({ waId, channel }));
    dispatch(loadMessages({ waId, channel }));
    return () => {
      dispatch(setActive({ waId: null, channel: null }));
    };
  }, [dispatch, waId, channel]);

  // Inverted FlatList wants newest-first. Slice keeps oldest-first to match
  // the API; reverse only at render.
  const reversed = useMemo(() => {
    const list = thread.messages || [];
    // Defensive copy; reverse is in-place.
    return list.slice().reverse();
  }, [thread.messages]);

  // Recompute every minute so the countdown stays fresh.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);
  // Tick is read into the dep array so the memo recomputes each minute.
  const window24h = useMemo(
    () => computeServiceWindow(thread.messages),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [thread.messages, tick],
  );

  const onScrollUpToEnd = useCallback(() => {
    // With inverted=true, onEndReached fires when the user has scrolled to the
    // OLDEST end of the thread. Trigger cursor-based load.
    if (thread.loading) return;
    if (!thread.hasMore) return;
    if (!thread.oldestId) return;
    dispatch(loadOlderMessages({ waId, channel, oldestId: thread.oldestId }));
  }, [dispatch, waId, channel, thread.loading, thread.hasMore, thread.oldestId]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !waId || !channel) return;

    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const tempRow = {
      WAInboxId: tempId,
      MessageId: null,
      wa_id: waId,
      SenderNumber: waId,
      MessageText: text,
      MessageType: 'text',
      ChatType: 'OUT',
      DeliveryStatus: 'Sending',
      ReceivedDate: new Date().toISOString(),
      WABANumber: channel,
    };
    dispatch(optimisticSend({ waId, row: tempRow }));
    setInput('');

    // After dispatch, the new row is at the END of the messages array (oldest-
    // first), which means index 0 of `reversed`. Inverted list shows that at
    // the visual bottom — so scroll-to-offset-0 keeps the user pinned to the
    // newest message.
    setTimeout(() => flatRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);

    try {
      const fd = buildLiveChatTextForm({ number: waId, channel, message: text });
      const res = await LiveChatAPI.sendMessage(fd);
      const ok = res?.Success ?? res?.success ?? false;
      if (ok) {
        dispatch(sendResolved({ tempId, waId, patch: { DeliveryStatus: 'Sent' } }));
      } else {
        dispatch(sendFailed({
          tempId,
          waId,
          error: res?.Message || res?.message || 'Send failed',
        }));
      }
    } catch (e) {
      dispatch(sendFailed({
        tempId,
        waId,
        error: e?.message || 'Send failed',
      }));
    } finally {
      setSending(false);
    }
  };

  const rootBg = dark ? 'bg-[#0A0A0D]' : 'bg-white';
  const softBg = dark ? 'bg-[#141418]' : 'bg-[#F2F2F5]';
  const inputBg = dark ? 'bg-[#1C1C22]' : 'bg-[#ECECEF]';
  const textInk = dark ? 'text-white' : 'text-[#0A0A0D]';
  const textMuted = dark ? 'text-[#9A9AA2]' : 'text-[#5C5C63]';

  const renderItem = ({ item }) => {
    const me = item.ChatType === 'OUT';
    const text = item.MessageText || '';
    const time = item.ReceivedDate ? moment(item.ReceivedDate).format('h:mm A') : '';
    return (
      <View className={`mb-2 ${me ? 'items-end' : 'items-start'}`}>
        <View
          className="rounded-[18px] px-3.5 py-2.5 max-w-[82%]"
          style={{
            backgroundColor: me ? c.bubbleMe : (dark ? '#141418' : '#F2F2F5'),
            borderWidth: item.DeliveryStatus === 'Failed' ? 1 : 0,
            borderColor: item.DeliveryStatus === 'Failed' ? c.red : 'transparent',
          }}
        >
          <Text
            className="text-[14px] leading-5"
            style={{ color: me ? c.bubbleMeText : c.ink }}
          >
            {text}
          </Text>
        </View>
        <View
          className={`flex-row mt-1 px-1 items-center ${me ? 'flex-row-reverse' : ''}`}
          style={{ gap: 4 }}
        >
          <Text className={`text-[10px] ${textMuted}`}>{time}</Text>
          {me && <StatusIcon status={item.DeliveryStatus} c={c} />}
          {item.DeliveryStatus === 'Failed' && item.ErrorMessage && (
            <Text className="text-[10px] ml-1" style={{ color: c.red }} numberOfLines={1}>
              {item.ErrorMessage}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const keyExtractor = (item) =>
    String(item.WAInboxId || item.MessageId || `${item.ReceivedDate}-${item.MessageText?.slice(0, 16)}`);

  const headerSubtitle =
    connection.status === 'connected' ? 'Online · WHATSAPP' :
    connection.status === 'reconnecting' ? 'Reconnecting…' :
    connection.status === 'disconnected' ? 'Offline · cached view' :
    'WHATSAPP';

  return (
    <KeyboardAvoidingView
      className={`flex-1 ${rootBg}`}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={{ paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 18 }}>
        <View className="flex-row items-center pb-3" style={{ gap: 10 }}>
          <TouchableOpacity
            className={`w-[42px] h-[42px] rounded-full items-center justify-center ${softBg}`}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={c.ink} />
          </TouchableOpacity>
          <View
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{ backgroundColor: c.teal + '33' }}
          >
            <Text className="text-sm font-bold" style={{ color: c.teal }}>
              {initialsOf(profileName || waId)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className={`text-[16px] font-semibold ${textInk}`} numberOfLines={1}>
              {profileName || waId || 'Conversation'}
            </Text>
            <View className="flex-row items-center mt-0.5" style={{ gap: 6 }}>
              <Ionicons name="logo-whatsapp" size={11} color={c.muted} />
              <Text className={`text-[11px] ${textMuted}`}>{headerSubtitle}</Text>
            </View>
          </View>
          <TouchableOpacity
            className={`w-[42px] h-[42px] rounded-full items-center justify-center ${softBg}`}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={c.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      {thread.loading && reversed.length === 0 ? (
        <View className="flex-1 items-center justify-center" style={{ gap: 10 }}>
          <ActivityIndicator color={c.teal} />
          <Text className={`text-xs tracking-widest uppercase ${textMuted}`}>loading thread</Text>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={reversed}
          inverted
          keyExtractor={keyExtractor}
          contentContainerStyle={{ padding: 18, paddingBottom: 12, flexGrow: 1 }}
          renderItem={renderItem}
          onEndReached={onScrollUpToEnd}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            // In an inverted list, ListFooterComponent appears at the visual TOP
            // (oldest end). Show the older-loading spinner here.
            thread.loading && reversed.length > 0 ? (
              <View className="py-3 items-center">
                <ActivityIndicator color={c.teal} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center" style={{ gap: 8 }}>
              <Ionicons name="chatbubble-ellipses-outline" size={36} color={c.dim} />
              <Text className={`text-[14px] ${textMuted}`}>No messages yet</Text>
            </View>
          }
        />
      )}

      {/* 24-hour service window banner */}
      {window24h && window24h.state !== 'open' && (
        <View
          className="flex-row items-center px-3 py-2 mx-3 mb-2 rounded-[12px]"
          style={{
            gap: 8,
            backgroundColor: window24h.state === 'closed' ? c.red + '22' : c.amber + '22',
            borderWidth: 1,
            borderColor: window24h.state === 'closed' ? c.red : c.amber,
          }}
        >
          <Ionicons
            name={window24h.state === 'closed' ? 'lock-closed' : 'time-outline'}
            size={14}
            color={window24h.state === 'closed' ? c.red : c.amber}
          />
          <Text
            className="flex-1 text-[11px]"
            style={{ color: window24h.state === 'closed' ? c.red : c.amber, fontWeight: '600' }}
          >
            {window24h.state === 'closed'
              ? '24-hour service window closed — only template messages allowed.'
              : `Service window closes in ${formatRemaining(window24h.remainingMs)} — switch to a template after that.`}
          </Text>
        </View>
      )}

      {/* Composer */}
      <View
        className={`flex-row items-end px-3 py-2 ${rootBg}`}
        style={{ gap: 8, borderTopWidth: 1, borderTopColor: c.bgInput }}
      >
        <View className={`flex-1 flex-row items-end rounded-[22px] px-3 ${inputBg}`} style={{ gap: 8 }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={connection.status === 'connected' ? 'Type a message' : 'Composing while offline…'}
            placeholderTextColor={c.muted}
            multiline
            className={`flex-1 py-2.5 text-[14px] leading-5 ${textInk}`}
            style={[{ maxHeight: 110 }, Platform.select({ web: { outlineStyle: 'none' } })]}
          />
        </View>
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending || !input.trim()}
          activeOpacity={0.85}
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{
            backgroundColor: input.trim() ? c.teal : (dark ? '#141418' : '#F2F2F5'),
            opacity: sending ? 0.6 : 1,
          }}
        >
          {sending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons name="send" size={17} color={input.trim() ? '#FFFFFF' : c.muted} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
