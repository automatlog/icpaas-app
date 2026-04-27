// src/screens/MediaLibraryScreen.js — Voice media library (.wav upload + status)
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Platform, RefreshControl, Alert, useColorScheme,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { VoiceAPI } from '../services/api';
import { addMedia, updateMedia, removeMedia } from '../store/slices/mediaSlice';

const C = {
  dark:  { bg: '#0A0A0D', bgSoft: '#141418', bgInput: '#1C1C22', ink: '#FFFFFF', muted: '#9A9AA2', dim: '#5C5C63', pink: '#FF4D7E', cyan: '#5CD4E0', orange: '#FF8A3D', green: '#4BD08D' },
  light: { bg: '#FAFAFB', bgSoft: '#F2F2F5', bgInput: '#ECECEF', ink: '#0A0A0D', muted: '#5C5C63', dim: '#9A9AA2', pink: '#E6428A', cyan: '#2FB8C4', orange: '#FF7A22', green: '#22C55E' },
};

const statusColor = (c, s) => {
  const v = String(s || '').toLowerCase();
  if (v.includes('approv')) return c.green;
  if (v.includes('reject') || v.includes('fail')) return c.pink;
  if (v.includes('process') || v.includes('pend')) return c.orange;
  return c.muted;
};

export default function MediaLibraryScreen({ navigation }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;

  const dispatch = useDispatch();
  const media = useSelector((s) => s.media);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
        } catch {
          // ignore per-item failure
        }
      }),
    );
  }, [media, dispatch]);

  useEffect(() => { pollStatuses(); }, []); // initial poll only

  const upload = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['audio/wav', 'audio/x-wav', 'audio/*'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const file = res.assets?.[0];
      if (!file) return;

      setUploading(true);
      const upload = await VoiceAPI.uploadMedia({
        uri: file.uri,
        name: file.name || 'upload.wav',
        type: file.mimeType || 'audio/wav',
      });

      const fileId = upload?.fileId || upload?.messageId;
      if (!fileId) throw { message: upload?.messageStatus || 'Upload failed' };

      dispatch(addMedia({
        fileId,
        name: file.name || 'upload.wav',
        sizeBytes: file.size || 0,
        status: upload?.messageStatus || 'Pending',
        errorCode: upload?.errorCode || null,
        uploadedAt: new Date().toISOString(),
      }));
      Alert.alert('Uploaded', `File ID ${fileId} is now ${upload?.messageStatus || 'Pending'}.`);
    } catch (e) {
      Alert.alert('Upload failed', e?.message || 'Unknown error');
    } finally {
      setUploading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await pollStatuses();
    setRefreshing(false);
  };

  const copyId = async (fileId) => {
    await Clipboard.setStringAsync(String(fileId));
    Alert.alert('Copied', `File ID ${fileId} copied`);
  };

  const remove = (fileId) => {
    Alert.alert('Remove entry?', 'This only removes the local record. The file remains on the server.', [
      { text: 'Cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => dispatch(removeMedia(fileId)) },
    ]);
  };

  const rootBg = dark ? 'bg-bg' : 'bg-white';
  const softBg = dark ? 'bg-bgSoft' : 'bg-[#F2F2F5]';
  const textInk = dark ? 'text-ink' : 'text-[#0A0A0D]';
  const textMuted = dark ? 'text-textMuted' : 'text-[#5C5C63]';
  const textDim = dark ? 'text-textDim' : 'text-[#9A9AA2]';

  const approved = media.filter((m) => String(m.status || '').toLowerCase().includes('approv')).length;
  const pending = media.filter((m) => /process|pend/.test(String(m.status || '').toLowerCase())).length;

  return (
    <View className={`flex-1 ${rootBg}`}>
      <ScrollView
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 22, paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.pink} />}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center mb-5" style={{ gap: 10 }}>
          <TouchableOpacity className={`w-[42px] h-[42px] rounded-full items-center justify-center ${softBg}`} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={c.ink} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className={`text-[11px] font-semibold tracking-widest uppercase ${textMuted}`}>Voice</Text>
            <Text className={`text-[24px] font-bold tracking-tight ${textInk}`}>Media Library</Text>
          </View>
          <TouchableOpacity className={`w-[42px] h-[42px] rounded-full items-center justify-center ${softBg}`} onPress={refresh} activeOpacity={0.7}>
            <Ionicons name="refresh" size={18} color={c.ink} />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View className="flex-row mb-3" style={{ gap: 10 }}>
          <Summary bg={softBg} label="Files" value={media.length} textInk={textInk} textMuted={textMuted} />
          <Summary bg={softBg} label="Approved" value={approved} accent={c.green} textInk={textInk} textMuted={textMuted} />
          <Summary bg={softBg} label="Pending" value={pending} accent={c.orange} textInk={textInk} textMuted={textMuted} />
        </View>

        {/* Upload CTA */}
        <TouchableOpacity
          onPress={upload}
          disabled={uploading}
          activeOpacity={0.88}
          className={`rounded-[20px] py-4 px-4 mb-4 flex-row items-center ${softBg}`}
          style={{ gap: 12, borderWidth: 1, borderColor: c.bgInput }}
        >
          <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: c.ink }}>
            {uploading ? <ActivityIndicator color={c.bg} /> : <Ionicons name="cloud-upload-outline" size={20} color={c.bg} />}
          </View>
          <View className="flex-1">
            <Text className={`text-[14px] font-semibold ${textInk}`}>
              {uploading ? 'Uploading…' : 'Upload .wav file'}
            </Text>
            <Text className={`text-[11px] mt-0.5 ${textMuted}`}>10KB – 20MB · 128 Kbps · unique name</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={c.muted} />
        </TouchableOpacity>

        {/* Files list */}
        {media.length === 0 ? (
          <View className="py-12 items-center" style={{ gap: 8 }}>
            <Ionicons name="musical-notes-outline" size={40} color={c.dim} />
            <Text className={`text-[15px] font-semibold ${textInk}`}>No media uploaded</Text>
            <Text className={`text-xs text-center ${textDim}`} style={{ maxWidth: 260 }}>
              Upload a .wav via the button above. The server assigns a file ID you can use in voice campaigns.
            </Text>
          </View>
        ) : (
          media.map((m) => {
            const sc = statusColor(c, m.status);
            return (
              <View key={m.fileId} className={`rounded-[18px] p-3.5 mb-2.5 ${softBg}`} style={{ borderWidth: 1, borderColor: c.bgInput }}>
                <View className="flex-row items-center" style={{ gap: 12 }}>
                  <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: sc + '22' }}>
                    <Ionicons name="musical-notes" size={18} color={sc} />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-[14px] font-semibold ${textInk}`} numberOfLines={1}>{m.name || 'upload.wav'}</Text>
                    <Text className={`text-[11px] font-mono ${textMuted}`}>ID: {m.fileId}</Text>
                  </View>
                  <View className="rounded-[12px] px-2.5 py-1" style={{ backgroundColor: sc + '22' }}>
                    <Text className="text-[10px] font-bold tracking-wider uppercase" style={{ color: sc }}>{m.status || '—'}</Text>
                  </View>
                </View>

                <View className="flex-row mt-3" style={{ gap: 8 }}>
                  <Action icon="copy-outline" label="Copy ID" onPress={() => copyId(m.fileId)} bg={c.bgInput} textInk={textInk} />
                  <Action icon="refresh" label="Recheck" onPress={async () => {
                    try {
                      const res = await VoiceAPI.getFileStatus(m.fileId);
                      dispatch(updateMedia({ fileId: m.fileId, status: res?.messageStatus || res?.status || m.status }));
                    } catch (e) {
                      Alert.alert('Check failed', e?.message || 'Unknown error');
                    }
                  }} bg={c.bgInput} textInk={textInk} />
                  <Action icon="trash-outline" label="Remove" onPress={() => remove(m.fileId)} bg={c.bgInput} textInk={c.pink} />
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const Summary = ({ bg, label, value, accent, textInk, textMuted }) => (
  <View className={`flex-1 rounded-[18px] py-3 px-3.5 ${bg}`}>
    <Text className={`text-[10px] font-semibold tracking-widest uppercase ${textMuted}`}>{label}</Text>
    <Text className={`text-[22px] font-bold mt-0.5 ${textInk}`} style={accent ? { color: accent } : undefined}>{value}</Text>
  </View>
);

const Action = ({ icon, label, onPress, bg, textInk }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    className="flex-1 flex-row items-center justify-center rounded-[14px] py-2.5"
    style={{ backgroundColor: bg, gap: 6 }}
  >
    <Ionicons name={icon} size={13} color={typeof textInk === 'string' && textInk.startsWith('text-') ? '#FFFFFF' : textInk} />
    <Text className="text-[12px] font-semibold" style={{ color: typeof textInk === 'string' && textInk.startsWith('text-') ? undefined : textInk }}>{label}</Text>
  </TouchableOpacity>
);
