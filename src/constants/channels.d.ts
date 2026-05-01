// Type shim for src/constants/channels.js — lets new .ts/.tsx code import
// the canonical channel list with autocomplete + checked field access.
export interface Channel {
  id: 'whatsapp' | 'rcs' | 'voice' | 'sms';
  label: string;
  /** Ionicons glyph name. */
  icon: string;
  /** Solid brand accent (Dashboard tile, FAB ring). */
  tint: string;
  /** Pastel chip background (composer chip rail, list rows). */
  softTint: string;
  /** Campaign composer route name. */
  route: string;
  /** Placeholder activity count for the Dashboard grid. */
  count: number;
}

export const CHANNELS: ReadonlyArray<Channel>;
export const CHANNEL_IDS: ReadonlyArray<Channel['id']>;
export function getChannel(id: string): Channel | undefined;
