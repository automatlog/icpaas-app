// src/screens/voice/campaigns/CampaignStep2Screen.js — Voice campaign step 2 (channel-locked)
import React from 'react';
import WhatsAppStep2 from '../../whatsapp/campaigns/CampaignStep2Screen';

export default function CampaignStep2Screen(props) {
  const route = { ...props.route, params: { ...(props.route?.params || {}), channel: 'voice' } };
  return <WhatsAppStep2 {...props} route={route} />;
}
