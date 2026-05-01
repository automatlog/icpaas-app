// SignalR client for OmniApp WhatsApp Live Agent.
// Singleton — there is exactly one HubConnection per app session.
//
// Lifecycle is owned by RealtimeProvider:
//   • connect()   on auth.isAuthenticated → true
//   • stop()      on logout
// Screens never call this directly; they consume state from liveChatSlice.
//
// Server emits (see docs/live-agent-reference.md §5):
//   ReceivedMessage(chat: ChatModel)
//   UpdateUnreadCount(senderNumber: string, count: number)
//   DeliveryStatusUpdate({ messageId, status, timestamp })
//   ReceivePresence(userId, status)               ← informational, not surfaced yet
//
// The hub assigns this connection to group "waba_<USERNAME upper>" on
// OnConnectedAsync — nothing for us to do client-side beyond authenticating.

import * as signalR from '@microsoft/signalr';
import * as secureStorage from './secureStorage';
import { OMNI_HOST, OMNI_REALTIME_PATH } from '../config';
import { store } from '../store';
import {
  connectionStatusChanged,
  receiveLiveMessage,
  updateUnreadCount,
  updateDeliveryStatus,
} from '../store/slices/liveChatSlice';

const TOKEN_KEY = 'icpaas_token';

let connection = null;
let starting = null; // Promise guard against double-start during fast-refresh.

const url = () => `${OMNI_HOST}${OMNI_REALTIME_PATH}`;

const buildConnection = () =>
  new signalR.HubConnectionBuilder()
    .withUrl(url(), {
      // Standard SignalR handshake: client → POST {hub}/negotiate → server
      // returns a connection ID + supported transports → client opens the
      // chosen transport. Skipping this is what produced the "connection ID
      // not present on the server" error. The accessTokenFactory is invoked
      // during negotiate AND for the upgraded transport, so the bearer flows
      // through both legs.
      accessTokenFactory: async () => (await secureStorage.getItem(TOKEN_KEY)) || '',
      // Default transport set is WebSockets → SSE → LongPolling. SignalR
      // picks the first one the server agrees to — keeps things working
      // even behind proxies that strip WebSockets.
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();

const wireHandlers = (conn) => {
  conn.on('ReceivedMessage', (chat) => {
    store.dispatch(receiveLiveMessage(chat));
  });
  conn.on('UpdateUnreadCount', (waId, count) => {
    store.dispatch(updateUnreadCount({ waId, count }));
  });
  conn.on('DeliveryStatusUpdate', (payload) => {
    // Server may send either { messageId, status, timestamp } or a list.
    const list = Array.isArray(payload) ? payload : [payload];
    list.forEach((s) => store.dispatch(updateDeliveryStatus(s)));
  });

  conn.onreconnecting((error) => {
    store.dispatch(
      connectionStatusChanged({ status: 'reconnecting', error: error?.message || null }),
    );
  });
  conn.onreconnected(() => {
    store.dispatch(connectionStatusChanged({ status: 'connected' }));
  });
  conn.onclose((error) => {
    store.dispatch(
      connectionStatusChanged({ status: 'disconnected', error: error?.message || null }),
    );
    connection = null;
    starting = null;
  });
};

export async function connect() {
  if (connection?.state === signalR.HubConnectionState.Connected) {
    return connection;
  }
  if (starting) return starting;

  // No bearer means the server's negotiate will reject with 401 anyway —
  // skip the cycle so we don't churn reconnects on a fresh install.
  const token = await secureStorage.getItem(TOKEN_KEY);
  if (!token) {
    store.dispatch(connectionStatusChanged({
      status: 'disconnected',
      error: 'No bearer token saved; sign in to enable Live Agent.',
    }));
    throw new Error('No bearer token saved');
  }

  store.dispatch(connectionStatusChanged({ status: 'connecting' }));

  connection = buildConnection();
  wireHandlers(connection);

  starting = connection
    .start()
    .then(() => {
      store.dispatch(connectionStatusChanged({ status: 'connected' }));
      return connection;
    })
    .catch((err) => {
      store.dispatch(
        connectionStatusChanged({
          status: 'disconnected',
          error: err?.message || String(err),
        }),
      );
      connection = null;
      throw err;
    })
    .finally(() => {
      starting = null;
    });

  return starting;
}

export async function stop() {
  if (!connection) return;
  try {
    await connection.stop();
  } catch (err) {
    // Swallow — onclose handler does state cleanup either way.
  }
  connection = null;
  starting = null;
  store.dispatch(connectionStatusChanged({ status: 'idle' }));
}

export const isConnected = () =>
  connection?.state === signalR.HubConnectionState.Connected;

export const getConnection = () => connection;

// Aliases — RealtimeProvider imports the longer names.
export const startRealtime = connect;
export const stopRealtime = stop;
