// src/screens/whatsapp/ChatScreen.js — Single-conversation chat (NativeWind)
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, ScrollView, useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { WhatsAppAPI, LiveChatAPI, TemplatesAPI } from '../../services/api';
import {
  setConversationMessages,
  appendConversationMessage,
  updateConversationMessage,
} from '../../store/slices/messagesSlice';
import { upsertConversation } from '../../store/slices/conversationsSlice';
import moment from 'moment';
import EmojiPicker from 'rn-emoji-keyboard';

const MOCK_MESSAGES = [
  { id: '1', text: 'Hi! We want to upgrade our WhatsApp Business API plan to the Enterprise tier.', fromMe: false, time: '2025-03-29T09:14:00Z', status: 'read' },
  { id: '2', text: 'Hello! Great to hear. Our Enterprise plan includes unlimited templates, shared inbox with 10 agents and priority support.', fromMe: true, time: '2025-03-29T09:15:00Z', status: 'read' },
  { id: '3', text: 'Can you also include RCS messaging in the package?', fromMe: false, time: '2025-03-29T09:16:00Z', status: 'read' },
  { id: '4', text: "Absolutely! RCS is available as an add-on. I'll prepare a combined proposal with WA Enterprise + RCS and send pricing.", fromMe: true, time: '2025-03-29T09:17:00Z', status: 'read' },
  { id: '5', text: 'Hi, we need to renew our WhatsApp API plan and also check on missed-call alerts for Gujarat.', fromMe: false, time: '2025-03-29T09:32:00Z', status: 'delivered' },
];

const ATTACHMENT_OPTIONS = [
  { id: 'image', label: 'Image', icon: 'image-outline', color: '#10B981' },
  { id: 'doc', label: 'Doc', icon: 'document-text-outline', color: '#3B82F6' },
  { id: 'video', label: 'Video', icon: 'videocam-outline', color: '#EF4444' },
  { id: 'audio', label: 'Audio', icon: 'volume-medium-outline', color: '#10B981' },
  { id: 'location', label: 'Location', icon: 'location-outline', color: '#EF4444' },
  { id: 'media', label: 'Media Library', icon: 'images-outline', color: '#10B981' },
];

const EMOJIS = ['👍', '😀', '😘', '😍', '😂', '😜', '😅', '🤣', '😭', '😎', '🥺', '😡', '🤔', '🙌', '👏', '🔥', '🎉', '✨', '💯', '❤️'];

