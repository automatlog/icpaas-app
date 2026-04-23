// src/navigation/AppNavigator.js — editorial stack flow (adaptive theme)
import React, { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEditorial } from '../theme';

import DashboardScreen from '../screens/DashboardScreen';
import ProductIconsScreen from '../screens/ProductIconsScreen';
import ReportScreen from '../screens/ReportScreen';
import AgentScreen from '../screens/AgentScreen';
import InboxScreen from '../screens/InboxScreen';
import ChatScreen from '../screens/ChatScreen';
import CampaignsScreen from '../screens/CampaignsScreen';
import ContactsScreen from '../screens/ContactsScreen';
import TemplatesScreen from '../screens/TemplatesScreen';
import IVRScreen from '../screens/IVRScreen';
import ConfigScreen from '../screens/ConfigScreen';
import SendMessageScreen from '../screens/SendMessageScreen';

const Stack = createNativeStackNavigator();

const NAV_FONTS = {
  regular: { fontFamily: 'System', fontWeight: '400' },
  medium: { fontFamily: 'System', fontWeight: '500' },
  bold: { fontFamily: 'System', fontWeight: '700' },
  heavy: { fontFamily: 'System', fontWeight: '900' },
};

export default function AppNavigator() {
  const ed = useEditorial();

  const theme = useMemo(() => ({
    dark: ed.scheme === 'dark',
    colors: {
      primary: ed.oxblood,
      background: ed.paper,
      card: ed.paper,
      text: ed.ink,
      border: ed.rule,
      notification: ed.oxblood,
    },
    fonts: NAV_FONTS,
  }), [ed]);

  const screenOptions = useMemo(() => ({
    headerShown: false,
    contentStyle: { backgroundColor: ed.paper },
    animation: 'fade',
  }), [ed]);

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator initialRouteName="Dashboard" screenOptions={screenOptions}>
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="ProductIcons" component={ProductIconsScreen} />
        <Stack.Screen name="Report" component={ReportScreen} />
        <Stack.Screen name="Agent" component={AgentScreen} />
        <Stack.Screen name="Templates" component={TemplatesScreen} />
        <Stack.Screen name="Campaigns" component={CampaignsScreen} />
        <Stack.Screen name="Contacts" component={ContactsScreen} />
        <Stack.Screen name="Inbox" component={InboxScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="IVR" component={IVRScreen} />
        <Stack.Screen name="Config" component={ConfigScreen} />
        <Stack.Screen name="Send" component={SendMessageScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
