import {
  buildRcsPayload,
  buildRcsTemplateJsonResult,
  buildRcsVariablesObject,
  extractRcsVariables,
  findRcsTemplate,
  getRcsComponent,
  getRcsTemplateName,
  parseJsonObject,
} from './rcsHelpers';

const component = {
  TextMessage: 'Hello {{1}}, order {{2}} is ready',
  TextMessageVarValue: [
    { '{{1}}': 'Name' },
    { '{{2}}': 'OrderId' },
  ],
  Cards: [
    {
      CardTitle: 'Deal for {{1}}',
      TitleVariables: [{ '{{1}}': 'Product' }],
      CardDescription: 'Save {{1}}',
      DescVariables: [{ '{{1}}': 'Discount' }],
      Suggestions: [
        {
          ActionType: 'OpenUrl',
          UrlVariables: [{ '{{1}}': 'Slug' }],
        },
      ],
    },
  ],
};

const template = {
  AgentId: 'bot-1',
  TemplateName: 'order_ready',
  Component: component,
};

describe('rcsHelpers', () => {
  it('parses JSON components safely', () => {
    expect(parseJsonObject(JSON.stringify(component))).toEqual(component);
    expect(parseJsonObject('bad-json')).toEqual({});
  });

  it('reads RCS template names and components', () => {
    expect(getRcsTemplateName(template)).toBe('order_ready');
    expect(getRcsComponent(template)).toEqual(component);
    expect(findRcsTemplate([template], 'order_ready')).toBe(template);
  });

  it('extracts unique variables from text, cards, and URL suggestions', () => {
    expect(extractRcsVariables(component)).toEqual([
      'Name',
      'OrderId',
      'Product',
      'Discount',
      'Slug',
    ]);
  });

  it('builds RCS variable objects from array or object values', () => {
    const variables = extractRcsVariables(component);

    expect(buildRcsVariablesObject(variables, ['Aman', '42'])).toEqual({
      Name: 'Aman',
      OrderId: '42',
    });

    expect(buildRcsVariablesObject(variables, { Product: 'Shoes' })).toEqual({
      Product: 'Shoes',
    });
  });

  it('builds an RCS send payload', () => {
    expect(buildRcsPayload(template, '9428587817', {
      values: {
        Name: 'Aman',
        OrderId: '42',
      },
      callbackData: 'cb-1',
    })).toEqual({
      botid: 'bot-1',
      templatename: 'order_ready',
      destination: ['919428587817'],
      callbackdata: 'cb-1',
      var: {
        Name: 'Aman',
        OrderId: '42',
      },
    });
  });

  it('builds a Zapier-compatible RCS template JSON result', () => {
    const result = buildRcsTemplateJsonResult({
      template,
      botId: 'bot-1',
      templateName: 'order_ready',
      destination: '9428587817',
      values: {
        Name: 'Aman',
      },
    });

    expect(result.id).toBe('order_ready_9428587817');
    expect(result.variables).toContain('Name');
    expect(result.payload.destination).toEqual(['919428587817']);
    expect(JSON.parse(result.jsonCompact)).toEqual(result.payload);
  });
});
