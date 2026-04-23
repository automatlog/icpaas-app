import reducer, { setConversations, upsertConversation } from './conversationsSlice';

const initial = { list: [], badge: 0 };

describe('conversationsSlice', () => {
  test('setConversations replaces list and recomputes badge', () => {
    const next = reducer(initial, setConversations([
      { id: '1', unread: 3 },
      { id: '2', unread: 0 },
      { id: '3', unread: 2 },
    ]));
    expect(next.list).toHaveLength(3);
    expect(next.badge).toBe(5);
  });

  test('upsertConversation inserts when new', () => {
    const next = reducer(initial, upsertConversation({ id: 'a', unread: 2 }));
    expect(next.list).toEqual([{ id: 'a', unread: 2 }]);
    expect(next.badge).toBe(2);
  });

  test('upsertConversation merges when existing', () => {
    const start = { list: [{ id: 'a', unread: 1, name: 'Alpha' }], badge: 1 };
    const next = reducer(start, upsertConversation({ id: 'a', unread: 5 }));
    expect(next.list[0]).toEqual({ id: 'a', unread: 5, name: 'Alpha' });
    expect(next.badge).toBe(5);
  });
});
