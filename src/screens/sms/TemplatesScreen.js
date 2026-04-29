// src/screens/sms/TemplatesScreen.js — SMS-only template list
import React from 'react';
import WhatsAppTemplatesScreen from '../whatsapp/TemplatesScreen';

export default function TemplatesScreen(props) {
  const route = { ...props.route, params: { ...(props.route?.params || {}), channel: 'sms' } };
  return <WhatsAppTemplatesScreen {...props} route={route} />;
}
