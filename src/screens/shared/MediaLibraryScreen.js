// src/screens/MediaLibraryScreen.js — matches UI image/Media Library Screen.png
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, Platform, RefreshControl, Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useBrand } from '../../theme';
import { VoiceAPI, WhatsAppAPI, ChannelsAPI } from '../../services/api';
import { addMedia, updateMedia, removeMedia } from '../../store/slices/mediaSlice';
import { pushNotification } from '../../store/slices/notificationsSlice';
import BottomTabBar from '../../components/BottomTabBar';
import ScreenHeader from '../../components/ScreenHeader';
import toast from '../../services/toast';
import {
  validateForWhatsApp, MEDIA_KINDS, STICKER_ANIMATED_MAX, formatBytes, ALL_MIMES,
} from '../../services/whatsappMediaSpec';

const RETENTION_DAYS = 30;

const FILTERS = ['All', 'Image', 'Document', 'Audio', 'Expired'];

const fmtAge = (uploadedAt) => {
  if (!uploadedAt) return null;
  try {
    const t = new Date(uploadedAt).getTime();
    const ms = Date.now() - t;
    const left = RETENTION_DAYS - Math.floor(ms / (1000 * 60 * 60 * 24));
    return left;
  } catch { return null; }
};

const guessKind = (name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  if (['png','jpg','jpeg','gif','webp'].includes(ext)) return 'image';
  if (['mp3','wav','m4a','ogg'].includes(ext)) return 'audio';
  if (['mp4','mov','webm'].includes(ext)) return 'video';
  if (['pdf'].includes(ext)) return 'pdf';
  return 'doc';
};

const KIND_ICON = {
  image: 'image',
  audio: 'musical-notes',
  video: 'videocam',
  pdf: 'document',
  doc: 'document-text',
};

const KIND_TINT = {
  image: { fg: '#10B981', bg: '#D1FAE5' },
  audio: { fg: '#8B5CF6', bg: '#EDE9FE' },
  video: { fg: '#EC4899', bg: '#FCE7F3' },
  pdf:   { fg: '#3B82F6', bg: '#DBEAFE' },
  doc:   { fg: '#6B7280', bg: '#F3F4F6' },
};

