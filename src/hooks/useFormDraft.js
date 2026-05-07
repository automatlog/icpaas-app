// src/hooks/useFormDraft.js
//
// Lightweight wrapper that mirrors a screen's local form state into the
// formDrafts redux slice. The slice is persisted, so reopening the screen
// after a navigation pop, app background, or full restart picks up where
// the user left off.
//
// Usage:
//   const [draft, patchDraft, clearDraft] = useFormDraft('whatsappCampaign', {
//     title: '', message: '', recipients: [],
//   });
//   <TextInput value={draft.title} onChangeText={(t) => patchDraft({ title: t })} />
//
// Call clearDraft() after a successful submit so the next visit starts blank.
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setDraft, clearDraft as clearDraftAction, selectDraft } from '../store/slices/formDraftsSlice';

export default function useFormDraft(formId, initialValues = {}) {
  const dispatch = useDispatch();
  const stored = useSelector(selectDraft(formId));

  // Merge: stored draft fields take precedence over initialValues, but any
  // field absent from the stored draft falls back to initialValues. This
  // means new fields added to a form later still get a sane default even if
  // an old draft is hydrated.
  const draft = useMemo(
    () => ({ ...initialValues, ...(stored || {}) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stored],
  );

  const patchDraft = useCallback(
    (patch) => {
      dispatch(setDraft({ formId, values: patch }));
    },
    [dispatch, formId],
  );

  const clearDraft = useCallback(() => {
    dispatch(clearDraftAction({ formId }));
  }, [dispatch, formId]);

  return [draft, patchDraft, clearDraft];
}
