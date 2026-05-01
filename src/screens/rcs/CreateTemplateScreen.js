// src/screens/rcs/CreateTemplateScreen.js
// Create RCS template — POST /api/v1/rcs/createtemplate
// type "3" = simple text message. Rich card / carousel can be layered on later.
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useBrand } from '../../theme';
import { RCSAPI } from '../../services/api';
import { pushNotification } from '../../store/slices/notificationsSlice';
import toast from '../../services/toast';
import dialog from '../../services/dialog';
import GradientButton from '../../components/GradientButton';
import ScreenHeader from '../../components/ScreenHeader';

const TYPES = [
  { id: '3', label: 'Text message',  icon: 'chatbubble-ellipses-outline', desc: 'Plain text with optional buttons.' },
  { id: '1', label: 'Rich card',     icon: 'image-outline',               desc: 'Single card with media + buttons.' },
  { id: 'Carousel', label: 'Carousel', icon: 'albums-outline',            desc: 'Multiple cards horizontally.' },
];

export default function CreateTemplateScreen({ navigation }) {
  const c = useBrand();
  const dispatch = useDispatch();

  const [bots, setBots] = useState([]);
  const [botId, setBotId] = useState('');
  const [showBot, setShowBot] = useState(false);
  const [loadingBots, setLoadingBots] = useState(true);

  const [name, setName] = useState('');
  const [type, setType] = useState('3');
  const [textMessage, setTextMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoadingBots(true);
    RCSAPI.getBotIds()
      .then((res) => {
        const list = res?.bots || res?.data?.bots || res?.data || [];
        setBots(Array.isArray(list) ? list : []);
        if (!botId && list[0]?.botId) setBotId(list[0].botId);
      })
      .catch(() => setBots([]))
      .finally(() => setLoadingBots(false));
  }, []);

  const submit = async () => {
    if (!botId) { dialog.warning({ title: 'Missing bot', message: 'Pick an RCS bot ID first.' }); return; }
    if (!name.trim()) { dialog.warning({ title: 'Missing name', message: 'Template name is required.' }); return; }
    if (!textMessage.trim()) { dialog.warning({ title: 'Missing message', message: 'Text message body is required.' }); return; }

    setSubmitting(true);
    try {
      const res = await RCSAPI.createTemplate({
        botId,
        template_data: {
          name: name.trim(),
          type,
          textMessage: textMessage.trim(),
        },
      });
      const ok = res?.status === 'success' || res?.status === true;
      if (!ok) throw { message: res?.message || 'Create template failed' };

      dispatch(pushNotification({
        title: 'RCS template created',
        body: `${name.trim()} (${type === '3' ? 'text' : type})`,
        type: 'success',
      }));
      toast.success('Template created', name.trim());
      navigation.goBack();
    } catch (e) {
      dialog.error({ title: 'Failed', message: e?.message || 'Could not create template' });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBot = bots.find((b) => b.botId === botId);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        icon="document-text-outline"
        title="Create Template"
        badge="RCS"
      />
      <ScrollView
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 140, paddingHorizontal: 18 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Bot selector */}
        <Text className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: c.textMuted }}>Bot</Text>
        <TouchableOpacity
          onPress={() => setShowBot((v) => !v)}
          activeOpacity={0.85}
          className="rounded-[14px] flex-row items-center px-4 py-3 mb-2"
          style={{ backgroundColor: c.bgInput, gap: 8 }}
        >
          <Ionicons name="card-outline" size={16} color={c.textMuted} />
          <Text className="flex-1 text-[13px] font-medium" style={{ color: c.text }} numberOfLines={1}>
            {loadingBots ? 'Loading bots…' : (selectedBot?.agentName || botId || 'Pick a bot')}
          </Text>
          <Ionicons name={showBot ? 'chevron-up' : 'chevron-down'} size={14} color={c.textMuted} />
        </TouchableOpacity>
        {showBot && (
          <View className="rounded-[14px] mb-3" style={{ backgroundColor: c.bgInput }}>
            {bots.map((b) => (
              <TouchableOpacity
                key={b.botId}
                onPress={() => { setBotId(b.botId); setShowBot(false); }}
                className="px-4 py-3 flex-row items-center"
                style={{ gap: 8, borderTopWidth: 1, borderTopColor: c.border }}
              >
                <Ionicons name={botId === b.botId ? 'radio-button-on' : 'radio-button-off'} size={14} color={c.primary} />
                <View className="flex-1">
                  <Text className="text-[13px] font-medium" style={{ color: c.text }}>{b.agentName || b.botId}</Text>
                  <Text className="text-[10px] font-mono" style={{ color: c.textMuted }} numberOfLines={1}>{b.botId}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Type */}
        <Text className="text-[11px] font-semibold uppercase tracking-widest mb-2 mt-2" style={{ color: c.textMuted }}>Type</Text>
        <View style={{ gap: 8 }}>
          {TYPES.map((t) => {
            const active = type === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setType(t.id)}
                activeOpacity={0.85}
                className="rounded-[14px] flex-row items-center px-3 py-3"
                style={{ backgroundColor: active ? c.primarySoft : c.bgInput, borderWidth: 1, borderColor: active ? c.primary : c.border, gap: 10 }}
              >
                <View className="w-9 h-9 rounded-[10px] items-center justify-center" style={{ backgroundColor: active ? c.primary : c.bgCard }}>
                  <Ionicons name={t.icon} size={16} color={active ? '#FFFFFF' : c.textMuted} />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-bold" style={{ color: c.text }}>{t.label}</Text>
                  <Text className="text-[11px]" style={{ color: c.textMuted }}>{t.desc}</Text>
                </View>
                <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={active ? c.primary : c.textDim} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Name */}
        <Text className="text-[11px] font-semibold uppercase tracking-widest mb-2 mt-4" style={{ color: c.textMuted }}>Template name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. OFFERCARD1"
          placeholderTextColor={c.textMuted}
          className="rounded-[14px] px-4 py-3 text-[14px]"
          style={[{ backgroundColor: c.bgInput, color: c.text }, Platform.select({ web: { outlineStyle: 'none' } })]}
        />

        {/* Body */}
        <Text className="text-[11px] font-semibold uppercase tracking-widest mb-2 mt-4" style={{ color: c.textMuted }}>Text message</Text>
        <TextInput
          value={textMessage}
          onChangeText={setTextMessage}
          placeholder="Hello [Name], your order #[OrderId] is confirmed!"
          placeholderTextColor={c.textMuted}
          multiline
          className="rounded-[14px] px-4 py-3 text-[14px]"
          style={[{ backgroundColor: c.bgInput, color: c.text, minHeight: 110, textAlignVertical: 'top' }, Platform.select({ web: { outlineStyle: 'none' } })]}
        />
        <Text className="text-[10px] mt-2" style={{ color: c.textDim }}>
          Use [Variable] placeholders. They will be filled in at send time.
        </Text>

        <GradientButton
          title="Create template"
          onPress={submit}
          loading={submitting}
          icon="add-circle-outline"
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </View>
  );
}
