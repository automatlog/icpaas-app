// src/components/LiveAgentJourneyPanel.js
//
// Right-rail-style modal that surfaces the customer's contextual record:
//   • Contact metadata (favourite, blocked, created date)
//   • Notes — add, edit, delete (LiveChatAPI.saveNote / deleteNote)
//   • Conversation history snippets (returned alongside getContacts)
//
// Pure modal — parent owns the trigger (header menu "View contact"). All
// note mutations dispatch via LiveChatAPI directly + update local state
// so the panel feels instant; the parent doesn't need to refresh.
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, Pressable, ScrollView,
  ActivityIndicator, Platform, useColorScheme, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LiveChatAPI } from '../services/api';

const C = {
  dark:  { sheet: '#17171B', ink: '#FFFFFF', muted: '#9A9AA2', border: '#26262C', input: '#0F0F12', tint: '#2094ab', dim: '#5C5C63' },
  light: { sheet: '#FFFFFF', ink: '#0A0A0D', muted: '#5C5C63', border: '#E5E7EB', input: '#F2F2F5', tint: '#175a6e', dim: '#9A9AA2' },
};

const fmtDate = (raw) => {
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
};

const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

// Tolerate both pascal- and camel-case projections from the controller.
const pickField = (obj, ...keys) => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
};

const normaliseNote = (n) => ({
  id: pickField(n, 'NoteId', 'noteId', 'Id', 'id'),
  text: pickField(n, 'NoteText', 'noteText', 'Text', 'text') || '',
  createdAt: pickField(n, 'CreatedDate', 'createdDate', 'CreatedAt', 'createdAt'),
  authorName: pickField(n, 'CreatedByName', 'createdByName', 'AuthorName', 'authorName') || '',
});

