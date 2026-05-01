// src/store/slices/formDraftsSlice.js
//
// Generic per-form draft store. A screen's composer state is mirrored here
// (keyed by a stable formId) so that backgrounding the app, hot-reloading,
// or a deeper nav unwinding the stack doesn't wipe partially-typed work.
//
// Drafts are persisted via redux-persist (this slice is NOT in the persist
// blacklist), so they survive app restart too.
//
// Lifecycle: screens call clearDraft(formId) on a successful submit so that
// the next visit starts blank.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // { [formId]: { ...values } }
  byForm: {},
};

const slice = createSlice({
  name: 'formDrafts',
  initialState,
  reducers: {
    setDraft(state, action) {
      const { formId, values } = action.payload || {};
      if (!formId) return;
      state.byForm[formId] = { ...(state.byForm[formId] || {}), ...(values || {}) };
    },
    clearDraft(state, action) {
      const { formId } = action.payload || {};
      if (!formId) return;
      delete state.byForm[formId];
    },
  },
});

export const { setDraft, clearDraft } = slice.actions;
export default slice.reducer;

export const selectDraft = (formId) => (state) =>
  state.formDrafts?.byForm?.[formId] || null;
