// src/screens/rcs/campaigns/CampaignStep2Screen.js — RCS campaign step 2 (channel-locked)
import React from 'react';
import WhatsAppStep2 from '../../whatsapp/campaigns/CampaignStep2Screen';

export default function CampaignStep2Screen(props) {
  const route = { ...props.route, params: { ...(props.route?.params || {}), channel: 'rcs' } };
  return <WhatsAppStep2 {...props} route={route} />;
}
