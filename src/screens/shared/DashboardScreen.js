// src/screens/shared/DashboardScreen.js — Brand Home (Modernized)
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, RefreshControl,
  Pressable, Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Animated, { 
  FadeInDown, 
  FadeInRight, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  useAnimatedProps,
} from 'react-native-reanimated';
import { useBrand } from '../../theme';
import { BalanceAPI, VoiceAPI, IVRAPI } from '../../services/api';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { selectUnreadCount, pushNotification } from '../../store/slices/notificationsSlice';
import { selectConnection, selectUnreadBadgeTotal } from '../../store/slices/liveChatSlice';
import Banner from '../../components/Banner';
import CampaignPicker from '../../components/CampaignPicker';
import ChatsPicker from '../../components/ChatsPicker';
import toast from '../../services/toast';
import { CHANNELS } from '../../constants/channels';

const { width } = Dimensions.get('window');

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Good Night';
};

const ymd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const ACTIVITY = [
  { id: '1', icon: 'send',          title: 'Campaign "New Offer" sent',         sub: '1,248 messages sent successfully',         time: '05:34 PM', status: 'Completed' },
  { id: '2', icon: 'chatbubble',    title: 'New chat from +91 98765 43210',     sub: 'Need help with my order',                  time: '04:18 PM', status: 'New' },
  { id: '3', icon: 'flash',         title: 'Automation "Welcome Flow" triggered', sub: 'Sent welcome message to new contact',    time: '02:45 PM', status: 'Completed' },
  { id: '4', icon: 'person-add',    title: 'New contact added',                 sub: 'Rahul Sharma (+91 91234 56789)',           time: '11:20 AM', status: 'Added' },
];

const STATUS_TINT = (c, s) => {
  if (s === 'Completed') return { bg: '#D1FAE5', fg: '#065F46' };
  if (s === 'New')       return { bg: '#DBEAFE', fg: '#1E40AF' };
  if (s === 'Added')     return { bg: '#FEF3C7', fg: '#92400E' };
  return { bg: '#F3F4F6', fg: '#6B7280' };
};

const AnimatedBar = ({ index, color }) => {
  const height = useSharedValue(Math.random() * 15 + 10);
  useEffect(() => {
    height.value = withRepeat(
      withSequence(
        withTiming(Math.random() * 25 + 15, { duration: 600 + Math.random() * 400 }),
        withTiming(Math.random() * 15 + 5, { duration: 600 + Math.random() * 400 })
      ),
      -1,
      true
    );
  }, []);
  const style = useAnimatedStyle(() => ({ height: height.value }));
  return <Animated.View className="w-1.5 rounded-t-sm mx-[2px] opacity-20" style={[{ backgroundColor: color }, style]} />;
};

const AnimatedWave = ({ index, color }) => {
  const height = useSharedValue(5);
  useEffect(() => {
    setTimeout(() => {
      height.value = withRepeat(
        withSequence(withTiming(30, { duration: 600 }), withTiming(5, { duration: 600 })),
        -1,
        true
      );
    }, index * 150);
  }, []);
  const style = useAnimatedStyle(() => ({ height: height.value }));
  return <Animated.View className="w-2 rounded-full mx-[2px] opacity-20" style={[{ backgroundColor: color }, style]} />;
};

