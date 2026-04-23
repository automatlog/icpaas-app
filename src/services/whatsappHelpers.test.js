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

const template = {
  name: 'shopifyheaderbodybutton',
  language: 'en',
  category: 'MARKETING',
  components: [
    {
      type: 'HEADER',
      format: 'TEXT',
      text: 'Hello {{1}}',
    },
    {
      type: 'BODY',
      text: 'Welcome {{1}}, your offer is {{2}}',
    },
    {
      type: 'BUTTONS',
      buttons: [
        {
          type: 'URL',
          text: 'Shop',
          url: 'https://example.com/{{1}}',
          example: ['offer-1'],
        },
        {
          type: 'COPY_CODE',
          example: 'SAVE20',
        },
      ],
    },
  ],
};

describe('whatsappHelpers', () => {
  it('encodes and parses template selections', () => {
    expect(encodeWhatsAppTemplateSelection(template)).toBe('shopifyheaderbodybutton::en');
    expect(parseWhatsAppTemplateSelection('shopifyheaderbodybutton::en')).toEqual({
      name: 'shopifyheaderbodybutton',
      language: 'en',
    });
  });

  it('finds a selected template by name and language', () => {
    expect(findWhatsAppTemplate([template], 'shopifyheaderbodybutton::en')).toBe(template);
    expect(findWhatsAppTemplate([template], 'missing::en')).toBeNull();
  });

  it('normalizes Indian and international phone numbers for messaging', () => {
    expect(normalizeForMessaging('9428587817')).toBe('919428587817');
    expect(normalizeForMessaging('+1 650 555 1234')).toBe('16505551234');
  });

  it('extracts variables from headers, body, and buttons', () => {
    expect(extractWhatsAppVariables(template.components)).toEqual({
      header: [{ type: 'text', index: 0 }],
      body: [
        { type: 'text', index: 0, placeholder: '{{1}}' },
        { type: 'text', index: 1, placeholder: '{{2}}' },
      ],
      buttons: [
        { type: 'url', index: 0 },
        { type: 'copy_code', index: 1 },
      ],
    });
  });

  it('builds a send payload with variables and button parameters', () => {
    const inputData = buildInputData({
      headerText: ['John'],
      body: ['John', '20%'],
      buttonUrl: ['offer-1'],
      buttonCoupon: ['SAVE20'],
    });

    expect(buildWhatsAppSendPayload(template, inputData, undefined, '919428587817')).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '919428587817',
      type: 'template',
      template: {
        name: 'shopifyheaderbodybutton',
        language: { code: 'en' },
        components: [
          {
            type: 'header',
            parameters: [{ type: 'text', text: 'John' }],
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'John' },
              { type: 'text', text: '20%' },
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: 'offer-1' }],
          },
          {
            type: 'button',
            sub_type: 'copy_code',
            index: '1',
            parameters: [{ type: 'coupon_code', coupon_code: 'SAVE20' }],
          },
        ],
      },
      biz_opaque_callback_data: '',
    });
  });

  it('builds a sample template JSON payload from template metadata', () => {
    const payload = buildWhatsAppTemplatePayload(template, '919428587817');

    expect(payload.template.components).toEqual([
      {
        type: 'header',
        parameters: [{ type: 'text', text: '{{1}}' }],
      },
      {
        type: 'body',
        parameters: [
          { type: 'text', text: '{{1}}' },
          { type: 'text', text: '{{2}}' },
        ],
      },
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: '{{url_param}}' }],
      },
      {
        type: 'button',
        sub_type: 'copy_code',
        index: '1',
        parameters: [{ type: 'coupon_code', coupon_code: '{{coupon_code}}' }],
      },
    ]);
  });
});
