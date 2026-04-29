// src/screens/sms/campaigns/CampaignsListScreen.js — SMS campaigns list (channel-locked)
import React from 'react';
import WhatsAppCampaignsList from '../../whatsapp/campaigns/CampaignsListScreen';

export default function CampaignsListScreen(props) {
  const route = { ...props.route, params: { ...(props.route?.params || {}), channel: 'sms' } };
  return <WhatsAppCampaignsList {...props} route={route} />;
}
