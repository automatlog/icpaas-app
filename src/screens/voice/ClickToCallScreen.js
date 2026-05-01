// src/screens/voice/ClickToCallScreen.js — Click-to-Call composer.
// Mirrors icpaas.in /Voice/OutBoundCampaign/Index (ClickToCall section)
// with two tabs:
//   1. Originate Call — single agent → single receiver
//   2. Bulk ClickToCall — campaign with CSV upload
//
// Both flows route through VoiceAPI.makeCall (icpaas.in /Voice/OgCall/MakeCall)
// since icpaas.in shares the OBD endpoint for click-to-call.
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useBrand } from '../../theme';
import { VoiceAPI } from '../../services/api';
import { pushNotification } from '../../store/slices/notificationsSlice';
import toast from '../../services/toast';
import dialog from '../../services/dialog';
import GradientButton from '../../components/GradientButton';
import FormField, { inputStyle } from '../../components/FormField';
import Select from '../../components/Select';
import ToggleRow from '../../components/ToggleRow';
import SectionHeader from '../../components/SectionHeader';
import Pill from '../../components/Pill';
import ScreenHeader from '../../components/ScreenHeader';
import usePullToRefresh from '../../hooks/usePullToRefresh';

const TABS = [
  { id: 'single', label: 'Originate Call', icon: 'megaphone-outline' },
  { id: 'bulk',   label: 'Bulk ClickToCall', icon: 'people-outline' },
];

// Placeholder agents + caller IDs. Wire to real endpoints when available.
const AGENTS = [
  { id: 'agent_aman',  label: 'Aman · 919876543210' },
  { id: 'agent_priya', label: 'Priya · 919876512345' },
];

const CALLER_IDS = [
  { id: '011-49000000', label: 'Primary OBD · 011-49000000' },
  { id: '022-71778899', label: 'Mumbai support · 022-71778899' },
];

const DELAYS = [
  { id: 0,  label: '0 seconds' },
  { id: 5,  label: '5 seconds' },
  { id: 10, label: '10 seconds' },
  { id: 30, label: '30 seconds' },
  { id: 60, label: '1 minute' },
];

