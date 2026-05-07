// Type shim for src/services/haptics.js
declare const haptics: {
  /** Light impact — generic UI tap. */
  tap: () => void;
  /** Medium impact — picker / FAB open. */
  medium: () => void;
  /** Heavy impact — destructive confirms. */
  heavy: () => void;
  /** Selection change — toggles, picker rows. */
  select: () => void;
  /** Success notification feedback. */
  success: () => void;
  /** Warning notification feedback. */
  warning: () => void;
  /** Error notification feedback. */
  error: () => void;
};

export default haptics;
