// src/screens/CampaignStep2Screen.js — Campaign Launch · Step 2 (matches Camapign screen2.png)
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBrand } from '../../../theme';
import { TemplatesAPI } from '../../../services/api';
import { extractWhatsAppVariables } from '../../../services/whatsappHelpers';
import toast from '../../../services/toast';
import Select from '../../../components/Select';
import { Stepper, Card, SectionTitle, PrimaryButton, SecondaryButton, Field } from './CampaignStep1Screen';

// Flat variable spec for one WhatsApp template
const waVarSpec = (extracted = {}) => {
  const spec = [];
  (extracted.header || []).forEach((h, i) => {
    if (h.type === 'text') spec.push({ key: `header_text_${i}`, label: `Header text ${i + 1}`, group: 'headerText', index: i });
  });
  (extracted.body || []).forEach((b, i) =>
    spec.push({ key: `body_${i}`, label: `Body ${b.placeholder || `{{${i + 1}}}`}`, group: 'body', index: i }),
  );
  (extracted.buttons || []).forEach((btn, i) => {
    if (btn.type === 'url') spec.push({ key: `button_url_${i}`, label: `Button URL ${i + 1}`, group: 'buttonUrl', index: i });
    else if (btn.type === 'copy_code') spec.push({ key: `button_coupon_${i}`, label: `Button coupon ${i + 1}`, group: 'buttonCoupon', index: i });
    else if (btn.type === 'quick_reply') spec.push({ key: `button_payload_${i}`, label: `Quick reply ${i + 1}`, group: 'buttonPayload', index: i });
  });
  return spec;
};

// Substitute {{1}}, {{2}} placeholders in a body string with given values keyed by body_<i>
const previewBody = (text, values, spec) => {
  if (!text) return '';
  let out = String(text);
  spec.filter((s) => s.group === 'body').forEach((s) => {
    const v = values[s.key];
    if (v !== undefined && v !== '') {
      out = out.replace(`{{${s.index + 1}}}`, v);
    }
  });
  return out;
};

