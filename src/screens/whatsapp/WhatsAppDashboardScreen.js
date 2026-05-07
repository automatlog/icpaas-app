import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, RefreshControl,
  Dimensions, Modal, Pressable,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeInDown, 
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import Svg, { Path, Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useBrand } from '../../theme';
import { WhatsAppAPI, AuthAPI } from '../../services/api';
import ScreenHeader from '../../components/ScreenHeader';
import { BottomTabBar } from '../shared/DashboardScreen';

const { width } = Dimensions.get('window');

const StatCard = ({ title, value, icon, color, delay = 0 }) => {
  return (
    <Animated.View 
      entering={FadeInDown.delay(delay).duration(600)}
      className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm mb-4"
      style={{ width: (width - 50) / 2 }}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="p-2 rounded-xl" style={{ backgroundColor: color + '15' }}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
      </View>
      <Text className="text-gray-900 text-[22px] font-black">{Number(value).toLocaleString()}</Text>
      <Text className="text-gray-500 text-[12px] font-bold uppercase tracking-wider">{title}</Text>
    </Animated.View>
  );
};

const TemplateStatRow = ({ item, index }) => {
  const progress = (item.delivered / item.total) * 100;
  return (
    <Animated.View 
      entering={FadeInRight.delay(400 + (index * 100)).duration(600)}
      className="mb-4 bg-gray-50 p-4 rounded-2xl border border-gray-100"
    >
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-gray-900 font-bold capitalize">{item.templateName}</Text>
        <Text className="text-gray-500 text-[12px]">{Number(item.total).toLocaleString()} messages</Text>
      </View>
      <View className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <View 
          className="h-full bg-emerald-500 rounded-full" 
          style={{ width: `${progress}%` }} 
        />
      </View>
      <View className="flex-row justify-between mt-2">
        <Text className="text-[11px] text-gray-500">Delivered: {Number(item.delivered).toLocaleString()}</Text>
        <Text className="text-[11px] font-bold text-emerald-600">{progress.toFixed(1)}% Rate</Text>
      </View>
    </Animated.View>
  );
};

const SimpleTrendChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  const maxVal = Math.max(...data.map(d => d.delivered));
  const chartHeight = 120;
  const chartWidth = width - 80;
  const step = chartWidth / (data.length - 1);
  
  const points = data.map((d, i) => {
    const x = i * step;
    const y = chartHeight - (d.delivered / maxVal) * chartHeight;
    return `${x},${y}`;
  }).join(' L ');

  return (
    <View className="mt-4 items-center">
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <SvgLinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#10B981" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#10B981" stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>
        <Path
          d={`M 0,${chartHeight} L ${points} L ${chartWidth},${chartHeight} Z`}
          fill="url(#grad)"
        />
        <Path
          d={`M ${points}`}
          fill="none"
          stroke="#10B981"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <View className="flex-row justify-between w-full px-2 mt-2">
        {data.map((d, i) => (
          <Text key={i} className="text-[9px] text-gray-400 font-bold">
            {d.date.split('-')[2]}/{d.date.split('-')[1]}
          </Text>
        ))}
      </View>
    </View>
  );
};

