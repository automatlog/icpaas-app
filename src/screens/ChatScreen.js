// src/screens/ChatScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
  Alert,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, Radii, Shadows } from '../theme';
import { Avatar, ChannelTag, LoadingSpinner } from '../components';
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
  { id: '2', text: 'Hello! Great to hear. Our Enterprise plan includes unlimited templates, shared inbox with 10 agents and priority support. I\'ll send you the details now.', fromMe: true, time: '2025-03-29T09:15:00Z', status: 'read' },
  { id: '3', text: 'Can you also include RCS messaging in the package?', fromMe: false, time: '2025-03-29T09:16:00Z', status: 'read' },
  { id: '4', text: 'Absolutely! RCS is available as an add-on. I\'ll prepare a combined proposal with WA Enterprise + RCS and send over the pricing. 📄', fromMe: true, time: '2025-03-29T09:17:00Z', status: 'read' },
  { id: '5', text: 'Hi, we need to renew our WhatsApp API plan and also check on the missed call alert setup for our Gujarat region.', fromMe: false, time: '2025-03-29T09:32:00Z', status: 'delivered' },
];

const QUICK_TEMPLATES = [
  { id: '1', label: '📄 Send Proposal', text: 'Hi! Here is our proposal document for your review. Please let me know if you have any questions.' },
  { id: '2', label: '💰 Pricing', text: 'Here are our latest pricing details. Would you like me to schedule a call to discuss?' },
  { id: '3', label: '📅 Schedule Demo', text: 'I\'d love to schedule a demo for you! Are you available for a 30-min call this week?' },
  { id: '4', label: '✅ Confirm Order', text: 'Your order has been confirmed. Our team will reach out within 24 hours to get you set up.' },
];

// ── Message Bubble ─────────────────────────────────────────
const MessageBubble = ({ item }) => (
  <View style={[styles.msgWrap, item.fromMe ? styles.msgWrapOut : styles.msgWrapIn]}>
    <View style={[styles.bubble, item.fromMe ? styles.bubbleOut : styles.bubbleIn]}>
      <Text style={[styles.bubbleText, item.fromMe ? styles.bubbleTextOut : styles.bubbleTextIn]}>
        {item.text}
      </Text>
    </View>
    <View style={[styles.msgMeta, item.fromMe && { flexDirection: 'row-reverse' }]}>
      <Text style={styles.msgTime}>{moment(item.time).format('h:mm A')}</Text>
      {item.fromMe && (
        <Text style={[styles.msgStatus, item.status === 'read' && { color: Colors.info }]}>
          {item.status === 'read' ? ' ✓✓' : item.status === 'delivered' ? ' ✓✓' : ' ✓'}
        </Text>
      )}
    </View>
  </View>
);

// ── Date Separator ─────────────────────────────────────────
const DateSep = ({ date }) => (
  <View style={styles.dateSep}>
    <View style={styles.dateLine} />
    <View style={styles.datePill}><Text style={styles.datePillText}>{date}</Text></View>
    <View style={styles.dateLine} />
  </View>
);

const EMPTY_MESSAGES = [];

