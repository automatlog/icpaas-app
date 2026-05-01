// Type shim for src/services/pushNotifications.js
export interface NotifyArgs {
  kind?: string;
  title: string;
  body?: string;
  /** Extra payload attached to the OS notification — read on tap. */
  data?: Record<string, unknown>;
}

export function initPushNotifications(): Promise<void>;
export function getExpoPushToken(): Promise<string | null>;
export function notify(args: NotifyArgs): void;

declare const pushNotifications: {
  init: typeof initPushNotifications;
  getExpoPushToken: typeof getExpoPushToken;
  notify: typeof notify;
};
export default pushNotifications;