export default function MediaLibraryScreen({ navigation }) {
  const c = useBrand();
  const dispatch = useDispatch();
  const media = useSelector((s) => s.media);

  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [showFilter, setShowFilter] = useState(false);

  const pollStatuses = useCallback(async () => {
    await Promise.all(
      media.map(async (m) => {
        try {
          const res = await VoiceAPI.getFileStatus(m.fileId);
          dispatch(updateMedia({
            fileId: m.fileId,
            status: res?.messageStatus || res?.status || m.status,
            lastCheckedAt: new Date().toISOString(),
          }));
        } catch {}
      }),
    );
  }, [media, dispatch]);

  useEffect(() => { pollStatuses(); }, []); // initial poll

  const upload = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ALL_MIMES,
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const file = res.assets?.[0];
      if (!file) return;

      // 1. Validate against Meta WhatsApp Cloud API limits
      const v = validateForWhatsApp({
        mimeType: file.mimeType,
        name: file.name,
        size: file.size,
      });
      if (v.reason) {
        toast.error('Invalid file', v.reason);
        return;
      }
      const detectedKind = v.kind;
      const mime = v.mime;

      // 2. Pick a WhatsApp channel (use the first available)
      let channelId;
      let wabaBusinessId;
      try {
        const ch = await ChannelsAPI.getDefault();
        channelId = ch?.phoneNumberId;
        wabaBusinessId = ch?.wabaBusinessId;
      } catch (e) {
        toast.error('No WA channel', 'Save a gsauth token in Config first.');
        return;
      }

      setUploading(true);

      // 3. Upload via WhatsApp Cloud API
      const uploadRes = await WhatsAppAPI.uploadMedia({
        phoneNumberId: channelId,
        file: { uri: file.uri, name: file.name || 'upload', type: mime },
        type: mime,
      });

      const fileId = uploadRes?.id || uploadRes?.fileId || uploadRes?.messageId;
      if (!fileId) throw { message: uploadRes?.error?.message || 'Upload failed (no id returned)' };

      dispatch(addMedia({
        fileId: String(fileId),
        name: file.name || 'upload',
        sizeBytes: file.size || 0,
        kind: detectedKind,
        mime,
        url: uploadRes?.fileUrl || file.uri,
        status: 'Approved',
        channelId,
        wabaBusinessId,
        uploadedAt: new Date().toISOString(),
      }));
      toast.success('Media uploaded', `${file.name || 'file'} (ID ${fileId})`);
      dispatch(pushNotification({
        kind: 'template-created',
        title: 'Media uploaded',
        body: `${file.name || 'upload'} (ID ${fileId}) is ready (${MEDIA_KINDS[detectedKind].label}, ${formatBytes(file.size || 0)}).`,
      }));
    } catch (e) {
      toast.error('Upload failed', e?.message || 'Unknown error');
    } finally {
      setUploading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await pollStatuses();
    setRefreshing(false);
  };

  const copyUrl = async (m) => {
    const v = m.url || `id:${m.fileId}`;
    await Clipboard.setStringAsync(String(v));
    toast.success('Copied', `${m.name || 'media'} URL copied.`);
  };

  const remove = (m) =>
    Alert.alert('Remove entry?', `${m.name} will be removed from this list (server file is unchanged).`, [
      { text: 'Cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => dispatch(removeMedia(m.fileId)) },
    ]);

  const filtered = media.filter((m) => {
    if (filter === 'All') return true;
    if (filter === 'Expired') return fmtAge(m.uploadedAt) != null && fmtAge(m.uploadedAt) <= 0;
    const k = m.kind || guessKind(m.name || '');
    if (filter === 'Image')    return k === 'image';
    if (filter === 'Document') return k === 'pdf' || k === 'doc';
    if (filter === 'Audio')    return k === 'audio';
    return true;
  });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        icon="images-outline"
        title="Media Library"
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Breadcrumb + Add Media */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Text className="text-[12px] font-semibold" style={{ color: c.textMuted }}>WhatsApp</Text>
            <Ionicons name="chevron-forward" size={11} color={c.textDim} />
            <Text className="text-[12px] font-bold" style={{ color: c.primary }}>Media Library</Text>
          </View>
          <TouchableOpacity
            onPress={upload}
            disabled={uploading}
            activeOpacity={0.85}
            className="flex-row items-center rounded-[10px] px-3 py-2"
            style={{ backgroundColor: c.primary, gap: 6 }}
          >
            {uploading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="add" size={14} color="#FFFFFF" />
                <Text className="text-[12px] font-bold text-white">Add Media</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Top info banner */}
        <View
          className="flex-row rounded-[10px] p-3 mb-2"
          style={{ backgroundColor: '#DBEAFE', gap: 10, borderWidth: 1, borderColor: '#BFDBFE' }}
        >
          <Ionicons name="information-circle" size={16} color="#1D4ED8" style={{ marginTop: 1 }} />
          <Text className="flex-1 text-[12px] leading-[18px]" style={{ color: '#1E40AF' }}>
            As per Meta (WhatsApp) media retention policies, only media files from the last{' '}
            <Text className="font-bold">30 days</Text> are available. Older media is automatically deleted —
            re-upload if needed.
          </Text>
        </View>

        {/* WhatsApp media upload limits */}
        <View
          className="rounded-[10px] p-3 mb-3"
          style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}
        >
          <View className="flex-row items-center mb-2" style={{ gap: 6 }}>
            <Ionicons name="shield-checkmark" size={13} color={c.primary} />
            <Text className="text-[12px] font-bold" style={{ color: c.text }}>WhatsApp upload limits</Text>
          </View>
          <LimitRow c={c} icon="image"            label="Image"    formats="JPG, JPEG, PNG"           max="5 MB" />
          <LimitRow c={c} icon="videocam"         label="Video"    formats="MP4, 3GPP"                max="16 MB" />
          <LimitRow c={c} icon="musical-notes"    label="Audio"    formats="AAC, MP3, AMR, OGG, OPUS" max="16 MB" />
          <LimitRow c={c} icon="document-text"    label="Document" formats="PDF, DOC(X), PPT(X), XLS(X), TXT" max="100 MB" />
          <LimitRow c={c} icon="happy"            label="Sticker"  formats="WEBP (static / animated)" max="100 KB / 500 KB" last />
        </View>

        {/* Filter dropdown */}
        <TouchableOpacity
          onPress={() => setShowFilter((v) => !v)}
          activeOpacity={0.85}
          className="flex-row items-center rounded-[10px] px-3 py-3 mb-3"
          style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.bgInput, gap: 10 }}
        >
          <Ionicons name="filter" size={14} color={c.textMuted} />
          <Text className="flex-1 text-[13px] font-semibold" style={{ color: filter === 'All' ? c.textMuted : c.text }}>
            {filter === 'All' ? 'Filter Records' : `Filter: ${filter}`}
          </Text>
          <Ionicons name={showFilter ? 'chevron-up' : 'chevron-down'} size={14} color={c.textMuted} />
        </TouchableOpacity>
        {showFilter ? (
          <View
            className="rounded-[10px] mb-3 overflow-hidden"
            style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.bgCard }}
          >
            {FILTERS.map((f, i) => (
              <TouchableOpacity
                key={f}
                onPress={() => { setFilter(f); setShowFilter(false); }}
                activeOpacity={0.85}
                className="flex-row items-center px-3 py-3"
                style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.rule, gap: 8 }}
              >
                <Text className="flex-1 text-[13px]" style={{ color: c.text, fontWeight: filter === f ? '700' : '400' }}>{f}</Text>
                {filter === f ? <Ionicons name="checkmark" size={14} color={c.primary} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Empty state */}
        {filtered.length === 0 ? (
          <View className="items-center py-12" style={{ gap: 8 }}>
            <View className="w-20 h-20 rounded-2xl items-center justify-center" style={{ backgroundColor: c.bgInput }}>
              <Ionicons name="images-outline" size={32} color={c.textDim} />
            </View>
            <Text className="text-[15px] font-bold" style={{ color: c.text }}>No media yet</Text>
            <Text className="text-[12px] text-center" style={{ color: c.textMuted, maxWidth: 280 }}>
              Tap "Add Media" to upload images, PDFs or audio. The server assigns an ID for use in campaigns.
            </Text>
          </View>
        ) : null}

        {/* Media rows */}
        {filtered.map((m) => (
          <MediaRow
            key={m.fileId}
            c={c}
            m={m}
            onCopy={() => copyUrl(m)}
            onRemove={() => remove(m)}
          />
        ))}

        {/* Bottom info banner */}
        {filtered.length > 0 ? (
          <View
            className="flex-row items-center rounded-[10px] p-3 mt-3"
            style={{ backgroundColor: c.primarySoft, gap: 8, borderWidth: 1, borderColor: c.primaryMint + '40' }}
          >
            <Ionicons name="information-circle" size={14} color={c.primaryDeep} />
            <Text className="flex-1 text-[11px]" style={{ color: c.primaryDeep }}>
              Only media files from the last <Text className="font-bold">30 days</Text> are shown.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <BottomTabBar c={c} navigation={navigation} active="you" />
    </View>
  );
}

function LimitRow({ c, icon, label, formats, max, last }) {
  return (
    <View
      className="flex-row items-center py-1.5"
      style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: c.rule, gap: 10 }}
    >
      <View className="w-7 h-7 rounded-full items-center justify-center" style={{ backgroundColor: c.bgInput }}>
        <Ionicons name={icon} size={12} color={c.primary} />
      </View>
      <View className="flex-1">
        <Text className="text-[11px] font-bold" style={{ color: c.text }}>{label}</Text>
        <Text className="text-[10px]" style={{ color: c.textMuted }} numberOfLines={1}>{formats}</Text>
      </View>
      <Text className="text-[11px] font-mono font-bold" style={{ color: c.primary }}>{max}</Text>
    </View>
  );
}

