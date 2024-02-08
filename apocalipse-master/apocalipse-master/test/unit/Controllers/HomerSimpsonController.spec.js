'use strict'
const { test, trait } = use('Test/Suite')('Identificação');

trait('Test/ApiClient'); 

const HomerSimpsonController = use('App/Controllers/Http/HomerSimpsonController');

test('findRecoveryToken -> esperado erro por falta do parametro recoveryToken', async ({ assert, client }) => {

  const response = await client
  .get('/api/v1/participant/find-recovery-token/get?campaignId=123')
  .end();

  assert.equal(response.status, 400);
  assert.exists(response.body);
  assert.equal(response.body.message, 'O parâmetro recoveryToken é obrigatório.');

});