import {
  buildSmsPayload,
  buildSmsTemplateJsonResult,
  buildSmsTemplatePayload,
  countSmsVariables,
  findSmsTemplate,
  getSmsTemplateId,
  getSmsTemplateName,
  getSmsTemplateText,
  replaceSmsVariables,
} from './smsHelpers';

const template = {
  senderId: 'AUBANK',
  templateName: 'WelcomeTemplate',
  templateText: 'Hello {#var#}, your OTP is {#var#}.',
  dltTemplateId: '1107161500710269782',
};

describe('smsHelpers', () => {
  it('reads SMS template fields across API variants', () => {
    expect(getSmsTemplateName(template)).toBe('WelcomeTemplate');
    expect(getSmsTemplateText(template)).toBe('Hello {#var#}, your OTP is {#var#}.');
    expect(getSmsTemplateId(template)).toBe('1107161500710269782');
    expect(findSmsTemplate([template], 'WelcomeTemplate')).toBe(template);
  });

  it('counts and replaces DLT variables', () => {
    expect(countSmsVariables(template.templateText)).toBe(2);
    expect(replaceSmsVariables(template.templateText, ['Aman', '897009'])).toBe(
      'Hello Aman, your OTP is 897009.',
    );
  });

  it('builds a base SMS payload', () => {
    expect(buildSmsPayload(template, '919428587817')).toEqual({
      senderId: 'AUBANK',
      dcs: 0,
      flashSms: 0,
      schedTime: '',
      groupId: '',
      peId: '',
      text: 'Hello {#var#}, your OTP is {#var#}.',
      dltTemplateId: '1107161500710269782',
      chainValue: '',
      messageId: '',
      numbers: ['919428587817'],
    });
  });

  it('builds a send payload with normalized phone and variable values', () => {
    expect(buildSmsTemplatePayload({
      template,
      senderId: 'AUBANK',
      phoneNumber: '9428587817',
      variables: ['Aman', '897009'],
    })).toEqual({
      senderId: 'AUBANK',
      dcs: 0,
      flashSms: 0,
      schedTime: '',
      groupId: '',
      peId: '',
      text: 'Hello Aman, your OTP is 897009.',
      dltTemplateId: '1107161500710269782',
      chainValue: '',
      messageId: '',
      numbers: ['919428587817'],
    });
  });

  it('builds a Zapier-compatible SMS template JSON result', () => {
    const result = buildSmsTemplateJsonResult({
      template,
      senderId: 'AUBANK',
      templateName: 'WelcomeTemplate',
      phoneNumber: '9428587817',
      variables: ['Aman', '897009'],
    });

    expect(result.id).toBe('WelcomeTemplate_9428587817');
    expect(result.senderId).toBe('AUBANK');
    expect(result.dltTemplateId).toBe('1107161500710269782');
    expect(result.payload.text).toBe('Hello Aman, your OTP is 897009.');
    expect(JSON.parse(result.jsonCompact)).toEqual(result.payload);
  });
});
