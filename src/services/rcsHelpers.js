import { normalizeForMessaging } from './whatsappHelpers';

export const parseJsonObject = (value) => {
  if (!value || typeof value !== 'string') {
    return value && typeof value === 'object' ? value : {};
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

export const getRcsTemplateName = (template = {}) =>
  template.templateName || template.TemplateName || template.name || '';

export const getRcsBotId = (template = {}) =>
  template.botId || template.AgentId || template.agentId || '';

export const getRcsComponent = (template = {}) =>
  parseJsonObject(template.component || template.Component || template.template_data || template.templateData);

export const findRcsTemplate = (templates = [], templateName) =>
  templates.find((template) => getRcsTemplateName(template) === templateName) || null;

const appendVariableConfig = (variables, varConfig = {}) => {
  const placeholder = Object.keys(varConfig)[0];
  const varValue = varConfig[placeholder];
  if (varValue && !variables.includes(varValue)) {
    variables.push(varValue);
  }
};

export const extractRcsVariables = (component = {}) => {
  const variables = [];

  if (!component || typeof component !== 'object') return variables;

  if (Array.isArray(component.TextMessageVarValue)) {
    component.TextMessageVarValue.forEach((varConfig) => appendVariableConfig(variables, varConfig));
  }

  if (Array.isArray(component.Cards)) {
    component.Cards.forEach((card) => {
      if (Array.isArray(card.TitleVariables)) {
        card.TitleVariables.forEach((varConfig) => appendVariableConfig(variables, varConfig));
      }

      if (Array.isArray(card.DescVariables)) {
        card.DescVariables.forEach((varConfig) => appendVariableConfig(variables, varConfig));
      }

      if (Array.isArray(card.Suggestions)) {
        card.Suggestions.forEach((suggestion) => {
          if (Array.isArray(suggestion.UrlVariables)) {
            suggestion.UrlVariables.forEach((varConfig) => appendVariableConfig(variables, varConfig));
          }
        });
      }
    });
  }

  return variables;
};

export const buildRcsVariablesObject = (variables = [], values) => {
  const varObject = {};

  variables.forEach((varName, index) => {
    const value = Array.isArray(values) ? values[index] : values?.[varName];
    if (value !== undefined && value !== null && value !== '') {
      varObject[varName] = String(value);
    }
  });

  return varObject;
};

export const buildRcsPayload = (template = {}, destination, options = {}) => {
  const component = getRcsComponent(template);
  const variables = options.variables || extractRcsVariables(component);
  const values = options.values || options.var || {};
  const varObject = options.varObject || buildRcsVariablesObject(variables, values);

  const normalizedDestination =
    normalizeForMessaging(destination, options.defaultRegion || 'IN') || destination;

  const payload = {
    botid: options.botId || getRcsBotId(template),
    templatename: options.templateName || getRcsTemplateName(template),
    destination: Array.isArray(normalizedDestination) ? normalizedDestination : [normalizedDestination],
    callbackdata: options.callbackdata || options.callbackData || '',
  };

  if (Object.keys(varObject).length > 0) {
    payload.var = varObject;
  }

  return payload;
};

export const buildRcsTemplateJsonResult = ({
  template,
  botId,
  templateName,
  destination,
  values = {},
  defaultRegion = 'IN',
}) => {
  const payload = buildRcsPayload(template, destination, {
    botId,
    templateName,
    values,
    defaultRegion,
  });

  return {
    id: `${templateName || getRcsTemplateName(template)}_${destination}`,
    name: `${templateName || getRcsTemplateName(template)} for ${destination}`,
    botId: botId || getRcsBotId(template),
    templateName: templateName || getRcsTemplateName(template),
    destination,
    variables: extractRcsVariables(getRcsComponent(template)),
    json: JSON.stringify(payload, null, 2),
    jsonCompact: JSON.stringify(payload),
    payload,
  };
};