const stamp = () => {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}, ${d.toLocaleTimeString()}`;
};

export default function ClickToCallScreen({ navigation }) {
  const c = useBrand();
  const dispatch = useDispatch();

  const [tab, setTab] = useState('single');

  // ── Single (Originate Call) ───────────────────────────────────────────
  const [singleAgent, setSingleAgent] = useState(null);
  const [showSingleAgent, setShowSingleAgent] = useState(false);
  const [singleCaller, setSingleCaller] = useState(CALLER_IDS[0].id);
  const [showSingleCaller, setShowSingleCaller] = useState(false);
  const [receiver, setReceiver] = useState('');
  const [singleRecord, setSingleRecord] = useState(false);
  const [singleSending, setSingleSending] = useState(false);

  // ── Bulk ──────────────────────────────────────────────────────────────
  const [name, setName] = useState(stamp());
  const [delay, setDelay] = useState(0);
  const [showDelay, setShowDelay] = useState(false);
  const [agentFirst, setAgentFirst] = useState(false);
  const [bulkRecord, setBulkRecord] = useState(false);
  const [bulkAgent, setBulkAgent] = useState('');
  const [bulkCaller, setBulkCaller] = useState('');
  const [bulkFile, setBulkFile] = useState(null);
  const [removeDup, setRemoveDup] = useState(true);
  const [schedule, setSchedule] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);

  const totalCount = 0; // wire to file-row counter once CSV parser is added

  // Pull-to-refresh: agents/caller-IDs are static placeholders today, but the
  // gesture stays in place so it lights up automatically once the gsauth
  // /Voice/CallerIds + agents endpoints are wired in.
  const { refreshing, onRefresh } = usePullToRefresh();

  // ── Single submit ─────────────────────────────────────────────────────
  const submitSingle = async () => {
    if (!singleAgent) { Alert.alert('Pick agent', 'Select an agent first.'); return; }
    if (!receiver.trim()) { Alert.alert('Receiver missing', 'Enter the receiver phone number.'); return; }

    const ok = await dialog.confirm({
      title: 'Originate call?',
      message: `${singleAgent.label} → ${receiver}`,
      confirmText: 'Originate',
    });
    if (!ok) return;

    setSingleSending(true);
    try {
      await VoiceAPI.makeCall({
        number: [receiver.trim()],
        callerId: singleCaller,
        agentId: singleAgent.id,
        isCallRecording: singleRecord ? 1 : 0,
      });
      dispatch(pushNotification({
        title: 'Click-to-Call placed',
        body: `${singleAgent.label} → ${receiver}`,
        type: 'success',
      }));
      toast.success('Call placed', `${singleAgent.label} → ${receiver}`);
      setReceiver('');
    } catch (e) {
      await dialog.error({ title: 'Call failed', message: e?.message || 'Unknown error' });
    } finally {
      setSingleSending(false);
    }
  };

  // ── Bulk submit ───────────────────────────────────────────────────────
  const submitBulk = async () => {
    if (!bulkAgent.trim()) { Alert.alert('Agent missing', 'Enter agent name(s).'); return; }
    if (!bulkCaller.trim()) { Alert.alert('Caller ID missing', 'Enter caller ID.'); return; }
    if (!bulkFile) { Alert.alert('File missing', 'Upload a CSV with receiver numbers.'); return; }

    const ok = await dialog.confirm({
      title: 'Originate bulk call?',
      message: `${name} · agent ${bulkAgent}`,
      confirmText: 'Originate Bulk',
    });
    if (!ok) return;

    setBulkSending(true);
    try {
      // The icpaas.in bulk endpoint expects the parsed numbers plus campaign
      // metadata. Until a CSV parser is wired in, we hand the raw file off.
      await VoiceAPI.makeCall({
        campaignName: name,
        agentName: bulkAgent,
        callerId: bulkCaller,
        nextCallDelay: delay,
        isAgentCallFirst: agentFirst ? 1 : 0,
        isCallRecording: bulkRecord ? 1 : 0,
        removeDuplicate: removeDup ? 1 : 0,
        schedTime: schedule ? '' : '',
        file: bulkFile,
      });
      dispatch(pushNotification({
        title: 'Bulk Click-to-Call queued',
        body: name,
        type: 'success',
      }));
      toast.success('Bulk call queued', name);
      navigation.goBack();
    } catch (e) {
      await dialog.error({ title: 'Bulk call failed', message: e?.message || 'Unknown error' });
    } finally {
      setBulkSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        icon="call-outline"
        title="Click to Call"
      />

      {/* Tabs */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingTop: 12,
          gap: 4,
          borderBottomWidth: 1,
          borderBottomColor: c.rule,
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              activeOpacity={0.85}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                gap: 6,
                borderBottomWidth: 2,
                borderBottomColor: active ? c.primary : 'transparent',
              }}
            >
              <Ionicons name={t.icon} size={14} color={active ? c.primary : c.textMuted} />
              <Text style={{ color: active ? c.primary : c.textMuted, fontWeight: active ? '700' : '500', fontSize: 13 }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 140, paddingHorizontal: 18 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} />}
      >
        {tab === 'single' ? (
          <SingleTab
            c={c}
            agents={AGENTS}
            agent={singleAgent} setAgent={setSingleAgent}
            showAgent={showSingleAgent} setShowAgent={setShowSingleAgent}
            callers={CALLER_IDS}
            caller={singleCaller} setCaller={setSingleCaller}
            showCaller={showSingleCaller} setShowCaller={setShowSingleCaller}
            receiver={receiver} setReceiver={setReceiver}
            record={singleRecord} setRecord={setSingleRecord}
            sending={singleSending} onSubmit={submitSingle}
          />
        ) : (
          <BulkTab
            c={c}
            name={name} setName={setName}
            delay={delay} setDelay={setDelay}
            showDelay={showDelay} setShowDelay={setShowDelay}
            agentFirst={agentFirst} setAgentFirst={setAgentFirst}
            record={bulkRecord} setRecord={setBulkRecord}
            agent={bulkAgent} setAgent={setBulkAgent}
            caller={bulkCaller} setCaller={setBulkCaller}
            file={bulkFile} setFile={setBulkFile}
            removeDup={removeDup} setRemoveDup={setRemoveDup}
            schedule={schedule} setSchedule={setSchedule}
            totalCount={totalCount}
            sending={bulkSending} onSubmit={submitBulk}
          />
        )}
      </ScrollView>
    </View>
  );
}

// ─── Single (Originate Call) tab ────────────────────────────────────────
const SingleTab = ({
  c, agents, agent, setAgent, showAgent, setShowAgent,
  callers, caller, setCaller, showCaller, setShowCaller,
  receiver, setReceiver, record, setRecord, sending, onSubmit,
}) => {
  const callerLabel = callers.find((cid) => cid.id === caller)?.label || 'Pick caller ID';

  return (
    <>
      <SectionHeader c={c} icon="megaphone-outline" title="Single ClickToCall" />

      <FormField c={c} label="Agent Name *" hint="Select the phone number assigned to the agent handling the call.">
        <Select
          c={c}
          placeholder="Select Agent"
          value={agent?.label || ''}
          open={showAgent}
          onToggle={() => setShowAgent((v) => !v)}
          options={agents}
          selectedId={agent?.id}
          onSelect={(opt) => { setAgent(opt); setShowAgent(false); }}
        />
      </FormField>

      <FormField c={c} label="Caller ID *" hint="Caller ID assigned to the user.">
        <Select
          c={c}
          placeholder="Select Caller ID"
          value={callerLabel}
          open={showCaller}
          onToggle={() => setShowCaller((v) => !v)}
          options={callers}
          selectedId={caller}
          onSelect={(opt) => { setCaller(opt.id); setShowCaller(false); }}
        />
      </FormField>

      <FormField c={c} label="Receiver Number *" hint="Enter the phone number of the person you want to call.">
        <TextInput
          value={receiver}
          onChangeText={setReceiver}
          placeholder="Enter Receiver Number"
          placeholderTextColor={c.textMuted}
          keyboardType="phone-pad"
          style={inputStyle(c)}
        />
      </FormField>

      <ToggleRow
        c={c}
        label="Is CallRecording"
        help="Enable this if the call should be recorded."
        value={record}
        onChange={setRecord}
      />

      <View style={{ marginTop: 18 }}>
        <GradientButton
          title="Originate Call"
          icon="call"
          loading={sending}
          onPress={onSubmit}
        />
      </View>
    </>
  );
};

// ─── Bulk tab ───────────────────────────────────────────────────────────
const BulkTab = ({
  c, name, setName, delay, setDelay, showDelay, setShowDelay,
  agentFirst, setAgentFirst, record, setRecord,
  agent, setAgent, caller, setCaller, file, setFile,
  removeDup, setRemoveDup, schedule, setSchedule,
  totalCount, sending, onSubmit,
}) => {
  const delayLabel = DELAYS.find((d) => d.id === delay)?.label || `${delay} seconds`;

  return (
    <>
      <SectionHeader c={c} icon="megaphone-outline" title="Campaign Details" />

      <FormField c={c} label="Campaign Name *" hint="The user-defined campaign name.">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Campaign name"
          placeholderTextColor={c.textMuted}
          style={inputStyle(c)}
        />
      </FormField>

      <FormField c={c} label="Next CallDelay *" hint="Delay time (in seconds) before the next call is initiated.">
        <Select
          c={c}
          placeholder="0 seconds"
          value={delayLabel}
          open={showDelay}
          onToggle={() => setShowDelay((v) => !v)}
          options={DELAYS}
          selectedId={delay}
          onSelect={(opt) => { setDelay(opt.id); setShowDelay(false); }}
        />
      </FormField>

      <ToggleRow
        c={c}
        label="Is AgentCallFirst"
        help="Connect the agent before dialing the receiver."
        value={agentFirst}
        onChange={setAgentFirst}
      />
      <ToggleRow
        c={c}
        label="Is CallRecording"
        help="Enable this if the call should be recorded."
        value={record}
        onChange={setRecord}
      />

      <View style={{ marginTop: 12 }}>
        <SectionHeader
          c={c}
          icon="people-outline"
          title="File Upload"
          right={
            <Pill bg="#DBEAFE" fg="#1D4ED8" label="Total Counts" value={totalCount} />
          }
        />
      </View>

      <FormField c={c} label="Agent Name *" hint="Select the phone numbers assigned to the agents handling the calls.">
        <TextInput
          value={agent}
          onChangeText={setAgent}
          placeholder="Enter Agent Name"
          placeholderTextColor={c.textMuted}
          style={inputStyle(c)}
        />
      </FormField>

      <FormField c={c} label="Caller ID *" hint="Caller ID assigned to the user.">
        <TextInput
          value={caller}
          onChangeText={setCaller}
          placeholder="Enter Caller ID"
          placeholderTextColor={c.textMuted}
          style={inputStyle(c)}
        />
      </FormField>

      <FormField c={c} label="File" hint="Upload a CSV or Excel file containing receiver phone numbers.">
        <TouchableOpacity
          onPress={() => Alert.alert('File picker', 'CSV / Excel picker not yet wired. Will be implemented when the bulk endpoint is finalised.')}
          activeOpacity={0.85}
          style={[
            inputStyle(c),
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 12,
            },
          ]}
        >
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 6,
              backgroundColor: c.bgInput,
            }}
          >
            <Text style={{ color: c.text, fontSize: 12, fontWeight: '700' }}>Choose File</Text>
          </View>
          <Text style={{ color: c.textMuted, fontSize: 12, flex: 1 }} numberOfLines={1}>
            {file?.name || 'No file chosen'}
          </Text>
        </TouchableOpacity>
      </FormField>

      <ToggleRow c={c} label="Remove Duplicates" value={removeDup} onChange={setRemoveDup} />
      <ToggleRow c={c} label="Schedule Now"     value={schedule}  onChange={setSchedule} />

      <View style={{ marginTop: 18 }}>
        <GradientButton
          title="Originate Bulk Call"
          icon="call"
          loading={sending}
          onPress={onSubmit}
        />
      </View>
    </>
  );
};
