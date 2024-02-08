'use strict'

const { test } = use('Test/Suite')('Valid Params');
const { validParamsCampaignAndDocuments } = require('../../app/Helpers/validParams');
const { validateParamsCampaignAndRequest } = require('../../app/Helpers/validParams');

test('should return "Valor do documento ausente" when document is missing', async ({ assert }) => {
  const params = { campaign_id: 123 };
  const result = validParamsCampaignAndDocuments(params);

  assert.equal(result, 'Valor do documento ausente');
});

test('should return "Valor da campanha ausente" when campaign_id is missing', async ({ assert }) => {
  const params = { document: '12345' };
  const result = validParamsCampaignAndDocuments(params);

  assert.equal(result, 'Valor da campanha ausente');
});

test('should return "Valor do documento não é um inteiro" when document is not an integer', async ({ assert }) => {
  const params = { campaign_id: 123, document: 'not_an_integer' };
  const result = validParamsCampaignAndDocuments(params);

  assert.equal(result, 'Valor do documento não é um inteiro');
});

test('should return "Valor da campanha não é um inteiro" when campaign_id is not an integer', async ({ assert }) => {
  const params = { campaign_id: 'not_an_integer', document: '12345' };
  const result = validParamsCampaignAndDocuments(params);

  assert.equal(result, 'Valor da campanha não é um inteiro');
});

test('should return "campaign_id invalido ou vazio" when campaign_id is not a number', async ({ assert }) => {
  const params = { campaign_id: 'not_a_number', requestType: 'child' };
  const result = validateParamsCampaignAndRequest(params);

  assert.equal(result, 'campaign_id invalido ou vazio');
});


test('should return "tipo de requisição incorreta ou invalida" when requestType is invalid', async ({ assert }) => {
  const params = { campaign_id: 123, requestType: 'invalid_type' };
  const result = validateParamsCampaignAndRequest(params);

  assert.equal(result, 'tipo de requisição incorreta ou invalida');
});

test('should return undefined ou null when params are valid', async ({ assert }) => {
  const params = { campaign_id: 123, requestType: 'child' };
  const result = validateParamsCampaignAndRequest(params);

  assert.equal(result, undefined || null);
});