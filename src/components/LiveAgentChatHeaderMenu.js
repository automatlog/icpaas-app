// src/components/LiveAgentChatHeaderMenu.js
//
// Overflow menu shown when the agent taps the ⋯ in the chat header. Lazily
// loads contact metadata (favourite + block + create date) from
// LiveChatAPI.getContacts on open so the menu rows reflect current state.
//
// Actions:
//   • Favourite / Unfavourite  → LiveChatAPI.updateFavourite
//   • Block / Unblock          → LiveChatAPI.blockUser / unblockUser
//   • Assign agent             → opens LiveAgentAssignSheet (parent renders)
//
// Each row dispatches via the on* callback so the parent can keep slice
// state in sync (e.g. update the chat row in the inbox list).
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, Pressable, ActivityIndicator, useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LiveChatAPI } from '../services/api';

const C = {
  dark:  { sheet: '#17171B', ink: '#FFFFFF', muted: '#9A9AA2', border: '#26262C', tint: '#2094ab' },
  light: { sheet: '#FFFFFF', ink: '#0A0A0D', muted: '#5C5C63', border: '#E5E7EB', tint: '#175a6e' },
};

const Row = ({ icon, iconBg, label, hint, onPress, disabled, busy, c }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || busy}
    activeOpacity={0.85}
    style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 12, paddingHorizontal: 6,
      opacity: (disabled || busy) ? 0.55 : 1,
    }}
  >
    <View style={{
      width: 36, height: 36, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: iconBg + '22',
    }}>
      {busy ? <ActivityIndicator color={iconBg} size="small" />
            : <Ionicons name={icon} size={18} color={iconBg} />}
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ color: c.ink, fontSize: 14, fontWeight: '600' }}>{label}</Text>
      {hint ? <Text style={{ color: c.muted, fontSize: 11, marginTop: 1 }}>{hint}</Text> : null}
    </View>
    <Ionicons name="chevron-forward" size={16} color={c.muted} />
  </TouchableOpacity>
);

export default function LiveAgentChatHeaderMenu({
  visible,
  waNumber,
  channel,
  profileName,
  onClose,
  onAssign,                      // () => void  — parent opens LiveAgentAssignSheet
  onViewContact,                 // () => void  — parent opens LiveAgentJourneyPanel
  onFavouriteChanged,            // (isFavourite: boolean) => void
  onBlockChanged,                // (isBlocked: boolean) => void
}) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;

  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState(null); // { IsFavourite, IsBlock, CreatedDate }
  const [busyKey, setBusyKey] = useState(null); // 'fav' | 'block'

  useEffect(() => {
    if (!visible || !waNumber || !channel) {
      setContact(null);
      setBusyKey(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await LiveChatAPI.getContacts({ number: waNumber, channel });
        if (!cancelled) {
          // Tolerate either casing.
          const co = res?.contact || res?.Contact || {};
          setContact({
            IsFavourite: !!(co.IsFavourite ?? co.isFavourite),
            IsBlock: !!(co.IsBlock ?? co.isBlock),
            CreatedDate: co.CreatedDate || co.createdDate || null,
          });
        }
      } catch (_) {
        // Default to false on failure so the toggle still works (best-effort).
        if (!cancelled) setContact({ IsFavourite: false, IsBlock: false });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [visible, waNumber, channel]);

  const toggleFavourite = async () => {
    if (!contact) return;
    const next = !contact.IsFavourite;
    setBusyKey('fav');
    try {
      await LiveChatAPI.updateFavourite({
        waNumber, channel, isFavourite: next,
      });
      setContact({ ...contact, IsFavourite: next });
      onFavouriteChanged?.(next);
    } catch (_) {
      // Silent — parent toast handles error if needed via the hook below.
    } finally {
      setBusyKey(null);
    }
  };

  const toggleBlock = async () => {
    if (!contact) return;
    const next = !contact.IsBlock;
    setBusyKey('block');
    try {
      if (next) {
        await LiveChatAPI.blockUser({ number: waNumber, wabaNumber: channel });
      } else {
        await LiveChatAPI.unblockUser({ number: waNumber, wabaNumber: channel });
      }
      setContact({ ...contact, IsBlock: next });
      onBlockChanged?.(next);
    } catch (_) {
      // Silent — best-effort; parent can wire toast through the callback.
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: c.sheet,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingHorizontal: 18, paddingTop: 12, paddingBottom: 26,
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.border }} />
          </View>

          <View style={{ marginBottom: 10 }}>
            <Text style={{ color: c.ink, fontSize: 15, fontWeight: '700' }}>
              {profileName || waNumber || 'Conversation'}
            </Text>
            <Text style={{ color: c.muted, fontSize: 11 }} numberOfLines={1}>
              {waNumber} · {channel}
            </Text>
          </View>

          <View style={{ height: 1, backgroundColor: c.border, marginVertical: 6 }} />

          {loading || !contact ? (
            <View style={{ alignItems: 'center', paddingVertical: 18 }}>
              <ActivityIndicator color={c.tint} />
            </View>
          ) : (
            <>
              <Row
                icon={contact.IsFavourite ? 'star' : 'star-outline'}
                iconBg="#F59E0B"
                label={contact.IsFavourite ? 'Unfavourite' : 'Favourite'}
                hint={contact.IsFavourite ? 'Remove from your starred contacts' : 'Star this contact for quick access'}
                onPress={toggleFavourite}
                busy={busyKey === 'fav'}
                c={c}
              />
              <Row
                icon={contact.IsBlock ? 'lock-open-outline' : 'ban-outline'}
                iconBg={contact.IsBlock ? '#10B981' : '#EF4444'}
                label={contact.IsBlock ? 'Unblock' : 'Block'}
                hint={contact.IsBlock
                  ? 'Receive messages from this contact again'
                  : 'Inbound messages stop showing in your inbox'}
                onPress={toggleBlock}
                busy={busyKey === 'block'}
                c={c}
              />
            </>
          )}

          {onViewContact ? (
            <Row
              icon="document-text-outline"
              iconBg="#3B82F6"
              label="View contact"
              hint="Notes, history, and contact metadata"
              onPress={() => { onClose?.(); onViewContact?.(); }}
              c={c}
            />
          ) : null}

          <Row
            icon="people-circle-outline"
            iconBg={c.tint}
            label="Assign agent"
            hint="Hand this conversation to a teammate"
            onPress={() => { onClose?.(); onAssign?.(); }}
            c={c}
          />

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={{
              alignSelf: 'center', marginTop: 8,
              paddingHorizontal: 18, paddingVertical: 8, borderRadius: 14,
            }}
          >
            <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
