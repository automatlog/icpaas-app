import { createSlice, nanoid } from '@reduxjs/toolkit';

const initialState = {
  list: [], // [{ id, name, numbers: [str], createdAt }]
};

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    addGroup: {
      reducer(state, action) {
        state.list.unshift(action.payload);
      },
      prepare({ name, numbers }) {
        return {
          payload: {
            id: nanoid(),
            name: String(name || 'Group').trim() || 'Group',
            numbers: Array.from(new Set((numbers || []).map((n) => String(n).trim()).filter(Boolean))),
            createdAt: Date.now(),
          },
        };
      },
    },
    renameGroup(state, action) {
      const { id, name } = action.payload || {};
      const g = state.list.find((x) => x.id === id);
      if (g) g.name = String(name || g.name).trim() || g.name;
    },
    appendNumbersToGroup(state, action) {
      const { id, numbers } = action.payload || {};
      const g = state.list.find((x) => x.id === id);
      if (!g) return;
      g.numbers = Array.from(new Set([...(g.numbers || []), ...(numbers || []).map((n) => String(n).trim()).filter(Boolean)]));
    },
    removeNumberFromGroup(state, action) {
      const { id, number } = action.payload || {};
      const g = state.list.find((x) => x.id === id);
      if (!g) return;
      g.numbers = (g.numbers || []).filter((n) => n !== number);
    },
    removeGroup(state, action) {
      state.list = state.list.filter((g) => g.id !== action.payload);
    },
  },
});

export const {
  addGroup,
  renameGroup,
  appendNumbersToGroup,
  removeNumberFromGroup,
  removeGroup,
} = groupsSlice.actions;

export default groupsSlice.reducer;

// --- Selectors ---
export const selectGroups = (s) => s.groups.list;
export const selectGroupById = (id) => (s) => s.groups.list.find((g) => g.id === id);
