// src/screens/ContactsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Modal, TextInput, ScrollView, Alert,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, Radii, Shadows } from '../theme';
import { SearchBar, Pill, GradientButton, LoadingSpinner, EmptyState, SectionLabel } from '../components';
import { useDispatch, useSelector } from 'react-redux';
import { ContactsAPI } from '../services/api';
import {
  setContacts as setContactsAction,
  upsertContact as upsertContactAction,
} from '../store/slices/contactsSlice';

const MOCK_CONTACTS = [
  { id: '1', name: 'Arjun Mehta', phone: '+91 98765 43210', company: 'Acme Corp', emoji: '🧑‍💼', color: 'rgba(37,211,102,0.12)', channels: ['whatsapp', 'sms', 'rcs'], score: 85, tag: 'hot', lastActivity: '5 min ago' },
  { id: '2', name: 'Sneha Patel', phone: '+91 87654 32109', company: 'TechFlow Pvt', emoji: '👩‍💻', color: 'rgba(83,74,183,0.12)', channels: ['whatsapp', 'sms'], score: 62, tag: 'warm', lastActivity: '1h ago' },
  { id: '3', name: 'Vikram Singh', phone: '+91 76543 21098', company: 'EduPrime', emoji: '👨‍🎓', color: 'rgba(240,150,50,0.12)', channels: ['whatsapp'], score: 28, tag: 'new', lastActivity: '3h ago' },
  { id: '4', name: 'Rahul Sharma — CEO', phone: '+91 65432 10987', company: 'RahulCorp', emoji: '🏢', color: 'rgba(212,83,126,0.12)', channels: ['whatsapp', 'sms', 'rcs'], score: 91, tag: 'hot', lastActivity: '20 min ago' },
  { id: '5', name: 'Dr. Ananya Rao', phone: '+91 54321 09876', company: 'Apollo Clinics', emoji: '👩‍⚕️', color: 'rgba(59,130,246,0.12)', channels: ['sms'], score: 55, tag: 'warm', lastActivity: '2h ago' },
  { id: '6', name: 'Kiran Joshi', phone: '+91 43210 98765', company: 'FutureTech', emoji: '🎓', color: 'rgba(37,211,102,0.12)', channels: ['whatsapp', 'sms'], score: 15, tag: 'cold', lastActivity: '2 days ago' },
  { id: '7', name: 'Meera Nair', phone: '+91 32109 87654', company: 'HDFC Finance', emoji: '💼', color: 'rgba(83,74,183,0.12)', channels: ['whatsapp', 'rcs'], score: 74, tag: 'warm', lastActivity: '4h ago' },
  { id: '8', name: 'Aditya Kapoor', phone: '+91 21098 76543', company: 'Flipkart', emoji: '🛒', color: 'rgba(240,150,50,0.12)', channels: ['whatsapp'], score: 42, tag: 'new', lastActivity: '1 day ago' },
];

const TAG_FILTERS = ['All', 'Hot 🔥', 'Warm', 'New', 'Cold', 'WA Opt-in', 'DND'];
const CHANNEL_COLORS = { whatsapp: '#25D366', sms: '#534AB7', rcs: '#f59e0b', ivr: '#3b82f6' };

const tagPillType = (t) => ({ hot: 'success', warm: 'primary', new: 'warning', cold: 'danger' }[t] || 'primary');
const tagLabel = (t) => ({ hot: '🔥 Hot', warm: '● Warm', new: '★ New', cold: '❄ Cold' }[t] || t);

const createLocalContact = ({ id, name, phone, company, email, channels }) => ({
  id: id || `${Date.now()}`,
  name,
  phone,
  company: company || 'Independent',
  email: email || '',
  emoji: '👤',
  color: 'rgba(83,74,183,0.12)',
  channels,
  score: 35,
  tag: 'new',
  lastActivity: 'Just now',
});

// ── Score Bar ──────────────────────────────────────────────
const ScoreBar = ({ score }) => {
  const color = score >= 70 ? Colors.success : score >= 40 ? Colors.primary : Colors.danger;
  return (
    <View style={styles.scoreBarBg}>
      <View style={[styles.scoreBarFill, { width: `${score}%`, backgroundColor: color }]} />
    </View>
  );
};

// ── Contact Row ────────────────────────────────────────────
const ContactRow = ({ item, onPress }) => (
  <TouchableOpacity style={styles.contactRow} onPress={() => onPress(item)} activeOpacity={0.75}>
    <View style={[styles.contactAvatar, { backgroundColor: item.color }]}>
      <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.contactName}>{item.name}</Text>
      <Text style={styles.contactPhone}>{item.phone}</Text>
      <Text style={styles.contactCompany}>{item.company}</Text>
      <View style={styles.channelDots}>
        {item.channels.map(ch => (
          <View key={ch} style={[styles.chDot, { backgroundColor: CHANNEL_COLORS[ch] }]} />
        ))}
      </View>
    </View>
    <View style={{ alignItems: 'flex-end' }}>
      <Pill label={tagLabel(item.tag)} type={tagPillType(item.tag)} style={{ marginBottom: 6 }} />
      <ScoreBar score={item.score} />
      <Text style={styles.scoreText}>Score: {item.score}</Text>
    </View>
  </TouchableOpacity>
);

