// src/screens/rcs/InboxScreen.js — RCS-only inbox (wraps shared inbox with channel='rcs')
import React from 'react';
import WhatsAppInboxScreen from '../whatsapp/InboxScreen';

export default function InboxScreen(props) {
  const route = { ...props.route, params: { ...(props.route?.params || {}), channel: 'rcs' } };
  return <WhatsAppInboxScreen {...props} route={route} />;
}
