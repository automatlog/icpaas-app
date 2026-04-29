// src/screens/voice/CampaignScreen.js — single-page Voice campaign composer.
// Mirrors UI image/Voice Campaign Screen.png. Picks voice plan, caller ID,
// optional OBD flow / DTMF mode, sound file, and recipient list, then
// dispatches via VoiceAPI.makeCall (icpaas.in /Voice/OgCall/MakeCall).
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Switch,
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

        <Field
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
        </Field>

        <Field
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
        </Field>

        <Field
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
        </Field>

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

        <Field c={c} label="Sound File">
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
        </Field>

        <SectionHeader c={c} icon="people-outline" title="Contact & File Upload" right={
          <View className="flex-row" style={{ gap: 6 }}>
            <Pill bg="#DBEAFE" fg="#1D4ED8" label="Total Counts" value={numberCount} />
            <Pill bg="#FEF3C7" fg="#B45309" label="Duplicates" value={0} />
            <Pill bg="#FEE2E2" fg="#B91C1C" label="BlackList" value={0} />
          </View>
        } />

        <Field c={c} label="Numbers" hint="Enter multiple numbers separated by commas.">
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
        </Field>

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
            <Field c={c} label="Group">
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
            </Field>
          </View>
        </View>

        <Field
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
        </Field>

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

const inputStyle = (c) => ({
  backgroundColor: c.bgCard,
  borderWidth: 1,
  borderColor: c.border,
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  fontSize: 14,
  color: c.text,
  ...Platform.select({ web: { outlineStyle: 'none' } }),
});

const Field = ({ c, label, hint, children }) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={{ color: c.text, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>{label}</Text>
    {children}
    {hint ? <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 6 }}>{hint}</Text> : null}
  </View>
);

const SectionHeader = ({ c, icon, title, right }) => (
  <View className="flex-row items-center mb-3" style={{ gap: 8 }}>
    <View
      style={{
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: c.primarySoft,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={14} color={c.primary} />
    </View>
    <Text style={{ color: c.text, fontSize: 14, fontWeight: '700', flex: 1 }}>{title}</Text>
    {right || null}
  </View>
);

const Dropdown = ({ c, placeholder, value, open, onToggle, options, selectedId, onSelect }) => (
  <>
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.85}
      style={{
        ...inputStyle(c),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
      }}
    >
      <Text numberOfLines={1} style={{ color: value ? c.text : c.textMuted, fontSize: 14, flex: 1 }}>
        {value || placeholder}
      </Text>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={c.textMuted} />
    </TouchableOpacity>
    {open ? (
      <View
        style={{
          marginTop: 6,
          backgroundColor: c.bgCard,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 10,
          maxHeight: 220,
          overflow: 'hidden',
        }}
      >
        <ScrollView nestedScrollEnabled>
          {options.length === 0 ? (
            <Text style={{ color: c.textMuted, padding: 14, fontSize: 12 }}>No options.</Text>
          ) : (
            options.map((o) => {
              const active = o.id === selectedId;
              return (
                <TouchableOpacity
                  key={o.id}
                  onPress={() => onSelect(o)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: c.border,
                    backgroundColor: active ? c.primarySoft : 'transparent',
                    gap: 10,
                  }}
                >
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={14}
                    color={active ? c.primary : c.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{o.label}</Text>
                    {o.sub ? (
                      <Text style={{ color: c.textMuted, fontSize: 10, marginTop: 2 }} numberOfLines={1}>{o.sub}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    ) : null}
  </>
);

const ToggleRow = ({ c, label, help, value, onChange }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.rule,
      gap: 10,
    }}
  >
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: c.bgInput, true: c.primary }}
      thumbColor="#FFFFFF"
    />
    <View style={{ flex: 1 }}>
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <Text style={{ color: c.text, fontSize: 13, fontWeight: '600' }}>{label}</Text>
        {help ? (
          <View
            style={{
              width: 14, height: 14, borderRadius: 7,
              backgroundColor: c.bgInput,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="help" size={9} color={c.textMuted} />
          </View>
        ) : null}
      </View>
      {help ? <Text style={{ color: c.textMuted, fontSize: 10, marginTop: 2 }}>{help}</Text> : null}
    </View>
  </View>
);

const Pill = ({ bg, fg, label, value }) => (
  <View
    style={{
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: bg,
      borderRadius: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    }}
  >
    <Text style={{ color: fg, fontSize: 10, fontWeight: '600' }}>{label}:</Text>
    <Text style={{ color: fg, fontSize: 11, fontWeight: '800' }}>{value}</Text>
  </View>
);
