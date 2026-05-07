// src/components/LiveAgentVoiceRecorder.js
//
// Inline voice-note recorder shown above the composer when active. Tap-to-
// toggle UX: first tap starts recording (after permission prompt), second
// tap stops + uploads + sends. Cancel button discards without sending.
//
// Migrated from expo-av (deprecated SDK 54) to expo-audio's hook-based API.
// The recorder hook owns the native lifecycle; we drive prepareToRecord +
// record on mount and stop on cancel/send.
//
// Permissions: foreground microphone via AudioModule.requestRecordingPermissionsAsync.
// Format: HIGH_QUALITY preset → m4a/aac on both platforms.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Animated, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useAudioRecorder,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';

const C = {
  dark:  { bg: '#17171B', ink: '#FFFFFF', muted: '#9A9AA2', border: '#26262C', danger: '#EF4444', tint: '#2094ab' },
  light: { bg: '#F2F2F5', ink: '#0A0A0D', muted: '#5C5C63', border: '#E5E7EB', danger: '#E54B4B', tint: '#175a6e' },
};

const fmt = (ms) => {
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
};

export default function LiveAgentVoiceRecorder({ onCancel, onComplete }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? C.dark : C.light;

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const startedAtRef = useRef(null);
  const intervalRef = useRef(null);
  const pulse = useRef(new Animated.Value(1)).current;

  // Start the recording on mount; the parent only mounts us once permission
  // intent is signalled.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const perm = await AudioModule.requestRecordingPermissionsAsync();
        if (!perm.granted) {
          if (!cancelled) onCancel?.('mic-permission-denied');
          return;
        }
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        await audioRecorder.prepareToRecordAsync();
        if (cancelled) return;
        audioRecorder.record();
        startedAtRef.current = Date.now();
        setStarted(true);
        intervalRef.current = setInterval(
          () => setElapsed(Date.now() - startedAtRef.current),
          250,
        );
      } catch (e) {
        if (!cancelled) onCancel?.(e?.message || 'recording-failed');
      }
    })();

    // Pulse the red dot.
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ]),
    ).start();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Best-effort cleanup if the component unmounts mid-recording. The
      // hook owns the recorder; calling stop is idempotent.
      audioRecorder.stop?.().catch(() => {});
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishRecording = async (mode) => {
    if (busy || !started) return;
    setBusy(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    try {
      await audioRecorder.stop();
    } catch (_) {
      // Already stopped — fine.
    }
    const uri = audioRecorder.uri;

    // Reset audio mode so playback elsewhere isn't suppressed.
    try {
      await setAudioModeAsync({ allowsRecording: false });
    } catch (_) {}

    if (mode === 'cancel' || !uri) {
      onCancel?.();
    } else {
      // Default mime — HIGH_QUALITY preset records AAC/M4A on both platforms.
      const mimeType = uri.endsWith('.mp3') ? 'audio/mpeg'
        : uri.endsWith('.ogg') ? 'audio/ogg'
        : 'audio/m4a';
      onComplete?.({ uri, mimeType, durationMs: elapsed });
    }
    setBusy(false);
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginHorizontal: 12,
        marginBottom: 6,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: c.bg,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <Animated.View style={{
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: c.danger,
        opacity: pulse,
      }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.ink, fontSize: 13, fontWeight: '600' }}>
          {busy ? 'Sending…' : (started ? 'Recording' : 'Starting…')}
        </Text>
        <Text style={{ color: c.muted, fontSize: 11 }}>
          {fmt(elapsed)} · tap stop to send
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => finishRecording('cancel')}
        disabled={busy || !started}
        activeOpacity={0.85}
        hitSlop={6}
        style={{
          width: 36, height: 36, borderRadius: 18,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: c.border,
          opacity: (busy || !started) ? 0.5 : 1,
        }}
        accessibilityLabel="Cancel recording"
      >
        <Ionicons name="close" size={16} color={c.muted} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => finishRecording('send')}
        disabled={busy || !started}
        activeOpacity={0.85}
        hitSlop={6}
        style={{
          width: 36, height: 36, borderRadius: 18,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: c.tint,
          opacity: (busy || !started) ? 0.6 : 1,
        }}
        accessibilityLabel="Stop and send recording"
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Ionicons name="send" size={15} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );
}
