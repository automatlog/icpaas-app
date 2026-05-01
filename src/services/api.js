// src/services/api.js
// gsauth.com API service for WhatsApp, RCS, and SMS.

import axios from 'axios';
import * as secureStorage from './secureStorage';
import {
  buildInputData,
  buildWhatsAppSendPayload,
  buildWhatsAppTemplatePayload,
  encodeWhatsAppTemplateSelection,
  extractWhatsAppVariables,
  findWhatsAppTemplate,
  normalizeForMessaging,
  parseWhatsAppTemplateSelection,
} from './whatsappHelpers';
import {
  extractWhatsAppStatusEvents,
  normalizeDlrStatus,
  verifyWebhookChallenge,
} from './whatsappDlr';
import {
  buildRcsPayload,
  buildRcsTemplateJsonResult,
  extractRcsVariables,
  findRcsTemplate,
  getRcsComponent,
  getRcsTemplateName,
} from './rcsHelpers';
import {
  buildSmsTemplateJsonResult,
  buildSmsTemplatePayload,
  countSmsVariables,
  findSmsTemplate,
  getSmsTemplateId,
  getSmsTemplateName,
  getSmsTemplateText,
  replaceSmsVariables,
} from './smsHelpers';
import { OMNI_HOST, LIVE_CHAT_PAGE_SIZE, LIVE_CHAT_MESSAGE_PAGE_SIZE } from '../config';

const API_DOMAIN = 'https://gsauth.com';
const ICPAAS_DOMAIN = 'https://icpaas.in';
const META_VERSION = 'v23.0';
const REST_VERSION = 'v1';

const STORAGE_KEYS = {
  token: 'icpaas_token',
};

// Optional fallback bearer for development. Read from `EXPO_PUBLIC_DEFAULT_TOKEN`
// (set in `.env`, `eas.json` or shell env). Empty string in production —
// users must sign in to get a real token. Never hardcode a live token here:
// the file is committed and any value would leak via the repo.
export const DEFAULT_API_TOKEN = process.env.EXPO_PUBLIC_DEFAULT_TOKEN || '';

