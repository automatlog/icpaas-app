// src/screens/ContactsScreen.js — Contact Manager (Add / Import / Groups)
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Platform,
  Alert, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBrand } from '../../theme';
import {
  selectGroups,
  addGroup,
  appendNumbersToGroup,
  removeGroup,
} from '../../store/slices/groupsSlice';
import { setContacts as setContactsAction, upsertContact } from '../../store/slices/contactsSlice';
import { BottomTabBar } from './DashboardScreen';
import toast from '../../services/toast';
import FormField from '../../components/FormField';
import ScreenHeader from '../../components/ScreenHeader';

const TABS = [
  { id: 'add',    label: 'Add Contact',    icon: 'person-add-outline' },
  { id: 'import', label: 'Import Contact', icon: 'cloud-upload-outline' },
  { id: 'groups', label: 'Groups',         icon: 'people-circle-outline' },
];

const cleanNumber = (s) => String(s || '').replace(/[^\d+]/g, '').trim();

const parseFileNumbers = (raw) =>
  String(raw || '')
    .split(/[\r\n,;\t]+/)
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter((s) => /^\+?\d{6,15}$/.test(s));

export default function ContactsScreen({ navigation, route }) {
  const c = useBrand();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const groups = useSelector(selectGroups);
  const contacts = useSelector((s) => s.contacts);

  const [tab, setTab] = useState(route?.params?.tab || 'add');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        title="Contacts"
        icon="people"
      />

      {/* Tab toggle */}
      <View className="flex-row mx-4 mt-3" style={{ gap: 4, borderBottomWidth: 1, borderBottomColor: c.rule }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              activeOpacity={0.85}
              className="flex-1 flex-row items-center justify-center pb-3 pt-2"
              style={{ borderBottomWidth: 2, borderBottomColor: active ? c.primary : 'transparent', gap: 6 }}
            >
              <Ionicons name={t.icon} size={13} color={active ? c.primary : c.textMuted} />
              <Text className="text-[12px]" style={{ color: active ? c.primary : c.textMuted, fontWeight: active ? '700' : '500' }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'add' ? (
        <AddContactTab c={c} onSave={(payload) => { dispatch(upsertContact(payload)); toast.success('Saved', `${payload.name} added.`); }} />
      ) : tab === 'import' ? (
        <ImportContactTab c={c} dispatch={dispatch} contacts={contacts} />
      ) : (
        <GroupsTab c={c} groups={groups} dispatch={dispatch} />
      )}

      <BottomTabBar c={c} navigation={navigation} active="campaign" />
    </KeyboardAvoidingView>
  );
}

