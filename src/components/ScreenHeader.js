// src/components/ScreenHeader.js — sticky page header.
// Renders:
//   1. A primary-green status-bar inset spacer (height = insets.top)
//   2. A header bar with optional back arrow, optional tinted-circle icon,
//      title + optional inline badge, optional subtitle (with status dot),
//      and an optional right-aligned action.
//
// Mount ABOVE the screen's ScrollView. The ScrollView gets `flex: 1` and
// scrolls underneath the header — the header itself stays put.
//
// Usage:
//   <ScreenHeader
//     c={c}
//     onBack={() => navigation.goBack()}
//     icon="logo-whatsapp"
//     title="WhatsApp"
//     badge="Active"
//     subtitle="Connected"
//     right={<TouchableOpacity ...><Ionicons name="settings-outline" /></TouchableOpacity>}
//   />
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ScreenHeader({
  c,
  onBack,
  icon,
  iconBg,    // optional override (defaults to c.primarySoft)
  iconFg,    // optional override (defaults to c.primary)
  title,
  badge,     // string OR { text, bg, fg }
  subtitle,  // string OR { text, dotColor }
  right,
  centerTitle = false,
  insetColor, // color for the status-bar inset spacer; defaults to c.primary
}) {
  const insets = useSafeAreaInsets();

  const badgeObj = typeof badge === 'string' ? { text: badge } : badge;
  const subObj = typeof subtitle === 'string' ? { text: subtitle } : subtitle;

  return (
    <View>
      {/* Status-bar inset, painted with the brand primary green */}
      <View style={{ height: insets.top, backgroundColor: insetColor || c.primary }} />

      {/* Header bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          gap: 12,
          backgroundColor: c.bg,
          borderBottomWidth: 1,
          borderBottomColor: c.rule,
        }}
      >
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
        ) : null}

        {icon ? (
          <View
            style={{
              width: 40, height: 40, borderRadius: 20,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: iconBg || c.primarySoft,
            }}
          >
            <Ionicons name={icon} size={20} color={iconFg || c.primary} />
          </View>
        ) : null}

        <View style={{ flex: 1, alignItems: centerTitle ? 'center' : 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text
              numberOfLines={1}
              style={{ color: c.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}
            >
              {title}
            </Text>
            {badgeObj?.text ? (
              <View
                style={{
                  paddingHorizontal: 8, paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: badgeObj.bg || c.primarySoft,
                }}
              >
                <Text
                  style={{
                    color: badgeObj.fg || c.primaryDeep,
                    fontSize: 10,
                    fontWeight: '700',
                  }}
                >
                  {badgeObj.text}
                </Text>
              </View>
            ) : null}
          </View>
          {subObj?.text ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 6 }}>
              {subObj.dotColor ? (
                <View
                  style={{
                    width: 6, height: 6, borderRadius: 3,
                    backgroundColor: subObj.dotColor,
                  }}
                />
              ) : null}
              <Text style={{ color: subObj.dotColor || c.textMuted, fontSize: 12, fontWeight: '600' }}>
                {subObj.text}
              </Text>
            </View>
          ) : null}
        </View>

        {right ? <View>{right}</View> : null}
      </View>
    </View>
  );
}
