// src/screens/rcs/ChatScreen.js — RCS chat (wraps shared chat with channel='rcs')
import React from 'react';
import WhatsAppChatScreen from '../whatsapp/ChatScreen';

export default function ChatScreen(props) {
  const params = props.route?.params || {};
  const conversation = params.conversation
    ? { ...params.conversation, channel: 'rcs' }
    : { id: 'new', name: 'New RCS Chat', channel: 'rcs', online: false };
  const route = { ...props.route, params: { ...params, channel: 'rcs', conversation } };
  return <WhatsAppChatScreen {...props} route={route} />;
}
