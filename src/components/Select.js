// src/components/Select.js — Global Select (Select2 style) with Search & Multi-select support.
import React, { useState, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { inputStyle } from './FormField';

export default function Select({
  c,
  placeholder = 'Select',
  value,
  open,
  onToggle,
  options = [],
  selectedId, // For multiple=true, this should be an array of IDs
  onSelect,   // For multiple=true, returns the updated array
  onClear,    // Optional clear handler
  maxHeight = 350,
  searchable = false,
  multiple = false,
  icon,       // Optional left icon name
  style,      // Optional container style
}) {
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchable || !search) return options;
    const term = search.toLowerCase();
    return options.filter((o) => {
      const label = typeof o === 'string' ? o : o.label;
      const sub = typeof o === 'string' ? '' : (o.sub || '');
      return label?.toLowerCase().includes(term) || sub?.toLowerCase().includes(term);
    });
  }, [options, search, searchable]);

  const isSelected = (id) => {
    if (multiple) {
      return Array.isArray(selectedId) && selectedId.includes(id);
    }
    return selectedId === id;
  };

  const handleSelect = (item) => {
    const itemId = typeof item === 'string' ? item : item.id;
    if (multiple) {
      const current = Array.isArray(selectedId) ? selectedId : [];
      const next = current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId];
      onSelect(next);
      // We don't call onToggle() here so the user can pick multiple at once
    } else {
      onSelect(item);
      onToggle(); // Close for single select
    }
  };

  const [layout, setLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const containerRef = useRef(null);

  const onTriggerPress = () => {
    setSearch('');
    if (!open) {
      containerRef.current?.measureInWindow((x, y, width, height) => {
        setLayout({ x, y, width, height });
        onToggle();
      });
    } else {
      onToggle();
    }
  };

  const renderSelectedTags = () => {
    if (!multiple || !Array.isArray(selectedId) || selectedId.length === 0) return null;
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {selectedId.map((id) => {
          const opt = options.find((o) => (typeof o === 'string' ? o : o.id) === id);
          const label = typeof opt === 'string' ? opt : opt?.label;
          if (!label) return null;
          return (
            <View key={id} style={{ backgroundColor: c.primarySoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: c.primary + '33' }}>
              <Text style={{ color: c.primaryDeep, fontSize: 11, fontWeight: '600' }}>{label}</Text>
              <TouchableOpacity onPress={() => handleSelect(opt)}>
                <Ionicons name="close-circle" size={12} color={c.primary} />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  const hasSelection = multiple 
    ? (Array.isArray(selectedId) && selectedId.length > 0)
    : (selectedId !== null && selectedId !== undefined && selectedId !== '');

  return (
    <View ref={containerRef} style={[{ zIndex: open ? 2000 : 1, position: 'relative' }, style]}>
      <TouchableOpacity
        onPress={onTriggerPress}
        activeOpacity={0.85}
        style={{ ...inputStyle(c), minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 }}
      >
        {icon && <Ionicons name={icon} size={16} color={c.textMuted} style={{ marginRight: 10 }} />}
        <View style={{ flex: 1 }}>
          {!multiple || !selectedId?.length ? (
            <Text numberOfLines={1} style={{ color: hasSelection ? c.text : c.textMuted, fontSize: 14 }}>
              {value || placeholder}
            </Text>
          ) : renderSelectedTags()}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {hasSelection && onClear && (
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); onClear(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={16} color={c.textMuted} />
            </TouchableOpacity>
          )}
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={c.textMuted} />
        </View>
      </TouchableOpacity>

      {open && (
        <Modal transparent visible={open} animationType="none" onRequestClose={onToggle}>
          <TouchableOpacity 
            activeOpacity={1} 
            style={{ flex: 1, backgroundColor: 'transparent' }} 
            onPress={onToggle}
          >
            <View
              style={{
                position: 'absolute',
                top: layout.y + layout.height + 4,
                left: layout.x,
                width: layout.width,
                backgroundColor: c.bgCard,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 12,
                maxHeight: 250,
                elevation: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.2,
                shadowRadius: 10,
                overflow: 'hidden',
              }}
            >
              {searchable && (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.bgInput }}>
                  <Ionicons name="search" size={14} color={c.textMuted} />
                  <TextInput
                    placeholder="Search..."
                    placeholderTextColor={c.textMuted}
                    style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: c.text, fontSize: 14 }}
                    value={search}
                    onChangeText={setSearch}
                    autoFocus
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                      <Ionicons name="close-circle" size={16} color={c.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <ScrollView 
                keyboardShouldPersistTaps="handled" 
                showsVerticalScrollIndicator={true} 
                style={{ flexGrow: 0 }}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                {filteredOptions.length === 0 ? (
                  <Text style={{ color: c.textMuted, padding: 20, textAlign: 'center', fontSize: 13 }}>No options found.</Text>
                ) : (
                  filteredOptions.map((o, i) => {
                    const itemId = typeof o === 'string' ? o : o.id;
                    const label = typeof o === 'string' ? o : o.label;
                    const sub = typeof o === 'string' ? null : o.sub;
                    const active = isSelected(itemId);
                    return (
                      <TouchableOpacity
                        key={`${itemId ?? 'opt'}_${i}`}
                        onPress={() => handleSelect(o)}
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: i === filteredOptions.length - 1 ? 0 : 1, borderBottomColor: c.rule || c.border, backgroundColor: active ? c.primarySoft : 'transparent', gap: 12 }}
                      >
                        <Ionicons name={multiple ? (active ? 'checkbox' : 'square-outline') : (active ? 'radio-button-on' : 'radio-button-off')} size={18} color={active ? c.primary : c.textMuted} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: active ? c.primaryDeep : c.text, fontSize: 14, fontWeight: active ? '700' : '500' }} numberOfLines={1}>{label}</Text>
                          {sub ? <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{sub}</Text> : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}



{/* <Select
  c={theme}
  placeholder="Select Country"
  searchable={true}
  options={countryOptions}
  selectedId={selectedId}
  onSelect={(item) => setSelectedId(item.id)}
  open={isOpen}
  onToggle={() => setIsOpen(!isOpen)}
/>
<Select
  c={theme}
  placeholder="Select Contacts"
  multiple={true}
  options={contactOptions}
  selectedId={selectedIds} // Must be an array, e.g., [1, 2]
  onSelect={(updatedIds) => setSelectedIds(updatedIds)}
  open={isOpen}
  onToggle={() => setIsOpen(!isOpen)}
/> */}
