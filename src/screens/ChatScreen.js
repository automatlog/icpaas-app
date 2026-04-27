// src/screens/ChatScreen.js — Single-conversation chat (NativeWind)
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { WhatsAppAPI } from '../services/api';
import {
  setConversationMessages,
  appendConversationMessage,
  updateConversationMessage,
} from '../store/slices/messagesSlice';
import { upsertConversation } from '../store/slices/conversationsSlice';
import moment from 'moment';

const MOCK_MESSAGES = [
  { id: '1', text: 'Hi! We want to upgrade our WhatsApp Business API plan to the Enterprise tier.', fromMe: false, time: '2025-03-29T09:14:00Z', status: 'read' },
  { id: '2', text: 'Hello! Great to hear. Our Enterprise plan includes unlimited templates, shared inbox with 10 agents and priority support.', fromMe: true, time: '2025-03-29T09:15:00Z', status: 'read' },
  { id: '3', text: 'Can you also include RCS messaging in the package?', fromMe: false, time: '2025-03-29T09:16:00Z', status: 'read' },
  { id: '4', text: "Absolutely! RCS is available as an add-on. I'll prepare a combined proposal with WA Enterprise + RCS and send pricing.", fromMe: true, time: '2025-03-29T09:17:00Z', status: 'read' },
  { id: '5', text: 'Hi, we need to renew our WhatsApp API plan and also check on missed-call alerts for Gujarat.', fromMe: false, time: '2025-03-29T09:32:00Z', status: 'delivered' },
];

const QUICK_TEMPLATES = [
  { id: '1', label: 'Send Proposal', text: 'Hi! Here is our proposal document for your review.' },
  { id: '2', label: 'Pricing',       text: 'Here are our latest pricing details. Can I schedule a call?' },
  { id: '3', label: 'Schedule Demo', text: "I'd love to schedule a demo. Are you free for 30 min this week?" },
  { id: '4', label: 'Confirm Order', text: 'Your order has been confirmed. Team will reach out in 24 hours.' },
];

const C = {
  dark:  { bg: '#0A0A0D', bgSoft: '#141418', bgInput: '#1C1C22', ink: '#FFFFFF', muted: '#9A9AA2', dim: '#5C5C63', green: '#4BD08D', pink: '#FF4D7E', cyan: '#5CD4E0', bubbleMe: '#8FCFBD' },
  light: { bg: '#FAFAFB', bgSoft: '#F2F2F5', bgInput: '#ECECEF', ink: '#0A0A0D', muted: '#5C5C63', dim: '#9A9AA2', green: '#22C55E', pink: '#E6428A', cyan: '#2FB8C4', bubbleMe: '#8FCFBD' },
};

const CHANNEL_ICON = {
  whatsapp: 'logo-whatsapp',
  sms: 'chatbubble-outline',
  rcs: 'card-outline',
  ivr: 'call-outline',
};

const initialsOf = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

const EMPTY_MESSAGES = [];

