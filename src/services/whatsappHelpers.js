export const WHATSAPP_TEMPLATE_SEPARATOR = '::';

export const cleanSheetValue = (value) => {
  if (!value) return value;

  const str = value.toString().trim();
  const match = str.match(/^\d+\.\s*[^:]+\s*:\s*(.+)$/);
  return match ? match[1].trim() : str;
};

export const parseWhatsAppTemplateSelection = (value) => {
  if (!value) return { name: '', language: '' };

  const separatorIndex = value.lastIndexOf(WHATSAPP_TEMPLATE_SEPARATOR);
  if (separatorIndex === -1) return { name: value, language: '' };

  return {
    name: value.slice(0, separatorIndex),
    language: value.slice(separatorIndex + WHATSAPP_TEMPLATE_SEPARATOR.length),
  };
};

export const encodeWhatsAppTemplateSelection = (template) =>
  `${template.name}${WHATSAPP_TEMPLATE_SEPARATOR}${template.language || 'en'}`;

export const findWhatsAppTemplate = (templates = [], templateSelection) => {
  const { name, language } = parseWhatsAppTemplateSelection(templateSelection);
  const normalizedName = name || templateSelection;

  if (language) {
    const exactMatch = templates.find(
      (template) => template.name === normalizedName && (template.language || 'en') === language,
    );
    if (exactMatch) return exactMatch;
  }

  return templates.find((template) => template.name === normalizedName) || null;
};

export const parsePhoneNumberSmart = (rawNumber, defaultRegion = 'IN') => {
  if (!rawNumber || typeof rawNumber !== 'string') {
    return { e164: null, countryCode: 0, region: null, nationalNumber: null };
  }

  const compact = rawNumber.trim().replace(/[\s\-()]/g, '');
  const digits = compact.replace(/[^\d]/g, '');

  if (!digits) {
    return { e164: null, countryCode: 0, region: null, nationalNumber: null };
  }

  if (compact.startsWith('+')) {
    return {
      e164: `+${digits}`,
      countryCode: Number(digits.slice(0, Math.max(1, digits.length - 10))) || 0,
      region: null,
      nationalNumber: digits.slice(-10),
    };
  }

  if (defaultRegion === 'IN' && digits.length === 10) {
    return {
      e164: `+91${digits}`,
      countryCode: 91,
      region: 'IN',
      nationalNumber: digits,
    };
  }

  if (defaultRegion === 'IN' && digits.length === 12 && digits.startsWith('91')) {
    return {
      e164: `+${digits}`,
      countryCode: 91,
      region: 'IN',
      nationalNumber: digits.slice(2),
    };
  }

  if (digits.length >= 8 && digits.length <= 15) {
    return {
      e164: `+${digits}`,
      countryCode: Number(digits.slice(0, Math.max(1, digits.length - 10))) || 0,
      region: null,
      nationalNumber: digits.slice(-10),
    };
  }

  return { e164: null, countryCode: 0, region: null, nationalNumber: null };
};

export const normalizeForMessaging = (rawNumber, defaultRegion = 'IN') => {
  const parsed = parsePhoneNumberSmart(rawNumber, defaultRegion);
  return parsed.e164 ? parsed.e164.replace(/^\+/, '') : null;
};

