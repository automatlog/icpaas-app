// src/screens/whatsapp/WabaChannelScreen.js — WhatsApp Business channels
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Platform, RefreshControl,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useBrand } from '../../theme';
import { WhatsAppAPI } from '../../services/api';
import InfoRow from '../../components/InfoRow';
import ScreenHeader from '../../components/ScreenHeader';
import toast from '../../services/toast';

export default function WabaChannelScreen({ navigation }) {
  const c = useBrand();

  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await WhatsAppAPI.getChannels();
      setChannels(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setChannels([]);
      setErr(e?.message || 'Failed to load channels');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const copy = async (value, label) => {
    await Clipboard.setStringAsync(String(value));
    toast.success('Copied', `${label} copied to clipboard.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        icon="logo-whatsapp"
        title="Business Channels"
        badge="WhatsApp"
        subtitle={{ text: 'WABA Managed Numbers', dotColor: c.success }}
        right={
          <TouchableOpacity
            onPress={load}
            activeOpacity={0.7}
            style={{
              width: 36, height: 36, borderRadius: 18,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: c.bgInput,
            }}
          >
            <Ionicons name="refresh" size={18} color={c.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View
          className="mx-4 rounded-[20px] p-5 mb-4 flex-row items-center justify-between"
          style={{ backgroundColor: c.primarySoft, borderWidth: 1, borderColor: c.primaryMint + '33' }}
        >
          <View>
            <Text className="text-[11px] font-bold tracking-widest uppercase mb-1" style={{ color: c.primaryDeep, opacity: 0.7 }}>
              Total Channels
            </Text>
            <Text className="text-[32px] font-extrabold" style={{ color: c.primaryDeep }}>
              {channels.length}
            </Text>
          </View>
          <View className="w-14 h-14 rounded-2xl items-center justify-center" style={{ backgroundColor: c.primary }}>
            <Ionicons name="apps" size={28} color="#FFFFFF" />
          </View>
        </View>

        {loading ? (
          <View className="py-20 items-center">
            <ActivityIndicator color={c.primary} size="large" />
            <Text className="text-[12px] font-bold tracking-widest uppercase mt-4" style={{ color: c.textMuted }}>
              Fetching channels...
            </Text>
          </View>
        ) : err ? (
          <View className="mx-4 rounded-[20px] p-5" style={{ backgroundColor: c.danger + '12', borderWidth: 1, borderColor: c.danger + '33' }}>
            <View className="flex-row items-center mb-2" style={{ gap: 8 }}>
              <Ionicons name="alert-circle" size={18} color={c.danger} />
              <Text className="text-[13px] font-bold uppercase tracking-widest" style={{ color: c.danger }}>Fetch error</Text>
            </View>
            <Text className="text-[14px]" style={{ color: c.text }}>{err}</Text>
            <TouchableOpacity
              onPress={load}
              className="mt-4 self-start px-4 py-2 rounded-[10px]"
              style={{ backgroundColor: c.danger }}
            >
              <Text className="text-[12px] font-bold text-white">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : channels.length === 0 ? (
          <View className="py-24 items-center px-10">
            <View className="w-20 h-20 rounded-full items-center justify-center mb-4" style={{ backgroundColor: c.bgInput }}>
              <Ionicons name="logo-whatsapp" size={40} color={c.textDim} />
            </View>
            <Text className="text-[18px] font-bold text-center" style={{ color: c.text }}>No Channels Found</Text>
            <Text className="text-[13px] text-center mt-2" style={{ color: c.textMuted }}>
              We couldn't find any WhatsApp Business channels linked to this token. Please check your gsauth credentials.
            </Text>
          </View>
        ) : (
          <View className="px-4">
            <Text className="text-[11px] font-bold uppercase tracking-widest mb-3 ml-1" style={{ color: c.textMuted }}>
              Linked Phone Numbers ({channels.length})
            </Text>
            {channels.map((ch, i) => (
              <View
                key={ch.phoneNumberId || i}
                className="rounded-[24px] p-5 mb-4"
                style={{
                  backgroundColor: c.bgCard,
                  borderWidth: 1,
                  borderColor: c.border,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.05,
                  shadowRadius: 10,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center mb-5" style={{ gap: 14 }}>
                  <View
                    className="w-14 h-14 rounded-full items-center justify-center"
                    style={{ backgroundColor: c.primarySoft }}
                  >
                    <Ionicons name="logo-whatsapp" size={26} color={c.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[17px] font-bold" style={{ color: c.text }} numberOfLines={1}>
                      {ch.label || ch.wabaNumber || 'Channel ' + (i + 1)}
                    </Text>
                    <View className="flex-row items-center mt-0.5" style={{ gap: 5 }}>
                      <View className="w-2 h-2 rounded-full" style={{ backgroundColor: c.success }} />
                      <Text className="text-[12px] font-medium" style={{ color: c.textMuted }}>
                        {ch.wabaNumber ? `+${ch.wabaNumber}` : 'Active'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Templates')}
                    activeOpacity={0.8}
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: c.bgInput }}
                  >
                    <Ionicons name="document-text" size={18} color={c.primary} />
                  </TouchableOpacity>
                </View>

                <View style={{ gap: 4 }}>
                  <InfoRow c={c} label="Phone Number ID" value={ch.phoneNumberId} onCopy={() => copy(ch.phoneNumberId, 'Phone Number ID')} />
                  <InfoRow c={c} label="WABA Account ID" value={ch.wabaBusinessId} onCopy={() => copy(ch.wabaBusinessId, 'WABA Business ID')} />
                </View>

                <TouchableOpacity
                  onPress={() => navigation.navigate('WhatsAppTemplates', { phoneNumberId: ch.phoneNumberId, wabaId: ch.wabaBusinessId })}
                  activeOpacity={0.85}
                  className="flex-row items-center justify-center rounded-[14px] py-3 mt-4"
                  style={{ backgroundColor: c.primary }}
                >
                  <Text className="text-[13px] font-bold text-white mr-2">Manage Templates</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

