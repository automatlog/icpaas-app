// src/constants/channels.js — single source of truth for the four channels.
//
// Both the Dashboard channel grid AND the CampaignPicker bottom-sheet read
// from this list, so a label/icon/route change touches one place.
//
// Field reference:
//   id       — slug used by route params, redux selectors, and identity lookups
//   label    — what the user sees ("WhatsApp", "RCS", "SMS", "Voice")
//   icon     — Ionicons name; matches the icon shown on the Dashboard tile
//   tint     — solid accent colour for the channel (FAB ring, picker dock circle)
//   softTint — pastel chip background; used by chip pickers / list rows
//              where the strong tint would dominate
//   route    — campaign composer route name (used by CampaignPicker.onPick)
//   count    — placeholder activity count for the Dashboard grid (replace with
//              a live selector when per-channel counts are wired up)
export const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp',      tint: '#10B981', softTint: '#8FCFBD', route: 'WhatsAppCampaignStep1', count: 32 },
  { id: 'rcs',      label: 'RCS',      icon: 'logo-google',        tint: '#8B5CF6', softTint: '#D4B3E8', route: 'RcsCampaign',           count: 14 },
  { id: 'voice',    label: 'Voice',    icon: 'mic-outline',        tint: '#F59E0B', softTint: '#E8D080', route: 'VoiceCampaign',         count: 8  },
  { id: 'sms',      label: 'SMS',      icon: 'chatbubble-outline', tint: '#0B8A6F', softTint: '#F2A8B3', route: 'SmsCampaign',           count: 21 },
];

/** Look up a channel by id (returns undefined if not found). */
export const getChannel = (id) => CHANNELS.find((ch) => ch.id === id);

/** Set of valid channel ids — handy for runtime validation. */
export const CHANNEL_IDS = CHANNELS.map((ch) => ch.id);
