'use strict'

const { test, trait } = use('Test/Suite')('Identificação')
const homerService = require('../../app/Providers/HomerSimpsonService')
const homer = new homerService()

trait('Test/ApiClient')

test('deve identificar e retornar um email válido', async ({ assert }) => {
  const login = 'test@example.com'
  const campaignId = 1
  
  const resultado = homer.identifyEmailOrCPF(login, campaignId)

  assert.deepEqual(resultado, { email: login, campaignId })
})

test('deve identificar e retornar um CPF válido', async ({ assert }) => {
  const login = '14520127769'
  const campaignId = 2

  const resultado = homer.identifyEmailOrCPF(login, campaignId)

  assert.deepEqual(resultado, { cpf: login, campaignId })
})

test('deve identificar e retornar um CNPJ válido', async ({ assert }) => {
  const login = '59668757000109'
  const campaignId = 3

  const resultado = homer.identifyEmailOrCPF(login, campaignId)


  assert.deepEqual(resultado, { cnpj: login, campaignId })
})

test('deve lançar erro ao receber parâmetros inválidos', async ({ assert }) => {
  const login = 12345
  const campaignId = 'not_a_number'

  const erroFn = () => homer.identifyEmailOrCPF(login, campaignId)

  assert.throw(erroFn, 'Parâmetros inválidos. login deve ser uma string e campaignId deve ser um número não negativo.')
})

test('deve retornar null para email inválido', async ({ assert }) => {
  const login = 'invalid.email'
  const campaignId = 4

  const resultado = homer.identifyEmailOrCPF(login, campaignId)

  assert.isNull(resultado)
})

test('deve retornar null para CNPJ inválido', async ({ assert }) => {
  const invalidCnpj = '12345678901234' // CNPJ inválido
  const campaignId = 6

  const resultado = homer.identifyEmailOrCPF(invalidCnpj, campaignId)

  assert.isNull(resultado)
})

test('deve lançar erro para campaignId negativo', async ({ assert }) => {
  const login = 'test@example.com'
  const campaignId = -1 // CampaignID negativo

  const erroFn = () => homer.identifyEmailOrCPF(login, campaignId)

  assert.throw(erroFn, 'Parâmetros inválidos. login deve ser uma string e campaignId deve ser um número não negativo.')
})