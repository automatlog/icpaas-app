// src/screens/voice/campaigns/CampaignStep1Screen.js — Voice campaign step 1 (channel-locked)
import React from 'react';
import WhatsAppStep1 from '../../whatsapp/campaigns/CampaignStep1Screen';

export default function CampaignStep1Screen(props) {
  const route = { ...props.route, params: { ...(props.route?.params || {}), channel: 'voice' } };
  return <WhatsAppStep1 {...props} route={route} />;
}
