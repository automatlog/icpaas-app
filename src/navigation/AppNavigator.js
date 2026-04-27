// src/navigation/AppNavigator.js — Feed-themed stack flow
import React, { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFeed } from '../theme';

import DashboardScreen from '../screens/DashboardScreen';
import ProductIconsScreen from '../screens/ProductIconsScreen';
import ReportScreen from '../screens/ReportScreen';
import AgentScreen from '../screens/AgentScreen';
import InboxScreen from '../screens/InboxScreen';
import ChatScreen from '../screens/ChatScreen';
import TemplatesScreen from '../screens/TemplatesScreen';
import ConfigScreen from '../screens/ConfigScreen';
import SendMessageScreen from '../screens/SendMessageScreen';
import WabaChannelScreen from '../screens/WabaChannelScreen';
import MediaLibraryScreen from '../screens/MediaLibraryScreen';
import CampaignStep1Screen from '../screens/CampaignStep1Screen';
import CampaignStep2Screen from '../screens/CampaignStep2Screen';
import CampaignStep3Screen from '../screens/CampaignStep3Screen';
import ChannelScreen from '../screens/ChannelScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import YouScreen from '../screens/YouScreen';
import ApiDocsScreen from '../screens/ApiDocsScreen';

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
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="ProductIcons" component={ProductIconsScreen} />
        <Stack.Screen name="Report" component={ReportScreen} />
        <Stack.Screen name="Agent" component={AgentScreen} />
        <Stack.Screen name="Templates" component={TemplatesScreen} />
        <Stack.Screen name="Inbox" component={InboxScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Config" component={ConfigScreen} />
        <Stack.Screen name="Send" component={SendMessageScreen} />
        <Stack.Screen name="WabaChannels" component={WabaChannelScreen} />
        <Stack.Screen name="MediaLibrary" component={MediaLibraryScreen} />
        <Stack.Screen name="CampaignStep1" component={CampaignStep1Screen} />
        <Stack.Screen name="CampaignStep2" component={CampaignStep2Screen} />
        <Stack.Screen name="CampaignStep3" component={CampaignStep3Screen} />
        <Stack.Screen name="Channel" component={ChannelScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="You" component={YouScreen} />
        <Stack.Screen name="ApiDocs" component={ApiDocsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
