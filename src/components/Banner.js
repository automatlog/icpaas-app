// src/components/Banner.js — Inline tone-aware banner.
// Use for sticky in-screen messages: connection status, quota warnings,
// release notes, success confirmations. For ephemeral notifications
// prefer toast.* (top floating); for blocking decisions use dialog.confirm.
import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TONES = {
  info:    { fg: '#1D4ED8', bg: '#DBEAFE', icon: 'information-circle' },
  success: { fg: '#047857', bg: '#D1FAE5', icon: 'checkmark-circle' },
  warning: { fg: '#B45309', bg: '#FEF3C7', icon: 'warning' },
  danger:  { fg: '#B91C1C', bg: '#FEE2E2', icon: 'close-circle' },
};

const TONES_DARK = {
  info:    { fg: '#93C5FD', bg: 'rgba(59,130,246,0.16)', icon: 'information-circle' },
  success: { fg: '#6EE7B7', bg: 'rgba(16,185,129,0.16)', icon: 'checkmark-circle' },
  warning: { fg: '#FCD34D', bg: 'rgba(245,158,11,0.16)', icon: 'warning' },
  danger:  { fg: '#FCA5A5', bg: 'rgba(239,68,68,0.16)', icon: 'close-circle' },
};

export default function Banner({
  tone = 'info',
  title,
  message,
  icon,
  actionText,
  onAction,
  onClose,
  style,
}) {
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? TONES_DARK : TONES;
  const t = palette[tone] || palette.info;

  return (
    <View
      style={[{
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: t.bg,
        borderRadius: 14,
        padding: 12,
        gap: 10,
      }, style]}
    >
      <View
        style={{
          width: 26, height: 26, borderRadius: 13,
          backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
          alignItems: 'center', justifyContent: 'center',
          marginTop: 1,
        }}
      >
        <Ionicons name={icon || t.icon} size={16} color={t.fg} />
      </View>

      <View style={{ flex: 1 }}>
        {title ? (
          <Text style={{ color: t.fg, fontSize: 13, fontWeight: '700' }} numberOfLines={2}>
            {title}
          </Text>
        ) : null}
        {message ? (
          <Text style={{ color: t.fg, fontSize: 12, marginTop: title ? 2 : 0, opacity: 0.9 }}>
            {message}
          </Text>
        ) : null}

        {onAction && actionText ? (
          <TouchableOpacity
            onPress={onAction}
            activeOpacity={0.8}
            style={{
              alignSelf: 'flex-start',
              marginTop: 8,
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 10,
              backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              ...Platform.select({ web: { cursor: 'pointer' } }),
            }}
          >
            <Text style={{ color: t.fg, fontSize: 11, fontWeight: '700' }}>{actionText}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {onClose ? (
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ padding: 2 }}
        >
          <Ionicons name="close" size={16} color={t.fg} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
