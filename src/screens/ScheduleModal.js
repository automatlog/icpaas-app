// src/screens/ScheduleModal.js — Pick date + time for campaign scheduling
import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useBrand } from '../theme';

const pad = (n) => String(n).padStart(2, '0');

// yyyy-MM-dd HH:mm:ss — matches Voice/Campaign API spec
const toApiString = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

// Friendly display: "27 Apr 2026 · 10:30 AM"
const toDisplay = (d) => {
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date} · ${time}`;
};

const QUICK_PICKS = [
  { label: 'In 1 hour',     mins: 60 },
  { label: 'In 4 hours',    mins: 4 * 60 },
  { label: 'Tomorrow 9 AM', mins: null, fn: (now) => { const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; } },
  { label: 'Next Monday 9 AM', mins: null, fn: (now) => {
    const d = new Date(now);
    const offset = ((1 - d.getDay() + 7) % 7) || 7;
    d.setDate(d.getDate() + offset);
    d.setHours(9, 0, 0, 0);
    return d;
  } },
];

export default function ScheduleModal({ visible, initialValue, onConfirm, onClose }) {
  const c = useBrand();
  const [date, setDate] = useState(() => initialValue ? new Date(initialValue) : new Date(Date.now() + 60 * 60 * 1000));
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  useEffect(() => {
    if (visible) setDate(initialValue ? new Date(initialValue) : new Date(Date.now() + 60 * 60 * 1000));
  }, [visible]);

  const minDate = new Date(); // can't schedule into the past
  const valid = date.getTime() > Date.now();

  const onChangeDate = (_e, picked) => {
    setShowDate(Platform.OS === 'ios');
    if (!picked) return;
    const next = new Date(date);
    next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    setDate(next);
  };

  const onChangeTime = (_e, picked) => {
    setShowTime(Platform.OS === 'ios');
    if (!picked) return;
    const next = new Date(date);
    next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    setDate(next);
  };

  const applyQuick = (q) => {
    const now = new Date();
    if (q.fn) setDate(q.fn(now));
    else setDate(new Date(now.getTime() + q.mins * 60 * 1000));
  };

  const confirm = () => {
    if (!valid) return;
    onConfirm(toApiString(date), date);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1 }} />

        <View
          style={{
            backgroundColor: c.bg,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingBottom: Platform.OS === 'ios' ? 24 : 16,
          }}
        >
          {/* Drag handle */}
          <View className="items-center pt-2 pb-1">
            <View className="w-10 h-1 rounded-full" style={{ backgroundColor: c.border }} />
          </View>

          {/* Header */}
          <View
            className="flex-row items-center px-4 pt-1 pb-3"
            style={{ borderBottomWidth: 1, borderBottomColor: c.rule, gap: 10 }}
          >
            <View className="w-9 h-9 rounded-[10px] items-center justify-center" style={{ backgroundColor: c.primarySoft }}>
              <Ionicons name="calendar" size={16} color={c.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-[16px] font-bold" style={{ color: c.text }}>Schedule campaign</Text>
              <Text className="text-[11px]" style={{ color: c.textMuted }}>Pick when this should send.</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color={c.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Quick picks */}
          <View className="px-4 pt-3">
            <Text className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: c.textMuted }}>Quick picks</Text>
            <View className="flex-row flex-wrap" style={{ gap: 6 }}>
              {QUICK_PICKS.map((q) => (
                <TouchableOpacity
                  key={q.label}
                  onPress={() => applyQuick(q)}
                  activeOpacity={0.85}
                  className="rounded-[14px] py-2 px-3"
                  style={{ backgroundColor: c.bgInput }}
                >
                  <Text className="text-[12px] font-semibold" style={{ color: c.text }}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Big preview */}
          <View className="px-4 mt-4">
            <View
              className="rounded-[14px] p-4 flex-row items-center"
              style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border, gap: 12 }}
            >
              <View className="w-10 h-10 rounded-[10px] items-center justify-center" style={{ backgroundColor: c.primarySoft }}>
                <Ionicons name="time" size={18} color={c.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-widest" style={{ color: c.textMuted }}>Will send at</Text>
                <Text className="text-[16px] font-bold mt-0.5" style={{ color: valid ? c.text : c.danger }} numberOfLines={1}>
                  {toDisplay(date)}
                </Text>
              </View>
            </View>
            {!valid ? (
              <Text className="text-[11px] mt-1.5 px-1" style={{ color: c.danger }}>
                ⚠ Pick a time in the future.
              </Text>
            ) : null}
          </View>

          {/* Date / Time pickers */}
          <View className="px-4 mt-3 flex-row" style={{ gap: 8 }}>
            <PickerField c={c} icon="calendar-outline" label="Date" value={date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} onPress={() => setShowDate(true)} />
            <PickerField c={c} icon="time-outline" label="Time" value={date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} onPress={() => setShowTime(true)} />
          </View>

          {showDate ? (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={minDate}
              onChange={onChangeDate}
            />
          ) : null}
          {showTime ? (
            <DateTimePicker
              value={date}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangeTime}
            />
          ) : null}

          {/* Action row */}
          <View className="px-4 mt-4 flex-row" style={{ gap: 8 }}>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              className="flex-1 flex-row items-center justify-center rounded-[12px] py-3"
              style={{ borderWidth: 1, borderColor: c.border, gap: 6 }}
            >
              <Text className="text-[13px] font-semibold" style={{ color: c.text }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={confirm}
              activeOpacity={0.85}
              disabled={!valid}
              className="flex-1 flex-row items-center justify-center rounded-[12px] py-3"
              style={{ backgroundColor: valid ? c.primary : c.bgInput, opacity: valid ? 1 : 0.6, gap: 6 }}
            >
              <Ionicons name="checkmark" size={14} color={valid ? '#FFFFFF' : c.textMuted} />
              <Text className="text-[13px] font-bold" style={{ color: valid ? '#FFFFFF' : c.textMuted }}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PickerField({ c, icon, label, value, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="flex-1 rounded-[12px] p-3"
      style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.bgCard }}
    >
      <View className="flex-row items-center mb-1" style={{ gap: 6 }}>
        <Ionicons name={icon} size={11} color={c.textMuted} />
        <Text className="text-[10px] font-bold uppercase tracking-widest" style={{ color: c.textMuted }}>{label}</Text>
      </View>
      <Text className="text-[13px] font-bold" style={{ color: c.text }} numberOfLines={1}>{value}</Text>
    </TouchableOpacity>
  );
}
