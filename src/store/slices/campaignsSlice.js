import { createSlice } from '@reduxjs/toolkit';

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
  },
});

export const { setCampaigns, upsertCampaign, updateCampaignStatus } = campaignsSlice.actions;
export default campaignsSlice.reducer;
