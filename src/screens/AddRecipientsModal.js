// src/screens/AddRecipientsModal.js — Unified recipient picker
// Opened from Campaign Step 1 "Group" button. Four ways to add numbers:
//   1. Add manually (single number form)
//   2. Pick from device contacts (multi-select)
//   3. Upload CSV / XLS file
//   4. Pick from saved groups
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Platform, Alert, SectionList, Linking,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useBrand } from '../theme';
import { selectGroups, addGroup } from '../store/slices/groupsSlice';
import toast from '../services/toast';

const TABS = [
  { id: 'manual',   label: 'Manual',  icon: 'create-outline' },
  { id: 'contacts', label: 'Device',  icon: 'people-outline' },
  { id: 'file',     label: 'File',    icon: 'cloud-upload-outline' },
  { id: 'groups',   label: 'Groups',  icon: 'people-circle-outline' },
];

const cleanNumber = (s) => String(s || '').replace(/[^\d+]/g, '').trim();
const validNumber = (s) => /^\+?\d{6,15}$/.test(s);

const parseFileNumbers = (raw) =>
  String(raw || '')
    .split(/[\r\n,;\t]+/)
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter(validNumber);

export default function AddRecipientsModal({ visible, onClose, onAdd }) {
  const c = useBrand();
  const dispatch = useDispatch();
  const groups = useSelector(selectGroups);
  const [tab, setTab] = useState('manual');
  const [expanded, setExpanded] = useState(false);

  // Reset to first tab whenever modal reopens
  useEffect(() => {
    if (visible) {
      setTab('manual');
      setExpanded(false);
    }
  }, [visible]);

  const commit = (numbers, msg) => {
    const cleaned = Array.from(new Set(numbers.map(cleanNumber).filter(validNumber)));
    if (cleaned.length === 0) { toast.warning('Nothing valid', 'No usable phone numbers found.'); return; }
    onAdd(cleaned);
    toast.success('Added', msg || `${cleaned.length} recipient${cleaned.length === 1 ? '' : 's'} added.`);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: expanded ? 0.05 : 0.35 }} />
        <View
          style={{
            flex: 1,
            backgroundColor: c.bg,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingBottom: Platform.OS === 'ios' ? 24 : 16,
          }}
        >
          {/* Drag handle (tap to toggle expand / collapse) */}
          <TouchableOpacity
            onPress={() => setExpanded((v) => !v)}
            activeOpacity={0.7}
            className="items-center pt-2 pb-1"
            hitSlop={{ top: 6, right: 30, bottom: 6, left: 30 }}
          >
            <View className="w-10 h-1 rounded-full" style={{ backgroundColor: c.border }} />
            <Text className="text-[9px] mt-1 font-semibold tracking-widest uppercase" style={{ color: c.textDim }}>
              {expanded ? 'Tap handle to shrink' : 'Tap handle to expand'}
            </Text>
          </TouchableOpacity>
          <View className="flex-row items-center px-4 pt-1 pb-3" style={{ borderBottomWidth: 1, borderBottomColor: c.rule, gap: 10 }}>
            <View className="w-9 h-9 rounded-[10px] items-center justify-center" style={{ backgroundColor: c.primarySoft }}>
              <Ionicons name="people" size={16} color={c.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-[16px] font-bold" style={{ color: c.text }}>Add Recipients</Text>
              <Text className="text-[11px]" style={{ color: c.textMuted }}>Pick a method to fill the recipient list.</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color={c.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View className="flex-row mx-4 mt-3" style={{ gap: 4 }}>
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setTab(t.id)}
                  activeOpacity={0.85}
                  className="flex-1 flex-row items-center justify-center py-2.5 rounded-[10px]"
                  style={{ backgroundColor: active ? c.primary : c.bgInput, gap: 5 }}
                >
                  <Ionicons name={t.icon} size={12} color={active ? '#FFFFFF' : c.textMuted} />
                  <Text className="text-[11px]" style={{ color: active ? '#FFFFFF' : c.textMuted, fontWeight: active ? '700' : '500' }}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ flex: 1 }}>
            {tab === 'manual'   ? <ManualTab   c={c} commit={commit} dispatch={dispatch} /> : null}
            {tab === 'contacts' ? <DeviceTab   c={c} commit={commit} /> : null}
            {tab === 'file'     ? <FileTab     c={c} commit={commit} /> : null}
            {tab === 'groups'   ? <GroupsTab   c={c} commit={commit} groups={groups} /> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Manual ----------
function ManualTab({ c, commit, dispatch }) {
  const [name, setName]     = useState('');
  const [phone, setPhone]   = useState('');
  const [bulk, setBulk]     = useState('');
  const [groupName, setGroupName] = useState('');

  const addOne = () => {
    const num = cleanNumber(phone);
    if (!validNumber(num)) { toast.warning('Bad number', 'Use 6–15 digits.'); return; }
    commit([num], `${name || num} added.`);
  };

  const addBulk = () => {
    const nums = parseFileNumbers(bulk);
    if (nums.length === 0) { toast.warning('Nothing valid', 'Paste comma- or newline-separated numbers.'); return; }
    commit(nums, `${nums.length} numbers added.`);
  };

  const saveAsGroup = () => {
    const nums = phone ? [cleanNumber(phone)] : parseFileNumbers(bulk);
    if (!groupName.trim()) { toast.warning('Required', 'Group name?'); return; }
    if (nums.length === 0) { toast.warning('Nothing to save', 'Add a number or paste a list.'); return; }
    dispatch(addGroup({ name: groupName, numbers: nums }));
    toast.success('Group saved', `${groupName} (${nums.length} numbers)`);
    setGroupName('');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      {/* Single contact */}
      <Section c={c} icon="person-add" label="Add one contact" />
      <Field c={c} label="Name (optional)">
        <Input c={c} value={name} onChangeText={setName} placeholder="Rahul Mehra" />
      </Field>
      <Field c={c} label="Phone number">
        <Input c={c} value={phone} onChangeText={setPhone} placeholder="919876543210" keyboardType="phone-pad" />
      </Field>
      <PrimaryBtn c={c} icon="add" label="Add contact" onPress={addOne} />

      {/* Bulk paste */}
      <View style={{ height: 12 }} />
      <Section c={c} icon="documents" label="Paste many" />
      <Field c={c} label="Numbers (comma or newline)">
        <Input c={c} value={bulk} onChangeText={setBulk} placeholder="919876543210, 918765432109 …" multiline minHeight={90} />
      </Field>
      <View className="flex-row" style={{ gap: 8 }}>
        <SecondaryBtn c={c} icon="add-circle" label="Add all" onPress={addBulk} />
      </View>

      {/* Save as group */}
      <View style={{ height: 12 }} />
      <Section c={c} icon="people-circle" label="Save as group" />
      <Field c={c} label="Group name">
        <Input c={c} value={groupName} onChangeText={setGroupName} placeholder="VIP customers" />
      </Field>
      <SecondaryBtn c={c} icon="save" label="Save group" onPress={saveAsGroup} />
    </ScrollView>
  );
}

// ---------- Device contacts (multi-select, sectioned, virtualized) ----------
const AVATAR_COLORS = [
  { bg: '#D1FAE5', fg: '#047857' },
  { bg: '#DBEAFE', fg: '#1D4ED8' },
  { bg: '#FCE7F3', fg: '#BE185D' },
  { bg: '#FEF3C7', fg: '#B45309' },
  { bg: '#EDE9FE', fg: '#6D28D9' },
  { bg: '#FFE4E6', fg: '#BE123C' },
  { bg: '#CFFAFE', fg: '#0E7490' },
  { bg: '#FEFCE8', fg: '#854D0E' },
];

const initialsOf = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '#';

const colorForName = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

function DeviceTab({ c, commit }) {
  // people = [{ id, name, numbers: [{ id, number, label }] }]
  const [people, setPeople]   = useState([]);
  const [picked, setPicked]   = useState({}); // { numberId: true }
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [granted, setGranted] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status !== 'granted') { setGranted(false); setLoading(false); return; }
        setGranted(true);
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
          sort: Contacts.SortTypes.FirstName,
        });
        const grouped = data
          .map((p) => ({
            id: p.id,
            name: (p.name || '').trim(),
            numbers: (p.phoneNumbers || [])
              .map((n, i) => ({
                id: `${p.id}_${n.id || i}`,
                number: cleanNumber(n.number || ''),
                label: (n.label || '').toString().toLowerCase(),
              }))
              .filter((n) => validNumber(n.number)),
          }))
          .filter((p) => p.numbers.length > 0)
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setPeople(grouped);
      } catch (e) {
        toast.error('Contacts error', e?.message || 'Unable to read contacts.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filter + section by first letter
  const sections = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? people.filter((p) =>
          p.name.toLowerCase().includes(q) ||
          p.numbers.some((n) => n.number.includes(q)),
        )
      : people;

    const buckets = {};
    filtered.forEach((p) => {
      const ch = (p.name[0] || '#').toUpperCase();
      const key = /[A-Z]/.test(ch) ? ch : '#';
      (buckets[key] = buckets[key] || []).push(p);
    });
    return Object.keys(buckets)
      .sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
      .map((k) => ({ title: k, data: buckets[k] }));
  }, [people, search]);

  const totalNumbers = useMemo(
    () => people.reduce((acc, p) => acc + p.numbers.length, 0),
    [people],
  );
  const selectedCount = useMemo(
    () => Object.values(picked).filter(Boolean).length,
    [picked],
  );

  const togglePersonAll = (p) => {
    const allSelected = p.numbers.every((n) => picked[n.id]);
    setPicked((prev) => {
      const next = { ...prev };
      p.numbers.forEach((n) => {
        if (allSelected) delete next[n.id];
        else next[n.id] = true;
      });
      return next;
    });
  };

  const toggleNumber = (id) => setPicked((prev) => {
    const next = { ...prev };
    if (next[id]) delete next[id];
    else next[id] = true;
    return next;
  });

  const selectAllVisible = () => {
    const flatIds = sections.flatMap((s) => s.data.flatMap((p) => p.numbers.map((n) => n.id)));
    if (flatIds.length === 0) return;
    const allOn = flatIds.every((id) => picked[id]);
    setPicked((prev) => {
      const next = { ...prev };
      flatIds.forEach((id) => {
        if (allOn) delete next[id];
        else next[id] = true;
      });
      return next;
    });
  };

  const clearSelection = () => setPicked({});

  const submit = () => {
    const nums = people
      .flatMap((p) => p.numbers)
      .filter((n) => picked[n.id])
      .map((n) => n.number);
    if (nums.length === 0) { toast.warning('No selection', 'Tap a contact to pick.'); return; }
    commit(nums, `${nums.length} contact${nums.length === 1 ? '' : 's'} added.`);
  };

  if (loading) {
    return (
      <View className="py-12 items-center" style={{ gap: 8 }}>
        <ActivityIndicator color={c.primary} />
        <Text className="text-[12px]" style={{ color: c.textMuted }}>Reading contacts…</Text>
      </View>
    );
  }

  if (granted === false) {
    return (
      <View className="py-10 items-center px-6" style={{ gap: 10 }}>
        <View className="w-16 h-16 rounded-2xl items-center justify-center" style={{ backgroundColor: c.bgInput }}>
          <Ionicons name="lock-closed" size={26} color={c.textDim} />
        </View>
        <Text className="text-[14px] font-bold" style={{ color: c.text }}>Contacts permission denied</Text>
        <Text className="text-[12px] text-center" style={{ color: c.textMuted }}>
          Enable contacts access in system settings to import numbers.
        </Text>
        <TouchableOpacity
          onPress={() => Linking.openSettings()}
          activeOpacity={0.85}
          className="flex-row items-center rounded-[10px] px-4 py-2.5 mt-1"
          style={{ backgroundColor: c.primary, gap: 6 }}
        >
          <Ionicons name="settings" size={14} color="#FFFFFF" />
          <Text className="text-[12px] font-bold text-white">Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (people.length === 0) {
    return (
      <View className="py-10 items-center px-6" style={{ gap: 8 }}>
        <View className="w-16 h-16 rounded-2xl items-center justify-center" style={{ backgroundColor: c.bgInput }}>
          <Ionicons name="people-outline" size={26} color={c.textDim} />
        </View>
        <Text className="text-[14px] font-bold" style={{ color: c.text }}>No phone-bearing contacts</Text>
        <Text className="text-[12px] text-center" style={{ color: c.textMuted }}>
          Your device address book has no entries with phone numbers.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Search + summary */}
      <View className="px-4 pt-3" style={{ gap: 8 }}>
        <View className="flex-row items-center rounded-[12px] px-3" style={{ backgroundColor: c.bgInput, gap: 8 }}>
          <Ionicons name="search-outline" size={14} color={c.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={`Search ${people.length} contact${people.length === 1 ? '' : 's'}`}
            placeholderTextColor={c.textMuted}
            className="flex-1 text-[13px]"
            autoCorrect={false}
            autoCapitalize="none"
            style={[
              { paddingVertical: Platform.OS === 'ios' ? 10 : 8, color: c.text },
              Platform.select({ web: { outlineStyle: 'none' } }),
            ]}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons name="close-circle" size={14} color={c.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View className="flex-row items-center" style={{ gap: 8 }}>
          <View className="flex-row items-center rounded-full px-2.5 py-1" style={{ backgroundColor: c.primarySoft, gap: 6 }}>
            <Ionicons name="checkmark-circle" size={11} color={c.primaryDeep} />
            <Text className="text-[11px] font-bold" style={{ color: c.primaryDeep }}>
              {selectedCount} selected
            </Text>
          </View>
          <Text className="text-[11px]" style={{ color: c.textMuted }}>
            of {totalNumbers} number{totalNumbers === 1 ? '' : 's'}
          </Text>
          <View className="flex-1" />
          <TouchableOpacity onPress={selectAllVisible} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Text className="text-[11px] font-bold" style={{ color: c.primary }}>Select all</Text>
          </TouchableOpacity>
          {selectedCount > 0 ? (
            <TouchableOpacity onPress={clearSelection} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Text className="text-[11px] font-bold" style={{ color: c.danger }}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Sectioned virtualized list */}
      <SectionList
        sections={sections}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}
        ListEmptyComponent={
          <Text className="text-[12px] italic text-center py-6" style={{ color: c.textDim }}>
            {search ? `No matches for "${search}"` : 'No contacts'}
          </Text>
        }
        renderSectionHeader={({ section }) => (
          <View className="py-1 mb-1" style={{ backgroundColor: c.bg }}>
            <Text className="text-[11px] font-bold tracking-widest" style={{ color: c.textMuted }}>
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item: p }) => {
          const allSelected = p.numbers.every((n) => picked[n.id]);
          const partialSelected = !allSelected && p.numbers.some((n) => picked[n.id]);
          const av = colorForName(p.name);
          return (
            <View
              className="rounded-[12px] mb-1.5"
              style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: allSelected ? c.primary : c.border }}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => togglePersonAll(p)}
                className="flex-row items-center px-2.5 py-2"
                style={{ gap: 10 }}
              >
                <View
                  className="w-6 h-6 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: allSelected ? c.primary : 'transparent',
                    borderWidth: 1.5,
                    borderColor: allSelected ? c.primary : c.border,
                  }}
                >
                  {allSelected ? (
                    <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                  ) : partialSelected ? (
                    <View style={{ width: 8, height: 2, borderRadius: 1, backgroundColor: c.primary }} />
                  ) : null}
                </View>
                <View
                  className="w-9 h-9 rounded-full items-center justify-center"
                  style={{ backgroundColor: av.bg }}
                >
                  <Text className="text-[12px] font-extrabold" style={{ color: av.fg }}>{initialsOf(p.name)}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-semibold" style={{ color: c.text }} numberOfLines={1}>
                    {p.name || p.numbers[0].number}
                  </Text>
                  <Text className="text-[11px]" style={{ color: c.textMuted }} numberOfLines={1}>
                    {p.numbers.length === 1
                      ? p.numbers[0].number
                      : `${p.numbers[0].number}  ·  +${p.numbers.length - 1} more`}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Per-number rows shown when person has multiple numbers */}
              {p.numbers.length > 1 ? (
                <View className="pl-12 pr-2.5 pb-2" style={{ gap: 4 }}>
                  {p.numbers.map((n) => {
                    const sel = !!picked[n.id];
                    return (
                      <TouchableOpacity
                        key={n.id}
                        activeOpacity={0.85}
                        onPress={() => toggleNumber(n.id)}
                        className="flex-row items-center rounded-[8px] px-2 py-1.5"
                        style={{ backgroundColor: sel ? c.primarySoft : c.bgInput, gap: 8 }}
                      >
                        <View
                          className="w-4 h-4 rounded-full items-center justify-center"
                          style={{
                            backgroundColor: sel ? c.primary : 'transparent',
                            borderWidth: 1, borderColor: sel ? c.primary : c.border,
                          }}
                        >
                          {sel ? <Ionicons name="checkmark" size={9} color="#FFFFFF" /> : null}
                        </View>
                        {n.label ? (
                          <Text className="text-[10px] uppercase tracking-widest" style={{ color: c.textMuted }}>
                            {n.label}
                          </Text>
                        ) : null}
                        <Text className="text-[12px] font-mono flex-1" style={{ color: c.text }} numberOfLines={1}>
                          {n.number}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        }}
      />

      <View className="px-4 pt-2 pb-1" style={{ borderTopWidth: 1, borderTopColor: c.rule }}>
        <TouchableOpacity
          onPress={submit}
          activeOpacity={0.85}
          disabled={selectedCount === 0}
          className="flex-row items-center justify-center rounded-[12px] py-3"
          style={{
            backgroundColor: selectedCount === 0 ? c.bgInput : c.primary,
            gap: 6,
            opacity: selectedCount === 0 ? 0.6 : 1,
          }}
        >
          <Ionicons name="checkmark-circle" size={14} color={selectedCount === 0 ? c.textMuted : '#FFFFFF'} />
          <Text
            className="text-[13px] font-bold"
            style={{ color: selectedCount === 0 ? c.textMuted : '#FFFFFF' }}
          >
            {selectedCount === 0 ? 'Pick contacts to continue' : `Add ${selectedCount} selected`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------- File ----------
function FileTab({ c, commit }) {
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
        toast.warning('Sheets not parsed', 'Re-export as .csv on your computer to import on mobile.');
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

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      <View
        className="flex-row rounded-[10px] p-3 mb-3"
        style={{ backgroundColor: '#DBEAFE', gap: 10, borderWidth: 1, borderColor: '#BFDBFE' }}
      >
        <Ionicons name="information-circle" size={16} color="#1D4ED8" style={{ marginTop: 1 }} />
        <Text className="flex-1 text-[12px] leading-[18px]" style={{ color: '#1E40AF' }}>
          Please, select only <Text className="font-bold">CSV, XLS, XLSX</Text> files for import.
        </Text>
      </View>

      <Section c={c} icon="cloud-upload" label="Upload File" />

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
      </View>

      <Text className="text-[11px] mb-3" style={{ color: c.danger }}>
        Note: Supports only <Text className="font-bold">.csv, .xls, .xlsx</Text> files. <Text style={{ color: c.primary }}>Sample File</Text>
      </Text>

      {parsing ? (
        <View className="py-6 items-center"><ActivityIndicator color={c.primary} /></View>
      ) : parsed.length > 0 ? (
        <>
          <View
            className="rounded-[12px] p-3 mb-3"
            style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}
          >
            <View className="flex-row items-center mb-1.5" style={{ gap: 6 }}>
              <Ionicons name="checkmark-circle" size={14} color={c.success} />
              <Text className="text-[13px] font-bold" style={{ color: c.text }}>
                {parsed.length} number{parsed.length === 1 ? '' : 's'} ready
              </Text>
            </View>
            <Text className="text-[11px]" style={{ color: c.textMuted }} numberOfLines={3}>
              {parsed.slice(0, 8).join(', ')}{parsed.length > 8 ? `  +${parsed.length - 8} more` : ''}
            </Text>
          </View>
          <PrimaryBtn c={c} icon="checkmark-circle" label={`Add ${parsed.length} numbers`} onPress={() => commit(parsed, `${parsed.length} numbers added.`)} />
        </>
      ) : null}
    </ScrollView>
  );
}

// ---------- Saved groups ----------
function GroupsTab({ c, commit, groups }) {
  if (groups.length === 0) {
    return (
      <View className="py-10 items-center px-6" style={{ gap: 6 }}>
        <View className="w-16 h-16 rounded-2xl items-center justify-center" style={{ backgroundColor: c.bgInput }}>
          <Ionicons name="people-circle-outline" size={28} color={c.textDim} />
        </View>
        <Text className="text-[14px] font-bold" style={{ color: c.text }}>No saved groups</Text>
        <Text className="text-[12px] text-center" style={{ color: c.textMuted }}>
          Use the Manual tab and "Save as group" to create one.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      {groups.map((g) => (
        <TouchableOpacity
          key={g.id}
          activeOpacity={0.85}
          onPress={() => commit(g.numbers || [], `${g.name} (${(g.numbers || []).length}) added.`)}
          className="flex-row items-center rounded-[12px] p-3 mb-2"
          style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border, gap: 10 }}
        >
          <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: c.primarySoft }}>
            <Ionicons name="people" size={16} color={c.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-[13px] font-bold" style={{ color: c.text }} numberOfLines={1}>{g.name}</Text>
            <Text className="text-[11px]" style={{ color: c.textMuted }}>{(g.numbers || []).length} number{(g.numbers || []).length === 1 ? '' : 's'}</Text>
          </View>
          <Ionicons name="add-circle" size={18} color={c.primary} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ---------- Reusable bits ----------
function Section({ c, icon, label }) {
  return (
    <View className="flex-row items-center mb-2" style={{ gap: 6 }}>
      <Ionicons name={icon} size={13} color={c.primary} />
      <Text className="text-[13px] font-bold" style={{ color: c.text }}>{label}</Text>
    </View>
  );
}

function Field({ c, label, children }) {
  return (
    <View className="mb-2.5">
      <Text className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: c.textMuted }}>{label}</Text>
      {children}
    </View>
  );
}

function Input({ c, value, onChangeText, placeholder, keyboardType, multiline, minHeight }) {
  return (
    <View className="rounded-[10px] px-3" style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.bg }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        multiline={!!multiline}
        className="text-[13px]"
        style={[
          { paddingVertical: Platform.OS === 'ios' ? 11 : 9, color: c.text },
          multiline ? { minHeight: minHeight || 80, textAlignVertical: 'top' } : {},
          Platform.select({ web: { outlineStyle: 'none' } }),
        ]}
      />
    </View>
  );
}

function PrimaryBtn({ c, icon, label, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="flex-row items-center justify-center rounded-[10px] py-3"
      style={{ backgroundColor: c.primary, gap: 6 }}
    >
      <Ionicons name={icon} size={14} color="#FFFFFF" />
      <Text className="text-[13px] font-bold text-white">{label}</Text>
    </TouchableOpacity>
  );
}

function SecondaryBtn({ c, icon, label, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="flex-1 flex-row items-center justify-center rounded-[10px] py-3"
      style={{ borderWidth: 1, borderColor: c.primary, gap: 6 }}
    >
      <Ionicons name={icon} size={14} color={c.primary} />
      <Text className="text-[13px] font-bold" style={{ color: c.primary }}>{label}</Text>
    </TouchableOpacity>
  );
}