export const extractWhatsAppVariables = (components = []) => {
  const variables = {
    header: [],
    body: [],
    buttons: [],
  };

  if (!Array.isArray(components)) return variables;

  components.forEach((component) => {
    const componentType = (component.type || '').toUpperCase();

    if (componentType === 'HEADER') {
      const formatType = (component.format || 'TEXT').toUpperCase();
      if (formatType === 'TEXT') {
        const count = ((component.text || '').match(/\{\{/g) || []).length;
        for (let index = 0; index < count; index += 1) {
          variables.header.push({ type: 'text', index });
        }
      } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(formatType)) {
        variables.header.push({ type: formatType.toLowerCase(), index: 0 });
      }
    } else if (componentType === 'BODY') {
      const matches = (component.text || '').match(/\{\{\d+\}\}/g) || [];
      matches.forEach((match, index) => {
        variables.body.push({ type: 'text', index, placeholder: match });
      });
    } else if (componentType === 'BUTTONS') {
      (component.buttons || []).forEach((button, index) => {
        const buttonType = (button.type || '').toUpperCase();
        if (buttonType === 'URL' && button.example?.length > 0) {
          variables.buttons.push({ type: 'url', index });
        } else if (buttonType === 'COPY_CODE') {
          variables.buttons.push({ type: 'copy_code', index });
        } else if (buttonType === 'QUICK_REPLY') {
          variables.buttons.push({ type: 'quick_reply', index, payload: button.text || 'quick_reply' });
        }
      });
    }
  });

  return variables;
};

const buildHeaderParameter = (headerVar, inputData, index) => {
  if (headerVar.type === 'text') {
    const value = cleanSheetValue(inputData[`header_text_${index}`]);
    return value ? { type: 'text', text: value } : null;
  }

  const mediaId = inputData[`header_${headerVar.type}_id`];
  const mediaUrl = inputData[`header_${headerVar.type}_url`];
  if (!mediaId && !mediaUrl) return null;

  const mediaPayload = mediaId ? { id: mediaId } : { link: mediaUrl };
  if (headerVar.type === 'document') {
    mediaPayload.filename = inputData.header_document_filename || 'document.pdf';
  }

  return {
    type: headerVar.type,
    [headerVar.type]: mediaPayload,
  };
};

export const buildWhatsAppSendPayload = (template, inputData = {}, variables, recipientPhone) => {
  const resolvedVariables = variables || extractWhatsAppVariables(template.components || []);
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientPhone,
    type: 'template',
    template: {
      name: template.name,
      language: { code: template.language || 'en' },
      components: [],
    },
    biz_opaque_callback_data: '',
  };

  const headerParams = resolvedVariables.header
    .map((headerVar, index) => buildHeaderParameter(headerVar, inputData, index))
    .filter(Boolean);
  if (headerParams.length > 0) {
    payload.template.components.push({ type: 'header', parameters: headerParams });
  }

  const bodyParams = resolvedVariables.body
    .map((bodyVar, index) => {
      const value = cleanSheetValue(inputData[`body_${index}`]);
      return value ? { type: 'text', text: value } : null;
    })
    .filter(Boolean);
  if (bodyParams.length > 0) {
    payload.template.components.push({ type: 'body', parameters: bodyParams });
  }

  let urlVariableIndex = 0;
  let couponVariableIndex = 0;
  let payloadVariableIndex = 0;

  resolvedVariables.buttons.forEach((buttonVar) => {
    if (buttonVar.type === 'url') {
      const urlParam = cleanSheetValue(inputData[`button_url_${urlVariableIndex}`]);
      urlVariableIndex += 1;
      if (urlParam) {
        payload.template.components.push({
          type: 'button',
          sub_type: 'url',
          index: String(buttonVar.index),
          parameters: [{ type: 'text', text: urlParam }],
        });
      }
    } else if (buttonVar.type === 'copy_code') {
      const couponCode = cleanSheetValue(inputData[`button_coupon_${couponVariableIndex}`]);
      couponVariableIndex += 1;
      if (couponCode) {
        payload.template.components.push({
          type: 'button',
          sub_type: 'copy_code',
          index: String(buttonVar.index),
          parameters: [{ type: 'coupon_code', coupon_code: couponCode }],
        });
      }
    } else if (buttonVar.type === 'quick_reply') {
      const payloadValue = cleanSheetValue(inputData[`button_payload_${payloadVariableIndex}`]) || buttonVar.payload;
      payloadVariableIndex += 1;
      payload.template.components.push({
        type: 'button',
        sub_type: 'quick_reply',
        index: String(buttonVar.index),
        parameters: [{ type: 'payload', payload: payloadValue }],
      });
    }
  });

  return payload;
};

