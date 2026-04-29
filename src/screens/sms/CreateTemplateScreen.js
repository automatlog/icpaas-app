// src/screens/sms/CreateTemplateScreen.js
// Create SMS template — POST /api/v1/sms/createtemplate
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useBrand } from '../../theme';
import { SMSAPI } from '../../services/api';
import { pushNotification } from '../../store/slices/notificationsSlice';
import toast from '../../services/toast';
import GradientButton from '../../components/GradientButton';

const TYPES = [
  { id: 'Normal',         label: 'Normal',         icon: 'chatbubble-outline',     desc: 'Standard transactional or promotional.' },
  { id: 'OTP',            label: 'OTP',            icon: 'shield-checkmark-outline', desc: 'One-time verification codes.' },
  { id: 'Transactional',  label: 'Transactional',  icon: 'receipt-outline',        desc: 'Order, account, alert messages.' },
];

export default function CreateTemplateScreen({ navigation }) {
  const c = useBrand();
  const dispatch = useDispatch();

  const [senders, setSenders] = useState([]);
  const [senderId, setSenderId] = useState('');
  const [showSender, setShowSender] = useState(false);
  const [loadingSenders, setLoadingSenders] = useState(true);

  const [name, setName] = useState('');
  const [type, setType] = useState('Normal');
  const [text, setText] = useState('');
  const [dltTemplateId, setDltTemplateId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoadingSenders(true);
    SMSAPI.getSenderIds()
      .then((res) => {
        const list = res?.senderIds || res?.data?.senderIds || res?.data || [];
        setSenders(Array.isArray(list) ? list : []);
        if (!senderId && list[0]?.senderId) {
          setSenderId(list[0].senderId);
          if (list[0].entityId) setDltTemplateId('');
        }
      })
      .catch(() => setSenders([]))
      .finally(() => setLoadingSenders(false));
  }, []);

  const submit = async () => {
    if (!senderId) { Alert.alert('Missing sender', 'Pick an SMS sender ID first.'); return; }
    if (!name.trim()) { Alert.alert('Missing name', 'Template name is required.'); return; }
    if (!text.trim()) { Alert.alert('Missing message', 'Message text is required.'); return; }

    setSubmitting(true);
    try {
      const res = await SMSAPI.createTemplate({
        senderId,
        templateType: type,
        templateName: name.trim(),
        templateText: text.trim(),
        dltTemplateId: dltTemplateId.trim(),
      });
      const ok = res?.status === true || res?.success === true || res?.status === 'success';
      if (!ok) throw { message: res?.message || 'Create template failed' };

      dispatch(pushNotification({
        title: 'SMS template created',
        body: `${name.trim()} (${type})`,
        type: 'success',
      }));
      toast.success('Template created', name.trim());
      navigation.goBack();
    } catch (e) {
      Alert.alert('Failed', e?.message || 'Could not create template');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSender = senders.find((s) => s.senderId === senderId);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 140, paddingHorizontal: 18 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center mb-4" style={{ gap: 10 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} className="w-9 h-9 items-center justify-center">
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: c.textMuted }}>SMS</Text>
            <Text className="text-[20px] font-extrabold" style={{ color: c.text }}>Create template</Text>
          </View>
        </View>

        {/* Sender selector */}
        <Text className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: c.textMuted }}>Sender ID</Text>
        <TouchableOpacity
          onPress={() => setShowSender((v) => !v)}
          activeOpacity={0.85}
          className="rounded-[14px] flex-row items-center px-4 py-3 mb-2"
          style={{ backgroundColor: c.bgInput, gap: 8 }}
        >
          <Ionicons name="chatbubble-outline" size={16} color={c.textMuted} />
          <Text className="flex-1 text-[13px] font-medium" style={{ color: c.text }} numberOfLines={1}>
            {loadingSenders ? 'Loading senders…' : (selectedSender?.senderId || senderId || 'Pick a sender')}
          </Text>
          <Ionicons name={showSender ? 'chevron-up' : 'chevron-down'} size={14} color={c.textMuted} />
        </TouchableOpacity>
        {showSender && (
          <View className="rounded-[14px] mb-3" style={{ backgroundColor: c.bgInput }}>
            {senders.map((s) => (
              <TouchableOpacity
                key={`${s.senderId}-${s.entityId}`}
                onPress={() => { setSenderId(s.senderId); setShowSender(false); }}
                className="px-4 py-3 flex-row items-center"
                style={{ gap: 8, borderTopWidth: 1, borderTopColor: c.border }}
              >
                <Ionicons name={senderId === s.senderId ? 'radio-button-on' : 'radio-button-off'} size={14} color={c.primary} />
                <View className="flex-1">
                  <Text className="text-[13px] font-medium" style={{ color: c.text }}>{s.senderId}</Text>
                  <Text className="text-[10px] font-mono" style={{ color: c.textMuted }} numberOfLines={1}>PE: {s.entityId}</Text>
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
          placeholder="e.g. WelcomeTemplate"
          placeholderTextColor={c.textMuted}
          className="rounded-[14px] px-4 py-3 text-[14px]"
          style={[{ backgroundColor: c.bgInput, color: c.text }, Platform.select({ web: { outlineStyle: 'none' } })]}
        />

        {/* DLT Template ID */}
        <Text className="text-[11px] font-semibold uppercase tracking-widest mb-2 mt-4" style={{ color: c.textMuted }}>DLT template ID</Text>
        <TextInput
          value={dltTemplateId}
          onChangeText={setDltTemplateId}
          placeholder="e.g. 1234567890"
          placeholderTextColor={c.textMuted}
          className="rounded-[14px] px-4 py-3 text-[14px]"
          style={[{ backgroundColor: c.bgInput, color: c.text, fontFamily: 'monospace' }, Platform.select({ web: { outlineStyle: 'none' } })]}
        />

        {/* Body */}
        <Text className="text-[11px] font-semibold uppercase tracking-widest mb-2 mt-4" style={{ color: c.textMuted }}>Message text</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Hello, this is a sample SMS template."
          placeholderTextColor={c.textMuted}
          multiline
          className="rounded-[14px] px-4 py-3 text-[14px]"
          style={[{ backgroundColor: c.bgInput, color: c.text, minHeight: 110, textAlignVertical: 'top' }, Platform.select({ web: { outlineStyle: 'none' } })]}
        />

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
