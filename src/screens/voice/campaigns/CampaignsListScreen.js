// src/screens/voice/campaigns/CampaignsListScreen.js — Voice campaigns list (channel-locked)
import React from 'react';
import WhatsAppCampaignsList from '../../whatsapp/campaigns/CampaignsListScreen';

export default function CampaignsListScreen(props) {
  const route = { ...props.route, params: { ...(props.route?.params || {}), channel: 'voice' } };
  return <WhatsAppCampaignsList {...props} route={route} />;
}