const AnimatedDot = ({ index, color }) => {
  const scale = useSharedValue(0.5);
  useEffect(() => {
    setTimeout(() => {
      scale.value = withRepeat(
        withSequence(withTiming(1.8, { duration: 500 }), withTiming(0.5, { duration: 500 })),
        -1,
        true
      );
    }, index * 200);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View className="w-2 h-2 rounded-full mx-1 opacity-30" style={[{ backgroundColor: color }, style]} />;
};

const AnimatedBlock = ({ index, color }) => {
  const opacity = useSharedValue(0.1);
  useEffect(() => {
    setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(withTiming(0.5, { duration: 400 }), withTiming(0.1, { duration: 400 })),
        -1,
        true
      );
    }, index * 300);
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View className="w-4 h-4 rounded-sm mx-0.5" style={[{ backgroundColor: color }, style]} />;
};

const AnimatedLineChart = ({ color }) => {
  const AnimatedPath = Animated.createAnimatedComponent(Path);
  const phase = useSharedValue(0);

  useEffect(() => {
    phase.value = withRepeat(withTiming(1, { duration: 2500 }), -1, true);
  }, []);

  const animatedProps = useAnimatedProps(() => {
    // Generate a line path that shifts based on phase
    const y1 = 15 + Math.sin(phase.value * Math.PI) * 10;
    const y2 = 25 - Math.cos(phase.value * Math.PI) * 15;
    const y3 = 10 + Math.sin(phase.value * Math.PI * 1.5) * 8;
    const y4 = 20 - Math.cos(phase.value * Math.PI * 0.5) * 12;
    const y5 = 5 + Math.sin(phase.value * Math.PI * 2) * 5;
    
    return {
      d: `M0,${y1} L20,${y2} L40,${y3} L60,${y4} L80,${y5}`
    };
  });

  return (
    <View className="absolute right-0 bottom-4 left-4 h-10 justify-end pointer-events-none opacity-40">
      <Svg width="100" height="35" viewBox="0 0 80 35">
        <AnimatedPath
          animatedProps={animatedProps}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const MiniChart = ({ type, color }) => {
  if (type === 'line') {
    return <AnimatedLineChart color={color} />;
  }
  if (type === 'wave') {
    return (
      <View className="absolute right-0 bottom-0 left-4 flex-row justify-between items-end h-10 pointer-events-none opacity-40">
        {[...Array(8)].map((_, i) => <AnimatedWave key={i} index={i} color={color} />)}
      </View>
    );
  }
  if (type === 'dots') {
    return (
      <View className="absolute right-2 bottom-4 flex-row items-center pointer-events-none opacity-40">
        {[...Array(5)].map((_, i) => <AnimatedDot key={i} index={i} color={color} />)}
      </View>
    );
  }
  if (type === 'blocks') {
    return (
      <View className="absolute right-2 bottom-2 flex-row items-end pointer-events-none opacity-40">
        {[...Array(4)].map((_, i) => <AnimatedBlock key={i} index={i} color={color} />)}
      </View>
    );
  }
  // Default to random bars
  return (
    <View className="absolute right-0 bottom-0 left-4 flex-row justify-between items-end h-10 pointer-events-none opacity-40">
      {[...Array(8)].map((_, i) => <AnimatedBar key={i} index={i} color={color} />)}
    </View>
  );
};

const WalletCard = ({ c, balance, balanceError, loading, navigation }) => {
  const scale = useSharedValue(1);
  const spin = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: 20000 }), -1, false);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bgStyle1 = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(spin.value, [0, 180, 360], [0, 20, 0]) },
      { translateY: interpolate(spin.value, [0, 180, 360], [0, -20, 0]) },
      { scale: interpolate(spin.value, [0, 180, 360], [1, 1.2, 1]) }
    ]
  }));

  const bgStyle2 = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(spin.value, [0, 180, 360], [0, -30, 0]) },
      { translateY: interpolate(spin.value, [0, 180, 360], [0, 30, 0]) },
      { rotate: `${spin.value}deg` }
    ]
  }));

  const onPressIn = () => (scale.value = withSpring(0.95));
  const onPressOut = () => (scale.value = withSpring(1));

  return (
    <Animated.View 
      entering={FadeInDown.delay(200).duration(800)}
      style={animatedStyle}
      className="mt-6"
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => navigation.navigate('Config')}
        className="shadow-2xl shadow-[#0B8A6F]/30"
      >
        <LinearGradient
          colors={['#0B8A6F', '#045c49']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-3xl p-6 overflow-hidden relative"
        >
          {/* Animated Abstract Background Elements */}
          <Animated.View style={bgStyle1} className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-400/20 blur-3xl" />
          <Animated.View style={bgStyle2} className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-emerald-900/40" />
          <View className="absolute top-0 left-0 w-full h-full bg-white/5" style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 24 }} />
          
          <View className="flex-row justify-between items-start mb-6 z-10">
            <View>
              <Text className="text-emerald-100/70 text-[12px] font-semibold uppercase tracking-[2px]">
                Wallet Balance
              </Text>
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ alignSelf: 'flex-start', marginTop: 10 }} />
              ) : balance != null ? (
                <Text className="text-white text-[32px] font-bold mt-1">
                  ₹{Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              ) : (
                <View className="mt-1">
                  <Text className="text-white text-[20px] font-bold">Unavailable</Text>
                  <Text className="text-emerald-100/60 text-[10px] mt-1">{balanceError || 'Pull to refresh'}</Text>
                </View>
              )}
            </View>
            <View className="bg-white/20 p-2.5 rounded-2xl">
              <Ionicons name="wallet-outline" size={24} color="#FFFFFF" />
            </View>
          </View>

          <View className="flex-row items-center justify-between z-10">
            <View className="flex-row -space-x-2">
              <View className="w-8 h-8 rounded-full border-2 border-[#0B8A6F] bg-emerald-100 items-center justify-center">
                <Ionicons name="logo-whatsapp" size={14} color="#0B8A6F" />
              </View>
              <View className="w-8 h-8 rounded-full border-2 border-[#0B8A6F] bg-blue-100 items-center justify-center">
                <Ionicons name="logo-google" size={14} color="#3B82F6" />
              </View>
              <View className="w-8 h-8 rounded-full border-2 border-[#0B8A6F] bg-purple-100 items-center justify-center">
                <Ionicons name="chatbubble-outline" size={14} color="#A855F7" />
              </View>
            </View>
            <View className="bg-white px-5 py-2.5 rounded-full shadow-lg">
              <Text className="text-[#0B8A6F] text-[13px] font-bold">Top up now</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const LiveStatusDot = ({ status }) => {
  const pulse = useSharedValue(1);
  
  useEffect(() => {
    if (status === 'connected') {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1
      );
    } else {
      pulse.value = 1;
    }
  }, [status]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.5], [1, 0]),
  }));

  const colors = {
    connected:    '#22C55E',
    connecting:   '#F59E0B',
    reconnecting: '#F59E0B',
    disconnected: '#EF4444',
    idle:         '#9CA3AF',
  };

  const color = colors[status] || colors.idle;

  return (
    <View className="flex-row items-center bg-white/50 px-2 py-1 rounded-full border border-gray-100">
      <View className="relative w-2 h-2 mr-1.5 items-center justify-center">
        <Animated.View 
          className="absolute w-full h-full rounded-full" 
          style={[{ backgroundColor: color }, animatedStyle]} 
        />
        <View className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      </View>
      <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
        {status === 'connected' ? 'Live' : status}
      </Text>
    </View>
  );
};