function MediaRow({ c, m, onCopy, onRemove }) {
  const kind = m.kind || guessKind(m.name || '');
  const tint = KIND_TINT[kind] || KIND_TINT.doc;
  const left = fmtAge(m.uploadedAt);
  const expired = left != null && left <= 0;

  return (
    <View
      className="flex-row items-center rounded-[14px] p-3 mb-2.5"
      style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border, gap: 12 }}
    >
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <Ionicons name="arrow-down-circle-outline" size={16} color={c.primary} />
      </View>

      {/* Thumbnail */}
      <View
        className="w-14 h-14 rounded-[10px] items-center justify-center overflow-hidden"
        style={{ backgroundColor: tint.bg, borderWidth: 1, borderColor: c.rule }}
      >
        {kind === 'image' && m.url ? (
          <Image source={{ uri: m.url }} style={{ width: 56, height: 56 }} />
        ) : (
          <Ionicons name={KIND_ICON[kind]} size={26} color={tint.fg} />
        )}
      </View>

      {/* Body */}
      <View className="flex-1">
        <Text className="text-[13px] font-bold" style={{ color: c.text }} numberOfLines={1}>{m.name || 'upload.bin'}</Text>
        <View className="flex-row items-center mt-1" style={{ gap: 4 }}>
          <Ionicons name="link" size={11} color={c.primary} />
          <Text className="text-[11px] font-semibold" style={{ color: c.primary }}>File URL</Text>
        </View>
        <View className="flex-row mt-1.5">
          <View
            className="rounded-full px-2 py-0.5"
            style={{ backgroundColor: expired ? '#FEE2E2' : '#D1FAE5' }}
          >
            <Text
              className="text-[10px] font-bold"
              style={{ color: expired ? '#B91C1C' : '#047857' }}
            >
              {expired ? 'Expired' : `${Math.max(left ?? 0, 0)} days left`}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity
        onPress={onCopy}
        activeOpacity={0.85}
        className="w-9 h-9 rounded-[8px] items-center justify-center"
        style={{ borderWidth: 1, borderColor: c.primary }}
      >
        <Ionicons name="copy-outline" size={14} color={c.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onRemove}
        activeOpacity={0.85}
        className="w-9 h-9 rounded-[8px] items-center justify-center"
        style={{ borderWidth: 1, borderColor: c.danger }}
      >
        <Ionicons name="trash-outline" size={14} color={c.danger} />
      </TouchableOpacity>
    </View>
  );
}
