import reducer, {
  setConversationMessages,
  appendConversationMessage,
  updateConversationMessage,
} from './messagesSlice';

describe('messagesSlice', () => {
  test('setConversationMessages stores list under conversation id', () => {
    const next = reducer({}, setConversationMessages({
      conversationId: 'c1',
      messages: [{ id: 'm1', text: 'hi' }],
    }));
    expect(next.c1).toEqual([{ id: 'm1', text: 'hi' }]);
  });

  test('appendConversationMessage appends to existing list', () => {
    const state = { c1: [{ id: 'm1' }] };
    const next = reducer(state, appendConversationMessage({
      conversationId: 'c1',
      message: { id: 'm2' },
    }));
    expect(next.c1).toEqual([{ id: 'm1' }, { id: 'm2' }]);
  });

  test('updateConversationMessage patches message by id', () => {
    const state = { c1: [{ id: 'm1', status: 'sent' }, { id: 'm2', status: 'sent' }] };
    const next = reducer(state, updateConversationMessage({
      conversationId: 'c1',
      messageId: 'm1',
      updates: { status: 'delivered' },
    }));
    expect(next.c1[0]).toEqual({ id: 'm1', status: 'delivered' });
    expect(next.c1[1].status).toBe('sent');
  });
});
