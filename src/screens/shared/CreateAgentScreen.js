// src/screens/shared/CreateAgentScreen.js
//
// Admin form for creating a new agent on OmniApp. POSTs UserViewModels to
// /WAMessage/AgentList/AddOrEditAgent. Will return 302 → SignIn until the
// backend ships the bearer-auth scheme on the AgentList controller (same
// open item as the rest of the OmniApp MVC surface). UI is fully wired so
// the moment that lands, this screen works end-to-end.
//
// Server-side validation (UserViewModels.cs):
//   - UserName / EmailId / MobileNumber must be unique (CheckDataAvailability)
//   - Password regex: 8–15 chars, ≥1 lowercase, ≥1 uppercase, ≥1 digit, ≥1 special
//   - SelectedProductIds drives ProductAccess for the new agent
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrand } from '../../theme';
import ScreenHeader from '../../components/ScreenHeader';
import { AgentAPI, PRODUCT_IDS } from '../../services/api';
import toast from '../../services/toast';

// What we expose to the agent admin. Keep to the channels icpaas mobile
// actually surfaces; OmniApp also has Email / URLShortener / Journey / etc.
// but those don't have mobile screens to land on.
const PRODUCT_OPTIONS = [
  { id: PRODUCT_IDS.WhatsApp, label: 'WhatsApp', icon: 'logo-whatsapp' },
  { id: PRODUCT_IDS.RCSMessage, label: 'RCS', icon: 'card-outline' },
  { id: PRODUCT_IDS.SMS, label: 'SMS', icon: 'chatbubble-outline' },
  { id: PRODUCT_IDS.Voice, label: 'Voice', icon: 'call-outline' },
  { id: PRODUCT_IDS.IVR, label: 'IVR', icon: 'mic-outline' },
];

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+=\[\]{};:<>|./?,-]).{8,15}$/;

