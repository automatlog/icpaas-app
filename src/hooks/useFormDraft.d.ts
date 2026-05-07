// Type shim for src/hooks/useFormDraft.js
//
// Generic over the draft shape so consumers get autocomplete on `draft.x`
// and type-checked patches.
//
// Example:
//   type CampaignDraft = { name: string; channelId: string; numbers: string };
//   const [draft, patchDraft, clearDraft] =
//     useFormDraft<CampaignDraft>('whatsappCampaign', {
//       name: '', channelId: '', numbers: '',
//     });
export default function useFormDraft<T extends Record<string, unknown>>(
  formId: string,
  initialValues?: Partial<T>,
): [T, (patch: Partial<T>) => void, () => void];
