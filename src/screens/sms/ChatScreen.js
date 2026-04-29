// src/screens/sms/ChatScreen.js — SMS chat (wraps shared chat with channel='sms')
import React from 'react';
import WhatsAppChatScreen from '../whatsapp/ChatScreen';

export default function ChatScreen(props) {
  const params = props.route?.params || {};
  const conversation = params.conversation
    ? { ...params.conversation, channel: 'sms' }
    : { id: 'new', name: 'New SMS Chat', channel: 'sms', online: false };
  const route = { ...props.route, params: { ...params, channel: 'sms', conversation } };
  return <WhatsAppChatScreen {...props} route={route} />;
}
