// src/navigation/AppNavigator.js — Feed-themed stack flow
import React, { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFeed } from '../theme';

// Shared screens (channel-agnostic)
import DashboardScreen from '../screens/shared/DashboardScreen';
import ReportScreen from '../screens/shared/ReportScreen';
import AgentScreen from '../screens/shared/AgentScreen';
import ConfigScreen from '../screens/shared/ConfigScreen';
import SendMessageScreen from '../screens/shared/SendMessageScreen';
import MediaLibraryScreen from '../screens/shared/MediaLibraryScreen';
import ChannelScreen from '../screens/shared/ChannelScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import ApiDocsScreen from '../screens/shared/ApiDocsScreen';
import ContactsScreen from '../screens/shared/ContactsScreen';
import CreateAgentScreen from '../screens/shared/CreateAgentScreen';

// WhatsApp screens
import WhatsAppChatScreen from '../screens/whatsapp/ChatScreen';
import UserProfileScreen from '../screens/whatsapp/UserProfileScreen';
import LiveAgentInbox from '../screens/whatsapp/LiveAgentInbox';
import LiveAgentChat from '../screens/whatsapp/LiveAgentChat';
import WhatsAppTemplatesScreen from '../screens/whatsapp/TemplatesScreen';
import WhatsAppCreateTemplateScreen from '../screens/whatsapp/CreateTemplateScreen';
import WabaChannelScreen from '../screens/whatsapp/WabaChannelScreen';
import WhatsAppCampaignsList from '../screens/whatsapp/campaigns/CampaignsListScreen';
import WhatsAppCampaignDetail from '../screens/whatsapp/campaigns/CampaignDetailScreen';
import WhatsAppCampaignStep1 from '../screens/whatsapp/campaigns/CampaignStep1Screen';
import WhatsAppCampaignStep2 from '../screens/whatsapp/campaigns/CampaignStep2Screen';
import WhatsAppCampaignStep3 from '../screens/whatsapp/campaigns/CampaignStep3Screen';
import WhatsAppDashboardScreen from '../screens/whatsapp/WhatsAppDashboardScreen';

// RCS screens
import RcsChatScreen from '../screens/rcs/ChatScreen';
import RcsBotIdScreen from '../screens/rcs/BotIdScreen';
import RcsTemplatesScreen from '../screens/rcs/TemplatesScreen';
import RcsCreateTemplateScreen from '../screens/rcs/CreateTemplateScreen';
import RcsCampaignScreen from '../screens/rcs/CampaignScreen';
import RcsCampaignsList from '../screens/rcs/campaigns/CampaignsListScreen';
import RcsCampaignDetail from '../screens/rcs/campaigns/CampaignDetailScreen';
import RcsCampaignStep1 from '../screens/rcs/campaigns/CampaignStep1Screen';
import RcsCampaignStep2 from '../screens/rcs/campaigns/CampaignStep2Screen';
import RcsCampaignStep3 from '../screens/rcs/campaigns/CampaignStep3Screen';

// SMS screens
import SmsChatScreen from '../screens/sms/ChatScreen';
import SmsSenderIdScreen from '../screens/sms/SenderIdScreen';
import SmsTemplatesScreen from '../screens/sms/TemplatesScreen';
import SmsCreateTemplateScreen from '../screens/sms/CreateTemplateScreen';
import SmsCampaignScreen from '../screens/sms/CampaignScreen';
import SmsConfigScreen from '../screens/sms/ConfigScreen';
import SmsCampaignsList from '../screens/sms/campaigns/CampaignsListScreen';
import SmsCampaignDetail from '../screens/sms/campaigns/CampaignDetailScreen';
import SmsCampaignStep1 from '../screens/sms/campaigns/CampaignStep1Screen';
import SmsCampaignStep2 from '../screens/sms/campaigns/CampaignStep2Screen';
import SmsCampaignStep3 from '../screens/sms/campaigns/CampaignStep3Screen';