const api = axios.create({
  baseURL: API_DOMAIN,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

const icpaasApi = axios.create({
  baseURL: ICPAAS_DOMAIN,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
  },
});

// OmniApp host (REST: /WAMessage/UserLiveChat/* etc.; SignalR: /whatsAppProgressHub).
// Used by LiveChatAPI for the agent inbox/chat surface.
const omniApi = axios.create({
  baseURL: OMNI_HOST,
  timeout: 20000,
  headers: {
    Accept: 'application/json',
  },
});

// Reads the bearer from SecureStore (keychain) on every request. Falls
// back to DEFAULT_API_TOKEN (env-only) when no token is saved — useful
// for dev where signing in every reload is annoying.
const attachAuth = async (config) => {
  const stored = await secureStorage.getItem(STORAGE_KEYS.token);
  config.headers.Authorization = `Bearer ${stored || DEFAULT_API_TOKEN}`;
  return config;
};

const handleResponseError = (error) => {
  const message =
    error?.response?.data?.statusMessage ||
    error?.response?.data?.messageStatus ||
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Something went wrong';

  return Promise.reject({
    message,
    status: error?.response?.status,
    data: error?.response?.data,
  });
};

api.interceptors.request.use(attachAuth, (error) => Promise.reject(error));
api.interceptors.response.use((response) => response.data, handleResponseError);

icpaasApi.interceptors.request.use(attachAuth, (error) => Promise.reject(error));
icpaasApi.interceptors.response.use((response) => response.data, handleResponseError);

omniApi.interceptors.request.use(attachAuth, (error) => Promise.reject(error));
omniApi.interceptors.response.use((response) => response.data, handleResponseError);

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

const firstDataItem = (response) => {
  if (Array.isArray(response?.data)) return response.data[0];
  if (Array.isArray(response)) return response[0];
  return null;
};

const unsupported = (feature) =>
  Promise.reject({ message: `${feature} is not available in the configured gsauth API.` });

const getBodyText = (components = []) =>
  components.find((component) => component?.type?.toLowerCase() === 'body')?.text || '';

const normalizeWhatsAppTemplate = (template) => ({
  id: template.id || template.name,
  name: template.name,
  channel: 'whatsapp',
  status: template.status,
  body: getBodyText(template.components),
  category: template.category,
  language: template.language,
  components: template.components || [],
  templateSelection: encodeWhatsAppTemplateSelection(template),
  variables: extractWhatsAppVariables(template.components || []),
  raw: template,
});

const normalizeSmsTemplate = (template, senderId) => ({
  id: template.id || template.templateId || template.dltTemplateId || template.templateName,
  name: template.templateName || template.name || template.dltTemplateId,
  channel: 'sms',
  status: template.status || template.templateStatus || 'APPROVED',
  body: template.templateText || template.text || template.message || '',
  category: template.templateType || template.category || 'SMS',
  senderId: template.senderId || senderId,
  dltTemplateId: getSmsTemplateId(template),
  variableCount: countSmsVariables(getSmsTemplateText(template)),
  raw: template,
});

const normalizeRcsTemplate = (template, botId) => {
  const component = template.Component || template.component || {};
  const firstCard = component.Cards?.[0] || component.cards?.[0] || {};
  const body =
    component.TextMessage ||
    component.textMessage ||
    firstCard.CardDescription ||
    firstCard.cardDescription ||
    firstCard.CardTitle ||
    firstCard.cardTitle ||
    '';

  return {
    id: template.TemplateName || template.templateName,
    name: template.TemplateName || template.templateName,
    channel: 'rcs',
    status: template.TemplateStatus || template.templateStatus,
    body,
    category: component.TemplateType || component.templateType || 'RCS',
    botId: template.AgentId || template.agentId || botId,
    variables: extractRcsVariables(component),
    component,
    raw: template,
  };
};

export const AuthAPI = {
  verifyWhatsAppToken: async (token) => {
    if (!token) throw { message: 'Missing required field: token' };

    try {
      const response = await axios.get(`${API_DOMAIN}/${META_VERSION}/channels`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      return {
        ok: true,
        channels: asArray(response.data?.data),
        response: response.data,
      };
    } catch (error) {
      throw {
        message:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          'Authentication failed',
        status: error?.response?.status,
        data: error?.response?.data,
      };
    }
  },

  verifyOmniToken: async (token) => {
    if (!token) throw { message: 'Missing required field: token' };

    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const [whatsapp, sms, rcs] = await Promise.allSettled([
      axios.get(`${API_DOMAIN}/${META_VERSION}/channels`, { headers }),
      axios.get(`${API_DOMAIN}/api/${REST_VERSION}/sms/getSenderIds`, { headers }),
      axios.get(`${API_DOMAIN}/api/${REST_VERSION}/rcs/getBotIds`, { headers }),
    ]);

    const result = {
      ok: [whatsapp, sms, rcs].some((item) => item.status === 'fulfilled'),
      whatsapp: {
        ok: whatsapp.status === 'fulfilled',
        channels: whatsapp.status === 'fulfilled' ? asArray(whatsapp.value.data?.data) : [],
        error: whatsapp.status === 'rejected' ? whatsapp.reason?.message : null,
      },
      sms: {
        ok: sms.status === 'fulfilled',
        senderIds: sms.status === 'fulfilled' ? asArray(sms.value.data?.senderIds || sms.value.data?.data) : [],
        error: sms.status === 'rejected' ? sms.reason?.message : null,
      },
      rcs: {
        ok: rcs.status === 'fulfilled',
        bots: rcs.status === 'fulfilled' ? asArray(rcs.value.data?.bots || rcs.value.data?.data?.bots) : [],
        error: rcs.status === 'rejected' ? rcs.reason?.message : null,
      },
    };

    if (!result.ok) {
      throw {
        message: 'Authentication failed for all configured omni-channel APIs.',
        result,
      };
    }

    return result;
  },

  saveAndVerifyCredentials: async (token) => {
    const verification = await AuthAPI.verifyOmniToken(token);
    await AuthAPI.saveCredentials(token);
    return verification;
  },

  // Save token, then smoke-test it against the icpaas.in /user/balance endpoint.
  // Returns { ok, walletBalance? , error? }. The token is persisted in every case.
  saveAndTestIcpaas: async (token) => {
    if (!token) throw { message: 'Missing required field: token' };
    const trimmed = String(token).trim();
    await AuthAPI.saveCredentials(trimmed);
    try {
      const res = await axios.get(`${ICPAAS_DOMAIN}/api/${REST_VERSION}/user/balance`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${trimmed}` },
        timeout: 15000,
      });
      return { ok: true, walletBalance: res?.data?.walletBalance ?? res?.data?.balance ?? null };
    } catch (error) {
      return {
        ok: false,
        status: error?.response?.status,
        error: error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Balance check failed',
      };
    }
  },

  saveCredentials: async (token) => {
    await secureStorage.setItem(STORAGE_KEYS.token, token);
  },

  clearCredentials: async () => {
    await secureStorage.removeItem(STORAGE_KEYS.token);
  },

  isLoggedIn: async () => {
    const token = await secureStorage.getItem(STORAGE_KEYS.token);
    return !!token;
  },

  getToken: async () => secureStorage.getItem(STORAGE_KEYS.token),
};

export const ChannelsAPI = {
  list: () => api.get(`/${META_VERSION}/channels`),

  getDefault: async () => {
    const response = await ChannelsAPI.list();
    const channel = firstDataItem(response);
    if (!channel?.phoneNumberId || !channel?.wabaBusinessId) {
      throw { message: 'No WhatsApp channel found for this token.' };
    }
    return channel;
  },
};

export const WhatsAppAPI = {
  getChannels: ChannelsAPI.list,
  getDefaultChannel: ChannelsAPI.getDefault,
  parseTemplateSelection: parseWhatsAppTemplateSelection,
  encodeTemplateSelection: encodeWhatsAppTemplateSelection,
  findTemplate: findWhatsAppTemplate,
  extractVariables: extractWhatsAppVariables,
  buildInputData,
  buildSendPayload: buildWhatsAppSendPayload,
  buildTemplatePayload: buildWhatsAppTemplatePayload,
  normalizePhone: normalizeForMessaging,

  resolveWabaBusinessId: async ({ phoneNumberId, wabaBusinessId } = {}) => {
    if (wabaBusinessId) return wabaBusinessId;

    const channel = phoneNumberId
      ? asArray((await ChannelsAPI.list())?.data).find(
        (item) => String(item.phoneNumberId) === String(phoneNumberId),
      )
      : await ChannelsAPI.getDefault();

    return channel?.wabaBusinessId || '';
  },

  getTemplates: async (wabaBusinessIdOrOptions) => {
    const options = typeof wabaBusinessIdOrOptions === 'object'
      ? wabaBusinessIdOrOptions || {}
      : { wabaBusinessId: wabaBusinessIdOrOptions };
    const channel = options.wabaBusinessId || options.wabaId ? null : await ChannelsAPI.getDefault();
    const wabaId = options.wabaBusinessId || options.wabaId || channel.wabaBusinessId;
    const templateName = options.name || options.templateName;

    return api.get(`/${META_VERSION}/${wabaId}/message_templates`, {
      params: templateName
        ? { name: parseWhatsAppTemplateSelection(templateName).name }
        : undefined,
    });
  },

  getTemplate: async (templateId, wabaBusinessId) => {
    const channel = wabaBusinessId ? null : await ChannelsAPI.getDefault();
    const wabaId = wabaBusinessId || channel.wabaBusinessId;
    return api.get(`/${META_VERSION}/${wabaId}/message_templates/${templateId}`);
  },

  createTemplate: async (payload, wabaBusinessId) => {
    const channel = wabaBusinessId ? null : await ChannelsAPI.getDefault();
    const wabaId = wabaBusinessId || payload?.wabaBusinessId || payload?.wabaId || channel.wabaBusinessId;
    const { wabaBusinessId: _wabaBusinessId, wabaId: _wabaId, ...template } = payload;
    return api.post(`/${META_VERSION}/${wabaId}/message_templates`, template);
  },

  // Build a Meta-compliant template body from the mobile composer fields.
  // POST /v23.0/{wabaId}/message_templates
  // Spec: https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates
  buildCreatePayload: ({ name, language = 'en', category, headerText, headerExample, bodyText, bodyExamples = [], footerText, buttons = [] } = {}) => {
    const components = [];

    if (headerText && String(headerText).trim()) {
      const hc = { type: 'HEADER', format: 'TEXT', text: String(headerText).trim() };
      const hVarCount = (String(headerText).match(/\{\{\d+\}\}/g) || []).length;
      if (hVarCount > 0 && headerExample) {
        hc.example = { header_text: [String(headerExample)] };
      }
      components.push(hc);
    }

    if (bodyText && String(bodyText).trim()) {
      const bc = { type: 'BODY', text: String(bodyText).trim() };
      const bVarCount = (String(bodyText).match(/\{\{\d+\}\}/g) || []).length;
      if (bVarCount > 0) {
        const samples = (bodyExamples || []).slice(0, bVarCount).map((s) => String(s ?? ''));
        while (samples.length < bVarCount) samples.push('Sample');
        bc.example = { body_text: [samples] };
      }
      components.push(bc);
    }

    if (footerText && String(footerText).trim()) {
      components.push({ type: 'FOOTER', text: String(footerText).trim() });
    }

    const usable = (buttons || []).filter((b) => b && b.text);
    if (usable.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons: usable.slice(0, 3).map((b) => {
          const t = String(b.type || 'QUICK_REPLY').toUpperCase();
          if (t === 'URL')          return { type: 'URL',         text: b.text, url: b.url || '' };
          if (t === 'PHONE_NUMBER') return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phone || '' };
          return                          { type: 'QUICK_REPLY', text: b.text };
        }),
      });
    }

    return {
      name: String(name || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      language: language || 'en',
      category: String(category || 'MARKETING').toUpperCase(),
      components,
    };
  },

  generateTemplateJson: ({ template, to = '{{to}}', defaultRegion = 'IN' }) => {
    const normalizedTo = normalizeForMessaging(to, defaultRegion) || to;
    return {
      json: buildWhatsAppTemplatePayload(template, normalizedTo),
      jsonCompact: JSON.stringify(buildWhatsAppTemplatePayload(template, normalizedTo)),
      jsonFormatted: JSON.stringify(buildWhatsAppTemplatePayload(template, normalizedTo), null, 2),
    };
  },

  sendRaw: async ({ phoneNumberId, payload } = {}) => {
    const channel = phoneNumberId ? null : await ChannelsAPI.getDefault();
    const id = phoneNumberId || channel.phoneNumberId;

    return api.post(`/${META_VERSION}/${id}/messages`, payload);
  },

  // Upload a media file to WhatsApp Cloud API.
  // POST /v23.0/{phoneNumberId}/media
  // multipart fields: file=<binary>, type=<mime>, messaging_product=whatsapp
  uploadMedia: async ({ phoneNumberId, file, type } = {}) => {
    const channel = phoneNumberId ? null : await ChannelsAPI.getDefault();
    const id = phoneNumberId || channel.phoneNumberId;
    if (!id) throw { message: 'Missing required field: phoneNumberId' };
    if (!file?.uri) throw { message: 'Missing required field: file.uri' };

    const form = new FormData();
    form.append('file', {
      uri: file.uri,
      name: file.name || 'upload',
      type: type || file.type || 'application/octet-stream',
    });
    form.append('type', type || file.type || 'application/octet-stream');
    form.append('messaging_product', 'whatsapp');

    return api.post(`/${META_VERSION}/${id}/media`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Get template or media metadata by ID — GET /v23.0/{id}
  getMediaById: (id) => api.get(`/${META_VERSION}/${id}`),

  sendTemplate: async (params = {}) => {
    const channel = params.phoneNumberId ? null : await ChannelsAPI.getDefault();
    const phoneNumberId = params.phoneNumberId || channel.phoneNumberId;
    const template = params.template || {};
    const language = template.language || params.language || {};
    const languageCode = typeof language === 'string' ? language : language.code;

    return api.post(`/${META_VERSION}/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: params.recipientType || 'individual',
      to: normalizeForMessaging(params.to || '', params.defaultRegion || 'IN') || params.to,
      type: 'template',
      template: {
        name: template.name || params.name || params.templateName,
        language: {
          code: languageCode || 'en',
        },
        components: template.components || params.components || [],
      },
      biz_opaque_callback_data: params.bizOpaqueCallbackData || params.callbackData || '',
    });
  },

  sendTemplateAuto: async (params = {}) => {
    const channel = params.phoneNumberId ? null : await ChannelsAPI.getDefault();
    const phoneNumberId = params.phoneNumberId || channel.phoneNumberId;
    const templateSelection = params.templateName || params.name;
    const recipientPhone = normalizeForMessaging(params.to || '', params.defaultRegion || 'IN');

    if (!phoneNumberId) throw { message: 'Missing required field: phoneNumberId' };
    if (!templateSelection) throw { message: 'Missing required field: templateName' };
    if (!recipientPhone) {
      throw {
        message:
          'Invalid phone number. Use a valid local or international number, for example 9876543210 or +919876543210.',
      };
    }

    const wabaBusinessId = await WhatsAppAPI.resolveWabaBusinessId({
      phoneNumberId,
      wabaBusinessId: params.wabaBusinessId || channel?.wabaBusinessId,
    });

    if (!wabaBusinessId) throw { message: 'Could not determine WhatsApp Business Account ID.' };

    const templateResponse = await WhatsAppAPI.getTemplates({
      phoneNumberId,
      wabaBusinessId,
      name: templateSelection,
    });
    const template = params.template || findWhatsAppTemplate(asArray(templateResponse?.data), templateSelection);

    if (!template) throw { message: `Template not found: ${templateSelection}` };

    const inputData = {
      ...buildInputData(params.templateVariables || {}),
      ...(params.inputData || {}),
    };
    const payload = buildWhatsAppSendPayload(
      template,
      inputData,
      extractWhatsAppVariables(template.components || []),
      recipientPhone,
    );
    const callbackData = (params.callbackData || params.bizOpaqueCallbackData || '').toString().trim();
    if (callbackData) payload.biz_opaque_callback_data = callbackData;

    const response = await WhatsAppAPI.sendRaw({ phoneNumberId, payload });
    return {
      ...response,
      payload,
      callbackData: callbackData || null,
      templateSelection: encodeWhatsAppTemplateSelection(template),
    };
  },

  sendTemplateWithVars: (to, templateName, variables = [], language = 'en') =>
    WhatsAppAPI.sendTemplate({
      to,
      templateName,
      language,
      components: [
        {
          type: 'body',
          parameters: variables.map((value) => ({
            type: 'text',
            text: String(value),
          })),
        },
      ],
    }),

  sendText: async (to, text, phoneNumberId) => {
    const channel = phoneNumberId ? null : await ChannelsAPI.getDefault();
    const id = phoneNumberId || channel.phoneNumberId;

    return api.post(`/${META_VERSION}/${id}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizeForMessaging(to || '', 'IN') || to,
      type: 'text',
      text: { body: text },
    });
  },

  sendReply: ({ to, message, phoneNumberId }) =>
    WhatsAppAPI.sendText(to, message, phoneNumberId),

  sendImage: async (to, imageUrl, caption = '', phoneNumberId) => {
    const channel = phoneNumberId ? null : await ChannelsAPI.getDefault();
    const id = phoneNumberId || channel.phoneNumberId;

    return api.post(`/${META_VERSION}/${id}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizeForMessaging(to || '', 'IN') || to,
      type: 'image',
      image: { link: imageUrl, caption },
    });
  },

  sendDocument: async (to, docUrl, filename, phoneNumberId) => {
    const channel = phoneNumberId ? null : await ChannelsAPI.getDefault();
    const id = phoneNumberId || channel.phoneNumberId;

    return api.post(`/${META_VERSION}/${id}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizeForMessaging(to || '', 'IN') || to,
      type: 'document',
      document: { link: docUrl, filename },
    });
  },

  getConversations: () => unsupported('WhatsApp conversations'),
  getMessages: () => unsupported('WhatsApp conversation messages'),
};

export const WhatsAppDlrAPI = {
  normalizeStatus: normalizeDlrStatus,
  extractStatusEvents: extractWhatsAppStatusEvents,
  verifyWebhookChallenge,
};

export const RCSAPI = {
  extractVariables: extractRcsVariables,
  findTemplate: findRcsTemplate,
  getTemplateName: getRcsTemplateName,
  getComponent: getRcsComponent,
  buildPayload: buildRcsPayload,
  buildTemplateJson: buildRcsTemplateJsonResult,

  getBotIds: () => api.get(`/api/${REST_VERSION}/rcs/getBotIds`),

  createTemplate: ({ botId, templateData, template_data }) =>
    api.post(`/api/${REST_VERSION}/rcs/createtemplate`, {
      botId,
      template_data: template_data || templateData,
    }),

  getTemplate: ({ botid, botId, TemplateName, templateName } = {}) =>
    api.post(`/api/${REST_VERSION}/rcs/getTemplate`, null, {
      params: {
        botid: botid || botId,
        TemplateName: TemplateName || templateName,
      },
    }),

  getTemplates: (botId) => RCSAPI.getTemplate({ botId }),

  getBotOptions: async () => {
    const response = await RCSAPI.getBotIds();
    return asArray(response?.bots || response?.data?.bots).map((bot) => ({
      id: bot.botId,
      name: bot.agentName || bot.botId,
      ...bot,
    })).filter((bot) => bot.id);
  },

  getTemplateOptions: async (botId) => {
    if (!botId) return [];
    const response = await RCSAPI.getTemplates(botId);
    const templates = asArray(response?.data);
    return templates.map((template) => ({
      id: getRcsTemplateName(template),
      name: getRcsTemplateName(template),
      ...template,
    })).filter((template) => template.id);
  },

  generateTemplateJson: async ({ botId, templateName, destination, values = {} } = {}) => {
    const response = await RCSAPI.getTemplates(botId);
    const template = findRcsTemplate(asArray(response?.data), templateName);

    if (!template) {
      return {
        id: 'error',
        name: 'Template not found',
        json: JSON.stringify({ error: 'Template not found' }, null, 2),
      };
    }

    return buildRcsTemplateJsonResult({
      template,
      botId,
      templateName,
      destination,
      values,
    });
  },

  send: (payload) =>
    api.post(`/api/${REST_VERSION}/rcs/sendmessage`, {
      botid: payload.botid || payload.botId,
      templatename: payload.templatename || payload.templateName,
      destination: asArray(payload.destination).map((number) => normalizeForMessaging(number, 'IN') || number),
      ...(payload.var ? { var: payload.var } : {}),
      callbackdata: payload.callbackdata || payload.callbackData || '',
    }),

  sendTemplateAuto: async ({ botId, templateName, destination, values = {}, callbackData = '' } = {}) => {
    if (!botId) throw { message: 'Missing required field: botId' };
    if (!templateName) throw { message: 'Missing required field: templateName' };

    const normalizedDestination = normalizeForMessaging(destination || '', 'IN');
    if (!normalizedDestination) {
      throw { message: 'Invalid phone number. Please provide a valid India or International phone number.' };
    }

    const response = await RCSAPI.getTemplates(botId);
    const template = findRcsTemplate(asArray(response?.data), templateName);
    if (!template) throw { message: 'Template not found.' };

    const payload = buildRcsPayload(template, normalizedDestination, {
      botId,
      templateName,
      values,
      callbackData,
    });
    const result = await RCSAPI.send(payload);

    return {
      success: result?.success !== false && result?.status !== false,
      status: result?.status || (result?.success ? 'success' : 'failed'),
      message: result?.message || result?.msg || 'RCS message sent',
      data: result?.data || result,
      botId,
      destination,
      templateName,
      payload,
      variables: payload.var,
    };
  },

  sendSingle: (number, botid, templatename, variables = {}, callbackdata = '') =>
    RCSAPI.send({
      botid,
      templatename,
      destination: [number],
      var: variables,
      callbackdata,
    }),

  sendBulk: (numbers, botid, templatename, variables = {}, callbackdata = `bulk_${Date.now()}`) =>
    RCSAPI.send({
      botid,
      templatename,
      destination: numbers,
      var: variables,
      callbackdata,
    }),
};

export const SMSAPI = {
  countVariables: countSmsVariables,
  replaceVariables: replaceSmsVariables,
  findTemplate: findSmsTemplate,
  getTemplateName: getSmsTemplateName,
  getTemplateText: getSmsTemplateText,
  getTemplateId: getSmsTemplateId,
  buildTemplatePayload: buildSmsTemplatePayload,
  buildTemplateJson: buildSmsTemplateJsonResult,

  getSenderIds: async () => {
    const endpoints = [
      `/api/${REST_VERSION}/sms/getSenderIds`,
      `/api/${REST_VERSION}/sms/senderId`,
      `/api/${REST_VERSION}/sms/getSenderId`,
    ];

    let lastError;
    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint);
        const senderIds = response?.senderIds || response?.data?.senderIds || response?.data;
        if (asArray(senderIds).length > 0) return response;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) throw lastError;
    return { senderIds: [] };
  },

  createTemplate: (payload) =>
    api.post(`/api/${REST_VERSION}/sms/createtemplate`, payload),

  getTemplates: (senderId) =>
    api.get(`/api/${REST_VERSION}/sms/getTemplate`, {
      params: { senderId },
    }),

  getSenderOptions: async () => {
    const response = await SMSAPI.getSenderIds();
    const senderIds = response?.senderIds || response?.data?.senderIds || response?.data;
    return asArray(senderIds).map((item) => ({
      id: item.senderId || item.id || item.botId,
      name: item.name || item.senderId || item.id || item.agentName || item.botId,
      ...item,
    })).filter((item) => item.id);
  },

  getTemplateOptions: async (senderId) => {
    if (!senderId) return [];
    const response = await SMSAPI.getTemplates(senderId);
    const templates = response?.data || response?.templates || response?.smsTemplates || response;
    return asArray(templates).map((template) => ({
      id: getSmsTemplateName(template),
      name: getSmsTemplateName(template),
      ...template,
    })).filter((template) => template.id);
  },

  generateTemplateJson: async ({ senderId, templateName, phoneNumber, variables = [] } = {}) => {
    const response = await SMSAPI.getTemplates(senderId);
    const templates = response?.data || response?.templates || response?.smsTemplates || response;
    const template = findSmsTemplate(asArray(templates), templateName);

    if (!template) {
      return {
        id: 'error',
        name: 'Template not found',
        json: JSON.stringify({ error: 'Template not found' }, null, 2),
      };
    }

    return buildSmsTemplateJsonResult({
      template,
      senderId,
      templateName,
      phoneNumber,
      variables,
    });
  },

  send: (payload) =>
    api.post(`/api/${REST_VERSION}/sms/mt`, {
      senderId: payload.senderId,
      dcs: payload.dcs ?? 0,
      flashSms: payload.flashSms ?? 0,
      schedTime: payload.schedTime ?? '',
      groupId: payload.groupId ?? '',
      peId: payload.peId ?? '',
      text: payload.text,
      dltTemplateId: payload.dltTemplateId ?? '',
      chainValue: payload.chainValue ?? '',
      messageId: payload.messageId ?? '',
      numbers: asArray(payload.numbers).map((number) => normalizeForMessaging(number, 'IN') || number),
    }),

  sendTemplateAuto: async ({ senderId, phone, templateName, variables = [] } = {}) => {
    if (!senderId) throw { message: 'Missing required field: senderId' };
    if (!templateName) throw { message: 'Missing required field: templateName' };

    const recipientPhone = normalizeForMessaging(phone || '', 'IN');
    if (!recipientPhone) {
      throw { message: 'Invalid phone number. Please provide a valid India or International phone number.' };
    }

    const response = await SMSAPI.getTemplates(senderId);
    const templates = response?.data || response?.templates || response?.smsTemplates || response;
    const template = findSmsTemplate(asArray(templates), templateName);
    if (!template) throw { message: 'Template not found.' };

    const payload = buildSmsTemplatePayload({
      template,
      senderId,
      phoneNumber: recipientPhone,
      variables,
    });
    const result = await SMSAPI.send(payload);

    return {
      success: result?.success !== false && result?.status !== false,
      status: result?.status || (result?.success ? 'success' : 'failed'),
      message: result?.message || result?.msg || 'SMS sent',
      data: result?.data || result,
      senderId,
      phone,
      text: payload.text,
      payload,
      variableCount: countSmsVariables(getSmsTemplateText(template)),
      variables,
    };
  },

  sendOTP: (number, text, senderId, peId, dltTemplateId, chainValue = '') =>
    SMSAPI.send({
      senderId,
      peId,
      dltTemplateId,
      chainValue,
      text,
      numbers: [number],
      messageId: `otp_${Date.now()}`,
    }),

  sendBulk: (numbers, text, senderId, peId, dltTemplateId, chainValue = '') =>
    SMSAPI.send({
      senderId,
      peId,
      dltTemplateId,
      chainValue,
      text,
      numbers,
      messageId: `bulk_${Date.now()}`,
    }),

  schedule: (numbers, text, senderId, peId, dltTemplateId, schedTime, chainValue = '') =>
    SMSAPI.send({
      senderId,
      peId,
      dltTemplateId,
      chainValue,
      text,
      numbers,
      schedTime,
      messageId: `sched_${Date.now()}`,
    }),
};

export const TemplatesAPI = {
  getWhatsApp: async (wabaBusinessId) => {
    // If a specific WABA is given, fetch only that one
    if (wabaBusinessId) {
      const response = await WhatsAppAPI.getTemplates(wabaBusinessId);
      return {
        ...response,
        data: asArray(response?.data).map((t) => ({
          ...normalizeWhatsAppTemplate(t),
          wabaBusinessId,
        })),
      };
    }

    // No WABA specified — pull ALL channels and merge their templates
    const channelsRes = await ChannelsAPI.list();
    const channels = asArray(channelsRes?.data).filter((ch) => ch?.wabaBusinessId);
    if (channels.length === 0) throw { message: 'No WhatsApp channels found for this token.' };

    const perChannel = await Promise.allSettled(
      channels.map((ch) => WhatsAppAPI.getTemplates(ch.wabaBusinessId)),
    );

    const data = perChannel.flatMap((res, i) => {
      if (res.status !== 'fulfilled') return [];
      const waba = channels[i].wabaBusinessId;
      const phoneNumberId = channels[i].phoneNumberId;
      return asArray(res.value?.data).map((t) => ({
        ...normalizeWhatsAppTemplate(t),
        wabaBusinessId: waba,
        phoneNumberId,
      }));
    });

    return { data, channels };
  },

  getRCS: async (botId) => {
    const resolvedBotId = botId || firstDataItem((await RCSAPI.getBotIds())?.bots)?.botId;
    if (!resolvedBotId) throw { message: 'No RCS bot ID found for this token.' };

    const response = await RCSAPI.getTemplates(resolvedBotId);
    return {
      ...response,
      data: asArray(response?.data).map((template) => normalizeRcsTemplate(template, resolvedBotId)),
    };
  },

  getSMS: async (senderId) => {
    const senderResponse = senderId ? null : await SMSAPI.getSenderIds();
    const resolvedSenderId = senderId || firstDataItem(senderResponse?.senderIds)?.senderId;
    if (!resolvedSenderId) throw { message: 'No SMS sender ID found for this token.' };

    const response = await SMSAPI.getTemplates(resolvedSenderId);
    const templates = response?.data || response?.templates || response?.smsTemplates || response;

    return {
      ...response,
      data: asArray(templates).map((template) => normalizeSmsTemplate(template, resolvedSenderId)),
    };
  },

  getByChannel: async (channel, options = {}) => {
    if (channel === 'whatsapp') return TemplatesAPI.getWhatsApp(options.wabaBusinessId);
    if (channel === 'rcs') return TemplatesAPI.getRCS(options.botId);
    if (channel === 'sms') return TemplatesAPI.getSMS(options.senderId);
    return TemplatesAPI.getAll(options);
  },

  getAll: async (options = {}) => {
    const results = await Promise.allSettled([
      TemplatesAPI.getWhatsApp(options.wabaBusinessId),
      TemplatesAPI.getRCS(options.botId),
      TemplatesAPI.getSMS(options.senderId),
    ]);

    const data = results.flatMap((result) =>
      result.status === 'fulfilled' ? asArray(result.value?.data) : [],
    );

    if (!data.length && results.every((result) => result.status === 'rejected')) {
      throw results[0].reason;
    }

    return { data, results };
  },

  createWhatsApp: WhatsAppAPI.createTemplate,
  createRCS: RCSAPI.createTemplate,
  createSMS: SMSAPI.createTemplate,
};

export const CampaignAPI = {
  list: () => unsupported('Campaign list'),
  create: () => unsupported('Campaign creation'),
  pause: () => unsupported('Campaign pause'),
};

export const ContactsAPI = {
  list: () => unsupported('Contacts list'),
  create: () => unsupported('Contact creation'),
};

export const AnalyticsAPI = {
  getSummary: () => unsupported('Analytics summary'),
};

const appendIfDefined = (form, key, value) => {
  if (value === undefined || value === null || value === '') return;
  form.append(key, typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value));
};

const normalizeNumberList = (numbers) => {
  if (!numbers) return '';
  if (Array.isArray(numbers)) return numbers.map((n) => String(n).trim()).filter(Boolean).join(',');
  return String(numbers).trim();
};

const toUploadFile = (file) => {
  if (!file) return null;
  if (file.uri) {
    return {
      uri: file.uri,
      name: file.name || file.fileName || 'upload.csv',
      type: file.type || file.mimeType || 'text/csv',
    };
  }
  return file;
};

export const VoiceAPI = {
  makeCall: ({
    number,
    numbers,
    callerId,
    mediaFileId,
    botFlowId,
    isDtmfFile,
    schedTime,
    removeDuplicate,
    uploadFiles,
  } = {}) => {
    if (!callerId) return Promise.reject({ message: 'Missing required field: callerId' });

    const numberValue = normalizeNumberList(number ?? numbers);
    const files = asArray(uploadFiles).map(toUploadFile).filter(Boolean);
    if (!numberValue && files.length === 0) {
      return Promise.reject({ message: 'Either Number or UploadFiles is required.' });
    }
    if (!mediaFileId && !botFlowId) {
      return Promise.reject({ message: 'Either MediaFileId or BotFlowId is required.' });
    }
    if (files.length > 5) {
      return Promise.reject({ message: 'Upload up to 5 CSV/XLS/XLSX files.' });
    }

    const form = new FormData();
    appendIfDefined(form, 'Number', numberValue);
    appendIfDefined(form, 'CallerId', callerId);
    appendIfDefined(form, 'MediaFileId', mediaFileId);
    appendIfDefined(form, 'BotFlowId', botFlowId);
    appendIfDefined(form, 'IsDTMFFile', botFlowId ? 0 : isDtmfFile);
    appendIfDefined(form, 'SchedTime', schedTime);
    appendIfDefined(form, 'RemoveDuplicate', removeDuplicate);
    files.forEach((file) => form.append('UploadFiles', file));

    return icpaasApi.post(`/api/${REST_VERSION}/Voice/OgCall/MakeCall`, form, {
      headers: { 'Content-Type': 'multipart/form-data', Accept: 'text/plain' },
    });
  },

  uploadMedia: (file) => {
    const uploadFile = toUploadFile(file);
    if (!uploadFile) return Promise.reject({ message: 'Missing required field: UploadSoundFile' });

    const form = new FormData();
    form.append('UploadSoundFile', uploadFile);

    return icpaasApi.post(`/api/${REST_VERSION}/Voice/OgCall/MediaUpload`, form, {
      headers: { 'Content-Type': 'multipart/form-data', Accept: 'text/plain' },
    });
  },

  getFileStatus: (mediaId) => {
    if (!mediaId) return Promise.reject({ message: 'Missing required field: mediaId' });
    return icpaasApi.get(`/api/${REST_VERSION}/Voice/OgCall/GetFileStatus/${mediaId}`, {
      headers: { Accept: 'text/plain' },
    });
  },

  getDeliveryReport: ({
    fromDate,
    toDate,
    deliveryStatus,
    responseType,
    reportType,
    maskId,
  } = {}) => {
    if (!fromDate || !toDate) {
      return Promise.reject({ message: 'fromDate and toDate are required (yyyy-MM-dd).' });
    }
    const wantsCsv = String(responseType || '').toLowerCase() === 'csv';

    return icpaasApi.post(
      `/api/${REST_VERSION}/Voice/OgCall/DeliveryReport`,
      { fromDate, toDate, deliveryStatus, responseType, reportType, maskId },
      wantsCsv ? { responseType: 'blob', headers: { Accept: 'text/csv' } } : undefined,
    );
  },
};

export const IVRAPI = {
  makeCall: VoiceAPI.makeCall,
  triggerCall: ({ to, number, numbers, callerId, flow_id, flowId, mediaFileId, ...rest } = {}) =>
    VoiceAPI.makeCall({
      number: to ?? number ?? numbers,
      callerId,
      botFlowId: flowId ?? flow_id,
      mediaFileId,
      ...rest,
    }),
  uploadMedia: VoiceAPI.uploadMedia,
  getFileStatus: VoiceAPI.getFileStatus,
  getDeliveryReport: VoiceAPI.getDeliveryReport,

  getInboundReports: ({ fromDate, toDate, callStatus, channel, exportToCsv = false } = {}) => {
    if (!fromDate || !toDate) {
      return Promise.reject({ message: 'fromDate and toDate are required.' });
    }
    return icpaasApi.post(`/api/${REST_VERSION}/Ivr/Inbound/getivrreports`, {
      fromDate,
      toDate,
      callStatus,
      channel,
      exportToCsv,
    });
  },

  getCallStatus: VoiceAPI.getFileStatus,
  getLiveCalls: () => unsupported('IVR live calls'),
  getCalls: () => unsupported('IVR call history'),
  getStats: () => unsupported('IVR stats'),
};

export const MissedCallAPI = {
  makeTtsCall: () => unsupported('Missed call TTS'),
  getTtsCallStatus: () => unsupported('Missed call TTS status'),
  getLeads: () => unsupported('Missed call leads'),
};

export const BalanceAPI = {
  getBalance: () => icpaasApi.get(`/api/${REST_VERSION}/user/balance`),
};

export const isSuccess = (response) => {
  if (!response) return false;
  const code = String(response.errorCode ?? response.status ?? '');
  return code === '0' || code === '00' || code === '000' || code.toUpperCase() === 'SUCCESS' || response.status === true;
};

export const getJobId = (response) => response?.jobId || response?.callback_data || null;
export const getStatusMessage = (response) => response?.statusMessage || response?.message || '';

// ---------------------------------------------------------------------------
// LiveChatAPI — agent-facing WhatsApp Live Chat surface served by OmniApp.
// See docs/live-agent-reference.md for endpoint semantics and docs/connection.md
// for how this slots into the wider port.
// ---------------------------------------------------------------------------
export const LiveChatAPI = {
  // GET /WAMessage/UserLiveChat/GetChannels
  // → list of WABAChannels the logged-in user is authorised on.
  getChannels: () => omniApi.get('/WAMessage/UserLiveChat/GetChannels'),

  // POST /WAMessage/UserLiveChat/GetChatCount?channel=&chatType=
  // → ChatCountRequestModel (badge counts for the filter chips).
  getCounts: (channel = 'All', chatType = 'All') =>
    omniApi.post('/WAMessage/UserLiveChat/GetChatCount', null, {
      params: { channel, chatType },
    }),

  // POST /WAMessage/UserLiveChat/GetChatList?channel=&chatType=&pageIndex=&pageSize=
  // Body: { Search?: string }
  // → { isOnline, allChats: WebChatsModel[], currentPage, totalPages, totalCount }
  getChatList: ({
    channel = 'All',
    chatType = 'All',
    search,
    pageIndex = 1,
    pageSize = LIVE_CHAT_PAGE_SIZE,
  } = {}) =>
    omniApi.post(
      '/WAMessage/UserLiveChat/GetChatList',
      { Search: search || '' },
      { params: { channel, chatType, pageIndex, pageSize } },
    ),

  // GET /WAMessage/UserLiveChat/GetUserChatMessages
  // Cursor-based: pass beforeId (oldest WAInboxId already loaded) to scroll up.
  // → { chatList: ChatModel[], hasMore, pageSize, canSendTemplate }
  getMessages: ({
    senderNumber,
    channelNumber,
    chatType = 'active',
    beforeId,
    pageSize = LIVE_CHAT_MESSAGE_PAGE_SIZE,
  }) =>
    omniApi.get('/WAMessage/UserLiveChat/GetUserChatMessages', {
      params: { senderNumber, channelNumber, chatType, beforeId, pageSize },
    }),

  // POST /WAMessage/UserLiveChat/SendChatMessage (multipart/form-data)
  // Caller builds the FormData; helper below covers the common path.
  sendMessage: (formData) =>
    omniApi.post('/WAMessage/UserLiveChat/SendChatMessage', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // GET /WAMessage/UserLiveChat/getAllStatus?messageId=...
  // → per-message delivery status timeline.
  getAllStatus: (messageId) =>
    omniApi.get('/WAMessage/UserLiveChat/getAllStatus', { params: { messageId } }),

  // POST /WAMessage/UserLiveChat/AssignAgent
  // force=false returns { confirmNeeded, existingAgentId } when the chat is
  // already owned by another agent; force=true reassigns unconditionally.
  assignAgent: ({ agentId, waNumber, channel, force = false }) =>
    omniApi.post('/WAMessage/UserLiveChat/AssignAgent', null, {
      params: { agentId, waNumber, channel, force },
    }),

  // POST /WAMessage/UserLiveChat/MarkMessagesAsRead
  //   ?senderNumber=&messageId=&wabaNumber=
  // Marks every inbound message from `senderNumber` on `wabaNumber` up to
  // and including `messageId` (a wamid) as read on the server. Returns bool.
  markAsRead: ({ senderNumber, messageId, wabaNumber }) =>
    omniApi.post('/WAMessage/UserLiveChat/MarkMessagesAsRead', null, {
      params: { senderNumber, messageId, wabaNumber },
    }),
};

// Convenience builder for the common text-only send path. Returns a FormData
// instance ready to hand to LiveChatAPI.sendMessage(). Media/location flows
// build their own FormData (v2).
export const buildLiveChatTextForm = ({
  number,
  channel,
  message,
  waInboxId = 0,
  chatType = 'active',
  replyToMessageId,
}) => {
  const fd = new FormData();
  fd.append('Number', number);
  fd.append('Channel', channel);
  fd.append('Message', message);
  fd.append('WaInboxId', String(waInboxId));
  fd.append('ChatType', chatType);
  if (replyToMessageId) fd.append('ReplyToMessageId', replyToMessageId);
  return fd;
};

export default api;
