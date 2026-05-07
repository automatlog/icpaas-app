// src/screens/whatsapp/UserProfileScreen.js
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function UserProfileScreen({ route, navigation }) {
  const conversation = route?.params?.conversation || {};
  const phone = conversation.id || conversation.phone || '919654297000';
  const name = conversation.name || phone;

  return (
    <ScrollView className="flex-1 bg-[#F0F2F5]">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3 flex-row items-center" style={{ paddingTop: Platform.OS === 'ios' ? 56 : 16 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="close" size={24} color="#54656F" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-800">Contact info</Text>
      </View>

      {/* Profile Info */}
      <View className="bg-white items-center py-6 border-b border-gray-200 mb-2 shadow-sm">
        <View className="w-32 h-32 rounded-full bg-[#00A884] items-center justify-center mb-4">
          <Text className="text-5xl text-white font-bold">{name.substring(0, 1).toUpperCase()}</Text>
        </View>
        <Text className="text-2xl font-semibold text-gray-800">{name}</Text>
        <Text className="text-base text-gray-500 mt-1">{phone}</Text>

        <View className="flex-row mt-6 space-x-8">
          <TouchableOpacity className="items-center">
            <View className="w-12 h-12 rounded-full border border-gray-200 items-center justify-center mb-1">
              <Ionicons name="call" size={20} color="#00A884" />
            </View>
            <Text className="text-xs text-gray-600 font-medium">Audio</Text>
          </TouchableOpacity>
          <TouchableOpacity className="items-center">
            <View className="w-12 h-12 rounded-full border border-gray-200 items-center justify-center mb-1">
              <Ionicons name="search" size={20} color="#00A884" />
            </View>
            <Text className="text-xs text-gray-600 font-medium">Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Options */}
      <View className="bg-white border-y border-gray-200 mb-2">
        <TouchableOpacity className="px-5 py-4 border-b border-gray-100 flex-row justify-between items-center">
          <View>
            <Text className="text-base text-gray-800">Mute notifications</Text>
          </View>
          <Switch value={false} onValueChange={() => {}} trackColor={{ false: "#767577", true: "#00A884" }} />
        </TouchableOpacity>
        <TouchableOpacity className="px-5 py-4 border-b border-gray-100">
          <Text className="text-base text-gray-800">Custom notifications</Text>
        </TouchableOpacity>
        <TouchableOpacity className="px-5 py-4">
          <Text className="text-base text-gray-800">Media visibility</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <View className="bg-white border-y border-gray-200 mb-2 px-5 py-4">
        <Text className="text-sm text-gray-500 mb-1">About and phone number</Text>
        <Text className="text-base text-gray-800 mb-4">Available</Text>
        <Text className="text-base text-gray-800">{phone}</Text>
      </View>

      {/* Actions */}
      <View className="bg-white border-y border-gray-200 mb-6">
        <TouchableOpacity className="px-5 py-4 border-b border-gray-100 flex-row items-center space-x-4">
          <Ionicons name="ban" size={24} color="#EF4444" />
          <Text className="text-base text-[#EF4444]">Block {name}</Text>
        </TouchableOpacity>
        <TouchableOpacity className="px-5 py-4 flex-row items-center space-x-4">
          <Ionicons name="warning" size={24} color="#EF4444" />
          <Text className="text-base text-[#EF4444]">Report {name}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