// Voice screens
import VoiceCallerIdScreen from '../screens/voice/CallerIdScreen';
import VoiceConfigScreen from '../screens/voice/ConfigScreen';
import VoiceCampaignScreen from '../screens/voice/CampaignScreen';
import ClickToCallScreen from '../screens/voice/ClickToCallScreen';
import VoiceCampaignsList from '../screens/voice/campaigns/CampaignsListScreen';
import VoiceCampaignDetail from '../screens/voice/campaigns/CampaignDetailScreen';
import VoiceCampaignStep1 from '../screens/voice/campaigns/CampaignStep1Screen';
import VoiceCampaignStep2 from '../screens/voice/campaigns/CampaignStep2Screen';
import VoiceCampaignStep3 from '../screens/voice/campaigns/CampaignStep3Screen';

const Stack = createNativeStackNavigator();

const NAV_FONTS = {
  regular: { fontFamily: 'System', fontWeight: '400' },
  medium: { fontFamily: 'System', fontWeight: '500' },
  bold: { fontFamily: 'System', fontWeight: '700' },
  heavy: { fontFamily: 'System', fontWeight: '900' },
};

export default function AppNavigator() {
  const c = useFeed();

  const theme = useMemo(() => ({
    dark: c.scheme === 'dark',
    colors: {
      primary: c.accentPink,
      background: c.bg,
      card: c.bgCard || c.bgSoft,
      text: c.text,
      border: c.border,
      notification: c.accentPink,
    },
    fonts: NAV_FONTS,
  }), [c]);

  const screenOptions = useMemo(() => ({
    headerShown: false,
    contentStyle: { backgroundColor: c.bg },
    animation: 'fade',
  }), [c]);

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator initialRouteName="Dashboard" screenOptions={screenOptions}>
        {/* Shared */}
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Report" component={ReportScreen} />
        <Stack.Screen name="Agent" component={AgentScreen} />
        <Stack.Screen name="Config" component={ConfigScreen} />
        <Stack.Screen name="Send" component={SendMessageScreen} />
        <Stack.Screen name="MediaLibrary" component={MediaLibraryScreen} />
        <Stack.Screen name="Channel" component={ChannelScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="You" component={ProfileScreen} />
        <Stack.Screen name="ApiDocs" component={ApiDocsScreen} />
        <Stack.Screen name="Contacts" component={ContactsScreen} />
        <Stack.Screen name="CreateAgent" component={CreateAgentScreen} />

        {/* WhatsApp */}
        <Stack.Screen
          name="WhatsAppInbox"
          component={LiveAgentInbox}
          initialParams={{ channel: 'whatsapp' }}
        />
        <Stack.Screen name="WhatsAppChat" component={WhatsAppChatScreen} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="WhatsAppTemplates" component={WhatsAppTemplatesScreen} />
        <Stack.Screen name="WhatsAppCreateTemplate" component={WhatsAppCreateTemplateScreen} />
        <Stack.Screen name="WabaChannels" component={WabaChannelScreen} />
        <Stack.Screen name="WhatsAppCampaignsList" component={WhatsAppCampaignsList} />
        <Stack.Screen name="WhatsAppCampaignDetail" component={WhatsAppCampaignDetail} />
        <Stack.Screen name="WhatsAppCampaignStep1" component={WhatsAppCampaignStep1} />
        <Stack.Screen name="WhatsAppCampaignStep2" component={WhatsAppCampaignStep2} />
        <Stack.Screen name="WhatsAppCampaignStep3" component={WhatsAppCampaignStep3} />
        <Stack.Screen name="WhatsAppDashboard" component={WhatsAppDashboardScreen} />

        {/* WhatsApp Live Agent (server-driven, real-time) */}
        <Stack.Screen name="LiveAgentInbox" component={LiveAgentInbox} />
        <Stack.Screen name="LiveAgentChat" component={LiveAgentChat} />

        {/* RCS */}
        <Stack.Screen
          name="RcsInbox"
          component={LiveAgentInbox}
          initialParams={{ channel: 'rcs' }}
        />
        <Stack.Screen name="RcsChat" component={RcsChatScreen} />
        <Stack.Screen name="RcsBotIds" component={RcsBotIdScreen} />
        <Stack.Screen name="RcsTemplates" component={RcsTemplatesScreen} />
        <Stack.Screen name="RcsCreateTemplate" component={RcsCreateTemplateScreen} />
        <Stack.Screen name="RcsCampaign" component={RcsCampaignScreen} />
        <Stack.Screen name="RcsCampaignsList" component={RcsCampaignsList} />
        <Stack.Screen name="RcsCampaignDetail" component={RcsCampaignDetail} />
        <Stack.Screen name="RcsCampaignStep1" component={RcsCampaignStep1} />
        <Stack.Screen name="RcsCampaignStep2" component={RcsCampaignStep2} />
        <Stack.Screen name="RcsCampaignStep3" component={RcsCampaignStep3} />

        {/* SMS */}
        <Stack.Screen
          name="SmsInbox"
          component={LiveAgentInbox}
          initialParams={{ channel: 'sms' }}
        />
        <Stack.Screen name="SmsChat" component={SmsChatScreen} />
        <Stack.Screen name="SmsSenderIds" component={SmsSenderIdScreen} />
        <Stack.Screen name="SmsTemplates" component={SmsTemplatesScreen} />
        <Stack.Screen name="SmsCreateTemplate" component={SmsCreateTemplateScreen} />
        <Stack.Screen name="SmsCampaign" component={SmsCampaignScreen} />
        <Stack.Screen name="SmsConfig" component={SmsConfigScreen} />
        <Stack.Screen name="SmsCampaignsList" component={SmsCampaignsList} />
        <Stack.Screen name="SmsCampaignDetail" component={SmsCampaignDetail} />
        <Stack.Screen name="SmsCampaignStep1" component={SmsCampaignStep1} />
        <Stack.Screen name="SmsCampaignStep2" component={SmsCampaignStep2} />
        <Stack.Screen name="SmsCampaignStep3" component={SmsCampaignStep3} />

        {/* Voice */}
        <Stack.Screen name="VoiceCallerIds" component={VoiceCallerIdScreen} />
        <Stack.Screen name="VoiceConfig" component={VoiceConfigScreen} />
        <Stack.Screen name="VoiceCampaign" component={VoiceCampaignScreen} />
        <Stack.Screen name="ClickToCall" component={ClickToCallScreen} />
        <Stack.Screen name="VoiceCampaignsList" component={VoiceCampaignsList} />
        <Stack.Screen name="VoiceCampaignDetail" component={VoiceCampaignDetail} />
        <Stack.Screen name="VoiceCampaignStep1" component={VoiceCampaignStep1} />
        <Stack.Screen name="VoiceCampaignStep2" component={VoiceCampaignStep2} />
        <Stack.Screen name="VoiceCampaignStep3" component={VoiceCampaignStep3} />

        {/* Aliases for legacy route names so existing navigate('Inbox' / 'Chat' / 'Templates' / 'CreateTemplate' / 'CampaignStep1' / etc) keep working. Default to WhatsApp where ambiguous. */}
        {/* The bottom-tab Chats button + Channel landing "Live Agent" tile
            both route through `Inbox`. The polished real-data screen lives
            in LiveAgentInbox.js — point Inbox at it so we have one canonical
            inbox screen across the app. WhatsAppInbox/RcsInbox/SmsInbox
            still resolve to InboxScreen.js for the per-channel mock views. */}
        <Stack.Screen name="Inbox" component={LiveAgentInbox} />
        <Stack.Screen name="Chat" component={WhatsAppChatScreen} />
        <Stack.Screen name="Templates" component={WhatsAppTemplatesScreen} />
        <Stack.Screen name="CreateTemplate" component={WhatsAppCreateTemplateScreen} />
        <Stack.Screen name="CampaignsList" component={WhatsAppCampaignsList} />
        <Stack.Screen name="CampaignDetail" component={WhatsAppCampaignDetail} />
        <Stack.Screen name="CampaignStep1" component={WhatsAppCampaignStep1} />
        <Stack.Screen name="CampaignStep2" component={WhatsAppCampaignStep2} />
        <Stack.Screen name="CampaignStep3" component={WhatsAppCampaignStep3} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