export default function CreateAgentScreen({ navigation, route }) {
  const c = useBrand();
  const editingId = route?.params?.agentId || 0;
  const isEditing = editingId > 0;

  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [emailId, setEmailId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [products, setProducts] = useState(new Set([PRODUCT_IDS.WhatsApp]));
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditing);

  // Edit mode → fetch the agent's current values to prefill the form.
  useEffect(() => {
    if (!isEditing) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await AgentAPI.get(editingId);
        const a = res?.agent || res?.Agent || res?.data || res || {};
        if (cancelled) return;
        setUserName(a.userName ?? a.UserName ?? '');
        setEmailId(a.emailId ?? a.EmailId ?? '');
        setMobileNumber(a.mobileNumber ?? a.MobileNumber ?? '');
        const pids = a.selectedProductIds ?? a.SelectedProductIds ?? [];
        if (Array.isArray(pids) && pids.length > 0) setProducts(new Set(pids));
      } catch (e) {
        toast.error('Could not load agent', e?.message || 'Try again.');
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isEditing, editingId]);

  const toggleProduct = (id) => {
    setProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Field-level validation surfaced inline so the agent admin sees errors
  // without round-tripping the server. In edit mode, password is optional —
  // empty password keeps the existing one.
  const errors = useMemo(() => {
    const e = {};
    if (userName && userName.trim().length < 3) e.userName = 'At least 3 characters';
    if (password && !PASSWORD_RE.test(password)) {
      e.password = '8–15 chars · upper · lower · digit · special';
    }
    if ((password || confirm) && confirm !== password) e.confirm = 'Passwords do not match';
    if (emailId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailId)) {
      e.emailId = 'Not a valid email';
    }
    if (mobileNumber && mobileNumber.replace(/[^\d]/g, '').length < 10) {
      e.mobileNumber = 'Need at least 10 digits';
    }
    return e;
  }, [userName, password, confirm, emailId, mobileNumber]);

  const passwordOk = isEditing
    ? (!password || PASSWORD_RE.test(password))
    : PASSWORD_RE.test(password);

  const canSubmit =
    userName.trim().length >= 3 &&
    passwordOk &&
    confirm === password &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailId) &&
    mobileNumber.replace(/[^\d]/g, '').length >= 10 &&
    products.size > 0 &&
    !submitting &&
    !loadingExisting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await AgentAPI.addOrEditAgent({
        userId: editingId,
        userName: userName.trim(),
        // Edit + empty password = leave it alone; addOrEditAgent skips the
        // field when password is falsy.
        password: password || undefined,
        mobileNumber: mobileNumber.replace(/[^\d]/g, ''),
        emailId: emailId.trim(),
        selectedProductIds: Array.from(products),
      });
      // OmniApp's TryCatchExecuteAsync returns { success: bool, message: string }.
      const ok = res?.success === true || res?.Success === true;
      if (ok) {
        toast.success(
          isEditing ? 'Agent updated' : 'Agent created',
          isEditing ? `${userName} saved.` : `${userName} can now sign in.`,
        );
        navigation.goBack();
      } else {
        const msg = res?.message || res?.Message
          || (isEditing ? 'Could not update agent.' : 'Could not create agent.');
        toast.error(isEditing ? 'Update failed' : 'Create failed', msg);
      }
    } catch (e) {
      // 302 → SignIn is the most likely error today (cookie-only AgentList
      // controller). Surface a clear hint instead of the raw message.
      const status = e?.status;
      const hint = status === 302 || status === 401
        ? 'Backend bearer auth on AgentList isn’t live yet. See docs/liveAgentV1Status.md.'
        : (e?.message || 'Network error.');
      toast.error(isEditing ? 'Update failed' : 'Create failed', hint);
    } finally {
      setSubmitting(false);
    }
  };

  // Field renderer.
  const Field = ({ label, value, onChange, placeholder, error, secureTextEntry, keyboardType, rightSlot, autoCapitalize = 'none' }) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          borderRadius: 12, borderWidth: 1,
          borderColor: error ? c.danger : c.border,
          backgroundColor: c.bgCard,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={c.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={[
            {
              flex: 1, color: c.text, fontSize: 14,
              paddingHorizontal: 12, paddingVertical: 12,
            },
            Platform.select({ web: { outlineStyle: 'none' } }),
          ]}
        />
        {rightSlot}
      </View>
      {error ? (
        <Text style={{ color: c.danger, fontSize: 11, marginTop: 4 }}>{error}</Text>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        c={c}
        onBack={() => navigation.goBack()}
        icon={isEditing ? 'person' : 'person-add'}
        title={isEditing ? 'Edit agent' : 'New agent'}
        subtitle={isEditing ? `Update agent #${editingId}` : 'Create an OmniApp agent account'}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <Field
          label="USERNAME *"
          value={userName}
          onChange={setUserName}
          placeholder="e.g. agent_riya"
          error={errors.userName}
        />
        <Field
          label={isEditing ? 'PASSWORD (leave blank to keep)' : 'PASSWORD *'}
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          secureTextEntry={!showPwd}
          error={errors.password}
          rightSlot={
            <TouchableOpacity
              onPress={() => setShowPwd((v) => !v)}
              hitSlop={10}
              style={{ paddingHorizontal: 12 }}
            >
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={16} color={c.textMuted} />
            </TouchableOpacity>
          }
        />
        <Field
          label={isEditing ? 'CONFIRM PASSWORD' : 'CONFIRM PASSWORD *'}
          value={confirm}
          onChange={setConfirm}
          placeholder="••••••••"
          secureTextEntry={!showPwd}
          error={errors.confirm}
        />
        <Field
          label="EMAIL *"
          value={emailId}
          onChange={setEmailId}
          placeholder="agent@example.com"
          keyboardType="email-address"
          error={errors.emailId}
        />
        <Field
          label="MOBILE *"
          value={mobileNumber}
          onChange={setMobileNumber}
          placeholder="+91 98765 43210"
          keyboardType="phone-pad"
          error={errors.mobileNumber}
        />

        {/* Products */}
        <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 8 }}>
          PRODUCT ACCESS *
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
          {PRODUCT_OPTIONS.map((p) => {
            const active = products.has(p.id);
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => toggleProduct(p.id)}
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingVertical: 8, paddingHorizontal: 12,
                  borderRadius: 12, borderWidth: 1,
                  backgroundColor: active ? c.primarySoft : c.bgCard,
                  borderColor: active ? c.primary : c.border,
                }}
              >
                <Ionicons name={p.icon} size={13} color={active ? c.primary : c.textMuted} />
                <Text style={{
                  color: active ? c.primary : c.textMuted,
                  fontSize: 12,
                  fontWeight: active ? '700' : '500',
                }}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {products.size === 0 ? (
          <Text style={{ color: c.danger, fontSize: 11, marginTop: 6 }}>
            Pick at least one product.
          </Text>
        ) : null}

        {/* Note about backend status */}
        <View
          style={{
            padding: 10, marginTop: 18, borderRadius: 10,
            backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border,
          }}
        >
          <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 4 }}>
            HEADS-UP
          </Text>
          <Text style={{ color: c.text, fontSize: 11, lineHeight: 16 }}>
            OmniApp's AgentList controller currently uses cookie auth. This
            request will succeed once backend ships bearer-auth — until then
            you'll see a 302/sign-in error.
          </Text>
        </View>

        <TouchableOpacity
          onPress={submit}
          disabled={!canSubmit}
          activeOpacity={0.85}
          style={{
            marginTop: 22,
            paddingVertical: 14, borderRadius: 14,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: canSubmit ? c.primary : c.border,
            opacity: submitting ? 0.7 : 1,
            flexDirection: 'row', gap: 8,
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons name="checkmark" size={16} color={canSubmit ? '#FFFFFF' : c.textMuted} />
          )}
          <Text style={{
            color: canSubmit ? '#FFFFFF' : c.textMuted,
            fontSize: 14, fontWeight: '700',
          }}>
            {submitting
              ? (isEditing ? 'Saving…' : 'Creating…')
              : (isEditing ? 'Save changes' : 'Create agent')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
