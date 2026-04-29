// src/screens/rcs/campaigns/CampaignDetailScreen.js — RCS campaign detail (channel-locked)
import React from 'react';
import WhatsAppCampaignDetail from '../../whatsapp/campaigns/CampaignDetailScreen';

export default function CampaignDetailScreen(props) {
  const route = { ...props.route, params: { ...(props.route?.params || {}), channel: 'rcs' } };
  return <WhatsAppCampaignDetail {...props} route={route} />;
}