// ── Main Chat Screen ───────────────────────────────────────
export default function ChatScreen({ route, navigation }) {
  const { conversation = MOCK_CONVERSATIONS[0] } = route?.params || {};
  const dispatch = useDispatch();
  const messages = useSelector((s) => s.messages[conversation.id]) || EMPTY_MESSAGES;
  const setConvMessages = (conversationId, msgs) =>
    dispatch(setConversationMessages({ conversationId, messages: msgs }));
  const appendMessage = (conversationId, message) =>
    dispatch(appendConversationMessage({ conversationId, message }));
  const updateMessage = (conversationId, messageId, updates) =>
    dispatch(updateConversationMessage({ conversationId, messageId, updates }));
  const upsertConv = (c) => dispatch(upsertConversation(c));
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
    const tempMsg = {
      id: Date.now().toString(), text: msg,
      fromMe: true, time: new Date().toISOString(), status: 'sent',
    };
    appendMessage(conversation.id, tempMsg);
    upsertConv({
      ...conversation,
      lastMsg: msg,
      time: 'Just now',
    });
    setText('');
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      await WhatsAppAPI.sendReply({ to: conversation.phone, message: msg, type: 'text' });
      updateMessage(conversation.id, tempMsg.id, { status: 'delivered' });
    } catch (e) {
      Alert.alert('Send failed', e.message || 'Please try again');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ fontSize: 22, color: Colors.primary }}>←</Text>
        </TouchableOpacity>
        <Avatar emoji={conversation.emoji} color={conversation.avatarColor} size={42} radius={13} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{conversation.name}</Text>
          <Text style={[styles.headerStatus, conversation.online && { color: Colors.success }]}>
            {conversation.online ? '● Online' : '● Offline'} · {conversation.channel?.toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerIcon}><Text style={{ fontSize: 16 }}>📋</Text></TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon}><Text style={{ fontSize: 16 }}>⋯</Text></TouchableOpacity>
      </View>

      {/* Contact info bar */}
      <View style={styles.infoBar}>
        <ChannelTag channel={conversation.channel} />
        <Text style={styles.infoPhone}>{conversation.phone || '+91 98765 43210'}</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.infoAction}><Text style={{ fontSize: 13 }}>📞 Call</Text></TouchableOpacity>
        <TouchableOpacity style={styles.infoAction}><Text style={{ fontSize: 13 }}>👤 Profile</Text></TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={i => i.id}
        renderItem={({ item, index }) => {
          const showDate = index === 0 || moment(item.time).format('D MMM') !== moment(messages[index - 1]?.time).format('D MMM');
          return (
            <>
              {showDate && <DateSep date={moment(item.time).format('D MMMM YYYY')} />}
              <MessageBubble item={item} />
            </>
          );
        }}
        contentContainerStyle={styles.messageList}
        style={styles.messagesFlatList}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
      />

      {/* Quick templates */}
      {showTemplates && (
        <View style={styles.templatesWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: Spacing.base }}>
            {QUICK_TEMPLATES.map(t => (
              <TouchableOpacity
                key={t.id}
                style={styles.templateChip}
                onPress={() => { sendMessage(t.text); setShowTemplates(false); }}
                activeOpacity={0.7}
              >
                <Text style={styles.templateChipText}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input row */}
      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.inputIcon}><Text style={{ fontSize: 18 }}>📎</Text></TouchableOpacity>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor={Colors.textLight}
          style={styles.input}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity style={styles.inputIcon} onPress={() => setShowTemplates(!showTemplates)}>
          <Text style={{ fontSize: 18 }}>⚡</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!text.trim() || sending}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 18, color: Colors.white }}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const MOCK_CONVERSATIONS = [
  { id: 'c1', name: 'Acme Corp', emoji: '🏢', avatarColor: 'rgba(37,211,102,0.12)', channel: 'whatsapp', online: true, phone: '+919876543210' },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.base, paddingTop: 56, paddingBottom: 12, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { paddingRight: 4 },
  headerName: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: Colors.textDark },
  headerStatus: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, color: Colors.textMuted, marginTop: 1 },
  headerIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  infoBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.base, paddingVertical: 8, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoPhone: { fontSize: FontSizes.xs, color: Colors.textMuted, fontFamily: Fonts.mono },
  infoAction: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  messagesFlatList: { flex: 1 },
  messageList: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.base, paddingBottom: 20 },
  msgWrap: { marginBottom: 8, maxWidth: '78%' },
  msgWrapIn: { alignSelf: 'flex-start' },
  msgWrapOut: { alignSelf: 'flex-end' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleIn: { backgroundColor: Colors.card, borderBottomLeftRadius: 4, ...Shadows.sm },
  bubbleOut: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 13, lineHeight: 19 },
  bubbleTextIn: { color: Colors.textDark, fontFamily: Fonts.regular },
  bubbleTextOut: { color: Colors.white, fontFamily: Fonts.regular },
  msgMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 2 },
  msgTime: { fontSize: 10, color: Colors.textLight },
  msgStatus: { fontSize: 10, color: Colors.textLight },
  dateSep: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, gap: 8 },
  dateLine: { flex: 1, height: 1, backgroundColor: Colors.divider },
  datePill: { backgroundColor: 'rgba(83,74,183,0.1)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radii.full },
  datePillText: { fontSize: 10, fontFamily: Fonts.semiBold, color: Colors.primary },
  templatesWrap: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.card },
  templateChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: Radii.full, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  templateChipText: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.primary },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.sm, paddingVertical: 10, backgroundColor: Colors.card, borderTopWidth: 1, borderTopColor: Colors.border },
  inputIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, backgroundColor: Colors.background, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: FontSizes.sm, color: Colors.textDark, maxHeight: 90, fontFamily: Fonts.regular, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.textLight, opacity: 0.5 },
});
