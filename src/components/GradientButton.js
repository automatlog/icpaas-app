// src/components/GradientButton.js — global gradient button.
// 135° linear gradient. Pick a `variant` to choose the colour:
//   primary   → green   (#10B981 → #059669)   default
//   secondary → grey    (#9CA3AF → #6B7280)
//   info      → blue    (#3B82F6 → #1D4ED8)
//   danger    → red     (#EF4444 → #B91C1C)
//   teal      → teal    (#16697A → #1A4D5C)
// You can also pass `colors={['#xxx','#yyy']}` to override.
//
// Props:
//   title, onPress, loading, disabled
//   icon (Ionicon name), iconPosition: 'left' | 'right'
//   size: 'sm' | 'md' | 'lg'
//   variant: 'primary' | 'secondary' | 'info' | 'danger' | 'teal'
//   fullWidth (default true), style, textStyle
import React from 'react';
import {
  Text, TouchableOpacity, View, ActivityIndicator, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export const VARIANTS = {
  primary:   { colors: ['#10B981', '#059669'], shadow: '#10B981', text: '#FFFFFF' }, // green
  secondary: { colors: ['#9CA3AF', '#6B7280'], shadow: '#6B7280', text: '#FFFFFF' }, // grey
  info:      { colors: ['#3B82F6', '#1D4ED8'], shadow: '#3B82F6', text: '#FFFFFF' }, // blue
  danger:    { colors: ['#EF4444', '#B91C1C'], shadow: '#EF4444', text: '#FFFFFF' }, // red
  teal:      { colors: ['#16697A', '#1A4D5C'], shadow: '#16697A', text: '#FFFFFF' }, // teal (legacy)
};

const DISABLED = ['#9CA3AF', '#6B7280'];

const SIZES = {
  sm: { paddingVertical: 10, paddingHorizontal: 16, fontSize: 13, iconSize: 14, radius: 12, gap: 6 },
  md: { paddingVertical: 14, paddingHorizontal: 20, fontSize: 14, iconSize: 16, radius: 14, gap: 8 },
  lg: { paddingVertical: 18, paddingHorizontal: 24, fontSize: 17, iconSize: 20, radius: 20, gap: 10 },
};

export default function GradientButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  size = 'md',
  variant = 'primary',
  fullWidth = true,
  style,
  textStyle,
  colors,                // optional override; takes precedence over variant
  testID,
  accessibilityLabel,    // overrides the auto-derived label (title)
  accessibilityHint,
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  const inactive = disabled || loading;
  const gradient = inactive ? DISABLED : (colors || v.colors);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.85}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[{ alignSelf: fullWidth ? 'stretch' : 'flex-start' }, style]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: s.radius,
          shadowColor: v.shadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: inactive ? 0 : 0.25,
          shadowRadius: 12,
          elevation: inactive ? 0 : 6,
          opacity: inactive ? 0.85 : 1,
          ...Platform.select({ web: { cursor: inactive ? 'not-allowed' : 'pointer' } }),
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: s.paddingVertical,
            paddingHorizontal: s.paddingHorizontal,
            gap: s.gap,
          }}
        >
          {loading ? (
            <>
              <ActivityIndicator size="small" color={v.text} />
              {title ? (
                <Text style={[{ color: v.text, fontSize: s.fontSize, fontWeight: '700' }, textStyle]}>
                  {title}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              {icon && iconPosition === 'left' ? (
                <Ionicons name={icon} size={s.iconSize} color={v.text} />
              ) : null}
              <Text style={[{ color: v.text, fontSize: s.fontSize, fontWeight: '700' }, textStyle]}>
                {title}
              </Text>
              {icon && iconPosition === 'right' ? (
                <Ionicons name={icon} size={s.iconSize} color={v.text} />
              ) : null}
            </>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}