// --- Add Contact tab ---
function AddContactTab({ c, onSave }) {
  const [name, setName]     = useState('');
  const [phone, setPhone]   = useState('');
  const [email, setEmail]   = useState('');
  const [company, setCompany] = useState('');
  const [tags, setTags]     = useState('');

  const save = () => {
    if (!name.trim()) { toast.warning('Required', 'Enter a contact name.'); return; }
    if (!phone.trim()) { toast.warning('Required', 'Enter a phone number.'); return; }
    onSave({
      id: `c_${Date.now()}`,
      name: name.trim(),
      phone: cleanNumber(phone),
      email: email.trim(),
      company: company.trim(),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    });
    setName(''); setPhone(''); setEmail(''); setCompany(''); setTags('');
  };

  const importDevice = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') { toast.warning('Permission needed', 'Allow contacts access.'); return; }
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
      const first = data.find((p) => p.phoneNumbers?.length);
      if (!first) { toast.info('No contacts', 'Device has no phone-bearing contacts.'); return; }
      setName(first.name || '');
      setPhone(cleanNumber(first.phoneNumbers[0].number || ''));
      toast.success('Imported', `${first.name} prefilled — review then save.`);
    } catch (e) {
      toast.error('Contacts error', e?.message || 'Unable to read contacts.');
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Card c={c}>
        <Title c={c} icon="person-circle" label="Contact details" />

        <FormField caps c={c} label="Full name" required icon="person-outline">
          <Input c={c} value={name} onChangeText={setName} placeholder="Rahul Mehra" />
        </FormField>

        <FormField caps c={c} label="Phone number" required icon="call-outline">
          <Input c={c} value={phone} onChangeText={setPhone} placeholder="919876543210" keyboardType="phone-pad" />
        </FormField>

        <FormField caps c={c} label="Email" icon="mail-outline">
          <Input c={c} value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
        </FormField>

        <FormField caps c={c} label="Company" icon="business-outline">
          <Input c={c} value={company} onChangeText={setCompany} placeholder="Acme Corp" />
        </FormField>

        <FormField caps c={c} label="Tags (comma separated)" icon="pricetags-outline">
          <Input c={c} value={tags} onChangeText={setTags} placeholder="lead, gold, mumbai" autoCapitalize="none" />
        </FormField>
      </Card>

      <View className="flex-row mt-2" style={{ gap: 8 }}>
        <TouchableOpacity
          onPress={importDevice}
          activeOpacity={0.85}
          className="flex-1 flex-row items-center justify-center rounded-[12px] py-3"
          style={{ borderWidth: 1, borderColor: c.primary, gap: 6 }}
        >
          <Ionicons name="people" size={14} color={c.primary} />
          <Text className="text-[13px] font-bold" style={{ color: c.primary }}>From device</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={save}
          activeOpacity={0.85}
          className="flex-1 flex-row items-center justify-center rounded-[12px] py-3"
          style={{ backgroundColor: c.primary, gap: 6 }}
        >
          <Ionicons name="save" size={14} color="#FFFFFF" />
          <Text className="text-[13px] font-bold text-white">Save</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// --- Import Contact tab ---
function ImportContactTab({ c, dispatch, contacts }) {
  const [picked, setPicked] = useState(null);
  const [parsed, setParsed] = useState([]);
  const [parsing, setParsing] = useState(false);

  const choose = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '*/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const f = res.assets?.[0];
      if (!f) return;
      setPicked(f);

      const ext = (f.name || '').split('.').pop().toLowerCase();
      if (ext === 'xls' || ext === 'xlsx') {
        toast.warning('Sheets not parsed', 'Re-export as .csv to import on mobile.');
        setParsed([]);
        return;
      }
      setParsing(true);
      const body = await FileSystem.readAsStringAsync(f.uri, { encoding: 'utf8' });
      setParsed(parseFileNumbers(body));
    } catch (e) {
      toast.error('Pick failed', e?.message || 'Unable to read file.');
    } finally {
      setParsing(false);
    }
  };

  const save = () => {
    if (parsed.length === 0) { toast.warning('Nothing to save', 'Pick a CSV first.'); return; }
    parsed.forEach((num, i) => {
      dispatch(upsertContact({
        id: `imp_${Date.now()}_${i}`,
        name: num,
        phone: num,
        createdAt: new Date().toISOString(),
        source: picked?.name || 'import',
      }));
    });
    toast.success('Imported', `${parsed.length} contact${parsed.length === 1 ? '' : 's'} added.`);
    setPicked(null);
    setParsed([]);
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Info banner */}
      <View
        className="flex-row rounded-[10px] p-3 mb-3"
        style={{ backgroundColor: '#DBEAFE', gap: 10, borderWidth: 1, borderColor: '#BFDBFE' }}
      >
        <Ionicons name="information-circle" size={16} color="#1D4ED8" style={{ marginTop: 1 }} />
        <Text className="flex-1 text-[12px] leading-[18px]" style={{ color: '#1E40AF' }}>
          Please, select only <Text className="font-bold">CSV, XLS, XLSX</Text> files for import.
        </Text>
      </View>

      <Title c={c} icon="cloud-upload" label="Upload File" />

      <View className="flex-row items-center mb-2" style={{ gap: 8 }}>
        <TouchableOpacity
          onPress={choose}
          activeOpacity={0.85}
          className="flex-row items-center rounded-[10px] px-3 py-2.5"
          style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.bgCard, gap: 6 }}
        >
          <Ionicons name="folder-open-outline" size={14} color={c.textMuted} />
          <Text className="text-[12px] font-semibold" style={{ color: c.text }}>Choose File</Text>
        </TouchableOpacity>
        <View
          className="flex-1 rounded-[10px] px-3 py-2.5"
          style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.bgCard }}
        >
          <Text className="text-[12px]" style={{ color: picked ? c.text : c.textMuted }} numberOfLines={1}>
            {picked?.name || 'No file chosen'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={save}
          activeOpacity={0.85}
          className="flex-row items-center rounded-[10px] px-3 py-2.5"
          style={{ borderWidth: 1, borderColor: c.primary, backgroundColor: c.bgCard, gap: 6 }}
        >
          <Ionicons name="save-outline" size={14} color={c.primary} />
          <Text className="text-[12px] font-bold" style={{ color: c.primary }}>Save</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-[11px] mb-3" style={{ color: c.danger }}>
        Note: Supports only <Text className="font-bold">.csv, .xls, .xlsx</Text> files. <Text style={{ color: c.primary }}>Sample File</Text>
      </Text>

      {/* Parsed preview */}
      {parsing ? (
        <View className="py-6 items-center"><ActivityIndicator color={c.primary} /></View>
      ) : parsed.length > 0 ? (
        <Card c={c}>
          <View className="flex-row items-center mb-2" style={{ gap: 6 }}>
            <Ionicons name="checkmark-circle" size={14} color={c.success} />
            <Text className="text-[13px] font-bold" style={{ color: c.text }}>
              {parsed.length} number{parsed.length === 1 ? '' : 's'} ready
            </Text>
          </View>
          <Text className="text-[11px]" style={{ color: c.textMuted }} numberOfLines={3}>
            {parsed.slice(0, 8).join(', ')}{parsed.length > 8 ? `  +${parsed.length - 8} more` : ''}
          </Text>
        </Card>
      ) : null}

      {/* Existing contacts list */}
      <Title c={c} icon="people" label={`Saved contacts (${contacts.length})`} />
      {contacts.length === 0 ? (
        <Text className="text-[12px] italic mt-1" style={{ color: c.textDim }}>No saved contacts yet.</Text>
      ) : (
        contacts.slice(0, 12).map((p) => (
          <View
            key={p.id || p.phone}
            className="flex-row items-center rounded-[12px] p-2.5 mb-2"
            style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border, gap: 10 }}
          >
            <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: c.primarySoft }}>
              <Ionicons name="person" size={14} color={c.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-[12px] font-bold" style={{ color: c.text }} numberOfLines={1}>{p.name || p.phone}</Text>
              <Text className="text-[11px]" style={{ color: c.textMuted }} numberOfLines={1}>{p.phone}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// --- Groups tab ---
function GroupsTab({ c, groups, dispatch }) {
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [numbersText, setNumbersText] = useState('');

  const create = () => {
    if (!groupName.trim()) { toast.warning('Required', 'Group name?'); return; }
    const numbers = numbersText
      .split(/[\n,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    dispatch(addGroup({ name: groupName, numbers }));
    toast.success('Group created', `${groupName} (${numbers.length} numbers)`);
    setGroupName('');
    setNumbersText('');
    setShowCreate(false);
  };

  const importDeviceToGroup = async (groupId) => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') { toast.warning('Permission needed', 'Allow contacts access.'); return; }
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
      const nums = data
        .flatMap((p) => (p.phoneNumbers || []).map((n) => cleanNumber(n.number || '')))
        .filter(Boolean);
      dispatch(appendNumbersToGroup({ id: groupId, numbers: nums }));
      toast.success('Added', `${nums.length} device contact${nums.length === 1 ? '' : 's'} added.`);
    } catch (e) {
      toast.error('Contacts error', e?.message || 'Unable to read contacts.');
    }
  };

  const remove = (g) =>
    Alert.alert('Delete group?', `${g.name} (${(g.numbers || []).length} numbers) will be removed.`, [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(removeGroup(g.id)) },
    ]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-[14px] font-bold" style={{ color: c.text }}>{groups.length} group{groups.length === 1 ? '' : 's'}</Text>
        <TouchableOpacity
          onPress={() => setShowCreate((v) => !v)}
          activeOpacity={0.85}
          className="flex-row items-center rounded-[10px] px-3 py-1.5"
          style={{ backgroundColor: showCreate ? c.bgInput : c.primary, gap: 4 }}
        >
          <Ionicons name={showCreate ? 'close' : 'add'} size={14} color={showCreate ? c.text : '#FFFFFF'} />
          <Text className="text-[12px] font-bold" style={{ color: showCreate ? c.text : '#FFFFFF' }}>
            {showCreate ? 'Cancel' : 'New Group'}
          </Text>
        </TouchableOpacity>
      </View>

      {showCreate ? (
        <Card c={c}>
          <Title c={c} icon="add-circle" label="Create group" />
          <FormField caps c={c} label="Group name" required>
            <Input c={c} value={groupName} onChangeText={setGroupName} placeholder="VIP customers" />
          </FormField>
          <FormField caps c={c} label="Numbers (comma or newline separated)">
            <Input
              c={c}
              value={numbersText}
              onChangeText={setNumbersText}
              placeholder="919876543210, 918765432109 …"
              multiline
              minHeight={90}
            />
          </FormField>
          <TouchableOpacity
            onPress={create}
            activeOpacity={0.85}
            className="flex-row items-center justify-center rounded-[10px] py-3 mt-1"
            style={{ backgroundColor: c.primary, gap: 6 }}
          >
            <Ionicons name="save" size={14} color="#FFFFFF" />
            <Text className="text-[13px] font-bold text-white">Create</Text>
          </TouchableOpacity>
        </Card>
      ) : null}

      {groups.length === 0 && !showCreate ? (
        <View className="items-center py-12" style={{ gap: 6 }}>
          <View className="w-20 h-20 rounded-2xl items-center justify-center" style={{ backgroundColor: c.bgInput }}>
            <Ionicons name="people-circle-outline" size={32} color={c.textDim} />
          </View>
          <Text className="text-[14px] font-bold" style={{ color: c.text }}>No groups yet</Text>
          <Text className="text-[12px] text-center" style={{ color: c.textMuted, maxWidth: 280 }}>
            Tap "New Group" to bundle numbers for one-tap campaign reuse.
          </Text>
        </View>
      ) : null}

      {groups.map((g) => (
        <View
          key={g.id}
          className="rounded-[14px] p-3 mb-2.5"
          style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}
        >
          <View className="flex-row items-center" style={{ gap: 10 }}>
            <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: c.primarySoft }}>
              <Ionicons name="people" size={16} color={c.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-[14px] font-bold" style={{ color: c.text }} numberOfLines={1}>{g.name}</Text>
              <Text className="text-[11px]" style={{ color: c.textMuted }}>{(g.numbers || []).length} number{(g.numbers || []).length === 1 ? '' : 's'}</Text>
            </View>
            <TouchableOpacity
              onPress={() => importDeviceToGroup(g.id)}
              activeOpacity={0.85}
              className="w-9 h-9 rounded-[10px] items-center justify-center"
              style={{ borderWidth: 1, borderColor: c.primary }}
            >
              <Ionicons name="person-add" size={13} color={c.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => remove(g)}
              activeOpacity={0.85}
              className="w-9 h-9 rounded-[10px] items-center justify-center"
              style={{ borderWidth: 1, borderColor: c.danger }}
            >
              <Ionicons name="trash-outline" size={13} color={c.danger} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// --- Reusable bits ---
function Card({ c, children }) {
  return (
    <View
      className="rounded-[14px] p-4 mb-2"
      style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}
    >
      {children}
    </View>
  );
}

function Title({ c, icon, label }) {
  return (
    <View className="flex-row items-center pb-2 mb-2" style={{ gap: 8, borderBottomWidth: 1, borderBottomColor: c.rule }}>
      <Ionicons name={icon} size={14} color={c.primary} />
      <Text className="text-[14px] font-bold" style={{ color: c.text }}>{label}</Text>
    </View>
  );
}


function Input({ c, value, onChangeText, placeholder, keyboardType, autoCapitalize, multiline, minHeight }) {
  return (
    <View
      className="rounded-[10px] px-3"
      style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.bg }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize || 'sentences'}
        autoCorrect={false}
        multiline={!!multiline}
        className="text-[13px]"
        style={[
          { paddingVertical: Platform.OS === 'ios' ? 12 : 10, color: c.text },
          multiline ? { minHeight: minHeight || 80, textAlignVertical: 'top' } : {},
          Platform.select({ web: { outlineStyle: 'none' } }),
        ]}
      />
    </View>
  );
}
