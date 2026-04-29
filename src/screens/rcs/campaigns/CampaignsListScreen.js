// src/screens/rcs/campaigns/CampaignsListScreen.js — RCS campaigns list (channel-locked)
import React from 'react';
import WhatsAppCampaignsList from '../../whatsapp/campaigns/CampaignsListScreen';

export default function CampaignsListScreen(props) {
  const route = { ...props.route, params: { ...(props.route?.params || {}), channel: 'rcs' } };
  return <WhatsAppCampaignsList {...props} route={route} />;
}
