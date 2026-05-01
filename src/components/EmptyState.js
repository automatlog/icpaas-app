// src/components/EmptyState.js
//
// Consistent zero-state across the app. Renders an illustrated icon
// (large tinted halo + main icon, optional accent dots in three corners
// to read like a small composition rather than a single chip), a bold
// title, a muted subtitle, and an optional CTA.
//
// Drops the bare "icon + text" pattern that several screens used. No
// extra image assets — entirely Ionicons + tinted shapes — so it stays
// theme-aware and doesn't bloat the bundle.
//
// Usage:
//   <EmptyState
//     c={c}
//     icon="chatbubble-ellipses-outline"
//     title="No conversations yet"
//     subtitle="Inbound WhatsApp / RCS messages will land here."
//     accentIcons={['logo-whatsapp', 'logo-google']}
//     ctaLabel="Send first message"
//     onCtaPress={() => navigation.navigate('SendMessage')}
//   />
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EmptyState({
  c,
  icon = 'sparkles-outline',
  title = 'Nothing here yet',
  subtitle,
  accentIcons = [],   // up to 3 small icons that decorate corners
  ctaLabel,
  onCtaPress,
  compact = false,    // smaller halo + tighter padding for inline use
}) {
  const haloSize = compact ? 88 : 128;
  const iconSize = compact ? 36 : 52;

  return (
    <View
      style={{
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: compact ? 24 : 40,
        gap: compact ? 8 : 14,
      }}
    >
      {/* Illustration: halo + main icon + corner accents */}
      <View
        style={{
          width: haloSize,
          height: haloSize,
          borderRadius: haloSize / 2,
          backgroundColor: c.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <Ionicons name={icon} size={iconSize} color={c.primary} />

        {/* Corner accents — purely decorative; deterministic positions so
            the layout reads the same across renders. */}
        {accentIcons[0] ? (
          <Accent c={c} icon={accentIcons[0]} top={-4} right={-2} />
        ) : null}
        {accentIcons[1] ? (
          <Accent c={c} icon={accentIcons[1]} bottom={-4} left={-4} />
        ) : null}
        {accentIcons[2] ? (
          <Accent c={c} icon={accentIcons[2]} bottom={4} right={-8} />
        ) : null}
      </View>

      <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ color: c.textMuted, fontSize: 12, textAlign: 'center', maxWidth: 300, lineHeight: 18 }}>
          {subtitle}
        </Text>
      ) : null}

      {ctaLabel && onCtaPress ? (
        <TouchableOpacity
          onPress={onCtaPress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          style={{
            marginTop: 8,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: c.primary,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const Accent = ({ c, icon, top, bottom, left, right }) => (
  <View
    style={{
      position: 'absolute',
      top, bottom, left, right,
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: c.bgCard,
      borderWidth: 2, borderColor: c.bg,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    }}
  >
    <Ionicons name={icon} size={14} color={c.primaryDeep || c.primary} />
  </View>
);
