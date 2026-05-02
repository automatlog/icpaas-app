// src/components/LiveAgentAssignSheet.js
//
// Bottom-sheet picker for assigning the active conversation to an agent.
// Loads the user-scoped agent list via LiveChatAPI.getAgents lazily on
// open, then POSTs LiveChatAPI.assignAgent on selection.
//
// OmniApp's AssignAgent semantics:
//   force=false → if the chat is already owned by another agent, the API
//                 returns { confirmNeeded: true, existingAgentId } so the
//                 caller can decide whether to clobber.
//   force=true  → reassign unconditionally + write a journey audit row.
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity, Pressable, TextInput,
  ActivityIndicator, useColorScheme, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LiveChatAPI } from '../services/api';

const C = {
  dark:  { sheet: '#17171B', ink: '#FFFFFF', muted: '#9A9AA2', border: '#26262C', input: '#0F0F12', tint: '#2094ab', dim: '#5C5C63' },
  light: { sheet: '#FFFFFF', ink: '#0A0A0D', muted: '#5C5C63', border: '#E5E7EB', input: '#F2F2F5', tint: '#175a6e', dim: '#9A9AA2' },
};

const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

export default function LiveAgentAssignSheet({
  visible,
  waNumber,
  channel,
  onClose,
  onAssigned,         // ({ agentId, agentName }) => void
  onError,            // (errorMessage) => void
}) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;

  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState([]);
  const [search, setSearch] = useState('');
  const [submittingId, setSubmittingId] = useState(null);

  useEffect(() => {
    if (!visible) {
      setSearch('');
      setSubmittingId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await LiveChatAPI.getAgents();
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (!cancelled) setAgents(list);
      } catch (_) {
        if (!cancelled) setAgents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [visible]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((a) =>
      String(a.name || a.userName || '').toLowerCase().includes(q),
    );
  }, [agents, search]);

  const assign = async (agent, force) => {
    const agentId = agent.id || agent.agentId || agent.userId;
    if (!agentId) return;
    setSubmittingId(agentId);
    try {
      const res = await LiveChatAPI.assignAgent({
        agentId,
        waNumber,
        channel,
        force,
      });
      // Conflict path: { confirmNeeded: true, existingAgentId }.
      if (res?.confirmNeeded || res?.ConfirmNeeded) {
        setSubmittingId(null);
        // Re-call with force=true after a quick toast hand-off.
        return assign(agent, true);
      }
      const ok = res?.success !== false && res?.Success !== false;
      if (ok) {
        onAssigned?.({ agentId, agentName: agent.name || agent.userName });
        onClose?.();
      } else {
        onError?.(res?.message || res?.Message || 'Assign failed.');
      }
    } catch (e) {
      onError?.(e?.message || 'Assign failed.');
    } finally {
      setSubmittingId(null);
    }
  };

  const inputStyle = {
    flex: 1, fontSize: 13, color: c.ink, paddingVertical: 8,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
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
            maxHeight: '75%',
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.border }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View style={{
              width: 34, height: 34, borderRadius: 10,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: c.tint + '22',
            }}>
              <Ionicons name="people-circle-outline" size={20} color={c.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.ink, fontSize: 15, fontWeight: '700' }}>Assign agent</Text>
              <Text style={{ color: c.muted, fontSize: 11 }} numberOfLines={1}>
                {waNumber} · {channel}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={18} color={c.muted} />
            </TouchableOpacity>
          </View>

          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            paddingHorizontal: 10, marginBottom: 8,
            borderRadius: 10, backgroundColor: c.input,
          }}>
            <Ionicons name="search-outline" size={14} color={c.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name"
              placeholderTextColor={c.muted}
              autoCapitalize="none"
              style={inputStyle}
            />
          </View>

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 30, gap: 8 }}>
              <ActivityIndicator color={c.tint} />
              <Text style={{ color: c.muted, fontSize: 11 }}>Loading agents…</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item, idx) =>
                String(item.id || item.agentId || item.userId || idx)}
              renderItem={({ item }) => {
                const agentId = item.id || item.agentId || item.userId;
                const name = item.name || item.userName || `Agent ${agentId}`;
                const busy = submittingId === agentId;
                return (
                  <TouchableOpacity
                    onPress={() => assign(item, false)}
                    disabled={!!submittingId}
                    activeOpacity={0.85}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      paddingVertical: 12, paddingHorizontal: 6,
                      opacity: busy ? 0.6 : 1,
                      borderBottomWidth: 1, borderBottomColor: c.border,
                    }}
                  >
                    <View style={{
                      width: 36, height: 36, borderRadius: 18,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: c.tint + '22',
                    }}>
                      <Text style={{ color: c.tint, fontSize: 12, fontWeight: '700' }}>
                        {initials(name)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.ink, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                        {name}
                      </Text>
                      {item.email || item.emailId ? (
                        <Text style={{ color: c.muted, fontSize: 11 }} numberOfLines={1}>
                          {item.email || item.emailId}
                        </Text>
                      ) : null}
                    </View>
                    {busy ? (
                      <ActivityIndicator color={c.tint} size="small" />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color={c.muted} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 30, gap: 8 }}>
                  <Ionicons name="people-outline" size={32} color={c.dim} />
                  <Text style={{ color: c.muted, fontSize: 12 }}>
                    {search ? 'No matches' : 'No agents available'}
                  </Text>
                </View>
              }
              style={{ maxHeight: 360 }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
