// src/components/LiveAgentForwardModal.js
//
// Forward a chat bubble to a different recipient. Captures destination
// number + WABA channel and resolves with that target so the parent can
// dispatch the appropriate send action.
//
// v1: text only. Media/location/template forwarding needs the original
// payload preserved on the row (today only the rendered MessageText is
// kept) — surfaces a hint when forwarding a non-text bubble.
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView, Pressable,
  Platform, useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = {
  dark:  { sheet: '#17171B', ink: '#FFFFFF', muted: '#9A9AA2', border: '#26262C', input: '#0F0F12', tint: '#2094ab' },
  light: { sheet: '#FFFFFF', ink: '#0A0A0D', muted: '#5C5C63', border: '#E5E7EB', input: '#F2F2F5', tint: '#175a6e' },
};

const toE164 = (raw) => {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

const isValidPhone = (raw) => {
  const d = toE164(raw);
  return d.length >= 10 && d.length <= 15;
};

export default function LiveAgentForwardModal({
  visible,
  source,                // { messageId, snippet, type, fromMe }
  channels = [],
  defaultChannel,
  onClose,
  onForward,             // ({ waId, channel, source }) => void
}) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;

  const channelOptions = useMemo(() => {
    return channels
      .map((ch) => ({
        id: ch.WABANumber || ch.wabaNumber || ch.PhoneNumber || ch.phoneNumber,
        label: ch.DisplayName || ch.displayName || ch.WABANumber || ch.wabaNumber,
      }))
      .filter((opt) => opt.id);
  }, [channels]);

  const initialChannel = defaultChannel && defaultChannel !== 'All'
    ? defaultChannel
    : channelOptions[0]?.id || '';

  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState(initialChannel);

  useEffect(() => {
    if (!visible) {
      setPhone('');
      return;
    }
    setChannel(initialChannel);
  }, [visible, initialChannel]);

  const valid = isValidPhone(phone) && !!channel && !!source;
  const isText = !source?.type || source.type === 'text';

  const submit = () => {
    if (!valid) return;
    onForward?.({
      waId: toE164(phone),
      channel,
      source,
    });
  };

  const inputStyle = {
    backgroundColor: c.input,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: c.ink,
    fontSize: 14,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center', justifyContent: 'center', padding: 20,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: '100%', maxWidth: 400,
            backgroundColor: c.sheet,
            borderRadius: 18,
            padding: 18,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <View style={{
              width: 34, height: 34, borderRadius: 10,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: c.tint + '22',
            }}>
              <Ionicons name="share-outline" size={18} color={c.tint} />
            </View>
            <Text style={{ color: c.ink, fontSize: 15, fontWeight: '700', flex: 1 }}>Forward message</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={18} color={c.muted} />
            </TouchableOpacity>
          </View>

          {/* Source preview */}
          {source ? (
            <View style={{
              padding: 10,
              borderRadius: 10,
              backgroundColor: c.input,
              borderLeftWidth: 3,
              borderLeftColor: c.tint,
              marginBottom: 14,
            }}>
              <Text style={{ color: c.muted, fontSize: 10, fontWeight: '700', marginBottom: 2 }}>
                FORWARDING
              </Text>
              <Text style={{ color: c.ink, fontSize: 12 }} numberOfLines={3}>
                {source.snippet || `[${source.type || 'message'}]`}
              </Text>
            </View>
          ) : null}

          {!isText ? (
            <View style={{
              padding: 10,
              marginBottom: 12,
              borderRadius: 10,
              backgroundColor: '#F59E0B22',
              borderWidth: 1,
              borderColor: '#F59E0B',
            }}>
              <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>
                Only text forwarding is wired in v1
              </Text>
              <Text style={{ color: '#F59E0B', fontSize: 10, marginTop: 2 }}>
                For media or templates, re-pick from "+" inside the destination chat.
              </Text>
            </View>
          ) : null}

          {/* Recipient phone */}
          <Text style={{ color: c.muted, fontSize: 11, marginBottom: 4 }}>RECIPIENT *</Text>
          <TextInput
            value={phone} onChangeText={setPhone}
            placeholder="+91 98765 43210"
            placeholderTextColor={c.muted}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            style={inputStyle}
          />

          {/* Channel chips */}
          {channelOptions.length > 0 && (
            <>
              <Text style={{ color: c.muted, fontSize: 11, marginBottom: 4, marginTop: 12 }}>
                SEND FROM CHANNEL
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
              >
                {channelOptions.map((opt) => {
                  const active = opt.id === channel;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => setChannel(opt.id)}
                      activeOpacity={0.85}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        paddingVertical: 6, paddingHorizontal: 10,
                        borderRadius: 12,
                        backgroundColor: active ? c.tint + '22' : c.input,
                        borderWidth: 1,
                        borderColor: active ? c.tint : 'transparent',
                      }}
                    >
                      <Ionicons name="logo-whatsapp" size={11} color={active ? c.tint : c.muted} />
                      <Text style={{
                        color: active ? c.tint : c.muted,
                        fontSize: 11,
                        fontWeight: active ? '700' : '500',
                      }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 12,
                borderRadius: 12, backgroundColor: c.border,
              }}
            >
              <Text style={{ color: c.ink, fontSize: 13, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={submit}
              disabled={!valid || !isText}
              activeOpacity={0.85}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: (valid && isText) ? c.tint : c.border,
                opacity: (valid && isText) ? 1 : 0.6,
              }}
            >
              <Text style={{
                color: (valid && isText) ? '#FFFFFF' : c.muted,
                fontSize: 13, fontWeight: '700',
              }}>Forward</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
