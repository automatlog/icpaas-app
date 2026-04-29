// src/screens/rcs/TemplatesScreen.js — RCS-only template list
import React from 'react';
import WhatsAppTemplatesScreen from '../whatsapp/TemplatesScreen';

export default function TemplatesScreen(props) {
  const route = { ...props.route, params: { ...(props.route?.params || {}), channel: 'rcs' } };
  return <WhatsAppTemplatesScreen {...props} route={route} />;
}
