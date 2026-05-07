// src/components/ErrorBoundary.js — top-level crash guard.
//
// Wraps the navigator so any uncaught render-time error in a screen
// shows a "Something went wrong — Reload" panel instead of a white
// screen / closed app. Reload simply resets the boundary; the user
// returns to the active screen with fresh state. The original error +
// componentStack are surfaced for diagnosis.
//
// React's getDerivedStateFromError / componentDidCatch only fire for
// render-phase errors — async / event-handler errors still need to be
// try/caught at their source. This boundary is a safety net for the
// rest.
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const palette = {
  bg:        '#FFFFFF',
  bgSoft:    '#F9FAFB',
  text:      '#111827',
  textMuted: '#6B7280',
  textDim:   '#9CA3AF',
  primary:   '#0B8A6F',
  danger:    '#EF4444',
  border:    '#E5E7EB',
};

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error, info: null };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack);
    this.setState({ info });
    if (typeof this.props.onError === 'function') {
      try { this.props.onError(error, info); } catch { /* swallow */ }
    }
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    if (!this.state.error) return this.props.children;

    const { error, info } = this.state;
    const message = error?.message || String(error);
    const stack = info?.componentStack || error?.stack || '';

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: palette.bg,
          paddingTop: Platform.OS === 'ios' ? 64 : 36,
          paddingHorizontal: 22,
        }}
      >
        <View
          style={{
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: '#FEE2E2',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Ionicons name="warning" size={28} color={palette.danger} />
        </View>
        <Text style={{ color: palette.text, fontSize: 22, fontWeight: '800', marginBottom: 6 }}>
          Something went wrong
        </Text>
        <Text style={{ color: palette.textMuted, fontSize: 13, marginBottom: 18 }}>
          The screen hit an unexpected error. Reload to recover. The error has
          been logged to the dev console.
        </Text>

        {/* Error message */}
        <View
          style={{
            backgroundColor: palette.bgSoft,
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: palette.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 4 }}>
            ERROR
          </Text>
          <Text selectable style={{ color: palette.text, fontSize: 13, fontFamily: 'monospace' }}>
            {message}
          </Text>
        </View>

        {/* Component stack (truncated to keep card readable) */}
        {stack ? (
          <ScrollView
            style={{
              maxHeight: 180,
              backgroundColor: palette.bgSoft,
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: 12,
              padding: 12,
              marginBottom: 18,
            }}
          >
            <Text style={{ color: palette.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 4 }}>
              COMPONENT STACK
            </Text>
            <Text selectable style={{ color: palette.textMuted, fontSize: 11, fontFamily: 'monospace' }}>
              {stack.trim()}
            </Text>
          </ScrollView>
        ) : null}

        <TouchableOpacity
          onPress={this.reset}
          activeOpacity={0.85}
          style={{
            backgroundColor: palette.primary,
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          }}
        >
          <Ionicons name="refresh" size={16} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Reload screen</Text>
        </TouchableOpacity>
      </View>
    );
  }
}
