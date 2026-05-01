// src/components/LiveAgentTemplatePicker.js
//
// Modal for picking & sending a WhatsApp Meta-approved template from the
// Live Agent composer. Two views in one component:
//   list  →  search-filtered list of approved templates
//   fill  →  selected template + one input per variable
//
// On submit, builds Meta /messages `template.components` and calls back via
// onSubmit({ name, language, components }) — parent dispatches the actual
// send action so optimistic + wamid reconciliation flow through liveChatActions.
//
// v1 variable coverage: body text + single header text. Header media (image/
// video/document) and button URL/quick-reply variables are surfaced as
// read-only "Coming soon" hints.
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, FlatList, Pressable,
  ActivityIndicator, useColorScheme, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WhatsAppAPI } from '../services/api';

const C = {
  dark:  { sheet: '#17171B', ink: '#FFFFFF', muted: '#9A9AA2', input: '#0F0F12', border: '#26262C', teal: '#2094ab', dim: '#5C5C63' },
  light: { sheet: '#FFFFFF', ink: '#0A0A0D', muted: '#5C5C63', input: '#F2F2F5', border: '#E5E7EB', teal: '#175a6e', dim: '#9A9AA2' },
};

// ---------- variable extraction ----------
// Lightweight, focused on what we actually fill in v1. (For richer
// extraction the existing helper at services/whatsappHelpers.js handles
// the full spec.)
const findComponent = (template, type) =>
  (template?.components || []).find(
    (c) => String(c.type || '').toUpperCase() === type,
  );

const countPlaceholders = (text = '') => (text.match(/\{\{\d+\}\}/g) || []).length;

const inspectTemplate = (template) => {
  const header = findComponent(template, 'HEADER');
  const body = findComponent(template, 'BODY');
  const footer = findComponent(template, 'FOOTER');
  const buttonsBlock = findComponent(template, 'BUTTONS');

  const headerFormat = String(header?.format || 'TEXT').toUpperCase();
  const headerHasTextVar = headerFormat === 'TEXT' && countPlaceholders(header?.text) === 1;
  const headerNeedsMedia = ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat);
  const bodyVarCount = countPlaceholders(body?.text);
  const buttonHasParam = (buttonsBlock?.buttons || []).some(
    (b) => String(b.type || '').toUpperCase() === 'URL' && (b.example?.length > 0),
  );

  return {
    header,
    body,
    footer,
    buttonsBlock,
    headerFormat,
    headerHasTextVar,
    headerNeedsMedia,
    bodyVarCount,
    buttonHasParam,
    fillable: !headerNeedsMedia && !buttonHasParam,
  };
};