export default function LiveAgentJourneyPanel({
  visible,
  waNumber,
  channel,
  profileName,
  onClose,
}) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;

  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState(null);
  const [notes, setNotes] = useState([]);
  const [history, setHistory] = useState([]);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [busyNoteId, setBusyNoteId] = useState(null);

  const reset = () => {
    setContact(null);
    setNotes([]);
    setHistory([]);
    setDraft('');
    setEditingNoteId(null);
    setSaving(false);
    setBusyNoteId(null);
  };

  useEffect(() => {
    if (!visible) {
      reset();
      return;
    }
    if (!waNumber || !channel) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await LiveChatAPI.getContacts({ number: waNumber, channel });
        const co = pickField(res, 'contact', 'Contact') || {};
        const ns = pickField(res, 'notes', 'Notes') || [];
        const hs = pickField(res, 'history', 'History') || [];
        if (cancelled) return;
        setContact({
          IsFavourite: !!pickField(co, 'IsFavourite', 'isFavourite'),
          IsBlock: !!pickField(co, 'IsBlock', 'isBlock'),
          CreatedDate: pickField(co, 'CreatedDate', 'createdDate'),
          Name: pickField(co, 'Name', 'name'),
        });
        setNotes((Array.isArray(ns) ? ns : []).map(normaliseNote));
        setHistory(Array.isArray(hs) ? hs : []);
      } catch (_) {
        if (!cancelled) {
          setContact({ IsFavourite: false, IsBlock: false });
          setNotes([]);
          setHistory([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [visible, waNumber, channel]);

  const submitNote = async () => {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    const noteId = editingNoteId || 0;
    try {
      const res = await LiveChatAPI.saveNote({ noteId, text, waNumber, channel });
      const persisted = normaliseNote(res?.note || res?.Note || res || {});
      setNotes((prev) => {
        if (noteId > 0) {
          return prev.map((n) => n.id === noteId ? { ...n, text, ...persisted } : n);
        }
        // New note — prepend so it's visible without scrolling.
        return [{ ...persisted, id: persisted.id || Date.now(), text, createdAt: persisted.createdAt || new Date().toISOString() }, ...prev];
      });
      setDraft('');
      setEditingNoteId(null);
    } catch (_) {
      Alert.alert('Save failed', 'The note could not be saved. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (note) => {
    setEditingNoteId(note.id);
    setDraft(note.text || '');
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setDraft('');
  };

  const removeNote = async (note) => {
    if (!note?.id) return;
    setBusyNoteId(note.id);
    // Optimistic: drop from local list before server confirms.
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    try {
      await LiveChatAPI.deleteNote({ noteId: note.id, waNumber, channel });
    } catch (_) {
      // Reinstate on failure.
      setNotes((prev) => [note, ...prev]);
    } finally {
      setBusyNoteId(null);
    }
  };

  const inputStyle = {
    backgroundColor: c.input,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: c.ink,
    fontSize: 13,
    minHeight: 64,
    textAlignVertical: 'top',
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  };

  const Tag = ({ icon, color, label }) => (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
      backgroundColor: color + '22',
    }}>
      <Ionicons name={icon} size={11} color={color} />
      <Text style={{ color, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
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
            maxHeight: '88%',
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.border }} />
          </View>

          {/* Title row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <View style={{
              width: 44, height: 44, borderRadius: 22,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: c.tint + '22',
            }}>
              <Text style={{ color: c.tint, fontSize: 14, fontWeight: '700' }}>
                {initials(profileName || waNumber)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.ink, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
                {profileName || waNumber || 'Contact'}
              </Text>
              <Text style={{ color: c.muted, fontSize: 11 }} numberOfLines={1}>
                {waNumber} · {channel}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={20} color={c.muted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <ActivityIndicator color={c.tint} />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Status row */}
              {contact ? (
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                  {contact.IsFavourite ? <Tag icon="star" color="#F59E0B" label="Favourite" /> : null}
                  {contact.IsBlock ? <Tag icon="ban" color="#EF4444" label="Blocked" /> : null}
                  <Tag icon="calendar-outline" color={c.tint} label={`since ${fmtDate(contact.CreatedDate)}`} />
                </View>
              ) : null}

              {/* Notes section */}
              <View style={{ marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="document-text-outline" size={14} color={c.muted} />
                <Text style={{ color: c.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
                  NOTES
                </Text>
              </View>

              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={editingNoteId ? 'Edit note…' : 'Add a private note about this contact'}
                placeholderTextColor={c.muted}
                multiline
                style={inputStyle}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 14 }}>
                {editingNoteId ? (
                  <TouchableOpacity
                    onPress={cancelEdit}
                    activeOpacity={0.85}
                    style={{
                      paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10,
                      backgroundColor: c.border,
                    }}
                  >
                    <Text style={{ color: c.ink, fontSize: 12, fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  onPress={submitNote}
                  disabled={!draft.trim() || saving}
                  activeOpacity={0.85}
                  style={{
                    flex: 1, alignItems: 'center', paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: draft.trim() ? c.tint : c.border,
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={{
                      color: draft.trim() ? '#FFFFFF' : c.muted,
                      fontSize: 12, fontWeight: '700',
                    }}>
                      {editingNoteId ? 'Save' : 'Add note'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {notes.length === 0 ? (
                <View style={{
                  paddingVertical: 14, paddingHorizontal: 12,
                  borderRadius: 10, backgroundColor: c.input,
                  marginBottom: 18,
                }}>
                  <Text style={{ color: c.muted, fontSize: 11, textAlign: 'center' }}>
                    No notes yet. Add context here for your shift hand-over.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 8, marginBottom: 18 }}>
                  {notes.map((n) => (
                    <View
                      key={n.id}
                      style={{
                        padding: 10, borderRadius: 10,
                        backgroundColor: c.input,
                        borderLeftWidth: 3, borderLeftColor: c.tint,
                      }}
                    >
                      <Text style={{ color: c.ink, fontSize: 12, lineHeight: 18 }}>{n.text}</Text>
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8,
                        marginTop: 6,
                      }}>
                        <Text style={{ color: c.dim, fontSize: 10 }}>
                          {n.authorName ? `${n.authorName} · ` : ''}{fmtDate(n.createdAt)}
                        </Text>
                        <View style={{ flex: 1 }} />
                        <TouchableOpacity
                          onPress={() => startEdit(n)}
                          hitSlop={6}
                          accessibilityLabel="Edit note"
                        >
                          <Ionicons name="create-outline" size={14} color={c.muted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => removeNote(n)}
                          disabled={busyNoteId === n.id}
                          hitSlop={6}
                          accessibilityLabel="Delete note"
                        >
                          {busyNoteId === n.id ? (
                            <ActivityIndicator size="small" color={c.danger || '#EF4444'} />
                          ) : (
                            <Ionicons name="trash-outline" size={14} color="#EF4444" />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* History — best-effort, depends on backend payload shape */}
              {history.length > 0 ? (
                <>
                  <View style={{ marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="time-outline" size={14} color={c.muted} />
                    <Text style={{ color: c.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
                      HISTORY
                    </Text>
                  </View>
                  <View style={{ gap: 6 }}>
                    {history.slice(0, 12).map((h, i) => (
                      <View key={i} style={{
                        padding: 8, borderRadius: 8,
                        backgroundColor: c.input,
                      }}>
                        <Text style={{ color: c.ink, fontSize: 11 }} numberOfLines={2}>
                          {pickField(h, 'MessageText', 'messageText', 'text') || `[${pickField(h, 'MessageType', 'type') || 'message'}]`}
                        </Text>
                        <Text style={{ color: c.dim, fontSize: 10, marginTop: 2 }}>
                          {fmtDate(pickField(h, 'ReceivedDate', 'receivedDate', 'date'))}
                          {' · '}
                          {pickField(h, 'ChatType', 'chatType') === 'OUT' ? 'You' : 'Customer'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