export default function DashboardScreen({ navigation }) {
  const c = useBrand();
  const user = useSelector((s) => s.auth.user);
  const unread = useSelector(selectUnreadCount);
  const liveConnection = useSelector(selectConnection);
  const liveUnread = useSelector(selectUnreadBadgeTotal);
  const dispatch = useDispatch();

  const [balance, setBalance] = useState(null);
  const [balanceError, setBalanceError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const extractBalance = (payload) => {
    if (payload == null) return null;
    if (typeof payload === 'number') return payload;
    const candidates = [
      payload.walletBalance, payload.balance, payload.amount,
      payload.data?.walletBalance, payload.data?.balance, payload.data?.amount,
      payload.result?.walletBalance, payload.result?.balance,
    ];
    for (const v of candidates) {
      if (v == null) continue;
      const n = typeof v === 'string' ? Number(v) : v;
      if (typeof n === 'number' && !Number.isNaN(n)) return n;
    }
    return null;
  };

  const fetchFront = useCallback(async () => {
    try {
      const [bal] = await Promise.allSettled([BalanceAPI.getBalance()]);
      if (bal.status === 'fulfilled') {
        const b = extractBalance(bal.value);
        setBalance(b);
        if (b == null) setBalanceError('Missing balance field');
        else if (b < 1000) {
          dispatch(pushNotification({
            kind: 'balance',
            title: 'Low wallet balance',
            body: `Wallet at ₹${Number(b).toLocaleString('en-IN', { maximumFractionDigits: 2 })}. Top up soon.`,
          }));
        }
      } else {
        setBalanceError(bal.reason?.message || 'API failed');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => { fetchFront(); }, [fetchFront]);

  const userName = user?.username || user?.name || 'Omniuser';

  return (
    <View className="flex-1" style={{ backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchFront(); }}
            tintColor="#0B8A6F"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <Animated.View entering={FadeInDown.duration(800)} className="flex-row items-center justify-between mb-2">
          <View>
            <Text className="text-gray-500 text-[14px] font-medium">{greet()},</Text>
            <Text className="text-gray-900 text-[32px] font-black tracking-tight">{userName}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Notifications')}
            className="w-12 h-12 rounded-2xl bg-gray-50 items-center justify-center border border-gray-100 relative"
          >
            <Ionicons name="notifications-outline" size={24} color="#111827" />
            {unread > 0 && (
              <View className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-white items-center justify-center">
                <Text className="text-[9px] font-bold text-white">{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {!bannerDismissed && balance < 1000 && balance !== null && (
          <Animated.View entering={FadeInDown.delay(100)} className="mb-4">
             <Banner
                tone="warning"
                title="Low balance"
                message={`Your wallet is running low (₹${Number(balance).toLocaleString()})`}
                actionText="Add Funds"
                onAction={() => navigation.navigate('Config')}
                onClose={() => setBannerDismissed(true)}
              />
          </Animated.View>
        )}

        {/* Wallet Section */}
        <WalletCard c={c} balance={balance} balanceError={balanceError} loading={loading} navigation={navigation} />

        {/* Channels Grid */}
        <View className="mt-10">
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-gray-900 text-[18px] font-bold">Available Channels</Text>
            <TouchableOpacity><Text className="text-[#0B8A6F] text-[13px] font-semibold">View All</Text></TouchableOpacity>
          </View>
          
          <View className="flex-row flex-wrap justify-between">
            {CHANNELS.map((ch, i) => (
              <ChannelTile
                key={ch.id}
                index={i}
                icon={ch.icon}
                label={ch.label}
                count={ch.count}
                tint={ch.tint}
                onPress={() => {
                  if (ch.id === 'whatsapp') {
                    navigation.navigate('WhatsAppDashboard');
                  } else {
                    navigation.navigate('Channel', { channel: ch.id });
                  }
                }}
              />
            ))}
          </View>
        </View>

        {/* WhatsApp Live Agent Card */}
        <Animated.View entering={FadeInDown.delay(600)} className="mt-8">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('LiveAgentInbox')}
            className="rounded-3xl p-5 border border-emerald-100 shadow-xl shadow-emerald-900/10 flex-row items-center relative overflow-hidden"
            style={{ backgroundColor: '#ffffff' }}
          >
            {/* Premium Gradient Background */}
            <LinearGradient
              colors={['rgba(11,138,111,0.05)', 'rgba(11,138,111,0.01)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none"
            />
            
            {/* Background Chart Animation */}
            <View className="absolute right-8 bottom-0 flex-row items-end h-16 pointer-events-none opacity-40">
              {[...Array(12)].map((_, i) => <AnimatedBar key={i} index={i} color="#0B8A6F" />)}
            </View>

            {/* Glowing Icon Container */}
            <View className="w-16 h-16 rounded-[20px] bg-emerald-50 items-center justify-center mr-4 z-10 shadow-lg shadow-emerald-500/20 border border-emerald-100">
              <Ionicons name="chatbubbles" size={30} color="#0B8A6F" />
            </View>
            <View className="flex-1 z-10">
              <View className="flex-row items-center mb-1.5">
                <Text className="text-gray-900 text-[17px] font-black mr-2">Live Agent</Text>
                <LiveStatusDot status={liveConnection.status} />
              </View>
              <Text className="text-gray-500 text-[13px] font-medium" numberOfLines={1}>
                {liveConnection.status === 'connected' ? 'Engage with customers in real-time' : 'Connect to start chatting'}
              </Text>
            </View>
            {liveUnread > 0 ? (
              <View className="bg-red-500 px-3 py-1.5 rounded-full mr-2 shadow-md shadow-red-500/30">
                <Text className="text-white text-[12px] font-black tracking-wider">{liveUnread > 99 ? '99+' : liveUnread}</Text>
              </View>
            ) : (
              <View className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center mr-1">
                 <Ionicons name="chevron-forward" size={18} color="#0B8A6F" />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Recent Activity */}
        <View className="mt-10">
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-gray-900 text-[18px] font-bold">Recent Activity</Text>
            <TouchableOpacity><Text className="text-gray-500 text-[13px] font-medium">Clear</Text></TouchableOpacity>
          </View>
          
          <View className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
            {ACTIVITY.map((a, i) => {
              const tint = STATUS_TINT(c, a.status);
              return (
                <TouchableOpacity
                  key={a.id}
                  activeOpacity={0.6}
                  className={`flex-row items-center p-4 ${i !== ACTIVITY.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <View className="w-12 h-12 rounded-2xl bg-gray-50 items-center justify-center mr-4">
                    <Ionicons name={a.icon} size={20} color="#374151" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 text-[14px] font-bold" numberOfLines={1}>{a.title}</Text>
                    <Text className="text-gray-500 text-[12px] mt-0.5" numberOfLines={1}>{a.sub}</Text>
                  </View>
                  <View className="items-end ml-2">
                    <Text className="text-gray-400 text-[10px] mb-1.5">{a.time}</Text>
                    <View className="px-2 py-0.5 rounded-lg" style={{ backgroundColor: tint.bg }}>
                      <Text className="text-[10px] font-bold" style={{ color: tint.fg }}>{a.status}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <BottomTabBar c={c} navigation={navigation} active="home" />
    </View>
  );
}

const ChannelTile = ({ index, icon, label, count, tint, onPress }) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 3000 }),
        withTiming(5, { duration: 3000 })
      ),
      -1,
      true
    );
  }, []);

  const watermarkStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: 1.2 }
    ]
  }));

  const animatedScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => (scale.value = withSpring(0.95));
  const onPressOut = () => (scale.value = withSpring(1));

  return (
    <Animated.View 
      entering={FadeInRight.delay(400 + (index * 100)).duration(600)}
      style={[{ width: '47.5%' }, animatedScaleStyle]} 
      className="mb-4"
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        className="rounded-3xl p-5 border border-gray-100 shadow-md relative overflow-hidden"
        style={{ backgroundColor: '#ffffff', shadowColor: tint, shadowOpacity: 0.1, shadowRadius: 15 }}
      >
        <LinearGradient
          colors={[tint + '08', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none"
        />

        {/* Huge Animated Watermark Icon */}
        <Animated.View style={watermarkStyle} className="absolute -right-6 -top-4 opacity-5 pointer-events-none">
          <Ionicons name={icon} size={100} color={tint} />
        </Animated.View>

        {/* Varied Animated Background Chart */}
        <MiniChart type={['line', 'wave', 'dots', 'blocks'][index % 4]} color={tint} />

        <View className="flex-row justify-between items-start mb-6 z-10">
          <View className="w-12 h-12 rounded-[18px] items-center justify-center border" style={{ backgroundColor: tint + '15', borderColor: tint + '30' }}>
            <Ionicons name={icon} size={22} color={tint} />
          </View>
          <View className="bg-white px-2.5 py-1 rounded-xl shadow-sm border border-gray-50">
            <Text className="text-gray-700 text-[11px] font-black">{count}</Text>
          </View>
        </View>
        
        <Text className="text-gray-900 text-[16px] font-black tracking-tight mb-1 z-10">{label}</Text>
        <View className="flex-row items-center z-10">
          <View className="w-2 h-2 rounded-full mr-2 shadow-sm" style={{ backgroundColor: tint, shadowColor: tint, shadowOpacity: 0.5, shadowRadius: 3 }} />
          <Text className="text-[12px] font-bold" style={{ color: tint }}>Active</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export function BottomTabBar({ c, navigation, active = 'home' }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [chatsPickerOpen, setChatsPickerOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const tab = (key, icon, label, onPress) => {
    const isActive = active === key;
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="items-center justify-center flex-1 py-2">
        <Ionicons name={isActive ? icon : icon + '-outline'} size={24} color={isActive ? '#0B8A6F' : '#9CA3AF'} />
        <Text className={`text-[10px] font-bold mt-1 ${isActive ? 'text-[#0B8A6F]' : 'text-gray-400'}`}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className="absolute bottom-0 left-0 right-0">
      {/* Visual background gradient for the bottom area */}
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
        style={{ height: 30 }}
      />
      
      <View 
        className="bg-white/95 border-t border-gray-100 flex-row items-center px-4 pt-2 shadow-2xl"
        style={{ paddingBottom: 0 }}
      >
        {tab('home', 'home', 'Home', () => navigation.navigate('Dashboard'))}
        {tab('chats', 'chatbubbles', 'Chats', () => setChatsPickerOpen((v) => !v))}

        <View className="flex-1 items-center -mt-10">
          <TouchableOpacity
            onPress={() => setPickerOpen((v) => !v)}
            activeOpacity={0.9}
            className="w-16 h-16 rounded-full bg-[#0B8A6F] items-center justify-center shadow-xl shadow-emerald-900/40 border-[4px] border-white"
            style={{ transform: [{ rotate: pickerOpen ? '45deg' : '0deg' }] }}
          >
            <Ionicons name={pickerOpen ? 'close' : 'rocket'} size={30} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className={`text-[10px] font-bold mt-2 ${pickerOpen ? 'text-[#0B8A6F]' : 'text-gray-400'}`}>
            Campaign
          </Text>
        </View>

        {tab('reports', 'stats-chart', 'Reports', () => navigation.navigate('Report'))}
        {tab('you', 'person', 'Profile', () => navigation.navigate('Profile'))}
      </View>

      <CampaignPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(ch) => {
          setPickerOpen(false);
          navigation.navigate(ch.route);
        }}
      />

      <ChatsPicker
        visible={chatsPickerOpen}
        onClose={() => setChatsPickerOpen(false)}
        onPick={(ch) => {
          setChatsPickerOpen(false);
          navigation.navigate(ch.route, ch.routeParams);
        }}
      />
    </View>
  );
}