export const buildWhatsAppTemplatePayload = (template, recipientNumber) => {
  let components = template.component || template.components || [];
  if (typeof components === 'string') {
    try {
      components = JSON.parse(components);
    } catch {
      components = [];
    }
  }

  const name = template.templateName || template.name;
  const language = template.language || template.languageCode || 'en';
  const category = (template.category || '').toString().toUpperCase();
  const isAuthenticationTemplate = category === 'AUTHENTICATION' || template.category === 103;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientNumber || '{{to}}',
    type: 'template',
    template: {
      name,
      language: { code: language },
      components: [],
    },
    biz_opaque_callback_data: '',
  };

  if (!Array.isArray(components)) return payload;

  let buttonIndex = 0;

  components.forEach((component) => {
    const componentType = (component.type || '').toUpperCase();

    if (componentType === 'HEADER') {
      const formatType = (component.format || 'TEXT').toUpperCase();
      const count = ((component.text || '').match(/\{\{/g) || []).length;
      if (formatType === 'TEXT' && count > 0) {
        payload.template.components.push({
          type: 'header',
          parameters: Array.from({ length: count }, (_, index) => ({
            type: 'text',
            text: `{{${index + 1}}}`,
          })),
        });
      } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(formatType)) {
        const type = formatType.toLowerCase();
        const media = { id: '{{MediaID}}', link: '{{MediaURL}}' };
        if (type === 'document') media.filename = '{{filename}}';
        payload.template.components.push({
          type: 'header',
          parameters: [{ type, [type]: media }],
        });
      }
    } else if (componentType === 'BODY') {
      const matches = (component.text || '').match(/\{\{\d+\}\}/g) || [];
      if (isAuthenticationTemplate) {
        payload.template.components.push({
          type: 'body',
          parameters: [{ type: 'text', text: '{{OTP_CODE}}' }],
        });
      } else if (matches.length > 0) {
        payload.template.components.push({
          type: 'body',
          parameters: matches.map((match) => ({ type: 'text', text: match })),
        });
      }
    } else if (componentType === 'BUTTONS') {
      (component.buttons || []).forEach((button) => {
        const buttonType = (button.type || '').toUpperCase();
        if (buttonType === 'QUICK_REPLY') {
          payload.template.components.push({
            type: 'button',
            sub_type: 'quick_reply',
            index: String(buttonIndex),
            parameters: [{ type: 'payload', payload: button.text || 'quick_reply' }],
          });
          buttonIndex += 1;
        } else if (buttonType === 'URL') {
          if (button.example?.length > 0) {
            payload.template.components.push({
              type: 'button',
              sub_type: 'url',
              index: String(buttonIndex),
              parameters: [{ type: 'text', text: '{{url_param}}' }],
            });
          }
          buttonIndex += 1;
        } else if (buttonType === 'COPY_CODE') {
          payload.template.components.push({
            type: 'button',
            sub_type: 'copy_code',
            index: String(buttonIndex),
            parameters: [{ type: 'coupon_code', coupon_code: '{{coupon_code}}' }],
          });
          buttonIndex += 1;
        }
      });
    }
  });

  return payload;
};

export const buildInputData = (templateVariables = {}) => {
  const {
    headerText = [],
    body = [],
    buttonUrl = [],
    buttonCoupon = [],
    buttonPayload = [],
    headerMedia = null,
  } = templateVariables;

  const inputData = {};
  headerText.forEach((value, index) => { inputData[`header_text_${index}`] = value; });
  body.forEach((value, index) => { inputData[`body_${index}`] = value; });
  buttonUrl.forEach((value, index) => { inputData[`button_url_${index}`] = value; });
  buttonCoupon.forEach((value, index) => { inputData[`button_coupon_${index}`] = value; });
  buttonPayload.forEach((value, index) => { inputData[`button_payload_${index}`] = value; });

  if (headerMedia && typeof headerMedia === 'object') {
    const mediaType = (headerMedia.type || '').toLowerCase();
    if (['image', 'video', 'document'].includes(mediaType)) {
      inputData[`header_${mediaType}_id`] = headerMedia.id;
      inputData[`header_${mediaType}_url`] = headerMedia.url;
      if (mediaType === 'document') {
        inputData.header_document_filename = headerMedia.filename;
      }
    }
  }

  return inputData;
};
