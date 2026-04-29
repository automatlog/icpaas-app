// src/screens/rcs/campaigns/CampaignStep3Screen.js — RCS campaign step 3 (channel-locked)
import React from 'react';
import WhatsAppStep3 from '../../whatsapp/campaigns/CampaignStep3Screen';

export default function CampaignStep3Screen(props) {
  const route = { ...props.route, params: { ...(props.route?.params || {}), channel: 'rcs' } };
  return <WhatsAppStep3 {...props} route={route} />;
}
