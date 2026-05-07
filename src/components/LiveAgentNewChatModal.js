// src/components/LiveAgentNewChatModal.js
//
// "Start a new conversation" sheet shown when the agent taps the FAB on
// LiveAgentInbox. Captures recipient + WABA, validates the number to
// E.164, then resolves with { waId, channel, profileName } so the parent
// can navigate into LiveAgentChat. The actual first send happens from the
// chat composer (text inside 24-h windows; template via "+" otherwise).
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

// 10-digit IN → +91, otherwise strip non-digits and trust the user.
const toE164 = (raw) => {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

// 10–15 digits is a workable range covering local + international.
const isValidPhone = (raw) => {
  const d = toE164(raw);
  return d.length >= 10 && d.length <= 15;
};

export default function LiveAgentNewChatModal({
  visible,
  channels = [],         // [{ wabaNumber, displayName, phoneNumberId, ... }]
  defaultChannel,        // selected channel (display number) from the inbox
  onClose,
  onContinue,            // ({ waId, channel, profileName }) => void
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

  const initialChannel =
    defaultChannel && defaultChannel !== 'All'
      ? defaultChannel
      : channelOptions[0]?.id || '';

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [channel, setChannel] = useState(initialChannel);

  useEffect(() => {
    if (!visible) {
      setPhone('');
      setName('');
      return;
    }
    setChannel(initialChannel);
  }, [visible, initialChannel]);

  const valid = isValidPhone(phone) && !!channel;

  const submit = () => {
    if (!valid) return;
    const waId = toE164(phone);
    onContinue?.({
      waId,
      channel,
      profileName: name.trim() || waId,
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
              <Ionicons name="create" size={18} color={c.tint} />
            </View>
            <Text style={{ color: c.ink, fontSize: 15, fontWeight: '700', flex: 1 }}>New conversation</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={18} color={c.muted} />
            </TouchableOpacity>
          </View>

          {/* Phone */}
          <Text style={{ color: c.muted, fontSize: 11, marginBottom: 4 }}>PHONE NUMBER *</Text>
          <TextInput
            value={phone} onChangeText={setPhone}
            placeholder="+91 98765 43210"
            placeholderTextColor={c.muted}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            style={inputStyle}
          />
          <Text style={{ color: c.muted, fontSize: 10, marginTop: 4 }}>
            10-digit Indian numbers auto-prefix +91. International needs full E.164.
          </Text>

          {/* Display name (optional) */}
          <Text style={{ color: c.muted, fontSize: 11, marginBottom: 4, marginTop: 12 }}>
            DISPLAY NAME (optional)
          </Text>
          <TextInput
            value={name} onChangeText={setName}
            placeholder="Customer name"
            placeholderTextColor={c.muted}
            style={inputStyle}
          />

          {/* Channel */}
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
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingVertical: 6,
                        paddingHorizontal: 10,
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

          {/* Hint */}
          <View
            style={{
              padding: 10, marginTop: 14, borderRadius: 10,
              backgroundColor: c.input,
            }}
          >
            <Text style={{ color: c.muted, fontSize: 10, fontWeight: '700', marginBottom: 4 }}>
              FIRST MESSAGE
            </Text>
            <Text style={{ color: c.ink, fontSize: 11, lineHeight: 16 }}>
              Send a Meta-approved template via "+" → Template inside the chat.
              Free-form text only delivers if the contact replied within 24 h.
            </Text>
          </View>

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
              disabled={!valid}
              activeOpacity={0.85}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 12,
                borderRadius: 12, backgroundColor: valid ? c.tint : c.border,
                opacity: valid ? 1 : 0.6,
              }}
            >
              <Text style={{
                color: valid ? '#FFFFFF' : c.muted,
                fontSize: 13, fontWeight: '700',
              }}>Continue</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
