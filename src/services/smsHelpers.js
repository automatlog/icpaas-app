import { normalizeForMessaging } from './whatsappHelpers';

export const getSmsTemplateName = (template = {}) =>
  template.templateName || template.TemplateName || template.name || '';

export const getSmsTemplateText = (template = {}) =>
  template.templateText || template.TemplateText || template.text || template.message || '';

export const getSmsTemplateId = (template = {}) =>
  template.templateId ||
  template.dltTemplateId ||
  template.DLTTemplateId ||
  template.tmplId ||
  template.id ||
  '';

export const findSmsTemplate = (templates = [], templateName) =>
  templates.find((template) => getSmsTemplateName(template) === templateName) || null;

export const countSmsVariables = (templateText) => {
  if (!templateText) return 0;
  const matches = templateText.match(/\{#var#\}/g);
  return matches ? matches.length : 0;
};

export const replaceSmsVariables = (templateText, variableValues = []) => {
  if (!templateText || variableValues.length === 0) return templateText;

  let result = templateText;
  variableValues.forEach((value) => {
    result = result.replace('{#var#}', String(value));
  });
  return result;
};

export const buildSmsPayload = (template = {}, phoneNumber, options = {}) => ({
  senderId: options.senderId || template.senderId,
  dcs: options.dcs ?? 0,
  flashSms: options.flashSms ?? 0,
  schedTime: options.schedTime ?? '',
  groupId: options.groupId ?? '',
  peId: options.peId ?? template.peId ?? '',
  text: options.text || getSmsTemplateText(template),
  dltTemplateId: options.dltTemplateId || getSmsTemplateId(template),
  chainValue: options.chainValue ?? template.chainValue ?? '',
  messageId: options.messageId ?? '',
  numbers: Array.isArray(phoneNumber) ? phoneNumber : [phoneNumber],
});

export const buildSmsTemplatePayload = ({
  template,
  senderId,
  phoneNumber,
  variables = [],
  defaultRegion = 'IN',
  options = {},
}) => {
  const normalizedPhone = normalizeForMessaging(phoneNumber, defaultRegion) || phoneNumber;
  const text = replaceSmsVariables(getSmsTemplateText(template), variables);

  return buildSmsPayload(
    {
      ...template,
      senderId: senderId || template.senderId,
      templateText: text,
    },
    normalizedPhone,
    options,
  );
};

export const buildSmsTemplateJsonResult = ({
  template,
  senderId,
  templateName,
  phoneNumber,
  variables = [],
  defaultRegion = 'IN',
}) => {
  const payload = buildSmsTemplatePayload({
    template,
    senderId,
    phoneNumber,
    variables,
    defaultRegion,
  });

  return {
    id: `${templateName || getSmsTemplateName(template)}_${phoneNumber}`,
    name: `${templateName || getSmsTemplateName(template)} for ${phoneNumber}`,
    senderId: senderId || template.senderId,
    templateName: templateName || getSmsTemplateName(template),
    phoneNumber,
    dltTemplateId: getSmsTemplateId(template),
    variableCount: countSmsVariables(getSmsTemplateText(template)),
    json: JSON.stringify(payload, null, 2),
    jsonCompact: JSON.stringify(payload),
    payload,
  };
};