// ── Add Contact Modal ──────────────────────────────────────
const AddContactModal = ({ visible, onClose, onAdded }) => {
  const dispatch = useDispatch();
  const upsertContact = (c) => dispatch(upsertContactAction(c));
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState(['whatsapp']);

  const toggleChannel = (ch) => {
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
  };

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) { Alert.alert('Required', 'Name and phone are required'); return; }
    setSaving(true);
    try {
      await ContactsAPI.create({ name, phone, company, email, channel_optins: channels });
      upsertContact(createLocalContact({ name, phone, company, email, channels }));
      onAdded?.();
      onClose();
      setName(''); setPhone(''); setCompany(''); setEmail('');
    } catch {
      upsertContact(createLocalContact({ name, phone, company, email, channels }));
      Alert.alert('Saved (Demo)', `${name} added to contacts!`);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Contact</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Text style={{ fontSize: 18, color: Colors.textMuted }}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ padding: Spacing.base }}>
          {[
            { label: 'Full Name *', value: name, set: setName, placeholder: 'Arjun Mehta', key: 'name' },
            { label: 'Phone Number *', value: phone, set: setPhone, placeholder: '+91 98765 43210', key: 'phone' },
            { label: 'Company', value: company, set: setCompany, placeholder: 'Acme Corp', key: 'company' },
            { label: 'Email', value: email, set: setEmail, placeholder: 'arjun@acme.com', key: 'email' },
          ].map(f => (
            <View key={f.key}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <TextInput
                value={f.value} onChangeText={f.set}
                placeholder={f.placeholder} placeholderTextColor={Colors.textLight}
                style={styles.textInput}
                keyboardType={f.key === 'phone' ? 'phone-pad' : f.key === 'email' ? 'email-address' : 'default'}
              />
            </View>
          ))}

          <Text style={styles.fieldLabel}>Channel Opt-ins</Text>
          <View style={styles.channelOptins}>
            {[
              { id: 'whatsapp', icon: '💬', label: 'WhatsApp' },
              { id: 'sms', icon: '📩', label: 'SMS' },
              { id: 'rcs', icon: '✨', label: 'RCS' },
              { id: 'ivr', icon: '📞', label: 'IVR' },
            ].map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.optinChip, channels.includes(c.id) && styles.optinChipActive]}
                onPress={() => toggleChannel(c.id)}
                activeOpacity={0.75}
              >
                <Text style={styles.optinIcon}>{c.icon}</Text>
                <Text style={[styles.optinLabel, channels.includes(c.id) && { color: Colors.primary }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <GradientButton
            title={saving ? 'Saving…' : '💾 Save Contact'}
            onPress={handleSave}
            loading={saving}
            style={{ marginTop: Spacing.lg, marginBottom: Spacing.xxxl }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
};

// ── Main Contacts ──────────────────────────────────────────
export default function ContactsScreen({ navigation }) {
  const dispatch = useDispatch();
  const contacts = useSelector((s) => s.contacts);
  const setContacts = (list) => dispatch(setContactsAction(list));
  const [loading, setLoading] = useState(contacts.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await ContactsAPI.list({ search });
      setContacts(res?.data || MOCK_CONTACTS);
    } catch {
      setContacts(MOCK_CONTACTS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const filtered = contacts.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchFilter = filter === 'All'
      || (filter === 'Hot 🔥' && c.tag === 'hot')
      || (filter === 'Warm' && c.tag === 'warm')
      || (filter === 'New' && c.tag === 'new')
      || (filter === 'Cold' && c.tag === 'cold')
      || (filter === 'WA Opt-in' && c.channels.includes('whatsapp'));
    return matchSearch && matchFilter;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Contacts</Text>
          <Text style={styles.subtitle}>{contacts.length.toLocaleString()} total · 47 new today</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)} activeOpacity={0.85}>
          <Text style={{ fontSize: 16, color: Colors.white }}>＋</Text>
        </TouchableOpacity>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, phone, company…" />

      {/* Filters */}
      <View style={{ paddingVertical: 6 }}>
        <FlatList
          data={TAG_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={i => i}
          contentContainerStyle={{ paddingHorizontal: Spacing.base, gap: 6 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, filter === item && styles.filterChipActive]}
              onPress={() => setFilter(item)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipText, filter === item && styles.filterChipTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <ContactRow
            item={item}
            onPress={(c) => Alert.alert(c.name, `${c.phone}\n${c.company}`)}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchContacts(); }} tintColor={Colors.primary} />}
        ListEmptyComponent={<EmptyState emoji="👥" title="No contacts found" subtitle="Try adjusting your search or filters" />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <AddContactModal visible={showModal} onClose={() => setShowModal(false)} onAdded={fetchContacts} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: 56, paddingBottom: 12, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: FontSizes.xxl, fontFamily: Fonts.bold, color: Colors.textDark },
  subtitle: { fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: Radii.full, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.textMuted },
  filterChipTextActive: { color: Colors.white },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.base, paddingVertical: 12, backgroundColor: Colors.card },
  contactAvatar: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  contactName: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: Colors.textDark },
  contactPhone: { fontSize: 11, color: Colors.textMuted, fontFamily: Fonts.mono, marginTop: 1 },
  contactCompany: { fontSize: 11, color: Colors.textLight, marginTop: 1 },
  channelDots: { flexDirection: 'row', gap: 4, marginTop: 4 },
  chDot: { width: 7, height: 7, borderRadius: 4 },
  scoreBarBg: { width: 64, height: 4, backgroundColor: Colors.background, borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  scoreBarFill: { height: '100%', borderRadius: 2 },
  scoreText: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
  separator: { height: 1, backgroundColor: Colors.divider, marginLeft: 74 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.card },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSizes.xl, fontFamily: Fonts.bold, color: Colors.textDark },
  modalClose: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: Colors.textDark, marginBottom: 6, marginTop: 16 },
  textInput: { backgroundColor: Colors.background, borderRadius: Radii.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSizes.sm, color: Colors.textDark, borderWidth: 1, borderColor: Colors.border },
  channelOptins: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optinChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radii.full, backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border },
  optinChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optinIcon: { fontSize: 14 },
  optinLabel: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.textMuted },
});
