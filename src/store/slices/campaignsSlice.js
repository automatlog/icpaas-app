import { createSlice, createSelector } from '@reduxjs/toolkit';

const upsertById = (items, next) => {
  const i = items.findIndex((item) => item.id === next.id);
  if (i === -1) return [next, ...items];
  const copy = items.slice();
  copy[i] = { ...copy[i], ...next };
  return copy;
};

const campaignsSlice = createSlice({
  name: 'campaigns',
  initialState: [],
  reducers: {
    setCampaigns(_state, action) {
      return Array.isArray(action.payload) ? action.payload : [];
    },
    upsertCampaign(state, action) {
      return upsertById(state, action.payload);
    },
    updateCampaignStatus(state, action) {
      const { campaignId, status } = action.payload;
      return state.map((c) => (c.id === campaignId ? { ...c, status } : c));
    },
    patchCampaign(state, action) {
      const { id, patch } = action.payload || {};
      return state.map((c) => (c.id === id ? { ...c, ...patch } : c));
    },
    removeCampaign(state, action) {
      return state.filter((c) => c.id !== action.payload);
    },
  },
});

export const {
  setCampaigns,
  upsertCampaign,
  updateCampaignStatus,
  patchCampaign,
  removeCampaign,
} = campaignsSlice.actions;
export default campaignsSlice.reducer;

// --- Selectors ---
export const selectCampaigns = (s) => s.campaigns;
export const selectCampaignById = (id) => (s) => s.campaigns.find((c) => c.id === id);

// Status counts for the dashboard.
// Memoised via createSelector so the returned object only changes when the
// campaigns list itself changes — otherwise React-Redux warns about
// referentially-new returns on every render.
export const selectCampaignTotals = createSelector(
  [selectCampaigns],
  (list) => {
    const counts = { total: list.length, live: 0, scheduled: 0, completed: 0, failed: 0, stuck: 0 };
    list.forEach((c) => {
      if (counts[c.status] != null) counts[c.status] += 1;
    });
    return counts;
  },
);
