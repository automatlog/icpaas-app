// src/components/BottomTabBar.js — sticky bottom navigation.
//
// Layout:
//   • Home / Chats / [centre Campaign FAB] / Reports / Profile
//   • White icon strip (c.bgCard) with rounded top corners + subtle shadow
//   • The bottom safe-area green band is painted by the App-level outer
//     container in App.js (not this component) — a screen wrapped in
//     App.js's green-outer / white-inner pattern automatically gets the
//     green strip below this bar.
//
// Behaviour:
//   • Campaign FAB toggles the CampaignPicker speed-dial arc (4 channels).
//   • Chats tab toggles the ChatsPicker speed-dial arc (WhatsApp + RCS).
//   • Both pickers are mounted inside this component so every screen using
//     the BottomTabBar gets the speed-dials for free.
//
// Props:
//   c           — brand theme from useBrand()
//   navigation  — React Navigation prop forwarded by the host screen
//   active      — which tab to highlight: 'home' | 'chats' | 'campaign' |
//                 'reports' | 'you'
//
// Screens still pad their ScrollView with `paddingBottom: 100` (or the
// exported BAR_HEIGHT constant) to clear the strip.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import CampaignPicker from './CampaignPicker';
import ChatsPicker from './ChatsPicker';
import haptics from '../services/haptics';
import { selectUnreadBadgeTotal } from '../store/slices/liveChatSlice';

export const BAR_HEIGHT = 100;
const ICON_INACTIVE = '#9CA3AF';

export default function BottomTabBar({ c, navigation, active = 'home' }) {
  const [pickerOpen, setPickerOpen] = useState(false);          // Campaign speed-dial
  const [chatsPickerOpen, setChatsPickerOpen] = useState(false); // Chats speed-dial

  // Live unread total — drives the small badge on the Chats tab so users
  // see new conversations even when they're elsewhere in the app.
  const liveUnread = useSelector(selectUnreadBadgeTotal);

  // The white icon strip uses c.bgCard so it stays clean in both themes.
  const stripBg = c.bgCard;
  const iconActive = c.text;

  const tab = (key, icon, label, onPress, hapticStyle = 'tap', badgeCount = 0) => {
    const isActive = active === key;
    return (
      <TouchableOpacity
        onPress={() => { (haptics[hapticStyle] || haptics.tap)(); onPress(); }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={badgeCount > 0 ? `${label}, ${badgeCount} unread` : label}
        className="items-center justify-center"
        style={{ flex: 1 }}
      >
        <View>
          <Ionicons name={icon} size={26} color={isActive ? iconActive : ICON_INACTIVE} />
          {badgeCount > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: -4,
                right: -10,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                paddingHorizontal: 4,
                backgroundColor: c.danger,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: stripBg,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>
                {badgeCount > 99 ? '99+' : badgeCount}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          style={{
            color: isActive ? iconActive : ICON_INACTIVE,
            fontSize: 11,
            fontWeight: '700',
            marginTop: 4,
          }}
        >
          {label}
        </Text>
        {isActive ? (
          <View
            style={{
              position: 'absolute',
              bottom: -4,
              width: 24, height: 2.5,
              borderRadius: 2,
              backgroundColor: c.primary,
            }}
          />
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={{
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 18,
      }}
    >
      {/* White icon strip */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingTop: 16,
          paddingBottom: 14,
          backgroundColor: stripBg,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          borderTopWidth: 1,
          borderTopColor: c.border,
        }}
      >
        {tab('home', 'home', 'Home', () => navigation.navigate('Dashboard'))}
        {tab('chats', 'chatbubbles-outline', 'Chats', () => setChatsPickerOpen((v) => !v), 'medium', liveUnread)}

        {/* Centered raised Campaign FAB — toggles the speed-dial arc */}
        <View className="items-center justify-center" style={{ flex: 1 }}>
          <TouchableOpacity
            onPress={() => { haptics.medium(); setPickerOpen((v) => !v); }}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={pickerOpen ? 'Close campaign menu' : 'New campaign'}
            style={{
              width: 60, height: 60, borderRadius: 30,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: c.primary,
              marginTop: -32,
              shadowColor: c.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.5,
              shadowRadius: 14,
              elevation: 10,
              borderWidth: 4,
              borderColor: stripBg,
              transform: [{ rotate: pickerOpen ? '45deg' : '0deg' }],
            }}
          >
            <Ionicons name={pickerOpen ? 'close' : 'megaphone'} size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text
            style={{
              color: (active === 'campaign' || pickerOpen) ? iconActive : ICON_INACTIVE,
              fontSize: 11,
              fontWeight: '700',
              marginTop: 4,
            }}
          >
            Campaign
          </Text>
        </View>

        {tab('reports', 'bar-chart-outline', 'Reports', () => navigation.navigate('Report'))}
        {tab('you', 'person-outline', 'Profile', () => navigation.navigate('Profile'))}
      </View>

      {/* Campaign speed-dial — fans above the centre FAB */}
      <CampaignPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(ch) => {
          haptics.select();
          setPickerOpen(false);
          navigation.navigate(ch.route);
        }}
      />

      {/* Chats speed-dial — fans above the Chats tab (left of centre).
          Only WhatsApp + RCS are shown; SMS / Voice don't have live chat. */}
      <ChatsPicker
        visible={chatsPickerOpen}
        onClose={() => setChatsPickerOpen(false)}
        onPick={(ch) => {
          haptics.select();
          setChatsPickerOpen(false);
          navigation.navigate(ch.route, ch.routeParams);
        }}
      />
    </View>
  );
}
