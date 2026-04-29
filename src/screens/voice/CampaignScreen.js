// src/screens/voice/CampaignScreen.js — single-page Voice campaign composer.
// Mirrors UI image/Voice Campaign Screen.png. Picks voice plan, caller ID,
// optional OBD flow / DTMF mode, sound file, and recipient list, then
// dispatches via VoiceAPI.makeCall (icpaas.in /Voice/OgCall/MakeCall).
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useBrand } from '../../theme';
import { VoiceAPI } from '../../services/api';
import { pushNotification } from '../../store/slices/notificationsSlice';
import toast from '../../services/toast';
import dialog from '../../services/dialog';
import GradientButton from '../../components/GradientButton';
import FormField, { inputStyle } from '../../components/FormField';
import Dropdown from '../../components/Dropdown';
import ToggleRow from '../../components/ToggleRow';
import SectionHeader from '../../components/SectionHeader';
import Pill from '../../components/Pill';

const VOICE_PLANS = [
  { id: '15s', label: '15-second pulse · ₹0.18/pulse' },
  { id: '30s', label: '30-second pulse · ₹0.32/pulse' },
];

const CALLER_IDS = [
  { id: '011-49000000', label: 'Primary OBD · 011-49000000' },
  { id: '022-71778899', label: 'Mumbai support · 022-71778899' },
];

