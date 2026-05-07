// src/components/ActivityDetailModal.js
//
// Bottom-sheet popup that surfaces details for a single Recent Activity
// row on the dashboard. The list rows are intentionally compact so the
// timeline reads at a glance — tapping a row opens this modal with the
// full title / body / timestamp / status pill, plus a primary CTA that
// runs the row's deep-link (open the campaign, open the chat, etc.) and
// a circular close button anchored top-right.
//
// Same visual language as TemplatePreviewModal so the app feels cohesive.
import React from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const STATUS_TINT = (status, c) => {
  const s = String(status || '').toLowerCase();
  if (s === 'completed' || s === 'live')   return { bg: '#D1FAE5', fg: '#047857' };
  if (s === 'submitted' || s === 'new')    return { bg: '#DBEAFE', fg: '#1D4ED8' };
  if (s === 'stuck' || s === 'alert' ||
      s === 'added' || s === 'scheduled')  return { bg: '#FEF3C7', fg: '#B45309' };
  if (s === 'failed')                       return { bg: '#FEE2E2', fg: '#B91C1C' };
  return { bg: c.bgInput, fg: c.textMuted };
};

const fmtFull = (ts) => {
  if (!ts) return '—';
  try {
    const d = ts instanceof Date ? ts : new Date(ts);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-GB', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
};

const fmtRelative = (ts) => {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const d = Math.floor(hr / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
};

export default function ActivityDetailModal({ c, visible, activity, onClose, onOpen }) {
  const status = STATUS_TINT(activity?.status, c);
  // The dashboard row stamps `id` with a `<source>:<key>` prefix so the
  // modal can label the source ("Notification", "Conversation", "Campaign")
  // back to the user.
  const sourceLabel = (() => {
    if (!activity?.id) return 'Activity';
    if (activity.id.startsWith('notif:')) return 'Notification';
    if (activity.id.startsWith('chat:')) return 'Conversation';
    if (activity.id.startsWith('cmp:')) return 'Campaign';
    return 'Activity';
  })();

  // Tailored CTA copy by source — no point saying "Open" if we know what
  // it'll open.
  const ctaLabel = (() => {
    if (!activity?.id) return 'Open';
    if (activity.id.startsWith('notif:')) return 'Open notifications';
    if (activity.id.startsWith('chat:')) return 'Open conversation';
    if (activity.id.startsWith('cmp:')) return 'Open campaign';
    return 'Open';
  })();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close activity details"
        style={{
          flex: 1,
          backgroundColor: 'rgba(15,23,42,0.5)',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: c.bgCard,
            borderRadius: 22,
            maxHeight: '85%',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.18,
            shadowRadius: 24,
            elevation: 12,
          }}
        >
          {/* Floating circular close button */}
          <View style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: c.bgInput,
                borderWidth: 1, borderColor: c.border,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={16} color={c.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingTop: 22, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Iconified header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 36, marginBottom: 14 }}>
              <View
                style={{
                  width: 52, height: 52, borderRadius: 26,
                  backgroundColor: c.primarySoft,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name={activity?.icon || 'ellipse'} size={26} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: c.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' }}
                >
                  {sourceLabel}
                </Text>
                <Text
                  style={{ color: c.text, fontSize: 16, fontWeight: '800', marginTop: 2 }}
                  numberOfLines={3}
                >
                  {activity?.title || 'Activity'}
                </Text>
              </View>
            </View>

            {/* Status + relative time chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {activity?.status ? (
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: status.bg }}>
                  <Text style={{ color: status.fg, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>
                    {String(activity.status).toUpperCase()}
                  </Text>
                </View>
              ) : null}
              {activity?.ts ? (
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: c.bgInput }}>
                  <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: '700' }}>
                    {fmtRelative(activity.ts)}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Body */}
            {activity?.sub ? (
              <View
                style={{
                  padding: 14, borderRadius: 14, marginBottom: 14,
                  backgroundColor: c.bgInput,
                  borderLeftWidth: 3, borderLeftColor: c.primary,
                }}
              >
                <Text style={{ color: c.text, fontSize: 13, lineHeight: 20 }}>
                  {activity.sub}
                </Text>
              </View>
            ) : null}

            {/* Metadata block */}
            <Section c={c} label="When" icon="time-outline">
              <Text style={{ color: c.text, fontSize: 12 }}>{fmtFull(activity?.ts)}</Text>
            </Section>
            <Section c={c} label="Source" icon="layers-outline">
              <Text style={{ color: c.text, fontSize: 12 }}>{sourceLabel}</Text>
            </Section>

            {/* CTAs */}
            {onOpen && activity?.onPress ? (
              <TouchableOpacity
                onPress={() => {
                  onClose?.();
                  onOpen();
                }}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel={ctaLabel}
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
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                  {ctaLabel}
                </Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const Section = ({ c, label, icon, children }) => (
  <View style={{ marginBottom: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
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
