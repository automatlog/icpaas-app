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
  selectChannels,
  selectSelectedChannel,
  setActive,
  removeMessage,
} from '../../store/slices/liveChatSlice';
import {
  loadMessages,
  loadOlderMessages,
  sendText as sendTextAction,
  sendImage as sendImageAction,
  sendVideo as sendVideoAction,
  sendAudio as sendAudioAction,
  sendDocument as sendDocumentAction,
  sendSticker as sendStickerAction,
  sendLocation as sendLocationAction,
  sendTemplate as sendTemplateAction,
  sendReaction as sendReactionAction,
  uploadMedia,
  markChatRead,
} from '../../services/liveChatActions';
import LiveAgentAttachMenu from '../../components/LiveAgentAttachMenu';
import LiveAgentLocationModal from '../../components/LiveAgentLocationModal';
import LiveAgentTemplatePicker from '../../components/LiveAgentTemplatePicker';
import LiveAgentBubbleActions from '../../components/LiveAgentBubbleActions';
import LiveAgentForwardModal from '../../components/LiveAgentForwardModal';
import LiveAgentChatHeaderMenu from '../../components/LiveAgentChatHeaderMenu';
import LiveAgentAssignSheet from '../../components/LiveAgentAssignSheet';
import LiveAgentVoiceRecorder from '../../components/LiveAgentVoiceRecorder';
import LiveAgentJourneyPanel from '../../components/LiveAgentJourneyPanel';
import toast from '../../services/toast';
import dialog from '../../services/dialog';

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
  const channels = useSelector(selectChannels);
  const selectedChannel = useSelector(selectSelectedChannel);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [picking, setPicking] = useState(false); // image/video/doc upload spinner
  // { messageId, snippet, fromMe } — bubble the user long-pressed to reply to.
  const [replyTo, setReplyTo] = useState(null);
  // { messageId, snippet, fromMe, type } — bubble currently selected for the
  // action sheet (Reply / React).
  const [bubbleAction, setBubbleAction] = useState(null);
  // Bubble currently being forwarded — opens LiveAgentForwardModal when set.
  const [forwardSource, setForwardSource] = useState(null);
  // Header overflow menu + agent assign sheet visibility.
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  // Voice-note recording in progress.
  const [recording, setRecording] = useState(false);
  // Customer journey panel visibility (notes + history + metadata).
  const [journeyOpen, setJourneyOpen] = useState(false);
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

  // Bubble action sheet — Reply stages the bubble; React fires sendReaction
  // immediately and closes the sheet.
  const handleReplyFromAction = () => {
    if (!bubbleAction) return;
    setReplyTo({
      messageId: bubbleAction.messageId,
      snippet: bubbleAction.snippet,
      fromMe: bubbleAction.fromMe,
    });
    setBubbleAction(null);
  };

  const handleReactFromAction = async (emoji) => {
    if (!bubbleAction) return;
    const target = bubbleAction;
    setBubbleAction(null);
    try {
      await dispatch(sendReactionAction({
        waId,
        channel,
        messageId: target.messageId,
        emoji,
      }));
    } catch (e) {
      toast.error('Reaction failed', e?.message || 'Try again.');
    }
  };

  const handleForwardFromAction = () => {
    if (!bubbleAction) return;
    setForwardSource(bubbleAction);
    setBubbleAction(null);
  };

  // Voice notes — Recorder mounts on toggle, hands back the file URI when
  // the agent taps stop. Cancel just unmounts.
  const handleVoiceComplete = async ({ uri, mimeType }) => {
    setRecording(false);
    if (!uri) return;
    setPicking(true);
    try {
      const fname = `voice-${Date.now()}.${mimeType === 'audio/mpeg' ? 'mp3' : 'm4a'}`;
      const upload = await uploadMedia({
        channel,
        file: { uri, name: fname, type: mimeType },
        mimeType,
      });
      const id = upload?.id || upload?.media?.[0]?.id;
      if (!id) {
        toast.error('Voice note failed', 'Meta did not return a media id.');
        return;
      }
      setTimeout(() => flatRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);
      await dispatch(sendAudioAction({ waId, channel, id }));
    } catch (e) {
      toast.error('Voice note failed', e?.message || 'Try again.');
    } finally {
      setPicking(false);
    }
  };

  const handleVoiceCancel = (reason) => {
    setRecording(false);
    if (reason === 'mic-permission-denied') {
      toast.warning('Permission needed', 'Allow microphone access to record voice notes.');
    }
  };

  // Sticker — picks a webp from device, uploads, sends. Meta requires WebP
  // (static ≤ 100 KB, animated ≤ 500 KB) — server will reject other types.
  const pickAndSendSticker = async () => {
    setAttachOpen(false);
    if (!ensureCanSend()) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/webp',
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType || 'image/webp';
    if (!mimeType.includes('webp')) {
      toast.warning('Stickers must be WebP', 'Pick a .webp file (static or animated).');
      return;
    }
    await uploadAndSend({
      kind: 'Sticker',
      file: fileFromAsset(asset, mimeType, asset.name || `sticker-${Date.now()}.webp`),
      mimeType,
      sendAction: sendStickerAction,
      sendArgs: {},
    });
  };

  const handleForwardSubmit = async ({ waId: toWaId, channel: toChannel, source }) => {
    setForwardSource(null);
    if (!toWaId || !toChannel || !source) return;
    // v1 — text only. The forward modal blocks non-text submits, but we
    // also guard here for safety.
    if (source.type && source.type !== 'text') {
      toast.info('Text-only forward', 'Re-pick media from the destination chat.');
      return;
    }
    try {
      await dispatch(sendTextAction({
        waId: toWaId,
        channel: toChannel,
        message: source.snippet,
      }));
      toast.success('Forwarded', `Sent to ${toWaId}`);
    } catch (e) {
      toast.error('Forward failed', e?.message || 'Try again.');
    }
  };

  // Tap a Failed text bubble → confirm → drop the failed row + re-dispatch
  // sendTextAction. v1 covers text only; for media/template the original
  // payload isn't preserved on the row.
  const handleRetryFailed = async (item) => {
    if (item.MessageType !== 'text' && item.MessageType !== undefined) {
      toast.info('Retry not supported',
        'Resend isn’t available yet for media or templates — re-pick from the +.');
      return;
    }
    const ok = await dialog.confirm({
      title: 'Resend message?',
      message: item.MessageText || 'Send this message again.',
      confirmText: 'Resend',
      cancelText: 'Cancel',
    });
    if (!ok) return;
    dispatch(removeMessage({ waId, inboxId: item.WAInboxId }));
    setTimeout(() => flatRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);
    await dispatch(sendTextAction({
      waId,
      channel,
      message: item.MessageText,
      replyToMessageId: item.ReplyToMessageId || undefined,
    }));
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

    // Long-press → open action sheet. Need a real wamid (MessageId) — Meta
    // requires it for both reply context and reaction targeting. Optimistic
    // temp rows that haven't reconciled yet have no actions available.
    const onLongPressBubble = () => {
      const mid = item.MessageId;
      if (!mid) return;
      const snippet = (text || `[${item.MessageType || 'message'}]`).slice(0, 80);
      setBubbleAction({ messageId: mid, snippet, fromMe: me, type: item.MessageType });
    };

    const isFailed = item.DeliveryStatus === 'Failed';

    return (
      <View className={`mb-2 ${me ? 'items-end' : 'items-start'}`}>
        <TouchableOpacity
          onLongPress={onLongPressBubble}
          onPress={isFailed ? () => handleRetryFailed(item) : undefined}
          activeOpacity={0.85}
          delayLongPress={300}
          accessibilityRole={isFailed ? 'button' : undefined}
          accessibilityLabel={isFailed ? 'Tap to retry sending this message' : undefined}
          className="rounded-[18px] px-3.5 py-2.5 max-w-[82%]"
          style={{
            backgroundColor: me ? c.primary : (dark ? '#141418' : '#F2F2F5'),
            borderWidth: isFailed ? 1 : 0,
            borderColor: isFailed ? c.danger : 'transparent',
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
          {isFailed && (
            <Text className="text-[10px] ml-1" style={{ color: c.danger, fontWeight: '600' }} numberOfLines={1}>
              {item.ErrorMessage ? `${item.ErrorMessage} · tap to retry` : 'Tap to retry'}
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
            onPress={() => setHeaderMenuOpen(true)}
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

      {/* Voice-note recorder — only mounted while recording. Owns mic
          permission + the audio session + the timer + the cancel/stop UX. */}
      {recording ? (
        <LiveAgentVoiceRecorder
          onComplete={handleVoiceComplete}
          onCancel={handleVoiceCancel}
        />
      ) : null}

      {/* Composer */}
      <View
        className={`flex-row items-end px-3 py-2 ${rootBg}`}
        style={{ gap: 8, borderTopWidth: 1, borderTopColor: c.bgInput }}
      >
        {/* "+" attach button */}
        <TouchableOpacity
          onPress={() => setAttachOpen(true)}
          disabled={picking || recording}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Attach media"
          accessibilityState={{ disabled: picking || recording, busy: picking }}
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{
            backgroundColor: dark ? '#141418' : '#F2F2F5',
            opacity: (picking || recording) ? 0.6 : 1,
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
        {input.trim() ? (
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: sending, busy: sending }}
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{
              backgroundColor: c.primary,
              opacity: sending ? 0.6 : 1,
            }}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="send" size={17} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        ) : (
          // Empty composer → show mic. Tapping starts recording (handled by
          // LiveAgentVoiceRecorder which mounts above the composer).
          <TouchableOpacity
            onPress={() => setRecording(true)}
            disabled={picking || recording}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Record voice note"
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{
              backgroundColor: c.primary,
              opacity: (picking || recording) ? 0.6 : 1,
            }}
          >
            <Ionicons name="mic" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Attachment menu + sub-modals — render at the screen root so they
          overlay the KeyboardAvoidingView correctly. */}
      <LiveAgentAttachMenu
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        onPickImage={pickAndSendImage}
        onPickVideo={pickAndSendVideo}
        onPickDocument={pickAndSendDocument}
        onPickSticker={pickAndSendSticker}
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
        channel={channel}
        onClose={() => setTemplateOpen(false)}
        onSubmit={handleSendTemplate}
      />
      <LiveAgentBubbleActions
        visible={!!bubbleAction}
        bubble={bubbleAction}
        onClose={() => setBubbleAction(null)}
        onReply={handleReplyFromAction}
        onReact={handleReactFromAction}
        onForward={handleForwardFromAction}
      />
      <LiveAgentForwardModal
        visible={!!forwardSource}
        source={forwardSource}
        channels={channels}
        defaultChannel={selectedChannel || channel}
        onClose={() => setForwardSource(null)}
        onForward={handleForwardSubmit}
      />
      <LiveAgentChatHeaderMenu
        visible={headerMenuOpen}
        waNumber={waId}
        channel={channel}
        profileName={profileName}
        onClose={() => setHeaderMenuOpen(false)}
        onAssign={() => setAssignOpen(true)}
        onViewContact={() => setJourneyOpen(true)}
        onFavouriteChanged={(isFav) =>
          toast.success(isFav ? 'Favourited' : 'Removed favourite', profileName || waId)}
        onBlockChanged={(isBlocked) =>
          toast.success(isBlocked ? 'Blocked' : 'Unblocked', profileName || waId)}
      />
      <LiveAgentJourneyPanel
        visible={journeyOpen}
        waNumber={waId}
        channel={channel}
        profileName={profileName}
        onClose={() => setJourneyOpen(false)}
      />
      <LiveAgentAssignSheet
        visible={assignOpen}
        waNumber={waId}
        channel={channel}
        onClose={() => setAssignOpen(false)}
        onAssigned={({ agentName }) =>
          toast.success('Assigned', `Conversation handed to ${agentName}.`)}
        onError={(msg) => toast.error('Assign failed', msg)}
      />
    </KeyboardAvoidingView>
  );
}
