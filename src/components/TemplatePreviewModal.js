// src/components/TemplatePreviewModal.js
//
// Bottom-sheet-style preview for a WhatsApp / RCS / SMS template. Shows
// category, status, language, header, body (with raw `{{1}}` placeholders),
// footer, button labels, and metadata. Triggered by tapping a template
// card in TemplatesScreen.
//
// A circular close button is anchored to the top-right of the sheet so
// users always have a clear dismiss target without having to swipe or
// reach the system back gesture.
//
// Usage:
//   <TemplatePreviewModal
//     c={c}
//     visible={preview != null}
//     template={preview}
//     onClose={() => setPreview(null)}
//     onUse={() => { onUse(preview); setPreview(null); }}
//   />
import React from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const STATUS_TINT = (s) => {
  const v = String(s || '').toUpperCase();
  if (v === 'APPROVED') return { bg: '#D1FAE5', fg: '#047857', icon: 'checkmark-circle' };
  if (v === 'PENDING')  return { bg: '#FEF3C7', fg: '#B45309', icon: 'time' };
  if (v === 'REJECTED') return { bg: '#FEE2E2', fg: '#B91C1C', icon: 'close-circle' };
  return null;
};

const Section = ({ c, label, children, icon }) => (
  <View style={{ marginBottom: 14 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      {icon ? <Ionicons name={icon} size={11} color={c.textMuted} /> : null}
      <Text
        style={{
          color: c.textMuted,
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
    {children}
  </View>
);

// Returns a body string from any of the shapes the gsauth APIs surface.
// WhatsApp templates carry a structured `components` array; RCS / SMS
// templates often expose `body`, `text`, or `template` directly.
const extractBody = (template) => {
  if (!template) return '';
  if (typeof template.body === 'string' && template.body) return template.body;
  if (typeof template.text === 'string' && template.text) return template.text;
  if (typeof template.template === 'string' && template.template) return template.template;
  if (Array.isArray(template.components)) {
    const body = template.components.find((cmp) => cmp?.type === 'BODY' || cmp?.type === 'body');
    if (body?.text) return body.text;
  }
  return '';
};

const extractHeader = (template) => {
  if (!template) return '';
  if (typeof template.header === 'string') return template.header;
  if (Array.isArray(template.components)) {
    const head = template.components.find((cmp) => cmp?.type === 'HEADER' || cmp?.type === 'header');
    if (head?.text) return head.text;
  }
  return '';
};

const extractFooter = (template) => {
  if (!template) return '';
  if (typeof template.footer === 'string') return template.footer;
  if (Array.isArray(template.components)) {
    const foot = template.components.find((cmp) => cmp?.type === 'FOOTER' || cmp?.type === 'footer');
    if (foot?.text) return foot.text;
  }
  return '';
};

const extractButtons = (template) => {
  if (!template) return [];
  if (Array.isArray(template.buttons)) return template.buttons;
  if (Array.isArray(template.components)) {
    const btns = template.components.find((cmp) => cmp?.type === 'BUTTONS' || cmp?.type === 'buttons');
    if (Array.isArray(btns?.buttons)) return btns.buttons;
  }
  return [];
};

export default function TemplatePreviewModal({ c, visible, template, onClose, onUse }) {
  const status = STATUS_TINT(template?.status);
  const header = extractHeader(template);
  const body = extractBody(template);
  const footer = extractFooter(template);
  const buttons = extractButtons(template);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Tap-outside backdrop */}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close preview"
        style={{
          flex: 1,
          backgroundColor: 'rgba(15,23,42,0.5)',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        {/* Stop-propagation wrapper so taps inside the card don't dismiss */}
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: c.bgCard,
            borderRadius: 22,
            maxHeight: '85%',
            overflow: 'hidden',
            // Subtle elevation so the sheet visually lifts off the dimmed
            // backdrop on Android (where shadow alone is barely visible).
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.18,
            shadowRadius: 24,
            elevation: 12,
          }}
        >
          {/* Floating circular close button — top-right of the sheet */}
          <View
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 10,
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Close preview"
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: c.bgInput,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <Ionicons name="close" size={16} color={c.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingTop: 22, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Title row + status pill */}
            <View style={{ paddingRight: 36 }}>
              <Text
                style={{ color: c.text, fontSize: 18, fontWeight: '800' }}
                numberOfLines={2}
              >
                {template?.name || 'Template'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {template?.category ? (
                  <Pill c={c} label={String(template.category).toUpperCase()} />
                ) : null}
                {template?.language ? (
                  <Pill c={c} label={String(template.language).toUpperCase()} />
                ) : null}
                {status ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 999,
                      backgroundColor: status.bg,
                      gap: 4,
                    }}
                  >
                    <Ionicons name={status.icon} size={10} color={status.fg} />
                    <Text style={{ color: status.fg, fontSize: 10, fontWeight: '800' }}>
                      {String(template.status).toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Bubble preview — mimics how the message will read */}
            <View
              style={{
                marginTop: 18,
                marginBottom: 18,
                padding: 14,
                borderRadius: 14,
                backgroundColor: c.bgInput,
                borderLeftWidth: 3,
                borderLeftColor: c.primary,
                gap: 10,
              }}
            >
              {header ? (
                <Text style={{ color: c.text, fontSize: 14, fontWeight: '800' }}>{header}</Text>
              ) : null}
              {body ? (
                <Text style={{ color: c.text, fontSize: 13, lineHeight: 20 }}>{body}</Text>
              ) : (
                <Text style={{ color: c.textMuted, fontSize: 12, fontStyle: 'italic' }}>
                  No body content available for preview.
                </Text>
              )}
              {footer ? (
                <Text style={{ color: c.textMuted, fontSize: 11 }}>{footer}</Text>
              ) : null}
              {buttons?.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {buttons.map((b, i) => (
                    <View
                      key={i}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: c.primary,
                      }}
                    >
                      <Text style={{ color: c.primary, fontSize: 11, fontWeight: '700' }}>
                        {b?.text || b?.label || b?.type || 'Button'}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {/* Metadata */}
            <Section c={c} label="Identifier" icon="key-outline">
              <Text style={{ color: c.text, fontSize: 12, fontFamily: 'monospace' }}>
                {template?.id || template?.name || '—'}
              </Text>
            </Section>

            {template?.botId ? (
              <Section c={c} label="Bot" icon="card-outline">
                <Text style={{ color: c.text, fontSize: 12, fontFamily: 'monospace' }}>
                  {template.botId}
                </Text>
              </Section>
            ) : null}

            {template?.senderId ? (
              <Section c={c} label="Sender" icon="chatbubble-outline">
                <Text style={{ color: c.text, fontSize: 12, fontFamily: 'monospace' }}>
                  {template.senderId}
                </Text>
              </Section>
            ) : null}

            {/* CTAs */}
            {onUse ? (
              <TouchableOpacity
                onPress={onUse}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="Use this template in a campaign"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: c.primary,
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <Ionicons name="paper-plane" size={14} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                  Use in Campaign
                </Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const Pill = ({ c, label }) => (
  <View
    style={{
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: c.bgInput,
    }}
  >
    <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: '700' }}>{label}</Text>
  </View>
);
