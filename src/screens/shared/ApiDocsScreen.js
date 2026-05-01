// src/screens/ApiDocsScreen.js — Per-product API endpoint reference
// Sourced from "Omni App.pdf"
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Platform, RefreshControl,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useBrand } from '../../theme';
import BottomTabBar from '../../components/BottomTabBar';
import ScreenHeader from '../../components/ScreenHeader';
import toast from '../../services/toast';
import usePullToRefresh from '../../hooks/usePullToRefresh';

const PRODUCTS = [
  {
    id: 'voice',
    label: 'Voice',
    icon: 'call',
    tint: '#10B981',
    base: 'https://icpaas.in',
    endpoints: [
      { method: 'POST', path: '/api/v1/Voice/OgCall/DeliveryReport', title: 'Get voice delivery report' },
      { method: 'POST', path: '/api/v1/Voice/OgCall/MediaUpload',     title: 'Upload Voice File (.wav)' },
      { method: 'GET',  path: '/api/v1/Voice/OgCall/GetFileStatus/{mediaId}', title: 'Get uploaded voice file status' },
      { method: 'POST', path: '/api/v1/Voice/OgCall/MakeCall',        title: 'Make a new outbound voice call' },
      { method: 'POST', path: '/api/v1/Ivr/Inbound/getivrreports',    title: 'Get IVR inbound reports' },
      { method: 'GET',  path: '/api/v1/user/balance',                  title: 'Get wallet balance' },
    ],
  },
  {
    id: 'sms',
    label: 'SMS',
    icon: 'chatbubble-outline',
    tint: '#0B8A6F',
    base: 'https://gsauth.com',
    endpoints: [
      { method: 'GET',  path: '/api/v1/sms/senderId',           title: 'Get all sender IDs' },
      { method: 'GET',  path: '/api/v1/sms/getTemplate?senderId=…', title: 'Get all SMS templates' },
      { method: 'POST', path: '/api/v1/sms/sendmessage',         title: 'Send SMS messages' },
    ],
  },
  {
    id: 'rcs',
    label: 'RCS',
    icon: 'card-outline',
    tint: '#3B82F6',
    base: 'https://gsauth.com',
    endpoints: [
      { method: 'GET',  path: '/api/v1/rcs/getBotIds',           title: 'Get all RCS bot IDs' },
      { method: 'GET',  path: '/api/rcs/getTemplate?botid=…',    title: 'Get all RCS templates' },
      { method: 'POST', path: '/api/v1/rcs/sendmessage',         title: 'Send RCS messages' },
    ],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: 'logo-whatsapp',
    tint: '#10B981',
    base: 'https://gsauth.com',
    endpoints: [
      { method: 'GET',  path: '/api/v23.0/channels',                          title: 'Get all WhatsApp channels' },
      { method: 'GET',  path: '/api/v23.0/{wabaId}/message_templates',        title: 'Get all message templates' },
      { method: 'POST', path: '/api/v1/whatsapp/sendmessage',                 title: 'Send WhatsApp messages' },
      { method: 'POST', path: '/{version}/{phoneNumberId}/media',             title: 'Upload WhatsApp media' },
      { method: 'GET',  path: '/api/v23.0/{id}',                              title: 'Get template or media by ID' },
    ],
  },
];

const METHOD_TINT = {
  GET:    { bg: '#DBEAFE', fg: '#1D4ED8' },
  POST:   { bg: '#D1FAE5', fg: '#047857' },
  PUT:    { bg: '#FEF3C7', fg: '#B45309' },
  DELETE: { bg: '#FEE2E2', fg: '#B91C1C' },
};

export default function ApiDocsScreen({ navigation, route }) {
  const c = useBrand();
  const [active, setActive] = useState(route?.params?.product || 'voice');
  // Endpoint list is bundled with the app — refresh just acknowledges the
  // gesture so the affordance is consistent with data-backed screens.
  const { refreshing, onRefresh } = usePullToRefresh();

  const product = useMemo(() => PRODUCTS.find((p) => p.id === active) || PRODUCTS[0], [active]);

  const copy = async (text, label) => {
    await Clipboard.setStringAsync(text);
    toast.success('Copied', `${label} copied to clipboard.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        icon="code-slash-outline"
        title="API Docs"
      />

      {/* Product pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        style={{ borderBottomWidth: 1, borderBottomColor: c.rule }}
      >
        {PRODUCTS.map((p) => {
          const isActive = active === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => setActive(p.id)}
              activeOpacity={0.85}
              className="flex-row items-center rounded-[14px] py-2 px-3"
              style={{ backgroundColor: isActive ? p.tint : c.bgInput, gap: 6 }}
            >
              <Ionicons name={p.icon} size={13} color={isActive ? '#FFFFFF' : c.textMuted} />
              <Text className="text-[12px]" style={{ color: isActive ? '#FFFFFF' : c.textMuted, fontWeight: isActive ? '700' : '500' }}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} />}
      >
        {/* Product header card */}
        <View
          className="rounded-[20px] p-4 mb-3 flex-row items-center"
          style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border, gap: 12 }}
        >
          <View className="w-12 h-12 rounded-[14px] items-center justify-center" style={{ backgroundColor: product.tint + '22' }}>
            <Ionicons name={product.icon} size={22} color={product.tint} />
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-bold" style={{ color: c.text }}>{product.label}</Text>
            <Text className="text-[11px] mt-0.5 font-mono" style={{ color: c.textMuted }} numberOfLines={1}>{product.base}</Text>
          </View>
          <TouchableOpacity
            onPress={() => copy(product.base, 'Base URL')}
            activeOpacity={0.85}
            className="w-9 h-9 rounded-[10px] items-center justify-center"
            style={{ backgroundColor: c.bgInput }}
          >
            <Ionicons name="copy-outline" size={14} color={c.textMuted} />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center mb-2 px-1" style={{ gap: 6 }}>
          <Ionicons name="code-slash" size={13} color={c.textMuted} />
          <Text className="text-[11px] font-bold uppercase tracking-widest" style={{ color: c.textMuted }}>
            Endpoints ({product.endpoints.length})
          </Text>
        </View>

        {product.endpoints.map((e, i) => (
          <Endpoint key={i} c={c} endpoint={e} base={product.base} onCopy={copy} />
        ))}

        <Text className="text-[11px] text-center mt-3" style={{ color: c.textDim }}>
          All endpoints require a Bearer token from Config.
        </Text>
      </ScrollView>

      <BottomTabBar c={c} navigation={navigation} active="you" />
    </View>
  );
}

function Endpoint({ c, endpoint, base, onCopy }) {
  const tint = METHOD_TINT[endpoint.method] || METHOD_TINT.GET;
  const fullUrl = base + endpoint.path;
  return (
    <View
      className="rounded-[16px] p-3.5 mb-2.5"
      style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}
    >
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <View className="rounded-[8px] px-2.5 py-1" style={{ backgroundColor: tint.bg }}>
          <Text className="text-[10px] font-extrabold tracking-wider" style={{ color: tint.fg }}>{endpoint.method}</Text>
        </View>
        <Text className="flex-1 text-[12px] font-mono" style={{ color: c.text }} numberOfLines={1}>{endpoint.path}</Text>
        <TouchableOpacity
          onPress={() => onCopy(fullUrl, endpoint.path)}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="copy-outline" size={14} color={c.textMuted} />
        </TouchableOpacity>
      </View>
      <Text className="text-[12px] mt-2" style={{ color: c.textMuted }}>{endpoint.title}</Text>
    </View>
  );
}