// ---------- main component ----------
export default function LiveAgentTemplatePicker({
  visible,
  onClose,
  onSubmit,
  initialFilter = '',
}) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;

  const [mode, setMode] = useState('list');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState(initialFilter);
  const [selected, setSelected] = useState(null);
  const [headerVar, setHeaderVar] = useState('');
  const [bodyVars, setBodyVars] = useState([]);
  const [sending, setSending] = useState(false);

  // Reset on open + load templates lazily.
  useEffect(() => {
    if (!visible) {
      setMode('list');
      setSelected(null);
      setHeaderVar('');
      setBodyVars([]);
      setSending(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await WhatsAppAPI.getTemplates();
        const list = Array.isArray(res?.data) ? res.data : [];
        if (!cancelled) {
          // Approved-only — Meta also surfaces PENDING and REJECTED.
          const approved = list.filter(
            (t) => String(t.status || '').toUpperCase() === 'APPROVED',
          );
          setTemplates(approved);
        }
      } catch (_) {
        if (!cancelled) setTemplates([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [visible]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        String(t.name || '').toLowerCase().includes(q) ||
        String(t.category || '').toLowerCase().includes(q),
    );
  }, [templates, search]);

  const openFill = (template) => {
    setSelected(template);
    const info = inspectTemplate(template);
    setHeaderVar('');
    setBodyVars(Array(info.bodyVarCount).fill(''));
    setMode('fill');
  };

  const backToList = () => {
    setSelected(null);
    setMode('list');
  };

  const handleSubmit = async () => {
    if (!selected || sending) return;
    const info = inspectTemplate(selected);

    const components = [];
    if (info.headerHasTextVar) {
      components.push({
        type: 'header',
        parameters: [{ type: 'text', text: headerVar.trim() || ' ' }],
      });
    }
    if (info.bodyVarCount > 0) {
      components.push({
        type: 'body',
        parameters: bodyVars.map((v) => ({ type: 'text', text: (v || '').trim() || ' ' })),
      });
    }

    setSending(true);
    try {
      await onSubmit?.({
        name: selected.name,
        language: selected.language || 'en_US',
        components,
      });
      onClose?.();
    } finally {
      setSending(false);
    }
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

  // ---------- render ----------
  const renderListRow = ({ item }) => {
    const info = inspectTemplate(item);
    const bodyText = info.body?.text || '(no body)';
    const varCount = (info.headerHasTextVar ? 1 : 0) + info.bodyVarCount;
    return (
      <TouchableOpacity
        onPress={() => openFill(item)}
        activeOpacity={0.85}
        style={{
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
          gap: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: c.ink, fontSize: 14, fontWeight: '700', flex: 1 }} numberOfLines={1}>
            {item.name}
          </Text>
          {!info.fillable && (
            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: '#F59E0B22' }}>
              <Text style={{ color: '#F59E0B', fontSize: 9, fontWeight: '700' }}>ADVANCED</Text>
            </View>
          )}
          <Text style={{ color: c.muted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' }}>
            {String(item.language || 'en')}
          </Text>
        </View>
        <Text style={{ color: c.muted, fontSize: 11 }} numberOfLines={2}>
          {bodyText}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <Text style={{ color: c.dim, fontSize: 10 }}>
            {String(item.category || 'UTILITY')}
          </Text>
          {varCount > 0 && (
            <Text style={{ color: c.teal, fontSize: 10, fontWeight: '600' }}>
              {varCount} variable{varCount === 1 ? '' : 's'}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const fillView = () => {
    if (!selected) return null;
    const info = inspectTemplate(selected);
    return (
      <View style={{ paddingTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <TouchableOpacity onPress={backToList} hitSlop={12}>
            <Ionicons name="chevron-back" size={20} color={c.ink} />
          </TouchableOpacity>
          <Text style={{ color: c.ink, fontSize: 15, fontWeight: '700', flex: 1 }} numberOfLines={1}>
            {selected.name}
          </Text>
          <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: c.input }}>
            <Text style={{ color: c.muted, fontSize: 9, fontWeight: '700' }}>
              {String(selected.language || 'en').toUpperCase()}
            </Text>
          </View>
        </View>

        {info.headerNeedsMedia && (
          <View style={{
            padding: 10, marginBottom: 10, borderRadius: 10,
            backgroundColor: '#F59E0B22', borderWidth: 1, borderColor: '#F59E0B',
          }}>
            <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>
              Header expects {info.headerFormat.toLowerCase()} — media-variable templates not yet supported here.
            </Text>
            <Text style={{ color: '#F59E0B', fontSize: 10, marginTop: 2 }}>
              Will send with a placeholder header. Use OmniApp web for full support.
            </Text>
          </View>
        )}

        {info.headerHasTextVar && (
          <>
            <Text style={{ color: c.muted, fontSize: 11, marginBottom: 4 }}>HEADER VARIABLE</Text>
            <TextInput
              value={headerVar}
              onChangeText={setHeaderVar}
              placeholder={info.header?.text}
              placeholderTextColor={c.muted}
              style={[inputStyle, { marginBottom: 10 }]}
            />
          </>
        )}

        {info.body?.text ? (
          <View style={{
            padding: 10, marginBottom: 10, borderRadius: 10,
            backgroundColor: c.input,
          }}>
            <Text style={{ color: c.muted, fontSize: 10, fontWeight: '700', marginBottom: 4 }}>
              BODY PREVIEW
            </Text>
            <Text style={{ color: c.ink, fontSize: 12, lineHeight: 18 }}>{info.body.text}</Text>
          </View>
        ) : null}

        {bodyVars.map((value, i) => (
          <View key={`var-${i}`} style={{ marginBottom: 10 }}>
            <Text style={{ color: c.muted, fontSize: 11, marginBottom: 4 }}>
              {`{{${i + 1}}}`}
            </Text>
            <TextInput
              value={value}
              onChangeText={(v) => {
                const next = bodyVars.slice();
                next[i] = v;
                setBodyVars(next);
              }}
              placeholder={`Value for {{${i + 1}}}`}
              placeholderTextColor={c.muted}
              style={inputStyle}
            />
          </View>
        ))}

        {info.buttonHasParam && (
          <View style={{
            padding: 10, marginTop: 4, borderRadius: 10,
            backgroundColor: '#F59E0B22', borderWidth: 1, borderColor: '#F59E0B',
          }}>
            <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>
              This template has a button URL variable — sending without it.
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <TouchableOpacity
            onPress={backToList}
            activeOpacity={0.85}
            style={{
              flex: 1, alignItems: 'center', paddingVertical: 12,
              borderRadius: 12, backgroundColor: c.border,
            }}
          >
            <Text style={{ color: c.ink, fontSize: 13, fontWeight: '600' }}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={sending}
            activeOpacity={0.85}
            style={{
              flex: 1, alignItems: 'center', paddingVertical: 12,
              borderRadius: 12, backgroundColor: c.teal, opacity: sending ? 0.6 : 1,
            }}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Send template</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const listView = () => (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <View style={{
          width: 34, height: 34, borderRadius: 10,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#EC489922',
        }}>
          <Ionicons name="layers" size={18} color="#EC4899" />
        </View>
        <Text style={{ color: c.ink, fontSize: 15, fontWeight: '700', flex: 1 }}>Pick a template</Text>
        <TouchableOpacity onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={18} color={c.muted} />
        </TouchableOpacity>
      </View>

      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 10, marginBottom: 10,
        borderRadius: 10, backgroundColor: c.input,
      }}>
        <Ionicons name="search-outline" size={14} color={c.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or category"
          placeholderTextColor={c.muted}
          autoCapitalize="none"
          style={[{
            flex: 1, paddingVertical: 8, color: c.ink, fontSize: 13,
          }, Platform.select({ web: { outlineStyle: 'none' } })]}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={14} color={c.muted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 30, gap: 8 }}>
          <ActivityIndicator color={c.teal} />
          <Text style={{ color: c.muted, fontSize: 11 }}>Loading templates…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, idx) => String(item.id || item.name || idx)}
          renderItem={renderListRow}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 30, gap: 8 }}>
              <Ionicons name="layers-outline" size={32} color={c.dim} />
              <Text style={{ color: c.muted, fontSize: 12 }}>
                {search ? 'No matches' : 'No approved templates'}
              </Text>
            </View>
          }
          style={{ maxHeight: 360 }}
        />
      )}
    </View>
  );

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
            width: '100%', maxWidth: 420,
            backgroundColor: c.sheet,
            borderRadius: 18,
            padding: 18,
            maxHeight: '85%',
          }}
        >
          {mode === 'list' ? listView() : fillView()}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