const C = {
  light: { bg: '#EFEAE2', bgSoft: '#F0F2F5', bgInput: '#FFFFFF', ink: '#111B21', muted: '#667781', dim: '#8696A0', green: '#00A884', pink: '#E6428A', cyan: '#53BDEB', bubbleMe: '#A0D8B3', bubbleOther: '#FFFFFF', panelBg: '#F0F2F5', primary: '#005C4B' },
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
  const { width } = useWindowDimensions();
  const c = C.light;
  const isLargeScreen = width > 768;

  const conversation = route?.params?.conversation || { id: 'new', name: '919654297000', channel: 'whatsapp', online: false };
  const dispatch = useDispatch();
  const messages = useSelector((s) => s.messages[conversation.id]) || EMPTY_MESSAGES;

  const setConvMessages = (id, msgs) => dispatch(setConversationMessages({ conversationId: id, messages: msgs }));
  const appendMessage = (id, message) => dispatch(appendConversationMessage({ conversationId: id, message }));
  const updateMessage = (id, messageId, updates) => dispatch(updateConversationMessage({ conversationId: id, messageId, updates }));
  const upsertConv = (cv) => dispatch(upsertConversation(cv));

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(messages.length === 0);
  
  // UI toggles
  const [showAttachment, setShowAttachment] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(isLargeScreen);
  const [templateTab, setTemplateTab] = useState('Marketing');
  const [realTemplates, setRealTemplates] = useState([]);
  const [templateSearch, setTemplateSearch] = useState('');

  const flatRef = useRef(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await LiveChatAPI.getMessages({
        senderNumber: conversation.id || conversation.phone,
        channelNumber: conversation.channelNumber || '919081234314'
      });
      const realMsgs = (res?.chatList || []).map(m => ({
        id: m.waInboxId || m.messageId || Math.random().toString(),
        text: m.messageText,
        fromMe: m.chatType === 'OUT',
        time: m.receivedDate || new Date().toISOString(),
        status: m.deliveryStatus?.toLowerCase() || 'sent'
      }));
      setConvMessages(conversation.id, realMsgs.length ? realMsgs.reverse() : MOCK_MESSAGES);
    } catch {
      setConvMessages(conversation.id, MOCK_MESSAGES);
    } finally {
      setLoading(false);
    }
  }, [conversation.id, conversation.phone, conversation.channelNumber]);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await TemplatesAPI.getWhatsApp();
      setRealTemplates(res?.data || []);
    } catch (e) {
      console.log('Failed to load templates', e);
    }
  }, []);

  useEffect(() => { 
    loadMessages(); 
    loadTemplates();
  }, [loadMessages, loadTemplates]);

  const sendMessage = async (msgText) => {
    const msg = msgText || text.trim();
    if (!msg || sending) return;
    setSending(true);
    const tempMsg = { id: Date.now().toString(), text: msg, fromMe: true, time: new Date().toISOString(), status: 'sent' };
    appendMessage(conversation.id, tempMsg);
    upsertConv({ ...conversation, lastMsg: msg, time: 'Just now' });
    setText('');
    setShowTemplateModal(false);
    setShowEmoji(false);
    setShowAttachment(false);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      await WhatsAppAPI.sendReply({ to: conversation.phone, message: msg, type: 'text' });
      updateMessage(conversation.id, tempMsg.id, { status: 'delivered' });
    } catch (e) {
      // alert or log error
    } finally {
      setSending(false);
    }
  };

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

  const renderTemplateModal = () => (
    <Modal visible={showTemplateModal} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white rounded-lg w-[90%] max-w-[600px] h-[70%] overflow-hidden shadow-xl">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <Text className="text-lg font-semibold text-gray-800">Template</Text>
            <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
              <Ionicons name="close" size={24} color={c.muted} />
            </TouchableOpacity>
          </View>
          <View className="p-4 flex-row items-center justify-between border-b border-gray-100">
            <View className="flex-row space-x-2">
              {['Marketing', 'Utility', 'Authentication'].map(tab => {
                const active = templateTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setTemplateTab(tab)}
                    className={`px-3 py-1.5 rounded border ${active ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}
                  >
                    <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-blue-600'}`}>{tab}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View className="border border-gray-300 rounded px-3 py-1.5 w-40">
              <TextInput value={templateSearch} onChangeText={setTemplateSearch} placeholder="Search template" className="text-sm p-0 m-0" style={Platform.select({ web: { outlineStyle: 'none' } })} />
            </View>
          </View>
          <ScrollView className="flex-1 p-4 bg-gray-50">
            {realTemplates
              .filter(t => (t.category || '').toUpperCase() === templateTab.toUpperCase() && (t.name || '').toLowerCase().includes(templateSearch.toLowerCase()))
              .length === 0 ? (
              <Text className="text-center text-gray-500 mt-10">No templates found.</Text>
            ) : (
              realTemplates
                .filter(t => (t.category || '').toUpperCase() === templateTab.toUpperCase() && (t.name || '').toLowerCase().includes(templateSearch.toLowerCase()))
                .map(item => (
                <TouchableOpacity
                  key={item.id || item.name}
                  onPress={() => sendMessage(item.body || item.name)}
                  className="bg-white p-3 rounded-lg mb-2 border border-gray-200 shadow-sm"
                >
                  <Text className="font-semibold text-gray-800 mb-1" numberOfLines={1}>{item.name}</Text>
                  <Text className="text-gray-600 text-sm" numberOfLines={3}>{item.body}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderInfoPanel = () => (
    <View className="w-80 bg-[#F0F2F5] border-l border-gray-200 h-full">
      <View className="bg-[#005C4B] p-5 pb-8 rounded-bl-3xl">
        <View className="flex-row justify-between items-start">
          <View className="bg-yellow-500 w-12 h-12 rounded-lg items-center justify-center">
            <Text className="text-white font-bold text-lg">91</Text>
          </View>
          <TouchableOpacity className="flex-row items-center space-x-1">
            <Ionicons name="open-outline" size={14} color="#fff" />
            <Text className="text-white text-xs font-medium">Export Chat</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-white font-bold text-xl mt-3">{conversation.name}</Text>
        <Text className="text-emerald-100 text-sm">{conversation.name}</Text>
      </View>
      
      <ScrollView className="flex-1 p-4">
        <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-gray-500 text-sm">Last Message On</Text>
            <View className="items-end">
              <Text className="text-gray-800 text-sm font-medium">2026-05-05</Text>
              <Text className="text-gray-800 text-sm font-medium">14:02:00</Text>
            </View>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-gray-500 text-sm">Last Active</Text>
            <Text className="text-gray-800 text-sm font-medium">02:02 PM</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-gray-500 text-sm">Last Message</Text>
            <View className="flex-row items-center space-x-1">
              <Ionicons name="warning" size={12} color="#F59E0B" />
              <Text className="text-gray-800 text-sm font-medium">Unsupported message</Text>
            </View>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-gray-500 text-sm">Channel Number</Text>
            <Text className="text-gray-800 text-sm font-medium">919081234314</Text>
          </View>
        </View>

        <Text className="text-gray-800 font-bold mb-2">Actions <Ionicons name="filter" size={14} /></Text>
        <TouchableOpacity className="bg-red-500 rounded-lg p-3 items-center mb-3 flex-row justify-center space-x-2">
          <Ionicons name="ban" size={18} color="#fff" />
          <Text className="text-white font-semibold">Block {conversation.name}</Text>
        </TouchableOpacity>
        
        {['Assign Agent', 'Notes', 'Customer Journey'].map(menu => (
          <TouchableOpacity key={menu} className="bg-white rounded-lg p-3 flex-row justify-between items-center mb-2 shadow-sm border border-gray-100">
            <Text className="text-gray-700 font-medium">{menu}</Text>
            <Ionicons name="chevron-down" size={16} color={c.muted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <KeyboardAvoidingView className="flex-1 flex-row bg-white" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="flex-1 flex-col relative" style={{ backgroundColor: c.bg }}>
        {/* Header */}
        <View className="bg-[#F0F2F5] border-b border-gray-200 px-4 py-2 flex-row items-center justify-between" style={{ paddingTop: Platform.OS === 'ios' ? 56 : 10 }}>
          <View className="flex-row items-center space-x-3">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-1">
              <Ionicons name="chevron-back" size={24} color={c.muted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { conversation })} className="flex-row items-center space-x-3">
              <View className="w-10 h-10 rounded-full bg-gray-300 items-center justify-center relative">
                <Text className="text-white font-bold">{initialsOf(conversation.name)}</Text>
                {conversation.online && <View className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
              </View>
              <View>
                <Text className="text-base font-semibold text-gray-800">{conversation.name}</Text>
                <Text className="text-xs text-gray-500">Click here for contact info</Text>
              </View>
            </TouchableOpacity>
          </View>
          <View className="flex-row space-x-4 items-center">
            <TouchableOpacity><Ionicons name="search" size={20} color={c.muted} /></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowInfoPanel(!showInfoPanel)}><Ionicons name="ellipsis-vertical" size={20} color={c.muted} /></TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={c.green} />
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
                  <View className="items-center my-3">
                    <View className="bg-white rounded-lg px-3 py-1 shadow-sm">
                      <Text className="text-xs text-gray-500 uppercase">{item.label}</Text>
                    </View>
                  </View>
                );
              }
              const me = item.fromMe;
              return (
                <View className={`mb-2 flex-row ${me ? 'justify-end' : 'justify-start'}`}>
                  <View className="rounded-lg px-3 py-2 max-w-[75%] shadow-sm" style={{ backgroundColor: me ? c.bubbleMe : c.bubbleOther }}>
                    <Text className="text-sm text-[#111B21]">{item.text}</Text>
                    <View className="flex-row items-center justify-end mt-1 space-x-1">
                      <Text className="text-[10px] text-gray-500">{moment(item.time).format('h:mm A')}</Text>
                      {me && (
                        <Ionicons
                          name={item.status === 'read' ? 'checkmark-done' : item.status === 'delivered' ? 'checkmark-done' : 'checkmark'}
                          size={14}
                          color={item.status === 'read' ? c.cyan : c.muted}
                        />
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Real Emoji Picker Popup */}
        <EmojiPicker
          open={showEmoji}
          onClose={() => setShowEmoji(false)}
          onEmojiSelected={(emojiObject) => setText(prev => prev + emojiObject.emoji)}
        />

        {/* Attachment Menu Popup */}
        {showAttachment && (
          <View className="absolute bottom-[70px] left-4 bg-white w-48 rounded-xl shadow-2xl z-50 py-2 border border-gray-100">
            {ATTACHMENT_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.id} className="flex-row items-center px-4 py-2 hover:bg-gray-50">
                <Ionicons name={opt.icon} size={20} color={opt.color} className="mr-3" />
                <Text className="text-gray-700 text-sm font-medium">{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Composer */}
        <View className="bg-[#F0F2F5] flex-row items-center px-3 py-2 space-x-2 min-h-[60px]">
          <TouchableOpacity onPress={() => { setShowAttachment(!showAttachment); setShowEmoji(false); }} className={`w-8 h-8 rounded-full items-center justify-center ${showAttachment ? 'bg-blue-100' : ''}`}>
            <Ionicons name="add" size={24} color={showAttachment ? '#3B82F6' : c.muted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setShowEmoji(!showEmoji); setShowAttachment(false); }} className={`w-8 h-8 rounded-full items-center justify-center ${showEmoji ? 'bg-blue-100' : ''}`}>
            <Ionicons name="happy" size={24} color={showEmoji ? '#3B82F6' : c.muted} />
          </TouchableOpacity>
          
          <View className="flex-1 bg-white rounded-full px-4 py-2 border border-gray-200">
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type your message..."
              placeholderTextColor={c.muted}
              multiline
              className="max-h-24 text-base text-gray-800 p-0 m-0"
              style={Platform.select({ web: { outlineStyle: 'none' } })}
            />
          </View>

          {text.trim() ? (
            <TouchableOpacity onPress={() => sendMessage()} className="w-10 h-10 rounded-full bg-[#00A884] items-center justify-center">
              <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setShowTemplateModal(true)} className="w-10 h-10 rounded-full bg-gray-800 items-center justify-center">
              <Ionicons name="albums" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

      </View>

      {/* Right Side Panel */}
      {showInfoPanel && renderInfoPanel()}
      
      {renderTemplateModal()}
    </KeyboardAvoidingView>
  );
}