export default function WhatsAppDashboardScreen({ navigation }) {
  const c = useBrand();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [range, setRange] = useState('last7days'); // today, yesterday, last7days
  const [showRangePicker, setShowRangePicker] = useState(false);

  const fetchData = useCallback(async (currentRange = range) => {
    try {
      setError(null);
      
      const token = await AuthAPI.getToken();
      if (!token) {
        setError('You are not logged in. Please sign in to view live data.');
        setLoading(false);
        return;
      }

      console.log('Fetching WhatsApp dashboard data for:', currentRange);
      const res = await WhatsAppAPI.getDashboardData({ range: currentRange });
      console.log('Dashboard Response:', res);
      
      // Handle various response structures
      const dashboardData = res?.data || res;
      
      if (dashboardData && (dashboardData.totals || dashboardData.success)) {
        // Ensure trendStats is an array
        if (!Array.isArray(dashboardData.trendStats)) {
          dashboardData.trendStats = [];
        }
        // Ensure templateStats is an array
        if (!Array.isArray(dashboardData.templateStats)) {
          dashboardData.templateStats = [];
        }
        setData(dashboardData);
      } else {
        setError('Unable to load dashboard data. Please try again later.');
        console.warn('Invalid dashboard data structure:', res);
      }
    } catch (error) {
      console.error('Failed to fetch WhatsApp dashboard data:', error);
      setError(error?.message || 'Connection failed. Please check your network.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRangeChange = (newRange) => {
    setRange(newRange);
    setShowRangePicker(false);
    setLoading(true);
    fetchData(newRange);
  };

  const getRangeLabel = () => {
    if (range === 'today') return 'Today';
    if (range === 'yesterday') return 'Yesterday';
    return 'Last 7 Days';
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: c.bg }}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text className="mt-4 text-gray-500 font-medium">Loading analytics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1" style={{ backgroundColor: c.bg }}>
        <ScreenHeader c={c} onBack={() => navigation.goBack()} title="WhatsApp Dashboard" />
        <View className="flex-1 justify-center items-center px-10">
          <View className="w-20 h-20 bg-red-50 rounded-full items-center justify-center mb-6">
            <Ionicons name="cloud-offline-outline" size={40} color="#EF4444" />
          </View>
          <Text className="text-gray-900 text-xl font-bold text-center mb-2">Oops! Something went wrong</Text>
          <Text className="text-gray-500 text-center mb-8">{error}</Text>
          <TouchableOpacity 
            onPress={() => { setLoading(true); fetchData(); }}
            className="bg-emerald-500 px-8 py-3 rounded-2xl shadow-lg shadow-emerald-500/30"
          >
            <Text className="text-white font-bold">Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const totals = data?.totals || {};

  return (
    <View className="flex-1" style={{ backgroundColor: c.bg }}>
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        icon="logo-whatsapp"
        title="WhatsApp Dashboard"
        subtitle={{ text: 'Real-time Analytics', dotColor: '#10B981' }}
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#10B981" />
        }
      >
        <Animated.View entering={FadeInDown.duration(800)}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-gray-900 text-[18px] font-bold">Total Performance</Text>
            <TouchableOpacity 
              onPress={() => setShowRangePicker(true)}
              className="flex-row items-center bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100"
            >
              <Ionicons name="calendar-outline" size={16} color="#10B981" />
              <Text className="text-gray-900 text-[12px] font-bold ml-2 mr-1">{getRangeLabel()}</Text>
              <Ionicons name="chevron-down" size={14} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap justify-between">
            <StatCard title="Total" value={totals.total} icon="mail" color="#6366F1" delay={100} />
            <StatCard title="Delivered" value={totals.delivered} icon="checkmark-done" color="#10B981" delay={200} />
            <StatCard title="Read" value={totals.read} icon="eye" color="#3B82F6" delay={300} />
            <StatCard title="Received" value={totals.received} icon="download" color="#F59E0B" delay={400} />
          </View>
        </Animated.View>

        {/* Trend Chart */}
        <Animated.View entering={FadeInDown.delay(500).duration(800)} className="mt-6 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <Text className="text-gray-900 text-[16px] font-bold">Delivery Trend (Last 7 Days)</Text>
          <SimpleTrendChart data={data?.trendStats} />
        </Animated.View>

        {/* Template Stats */}
        <Animated.View entering={FadeInDown.delay(700).duration(800)} className="mt-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-gray-900 text-[18px] font-bold">Categories Breakdown</Text>
            <Text className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">{getRangeLabel()}</Text>
          </View>
          {data?.templateStats?.map((item, i) => (
            <TemplateStatRow key={i} item={item} index={i} />
          ))}
        </Animated.View>

        {/* Quick Tools */}
        <Text className="text-gray-900 text-[18px] font-bold mt-8 mb-4">Quick Tools</Text>
        <View className="flex-row flex-wrap justify-between">
          <ToolCard icon="chatbubbles" label="Live Chat" color="#10B981" onPress={() => navigation.navigate('LiveAgentInbox')} />
          <ToolCard icon="megaphone" label="Campaign" color="#8B5CF6" onPress={() => navigation.navigate('WhatsAppCampaignStep1')} />
          <ToolCard icon="document-text" label="Templates" color="#3B82F6" onPress={() => navigation.navigate('WhatsAppTemplates')} />
          <ToolCard icon="settings" label="Settings" color="#6B7280" onPress={() => navigation.navigate('WabaChannels')} />
        </View>
      </ScrollView>

      <BottomTabBar c={c} navigation={navigation} active="home" />

      {/* Range Picker Modal */}
      <Modal
        visible={showRangePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRangePicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowRangePicker(false)} />
          <Animated.View 
            entering={FadeInDown.duration(400)}
            className="bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl"
          >
            <View className="w-12 h-1.5 bg-gray-200 rounded-full self-center mb-6" />
            <Text className="text-gray-900 text-[24px] font-black mb-6">Select Date Range</Text>
            
            <RangeOption 
              label="Today" 
              active={range === 'today'} 
              onPress={() => handleRangeChange('today')} 
            />
            <RangeOption 
              label="Yesterday" 
              active={range === 'yesterday'} 
              onPress={() => handleRangeChange('yesterday')} 
            />
            <RangeOption 
              label="Last 7 Days" 
              active={range === 'last7days'} 
              onPress={() => handleRangeChange('last7days')} 
            />

            <TouchableOpacity 
              onPress={() => setShowRangePicker(false)}
              className="mt-6 p-5 rounded-3xl bg-gray-50 items-center"
            >
              <Text className="text-gray-900 font-bold">Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const RangeOption = ({ label, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    className={`flex-row items-center justify-between p-5 rounded-3xl mb-3 ${active ? 'bg-emerald-50 border border-emerald-100' : 'bg-white border border-gray-100'}`}
  >
    <Text className={`text-[17px] font-bold ${active ? 'text-emerald-600' : 'text-gray-900'}`}>{label}</Text>
    {active && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
  </TouchableOpacity>
);

const ToolCard = ({ icon, label, color, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm items-center mb-4"
    style={{ width: (width - 60) / 4 }}
  >
    <View className="p-2 rounded-xl mb-2" style={{ backgroundColor: color + '15' }}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text className="text-gray-900 text-[10px] font-bold text-center" numberOfLines={1}>{label}</Text>
  </TouchableOpacity>
);
