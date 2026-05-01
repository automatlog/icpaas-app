// src/screens/whatsapp/LiveAgentChat.js
//
// Real-data WhatsApp Live Agent conversation. Cursor-paginated history
// (loadOlderMessages on scroll-up), optimistic send via OmniApp's
// SendChatMessage multipart endpoint, delivery-status icons that upgrade
// in place as DeliveryStatusUpdate SignalR events arrive.
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import { useBrand } from '../../theme';
import {
  selectThread,
  selectConnection,
  setActive,
} from '../../store/slices/liveChatSlice';
import {
  loadMessages,
  loadOlderMessages,
  sendText as sendTextAction,
  sendImage as sendImageAction,
  sendVideo as sendVideoAction,
  sendDocument as sendDocumentAction,
  sendLocation as sendLocationAction,
  sendTemplate as sendTemplateAction,
  uploadMedia,
  markChatRead,
} from '../../services/liveChatActions';
import LiveAgentAttachMenu from '../../components/LiveAgentAttachMenu';
import LiveAgentLocationModal from '../../components/LiveAgentLocationModal';
import LiveAgentTemplatePicker from '../../components/LiveAgentTemplatePicker';
import toast from '../../services/toast';

const initialsOf = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

// Maps OmniApp's DeliveryStatus enum to an icon + colour.
const StatusIcon = ({ status, c }) => {
  switch (status) {
    case 'Sending':
      return <ActivityIndicator size="small" color={c.textMuted} style={{ transform: [{ scale: 0.6 }] }} />;
    case 'Sent':
      return <Ionicons name="checkmark" size={13} color={c.textMuted} />;
    case 'Delivered':
      return <Ionicons name="checkmark-done" size={13} color={c.textMuted} />;
    case 'Read':
      return <Ionicons name="checkmark-done" size={13} color={c.info} />;
    case 'Failed':
      return <Ionicons name="alert-circle" size={13} color={c.danger} />;
    default:
      return <Ionicons name="time-outline" size={12} color={c.textMuted} />;
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
  const c = useBrand();
  const dark = c.scheme === 'dark';

  const { waId, channel, profileName } = route?.params || {};
  const dispatch = useDispatch();
  const thread = useSelector(selectThread(waId)) || EMPTY_THREAD;
  const connection = useSelector(selectConnection);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [picking, setPicking] = useState(false); // image/video/doc upload spinner
  // { messageId, snippet, fromMe } — bubble the user long-pressed to reply to.
  const [replyTo, setReplyTo] = useState(null);
  const flatRef = useRef(null);
  // Tracks the wamid of the last inbound message we already POSTed
  // MarkMessagesAsRead for, so re-renders don't fire duplicate calls.
  const lastMarkedIdRef = useRef(null);

  // Mark this conversation active so the slice suppresses unread bumps for
  // incoming messages addressed to it. Reset on unmount.
  useEffect(() => {
    if (!waId) return;
    dispatch(setActive({ waId, channel }));
    dispatch(loadMessages({ waId, channel }));
    // Conversation switched — forget what we marked for the previous one
    // and clear any reply state from the prior chat.
    lastMarkedIdRef.current = null;
    setReplyTo(null);
    return () => {
      dispatch(setActive({ waId: null, channel: null }));
    };
  }, [dispatch, waId, channel]);

  // Mark-as-read: whenever the latest inbound message id changes (mount,
  // pagination, or a SignalR ReceivedMessage while the chat is open), POST
  // OmniApp's MarkMessagesAsRead so the server-side unread state matches
  // what the agent has actually seen.
  useEffect(() => {
    if (!waId || !channel || !thread.messages?.length) return;

    let latestInboundId = null;
    for (let i = thread.messages.length - 1; i >= 0; i -= 1) {
      const m = thread.messages[i];
      if (m?.ChatType === 'IN' && m?.MessageId) {
        latestInboundId = m.MessageId;
        break;
      }
    }
    if (!latestInboundId) return;
    if (latestInboundId === lastMarkedIdRef.current) return;

    lastMarkedIdRef.current = latestInboundId;
    dispatch(markChatRead({ waId, channel, messageId: latestInboundId }));
  }, [dispatch, waId, channel, thread.messages]);

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
    setInput('');
    const replyToMessageId = replyTo?.messageId || undefined;
    setReplyTo(null);

    // After dispatch, the new row is at the END of the messages array (oldest-
    // first), which means index 0 of `reversed`. Inverted list shows that at
    // the visual bottom — so scroll-to-offset-0 keeps the user pinned to the
    // newest message.
    setTimeout(() => flatRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);

    // sendTextAction handles optimistic render + Meta Cloud API call (via
    // the gsauth proxy) + wamid reconciliation + Sent/Failed dispatch.
    await dispatch(sendTextAction({ waId, channel, message: text, replyToMessageId }));
    setSending(false);
  };

  // ---------------------------------------------------------------------------
  // Attachment flows. Each one is: picker → uploadMedia (Meta /media) →
  // dispatch send action with the returned media id. Failures surface as
  // a toast — the menu has already closed by this point.
  // ---------------------------------------------------------------------------
  const ensureCanSend = () => {
    if (!waId || !channel) {
      toast.error('No conversation', 'Open a chat before attaching.');
      return false;
    }
    return true;
  };

  // Builds the RN-flavoured FormData file shape from a picker asset.
  const fileFromAsset = (asset, fallbackMime, fallbackName) => ({
    uri: asset.uri,
    name: asset.fileName || asset.name || fallbackName,
    type: asset.mimeType || asset.type || fallbackMime,
  });

  const uploadAndSend = async ({ kind, file, mimeType, sendAction, sendArgs }) => {
    setPicking(true);
    try {
      const upload = await uploadMedia({ channel, file, mimeType });
      const id = upload?.id || upload?.media?.[0]?.id;
      if (!id) {
        toast.error('Upload failed', 'Meta did not return a media id.');
        return;
      }
      setTimeout(() => flatRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);
      await dispatch(sendAction({ waId, channel, id, ...sendArgs }));
    } catch (e) {
      toast.error(`${kind} send failed`, e?.message || 'Try again.');
    } finally {
      setPicking(false);
    }
  };

  const pickAndSendImage = async () => {
    setAttachOpen(false);
    if (!ensureCanSend()) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.warning('Permission needed', 'Allow photo access to send images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'images',
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType || 'image/jpeg';
    await uploadAndSend({
      kind: 'Image',
      file: fileFromAsset(asset, mimeType, `image-${Date.now()}.jpg`),
      mimeType,
      sendAction: sendImageAction,
      sendArgs: {},
    });
  };

  const pickAndSendVideo = async () => {
    setAttachOpen(false);
    if (!ensureCanSend()) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.warning('Permission needed', 'Allow photo access to send videos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Videos || 'videos',
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType || 'video/mp4';
    await uploadAndSend({
      kind: 'Video',
      file: fileFromAsset(asset, mimeType, `video-${Date.now()}.mp4`),
      mimeType,
      sendAction: sendVideoAction,
      sendArgs: {},
    });
  };

  const pickAndSendDocument = async () => {
    setAttachOpen(false);
    if (!ensureCanSend()) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType || 'application/octet-stream';
    await uploadAndSend({
      kind: 'Document',
      file: fileFromAsset(asset, mimeType, asset.name || `file-${Date.now()}`),
      mimeType,
      sendAction: sendDocumentAction,
      sendArgs: { filename: asset.name },
    });
  };

  const openLocation = () => {
    setAttachOpen(false);
    if (!ensureCanSend()) return;
    setLocationOpen(true);
  };

  const handleSendLocation = async ({ latitude, longitude, name, address }) => {
    setLocationOpen(false);
    setPicking(true);
    try {
      setTimeout(() => flatRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);
      await dispatch(sendLocationAction({ waId, channel, latitude, longitude, name, address }));
    } catch (e) {
      toast.error('Location send failed', e?.message || 'Try again.');
    } finally {
      setPicking(false);
    }
  };

  const openTemplate = () => {
    setAttachOpen(false);
    if (!ensureCanSend()) return;
    setTemplateOpen(true);
  };

  const handleSendTemplate = async ({ name, language, components }) => {
    setPicking(true);
    try {
      setTimeout(() => flatRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);
      await dispatch(sendTemplateAction({ waId, channel, name, language, components }));
    } catch (e) {
      toast.error('Template send failed', e?.message || 'Try again.');
    } finally {
      setPicking(false);
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

    // Long-press → set reply target. Need a real wamid (MessageId) — Meta
    // requires it for the context block. Optimistic temp rows that haven't
    // reconciled yet just don't allow reply.
    const onLongPressBubble = () => {
      const mid = item.MessageId;
      if (!mid) return;
      const snippet = (text || `[${item.MessageType || 'message'}]`).slice(0, 80);
      setReplyTo({ messageId: mid, snippet, fromMe: me });
    };

    return (
      <View className={`mb-2 ${me ? 'items-end' : 'items-start'}`}>
        <TouchableOpacity
          onLongPress={onLongPressBubble}
          activeOpacity={0.85}
          delayLongPress={300}
          className="rounded-[18px] px-3.5 py-2.5 max-w-[82%]"
          style={{
            backgroundColor: me ? c.primary : (dark ? '#141418' : '#F2F2F5'),
            borderWidth: item.DeliveryStatus === 'Failed' ? 1 : 0,
            borderColor: item.DeliveryStatus === 'Failed' ? c.danger : 'transparent',
          }}
        >
          {/* Quote-of-message preview shown when this bubble was itself a reply */}
          {item.ReplyToMessageId ? (
            <View
              style={{
                paddingLeft: 8,
                paddingVertical: 4,
                marginBottom: 6,
                borderLeftWidth: 3,
                borderLeftColor: me ? '#FFFFFF55' : c.primary,
                opacity: 0.75,
              }}
            >
              <Text
                className="text-[11px]"
                style={{ color: me ? '#FFFFFF' : c.textMuted, fontStyle: 'italic' }}
                numberOfLines={2}
              >
                {item.ReplyToText || 'Replying to message'}
              </Text>
            </View>
          ) : null}

          <Text
            className="text-[14px] leading-5"
            style={{ color: me ? '#FFFFFF' : c.text }}
          >
            {text}
          </Text>
        </TouchableOpacity>
        <View
          className={`flex-row mt-1 px-1 items-center ${me ? 'flex-row-reverse' : ''}`}
          style={{ gap: 4 }}
        >
          <Text className={`text-[10px] ${textMuted}`}>{time}</Text>
          {me && <StatusIcon status={item.DeliveryStatus} c={c} />}
          {item.DeliveryStatus === 'Failed' && item.ErrorMessage && (
            <Text className="text-[10px] ml-1" style={{ color: c.danger }} numberOfLines={1}>
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
            accessibilityRole="button"
            accessibilityLabel="Back to inbox"
          >
            <Ionicons name="chevron-back" size={20} color={c.text} />
          </TouchableOpacity>
          <View
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{ backgroundColor: c.primary + '33' }}
          >
            <Text className="text-sm font-bold" style={{ color: c.primary }}>
              {initialsOf(profileName || waId)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className={`text-[16px] font-semibold ${textInk}`} numberOfLines={1}>
              {profileName || waId || 'Conversation'}
            </Text>
            <View className="flex-row items-center mt-0.5" style={{ gap: 6 }}>
              <Ionicons name="logo-whatsapp" size={11} color={c.textMuted} />
              <Text className={`text-[11px] ${textMuted}`}>{headerSubtitle}</Text>
            </View>
          </View>
          <TouchableOpacity
            className={`w-[42px] h-[42px] rounded-full items-center justify-center ${softBg}`}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Conversation options"
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={c.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      {thread.loading && reversed.length === 0 ? (
        <View className="flex-1 items-center justify-center" style={{ gap: 10 }}>
          <ActivityIndicator color={c.primary} />
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
                <ActivityIndicator color={c.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center" style={{ gap: 8 }}>
              <Ionicons name="chatbubble-ellipses-outline" size={36} color={c.textDim} />
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
            backgroundColor: window24h.state === 'closed' ? c.danger + '22' : c.warning + '22',
            borderWidth: 1,
            borderColor: window24h.state === 'closed' ? c.danger : c.warning,
          }}
        >
          <Ionicons
            name={window24h.state === 'closed' ? 'lock-closed' : 'time-outline'}
            size={14}
            color={window24h.state === 'closed' ? c.danger : c.warning}
          />
          <Text
            className="flex-1 text-[11px]"
            style={{ color: window24h.state === 'closed' ? c.danger : c.warning, fontWeight: '600' }}
          >
            {window24h.state === 'closed'
              ? '24-hour service window closed — only template messages allowed.'
              : `Service window closes in ${formatRemaining(window24h.remainingMs)} — switch to a template after that.`}
          </Text>
        </View>
      )}

      {/* Reply / quote chip — visible while a bubble is selected for reply.
          Tap × to clear; otherwise the next text send carries the context. */}
      {replyTo ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginHorizontal: 12,
            marginBottom: 6,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 10,
            backgroundColor: c.primarySoft,
            borderLeftWidth: 3,
            borderLeftColor: c.primary,
          }}
        >
          <Ionicons name="return-up-back" size={13} color={c.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.primary, fontSize: 10, fontWeight: '700' }}>
              Replying to {replyTo.fromMe ? 'yourself' : (profileName || 'customer')}
            </Text>
            <Text style={{ color: c.text, fontSize: 12 }} numberOfLines={1}>
              {replyTo.snippet}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setReplyTo(null)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Cancel reply"
          >
            <Ionicons name="close" size={16} color={c.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Composer */}
      <View
        className={`flex-row items-end px-3 py-2 ${rootBg}`}
        style={{ gap: 8, borderTopWidth: 1, borderTopColor: c.bgInput }}
      >
        {/* "+" attach button */}
        <TouchableOpacity
          onPress={() => setAttachOpen(true)}
          disabled={picking}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Attach media"
          accessibilityState={{ disabled: picking, busy: picking }}
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{
            backgroundColor: dark ? '#141418' : '#F2F2F5',
            opacity: picking ? 0.6 : 1,
          }}
        >
          {picking ? (
            <ActivityIndicator color={c.primary} size="small" />
          ) : (
            <Ionicons name="add" size={22} color={c.primary} />
          )}
        </TouchableOpacity>

        <View className={`flex-1 flex-row items-end rounded-[22px] px-3 ${inputBg}`} style={{ gap: 8 }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={connection.status === 'connected' ? 'Type a message' : 'Composing while offline…'}
            placeholderTextColor={c.textMuted}
            multiline
            className={`flex-1 py-2.5 text-[14px] leading-5 ${textInk}`}
            style={[{ maxHeight: 110 }, Platform.select({ web: { outlineStyle: 'none' } })]}
          />
        </View>
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending || !input.trim()}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: sending || !input.trim(), busy: sending }}
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{
            backgroundColor: input.trim() ? c.primary : (dark ? '#141418' : '#F2F2F5'),
            opacity: sending ? 0.6 : 1,
          }}
        >
          {sending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons name="send" size={17} color={input.trim() ? '#FFFFFF' : c.textMuted} />
          )}
        </TouchableOpacity>
      </View>

      {/* Attachment menu + sub-modals — render at the screen root so they
          overlay the KeyboardAvoidingView correctly. */}
      <LiveAgentAttachMenu
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        onPickImage={pickAndSendImage}
        onPickVideo={pickAndSendVideo}
        onPickDocument={pickAndSendDocument}
        onPickLocation={openLocation}
        onPickTemplate={openTemplate}
        locked={window24h?.state === 'closed'}
      />
      <LiveAgentLocationModal
        visible={locationOpen}
        onClose={() => setLocationOpen(false)}
        onSubmit={handleSendLocation}
      />
      <LiveAgentTemplatePicker
        visible={templateOpen}
        onClose={() => setTemplateOpen(false)}
        onSubmit={handleSendTemplate}
      />
    </KeyboardAvoidingView>
  );
}