const stamp = () => {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}, ${d.toLocaleTimeString()}`;
};

export default function CampaignScreen({ navigation }) {
  const c = useBrand();
  const dispatch = useDispatch();

  const [name, setName] = useState(stamp());

  const [plan, setPlan] = useState('15s');
  const [showPlan, setShowPlan] = useState(false);

  const [callerId, setCallerId] = useState(CALLER_IDS[0].id);
  const [showCaller, setShowCaller] = useState(false);

  const [useObdFlow, setUseObdFlow] = useState(false);
  const [isDtmfFile, setIsDtmfFile] = useState(false);

  // Pull uploaded media files from Redux (populated by MediaLibraryScreen).
  const mediaFiles = useSelector((s) => s.media?.list || []);
  const [soundFile, setSoundFile] = useState(null);
  const [showSound, setShowSound] = useState(false);

  const [numbers, setNumbers] = useState('');
  const [group, setGroup] = useState(null);
  const [showGroup, setShowGroup] = useState(false);
  const groups = useSelector((s) => s.groups?.list || []);

  const [groupFrom, setGroupFrom] = useState('');
  const [groupTo, setGroupTo] = useState('');

  const [removeDup, setRemoveDup] = useState(true);
  const [schedule, setSchedule] = useState(false);

  const [calling, setCalling] = useState(false);

  const numberCount = useMemo(() => (
    numbers.split(/[,\n\s]+/).map((n) => n.trim()).filter(Boolean).length
  ), [numbers]);

  const submit = async ({ test = false } = {}) => {
    if (!callerId) { Alert.alert('Pick a caller ID', 'Select the caller ID for this campaign.'); return; }
    if (!soundFile && !useObdFlow) {
      Alert.alert('Pick a sound file', 'Choose a sound file or enable OBD Flow.');
      return;
    }
    const list = numbers.split(/[,\n\s]+/).map((n) => n.trim()).filter(Boolean);
    const recipients = test ? list.slice(0, 1) : list;
    if (recipients.length === 0) {
      Alert.alert('No numbers', test ? 'Add at least one number to test.' : 'Add at least one recipient number.');
      return;
    }

    const ok = await dialog.confirm({
      title: test ? 'Place test call?' : 'Originate campaign?',
      message: test
        ? `One test call to ${recipients[0]}.`
        : `${name} → ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}`,
      confirmText: test ? 'Test now' : 'Originate',
    });
    if (!ok) return;

    setCalling(true);
    try {
      const result = await VoiceAPI.makeCall({
        number: recipients,
        callerId,
        mediaFileId: useObdFlow ? null : soundFile?.id,
        botFlowId: useObdFlow ? soundFile?.id : null,
        isDtmfFile: isDtmfFile ? 1 : 0,
        schedTime: schedule ? '' : '',
        removeDuplicate: removeDup ? 1 : 0,
      });
      dispatch(pushNotification({
        title: test ? 'Test call queued' : 'Voice campaign launched',
        body: `${name} · ${recipients.length} call${recipients.length === 1 ? '' : 's'}`,
        type: 'success',
      }));
      toast.success(
        test ? 'Test call queued' : 'Campaign launched',
        `${recipients.length} call${recipients.length === 1 ? '' : 's'} placed`,
      );
      if (!test) navigation.goBack();
    } catch (e) {
      await dialog.error({ title: test ? 'Test failed' : 'Call failed', message: e?.message || 'Unknown error' });
    } finally {
      setCalling(false);
    }
  };

  const planLabel = VOICE_PLANS.find((p) => p.id === plan)?.label || 'Pick plan';
  const callerLabel = CALLER_IDS.find((cid) => cid.id === callerId)?.label || 'Pick caller ID';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 140, paddingHorizontal: 18 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center mb-5" style={{ gap: 10 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} className="w-9 h-9 items-center justify-center">
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
          <Text className="flex-1 text-[18px] font-extrabold text-center" style={{ color: c.text }}>
            Voice Campaign
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <SectionHeader c={c} icon="megaphone-outline" title="Campaign Details" />

        <FormField
          c={c}
          label="Campaign Name *"
          hint="User-defined campaign name (default: current timestamp)."
        >
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Campaign name"
            placeholderTextColor={c.textMuted}
            style={inputStyle(c)}
          />
        </FormField>

        <FormField
          c={c}
          label="Voice Plan *"
          hint="Voice plans operate on a 15-sec or 30-sec pulse."
        >
          <Dropdown
            c={c}
            placeholder="Select Voice Plan"
            value={planLabel}
            open={showPlan}
            onToggle={() => setShowPlan((v) => !v)}
            options={VOICE_PLANS}
            selectedId={plan}
            onSelect={(opt) => { setPlan(opt.id); setShowPlan(false); }}
          />
        </FormField>

        <FormField
          c={c}
          label="Caller ID *"
          hint="Caller ID assigned to the user."
        >
          <Dropdown
            c={c}
            placeholder="Select CallerID"
            value={callerLabel}
            open={showCaller}
            onToggle={() => setShowCaller((v) => !v)}
            options={CALLER_IDS}
            selectedId={callerId}
            onSelect={(opt) => { setCallerId(opt.id); setShowCaller(false); }}
          />
        </FormField>

        <ToggleRow
          c={c}
          label="Use OBD Flow"
          help="When on, calls run an outbound dial flow (BotFlowId)."
          value={useObdFlow}
          onChange={setUseObdFlow}
        />
        <ToggleRow
          c={c}
          label="Is DTMF File"
          help="The sound file accepts touch-tone (DTMF) input."
          value={isDtmfFile}
          onChange={setIsDtmfFile}
        />

        <FormField c={c} label="Sound File">
          <Dropdown
            c={c}
            placeholder="Select Sound File"
            value={soundFile?.name || ''}
            open={showSound}
            onToggle={() => setShowSound((v) => !v)}
            options={mediaFiles.map((m) => ({ id: m.id, label: m.name, sub: m.kind }))}
            selectedId={soundFile?.id}
            onSelect={(opt) => { setSoundFile(mediaFiles.find((m) => m.id === opt.id)); setShowSound(false); }}
          />
        </FormField>

        <SectionHeader c={c} icon="people-outline" title="Contact & File Upload" right={
          <View className="flex-row" style={{ gap: 6 }}>
            <Pill bg="#DBEAFE" fg="#1D4ED8" label="Total Counts" value={numberCount} />
            <Pill bg="#FEF3C7" fg="#B45309" label="Duplicates" value={0} />
            <Pill bg="#FEE2E2" fg="#B91C1C" label="BlackList" value={0} />
          </View>
        } />

        <FormField c={c} label="Numbers" hint="Enter multiple numbers separated by commas.">
          <TextInput
            value={numbers}
            onChangeText={setNumbers}
            placeholder="9197127298989,9187123456..."
            placeholderTextColor={c.textMuted}
            multiline
            style={[
              inputStyle(c),
              { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 },
            ]}
          />
        </FormField>

        <View className="flex-row" style={{ gap: 10, marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <GradientButton
              title="Upload Files"
              icon="cloud-upload-outline"
              variant="info"
              size="sm"
              onPress={() => navigation.navigate('MediaLibrary')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <FormField c={c} label="Group">
              <Dropdown
                c={c}
                placeholder="Select Groups"
                value={group?.name || ''}
                open={showGroup}
                onToggle={() => setShowGroup((v) => !v)}
                options={groups.map((g) => ({ id: g.id || g.name, label: g.name, sub: `${(g.numbers || []).length} numbers` }))}
                selectedId={group?.id || group?.name}
                onSelect={(opt) => { setGroup(groups.find((g) => (g.id || g.name) === opt.id)); setShowGroup(false); }}
              />
            </FormField>
          </View>
        </View>

        <FormField
          c={c}
          label="Group Range"
          hint="Enter the starting and ending group IDs to pick contacts within the range."
        >
          <View className="flex-row" style={{ gap: 8 }}>
            <TextInput
              value={groupFrom}
              onChangeText={setGroupFrom}
              placeholder="From"
              placeholderTextColor={c.textMuted}
              keyboardType="number-pad"
              style={[inputStyle(c), { flex: 1 }]}
            />
            <Text style={{ color: c.textMuted, alignSelf: 'center' }}>to</Text>
            <TextInput
              value={groupTo}
              onChangeText={setGroupTo}
              placeholder="To"
              placeholderTextColor={c.textMuted}
              keyboardType="number-pad"
              style={[inputStyle(c), { flex: 1 }]}
            />
          </View>
        </FormField>

        <ToggleRow c={c} label="Remove Duplicates" value={removeDup} onChange={setRemoveDup} />
        <ToggleRow c={c} label="Schedule Now"     value={schedule}  onChange={setSchedule} />

        <View className="flex-row items-center mt-5" style={{ gap: 12 }}>
          <View style={{ flex: 1 }}>
            <GradientButton
              title="Originate Call"
              icon="call"
              loading={calling}
              onPress={() => submit()}
            />
          </View>
          <Text style={{ color: c.textMuted, fontWeight: '700', fontSize: 12 }}>OR</Text>
          <View style={{ flex: 1 }}>
            <GradientButton
              title="Test Call"
              icon="call-outline"
              variant="info"
              loading={calling}
              onPress={() => submit({ test: true })}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