export default function CampaignStep2Screen({ navigation, route }) {
  const c = useBrand();
  const draft = route?.params?.draft || {};

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(draft.category || '');
  const [type, setType] = useState(draft.type || '');
  const [templateName, setTemplateName] = useState(draft.templateName || '');
  const [openDD, setOpenDD] = useState(null); // 'category' | 'type' | 'template'
  const [values, setValues] = useState(draft.values || {});
  const [focusedField, setFocusedField] = useState(null);
  const [showErrors, setShowErrors] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const wabaId = draft.channels?.find?.((x) => x.phoneNumberId === draft.channelId)?.wabaBusinessId;
      const res = await TemplatesAPI.getWhatsApp(wabaId);
      setTemplates(res?.data || []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [draft.channelId, draft.channels]);

  useEffect(() => { load(); }, [load]);

  const categories = useMemo(
    () => [...new Set(templates.map((t) => t.category).filter(Boolean))],
    [templates],
  );
  const types = ['All', 'Default', 'Flows'];

  // Detect a Flows-style template via components or explicit hint
  const isFlowsTemplate = (t) => {
    if (!t) return false;
    if (String(t.template_type || t.templateType || t.type || '').toLowerCase().includes('flow')) return true;
    if (t.category && String(t.category).toLowerCase().includes('flow')) return true;
    if (Array.isArray(t.components)) {
      return t.components.some((cmp) => {
        const buttons = cmp.buttons || cmp.Buttons;
        if (!Array.isArray(buttons)) return false;
        return buttons.some((b) => String(b.type || '').toUpperCase() === 'FLOW');
      });
    }
    return false;
  };

  const filteredTemplates = useMemo(
    () => {
      if (!category) return [];
      return templates
        .filter((t) => t.category === category)
        .filter((t) => {
          if (!type || type === 'All') return true;
          const flow = isFlowsTemplate(t);
          return type === 'Flows' ? flow : !flow;
        });
    },
    [templates, category, type],
  );

  const selectedTemplate = useMemo(
    () => templates.find((t) => (t.name || t.id) === templateName) || null,
    [templates, templateName],
  );

  const varSpec = useMemo(() => {
    if (!selectedTemplate?.components) return [];
    return waVarSpec(extractWhatsAppVariables(selectedTemplate.components));
  }, [selectedTemplate]);

  const next = () => {
    if (!templateName) {
      toast.warning('Required', 'Please select a Meta template first.');
      return;
    }

    // Validate that all variables in the spec have a value
    const missing = varSpec.filter((s) => !values[s.key]?.trim());
    if (missing.length > 0) {
      setShowErrors(true);
      toast.warning('Incomplete', `Please fill all variables: ${missing.map((m) => m.label).join(', ')}`);
      return;
    }
    setShowErrors(false);

    navigation.navigate('CampaignStep3', {
      draft: { ...draft, category, type, templateName, values, varSpec },
    });
  };

  // Cascade validation: changing category resets type + template + values.
  const onPickCategory = (next) => {
    if (next === category) return;
    setCategory(next);
    setType('');
    setTemplateName('');
    setValues({});
    setOpenDD(null);
  };

  // Changing type resets template + values.
  const onPickType = (next) => {
    if (next === type) return;
    setType(next);
    setTemplateName('');
    setValues({});
    setOpenDD(null);
  };

  const onPickTemplate = (next) => {
    if (next === templateName) {
      setTemplateName('');
      setValues({});
    } else {
      setTemplateName(next);
      setValues({});
    }
    setOpenDD(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header c={c} navigation={navigation} title="Campaign Launch" />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Stepper c={c} step={2} />

        <Card c={c}>
          <SectionTitle c={c} icon="document-text" label="Template Information" />

          <Field c={c} label="Template Category" required hint="Select your template category">
            <Select
              c={c}
              icon="filter"
              value={category}
              placeholder="Select Category"
              open={openDD === 'category'}
              onToggle={() => setOpenDD(openDD === 'category' ? null : 'category')}
              options={categories}
              selectedId={category}
              onSelect={(o) => onPickCategory(o)}
              onClear={() => onPickCategory(null)}
            />
          </Field>

          <Field c={c} label="Template Type" required hint="Select your template type">
            <Select
              c={c}
              icon="grid"
              value={type}
              placeholder="Select Type"
              open={openDD === 'type'}
              onToggle={() => {
                if (!category) return;
                setOpenDD(openDD === 'type' ? null : 'type');
              }}
              options={category ? types : []}
              style={{ opacity: category ? 1 : 0.5 }}
              selectedId={type}
              onSelect={(o) => onPickType(o)}
              onClear={() => onPickType(null)}
            />
          </Field>

          <Field c={c} label="Meta Template" required hint="Your WhatsApp approved templates">
            <Select
              c={c}
              icon="phone-portrait"
              value={templateName}
              placeholder="Select Template"
              open={openDD === 'template'}
              onToggle={() => {
                if (!category || !type) return;
                setOpenDD(openDD === 'template' ? null : 'template');
              }}
              options={(category && type) ? filteredTemplates.map((t) => t.name || t.id) : []}
              style={{ opacity: (category && type) ? 1 : 0.5 }}
              selectedId={templateName}
              onSelect={(o) => onPickTemplate(o)}
              onClear={() => onPickTemplate(null)}
              searchable
            />
          </Field>

          {/* Variable mapping */}
          {selectedTemplate && varSpec.length > 0 ? (
            <View
              className="rounded-[12px] mt-2 mb-1 p-3.5"
              style={{ backgroundColor: c.bgInput }}
            >
              <View className="flex-row items-center mb-2.5" style={{ gap: 6 }}>
                <Ionicons name="code-slash" size={14} color={c.primary} />
                <Text className="text-[13px] font-bold" style={{ color: c.text }}>
                  Variable Mapping ({varSpec.length})
                </Text>
              </View>

              {varSpec.map((s) => (
                <View key={s.key} className="mb-2.5">
                  <Text className="text-[11px] font-semibold mb-1" style={{ color: c.textMuted }}>
                    {s.label}
                  </Text>
                  <View
                    className="rounded-[10px] px-3"
                    style={{ 
                      borderWidth: 1.5, 
                      borderColor: focusedField === s.key ? c.primary : (showErrors && !values[s.key] ? c.danger : c.border), 
                      backgroundColor: focusedField === s.key ? c.primary + '05' : (showErrors && !values[s.key] ? c.danger + '05' : c.bg) 
                    }}
                  >
                    <TextInput
                      value={values[s.key] || ''}
                      onChangeText={(v) => {
                        setValues((prev) => ({ ...prev, [s.key]: v }));
                        if (showErrors) setShowErrors(false);
                      }}
                      onFocus={() => setFocusedField(s.key)}
                      onBlur={() => setFocusedField(null)}
                      placeholder={`Value for ${s.label}`}
                      placeholderTextColor={c.textMuted}
                      className="text-[13px]"
                      style={[
                        { paddingVertical: Platform.OS === 'ios' ? 10 : 8, color: c.text },
                        Platform.select({ web: { outlineStyle: 'none' } }),
                      ]}
                    />
                  </View>
                </View>
              ))}

              {/* Body preview */}
              {selectedTemplate.body ? (
                <View className="mt-2 rounded-[10px] p-3" style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border }}>
                  <Text className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: c.textMuted }}>
                    Preview
                  </Text>
                  <Text className="text-[12px] leading-[18px]" style={{ color: c.text }}>
                    {previewBody(selectedTemplate.body, values, varSpec)}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {selectedTemplate && varSpec.length === 0 ? (
            <View
              className="rounded-[12px] mt-1 mb-1 p-3 flex-row items-center"
              style={{ backgroundColor: c.primarySoft, gap: 8 }}
            >
              <Ionicons name="checkmark-circle" size={14} color={c.primaryDeep} />
              <Text className="text-[12px] font-semibold flex-1" style={{ color: c.primaryDeep }}>
                Template has no variables — ready to launch.
              </Text>
            </View>
          ) : null}

          {/* Empty state / Template selection placeholder */}
          {!loading && !selectedTemplate ? (
            <View className="items-center py-10" style={{ gap: 8 }}>
              <View
                className="w-24 h-24 rounded-2xl items-center justify-center"
                style={{ backgroundColor: c.bgInput }}
              >
                <Ionicons name="document-outline" size={40} color={c.textDim} />
              </View>
              <Text className="text-[15px] font-bold" style={{ color: c.text }}>No Template Selected</Text>
              <Text className="text-[12px] text-center px-6" style={{ color: c.textMuted }}>
                Please select a category and type, then pick a Meta template to configure variables.
              </Text>
            </View>
          ) : null}

          {loading ? (
            <View className="py-10 items-center"><ActivityIndicator color={c.primary} /></View>
          ) : null}
        </Card>

        <View className="flex-row" style={{ gap: 10 }}>
          <SecondaryButton c={c} icon="hand-left" label="Previous" onPress={() => navigation.goBack()} />
          <View style={{ flex: 1 }}>
            <PrimaryButton c={c} icon="hand-right" label="Next" onPress={next} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Header({ c, navigation, title }) {
  return (
    <View
      className="flex-row items-center px-4"
      style={{
        paddingTop: Platform.OS === 'ios' ? 56 : 36,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: c.rule,
        backgroundColor: c.bg,
      }}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} className="w-10 h-10 items-center justify-center">
        <Ionicons name="arrow-back" size={22} color={c.text} />
      </TouchableOpacity>
      <Text className="flex-1 text-[18px] font-bold text-center" style={{ color: c.text }}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