export default function ChatScreen({ route, navigation }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;

  const conversation = route?.params?.conversation || { id: 'new', name: 'New Chat', channel: 'whatsapp', online: false };
  const dispatch = useDispatch();
  const messages = useSelector((s) => s.messages[conversation.id]) || EMPTY_MESSAGES;

  const setConvMessages = (id, msgs) => dispatch(setConversationMessages({ conversationId: id, messages: msgs }));
  const appendMessage = (id, message) => dispatch(appendConversationMessage({ conversationId: id, message }));
  const updateMessage = (id, messageId, updates) => dispatch(updateConversationMessage({ conversationId: id, messageId, updates }));
  const upsertConv = (cv) => dispatch(upsertConversation(cv));

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(messages.length === 0);
  const [showTemplates, setShowTemplates] = useState(false);
  const flatRef = useRef(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await WhatsAppAPI.getMessages(conversation.id);
      setConvMessages(conversation.id, res?.data || MOCK_MESSAGES);
    } catch {
      setConvMessages(conversation.id, MOCK_MESSAGES);
    } finally {
      setLoading(false);
    }
  }, [conversation.id]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const sendMessage = async (msgText) => {
    const msg = msgText || text.trim();
    if (!msg || sending) return;
    setSending(true);
    const tempMsg = { id: Date.now().toString(), text: msg, fromMe: true, time: new Date().toISOString(), status: 'sent' };
    appendMessage(conversation.id, tempMsg);
    upsertConv({ ...conversation, lastMsg: msg, time: 'Just now' });
    setText('');
    setShowTemplates(false);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      await WhatsAppAPI.sendReply({ to: conversation.phone, message: msg, type: 'text' });
      updateMessage(conversation.id, tempMsg.id, { status: 'delivered' });
    } catch (e) {
      Alert.alert('Send failed', e?.message || 'Please try again');
    } finally {
      setSending(false);
    }
  };

  const rootBg = dark ? 'bg-bg' : 'bg-white';
  const softBg = dark ? 'bg-bgSoft' : 'bg-[#F2F2F5]';
  const inputBg = dark ? 'bg-bgInput' : 'bg-[#ECECEF]';
  const textInk = dark ? 'text-ink' : 'text-[#0A0A0D]';
  const textMuted = dark ? 'text-textMuted' : 'text-[#5C5C63]';
  const chIcon = CHANNEL_ICON[String(conversation.channel || 'whatsapp').toLowerCase()] || 'chatbubble-outline';

  const grouped = useMemo(() => {
    const out = [];
    let lastDay = null;
    messages.forEach((m) => {
      const day = moment(m.time).format('MMM D');
      if (day !== lastDay) {
        out.push({ type: 'sep', id: `sep_${day}`, label: day });
        lastDay = day;
      }
      out.push({ type: 'msg', ...m });
    });
    return out;
  }, [messages]);

  return (
    <KeyboardAvoidingView className={`flex-1 ${rootBg}`} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={{ paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 18 }}>
        <View className="flex-row items-center pb-3" style={{ gap: 10 }}>
          <TouchableOpacity className={`w-[42px] h-[42px] rounded-full items-center justify-center ${softBg}`} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={c.ink} />
          </TouchableOpacity>
          <View className="relative">
            <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: c.bubbleMe }}>
              <Text className="text-sm font-bold" style={{ color: '#0A0A0D' }}>{initialsOf(conversation.name)}</Text>
            </View>
            {conversation.online && (
              <View
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
                style={{ backgroundColor: c.green, borderWidth: 2, borderColor: c.bg }}
              />
            )}
          </View>
          <View className="flex-1">
            <Text className={`text-[16px] font-semibold ${textInk}`} numberOfLines={1}>{conversation.name}</Text>
            <View className="flex-row items-center mt-0.5" style={{ gap: 6 }}>
              <Ionicons name={chIcon} size={11} color={c.muted} />
              <Text className={`text-[11px] ${textMuted}`}>
                {conversation.online ? 'Online · ' : 'Offline · '}
                {String(conversation.channel || 'WhatsApp').toUpperCase()}
              </Text>
            </View>
          </View>
          <TouchableOpacity className={`w-[42px] h-[42px] rounded-full items-center justify-center ${softBg}`} activeOpacity={0.7}>
            <Ionicons name="call-outline" size={18} color={c.ink} />
          </TouchableOpacity>
          <TouchableOpacity className={`w-[42px] h-[42px] rounded-full items-center justify-center ${softBg}`} activeOpacity={0.7}>
            <Ionicons name="ellipsis-horizontal" size={18} color={c.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View className="flex-1 items-center justify-center" style={{ gap: 10 }}>
          <ActivityIndicator color={c.pink} />
          <Text className={`text-xs tracking-widest uppercase ${textMuted}`}>loading thread</Text>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={grouped}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 18, paddingBottom: 12 }}
          renderItem={({ item }) => {
            if (item.type === 'sep') {
              return (
                <View className="flex-row items-center my-3" style={{ gap: 10 }}>
                  <View className="flex-1 h-px" style={{ backgroundColor: c.bgInput }} />
                  <View className={`rounded-full px-3 py-1 ${softBg}`}>
                    <Text className={`text-[10px] font-semibold tracking-wider uppercase ${textMuted}`}>{item.label}</Text>
                  </View>
                  <View className="flex-1 h-px" style={{ backgroundColor: c.bgInput }} />
                </View>
              );
            }
            const me = item.fromMe;
            return (
              <View className={`mb-2 ${me ? 'items-end' : 'items-start'}`}>
                <View
                  className="rounded-[18px] px-3.5 py-2.5 max-w-[82%]"
                  style={{ backgroundColor: me ? c.bubbleMe : (dark ? '#141418' : '#F2F2F5') }}
                >
                  <Text
                    className="text-[14px] leading-5"
                    style={{ color: me ? '#0A0A0D' : c.ink }}
                  >
                    {item.text}
                  </Text>
                </View>
                <View className={`flex-row mt-1 px-1 items-center ${me ? 'flex-row-reverse' : ''}`} style={{ gap: 4 }}>
                  <Text className={`text-[10px] ${textMuted}`}>{moment(item.time).format('h:mm A')}</Text>
                  {me && (
                    <Ionicons
                      name={item.status === 'read' ? 'checkmark-done' : item.status === 'delivered' ? 'checkmark-done' : 'checkmark'}
                      size={12}
                      color={item.status === 'read' ? c.cyan : c.muted}
                    />
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Quick templates */}
      {showTemplates && (
        <View className={`px-4 pb-2 ${rootBg}`}>
          <FlatList
            data={QUICK_TEMPLATES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => sendMessage(item.text)}
                activeOpacity={0.8}
                className={`rounded-[14px] px-3 py-2 flex-row items-center ${softBg}`}
                style={{ gap: 6, borderWidth: 1, borderColor: c.bgInput }}
              >
                <Ionicons name="flash-outline" size={12} color={c.muted} />
                <Text className={`text-xs font-medium ${textInk}`}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Composer */}
      <View className={`flex-row items-end px-3 py-2 ${rootBg}`} style={{ gap: 8, borderTopWidth: 1, borderTopColor: c.bgInput }}>
        <TouchableOpacity
          onPress={() => setShowTemplates((v) => !v)}
          activeOpacity={0.75}
          className={`w-10 h-10 rounded-full items-center justify-center ${softBg}`}
        >
          <Ionicons name={showTemplates ? 'close' : 'add'} size={20} color={c.ink} />
        </TouchableOpacity>
        <View className={`flex-1 flex-row items-end rounded-[22px] px-3 ${inputBg}`} style={{ gap: 8 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message"
            placeholderTextColor={c.muted}
            multiline
            className={`flex-1 py-2.5 text-[14px] leading-5 ${textInk}`}
            style={[{ maxHeight: 110 }, Platform.select({ web: { outlineStyle: 'none' } })]}
          />
          <TouchableOpacity className="py-2" activeOpacity={0.7}>
            <Ionicons name="happy-outline" size={20} color={c.muted} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() => sendMessage()}
          disabled={sending || !text.trim()}
          activeOpacity={0.85}
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{ backgroundColor: text.trim() ? c.bubbleMe : (dark ? '#141418' : '#F2F2F5'), opacity: sending ? 0.6 : 1 }}
        >
          {sending ? (
            <ActivityIndicator color="#0A0A0D" size="small" />
          ) : (
            <Ionicons name="send" size={17} color={text.trim() ? '#0A0A0D' : c.muted} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
