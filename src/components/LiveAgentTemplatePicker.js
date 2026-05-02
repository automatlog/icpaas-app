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
  ActivityIndicator, useColorScheme, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { WhatsAppAPI } from '../services/api';
import { uploadMedia } from '../services/liveChatActions';
import toast from '../services/toast';

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

// Inspect the BUTTONS component for URL-style buttons that take a dynamic
// suffix. Returns [{ index, text, exampleUrl }] in stable order.
const findUrlButtonSlots = (template) => {
  const buttonsBlock = (template?.components || []).find(
    (c) => String(c.type || '').toUpperCase() === 'BUTTONS',
  );
  const buttons = buttonsBlock?.buttons || [];
  const slots = [];
  buttons.forEach((b, idx) => {
    const t = String(b.type || '').toUpperCase();
    if (t === 'URL' && Array.isArray(b.example) && b.example.length > 0) {
      slots.push({
        index: idx,
        text: b.text || `Button ${idx + 1}`,
        exampleUrl: b.example?.[0] || '',
      });
    }
  });
  return slots;
};

// ---------- main component ----------
export default function LiveAgentTemplatePicker({
  visible,
  onClose,
  onSubmit,
  initialFilter = '',
  // Channel needed to upload media headers (Meta /media is per-WABA).
  channel,
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
  // For image/video/document headers: { id, kind } captured after upload.
  const [headerMedia, setHeaderMedia] = useState(null);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  // For URL buttons: index → user-supplied dynamic suffix.
  const [buttonParams, setButtonParams] = useState({});

  // Reset on open + load templates lazily.
  useEffect(() => {
    if (!visible) {
      setMode('list');
      setSelected(null);
      setHeaderVar('');
      setBodyVars([]);
      setHeaderMedia(null);
      setUploadingHeader(false);
      setButtonParams({});
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
    setHeaderMedia(null);
    setUploadingHeader(false);
    setButtonParams({});
    setMode('fill');
  };

  // Pick + upload a media header. Routes through the appropriate device
  // picker for the template's header format, then uploads to Meta /media
  // via uploadMedia and stores the returned id for build time.
  const pickHeaderMedia = async (kind) => {
    if (!channel) {
      toast.warning('No channel', 'Open a chat before picking a media header.');
      return;
    }
    setUploadingHeader(true);
    try {
      let asset = null;
      let mimeType = null;
      if (kind === 'image' || kind === 'video') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          toast.warning('Permission needed', `Allow access to pick a header ${kind}.`);
          return;
        }
        const r = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: kind === 'image'
            ? (ImagePicker.MediaTypeOptions?.Images || 'images')
            : (ImagePicker.MediaTypeOptions?.Videos || 'videos'),
          quality: 0.8,
        });
        if (r.canceled || !r.assets?.[0]) return;
        asset = r.assets[0];
        mimeType = asset.mimeType || (kind === 'image' ? 'image/jpeg' : 'video/mp4');
      } else {
        const r = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          multiple: false,
          copyToCacheDirectory: true,
        });
        if (r.canceled || !r.assets?.[0]) return;
        asset = r.assets[0];
        mimeType = asset.mimeType || 'application/pdf';
      }
      const file = {
        uri: asset.uri,
        name: asset.fileName || asset.name || `header-${Date.now()}`,
        type: mimeType,
      };
      const res = await uploadMedia({ channel, file, mimeType });
      const id = res?.id || res?.media?.[0]?.id;
      if (!id) {
        toast.error('Upload failed', 'Meta did not return a media id.');
        return;
      }
      setHeaderMedia({ id, kind, fileName: asset.fileName || asset.name });
    } catch (e) {
      toast.error('Upload failed', e?.message || 'Try again.');
    } finally {
      setUploadingHeader(false);
    }
  };

  const backToList = () => {
    setSelected(null);
    setMode('list');
  };

  const handleSubmit = async () => {
    if (!selected || sending) return;
    const info = inspectTemplate(selected);
    const urlSlots = findUrlButtonSlots(selected);

    const components = [];

    // Header — text variant if there's a {{1}}, media variant if the
    // template's HEADER format is image/video/document and we have a media id.
    if (info.headerHasTextVar) {
      components.push({
        type: 'header',
        parameters: [{ type: 'text', text: headerVar.trim() || ' ' }],
      });
    } else if (info.headerNeedsMedia && headerMedia) {
      components.push({
        type: 'header',
        parameters: [{
          type: headerMedia.kind, // 'image' | 'video' | 'document'
          [headerMedia.kind]: { id: headerMedia.id },
        }],
      });
    }

    // Body — one text parameter per {{N}}.
    if (info.bodyVarCount > 0) {
      components.push({
        type: 'body',
        parameters: bodyVars.map((v) => ({ type: 'text', text: (v || '').trim() || ' ' })),
      });
    }

    // Buttons — one component per URL button (sub_type='url'). Index is the
    // button's position in the BUTTONS block per Meta's spec.
    urlSlots.forEach((slot) => {
      const value = (buttonParams[slot.index] || '').trim();
      if (!value) return;
      components.push({
        type: 'button',
        sub_type: 'url',
        index: String(slot.index),
        parameters: [{ type: 'text', text: value }],
      });
    });

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
      <ScrollView
        style={{ paddingTop: 4 }}
        contentContainerStyle={{ paddingBottom: 6 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
          <View style={{ marginBottom: 10 }}>
            <Text style={{ color: c.muted, fontSize: 11, marginBottom: 6 }}>
              {`HEADER ${info.headerFormat}`}
            </Text>
            {headerMedia ? (
              <View
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  padding: 10, borderRadius: 10,
                  backgroundColor: '#10B98122',
                  borderWidth: 1, borderColor: '#10B981',
                }}
              >
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>
                    {`${headerMedia.kind} ready`}
                  </Text>
                  <Text style={{ color: c.muted, fontSize: 10 }} numberOfLines={1}>
                    {headerMedia.fileName || `id: ${headerMedia.id}`}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setHeaderMedia(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={c.muted} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => pickHeaderMedia(info.headerFormat.toLowerCase())}
                disabled={uploadingHeader}
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: 12, borderRadius: 10,
                  backgroundColor: c.input,
                  borderWidth: 1, borderStyle: 'dashed', borderColor: c.border,
                  opacity: uploadingHeader ? 0.6 : 1,
                }}
              >
                {uploadingHeader ? (
                  <ActivityIndicator size="small" color={c.tint} />
                ) : (
                  <Ionicons
                    name={
                      info.headerFormat === 'IMAGE' ? 'image-outline'
                      : info.headerFormat === 'VIDEO' ? 'videocam-outline'
                      : 'document-text-outline'
                    }
                    size={16} color={c.tint}
                  />
                )}
                <Text style={{ color: c.tint, fontSize: 12, fontWeight: '700' }}>
                  {uploadingHeader ? 'Uploading…' : `Pick header ${info.headerFormat.toLowerCase()}`}
                </Text>
              </TouchableOpacity>
            )}
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

        {/* URL button parameters — one input per dynamic-suffix URL button.
            Meta builds the final URL by appending this value to the example
            URL pattern (so for example "https://example.com/{{1}}", the
            value here is what {{1}} expands to). */}
        {findUrlButtonSlots(selected).map((slot) => (
          <View key={`btn-${slot.index}`} style={{ marginTop: 4, marginBottom: 10 }}>
            <Text style={{ color: c.muted, fontSize: 11, marginBottom: 4 }}>
              {`URL BUTTON · ${slot.text}`}
            </Text>
            <TextInput
              value={buttonParams[slot.index] || ''}
              onChangeText={(v) =>
                setButtonParams((prev) => ({ ...prev, [slot.index]: v }))}
              placeholder={slot.exampleUrl
                ? `e.g. ${slot.exampleUrl.replace(/^https?:\/\//, '').slice(0, 36)}`
                : 'Dynamic suffix value'}
              placeholderTextColor={c.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={inputStyle}
            />
          </View>
        ))}

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
      </ScrollView>
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
