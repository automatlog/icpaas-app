// src/screens/sms/campaigns/CampaignDetailScreen.js — SMS campaign detail (channel-locked)
import React from 'react';
import WhatsAppCampaignDetail from '../../whatsapp/campaigns/CampaignDetailScreen';

export default function CampaignDetailScreen(props) {
  const route = { ...props.route, params: { ...(props.route?.params || {}), channel: 'sms' } };
  return <WhatsAppCampaignDetail {...props} route={route} />;
}
