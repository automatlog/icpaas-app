// src/screens/sms/InboxScreen.js — SMS-only inbox (wraps shared inbox with channel='sms')
import React from 'react';
import WhatsAppInboxScreen from '../whatsapp/InboxScreen';

export default function InboxScreen(props) {
  const route = { ...props.route, params: { ...(props.route?.params || {}), channel: 'sms' } };
  return <WhatsAppInboxScreen {...props} route={route} />;
}
