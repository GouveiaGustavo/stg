'use strict';
const { productsWithFreeFreight } = require('../../mocks/PabloEscobarHelper/products.example.js');
const { productsWithoutFreeFreight } = require('../../mocks/PabloEscobarHelper/products.example.js');
const { test } = use('Test/Suite')('PabloEscobarHelper');
const PabloescobarHelper = new (use('PabloEscobarHelper'))();

test('validateFreight -> Retorna validação de frete com o cálculo de valores resultantes considerando frete grátis', async ({ assert }) => {
  const validatedValues = await PabloescobarHelper.validateFreight(productsWithFreeFreight);
  assert.equal(validatedValues.myOrder.totalFreight, 0);
  assert.equal(validatedValues.myOrder.totalPrice, 26);
  assert.equal(validatedValues.resultingProducts[0].freightPoints, 0);
  assert.equal(validatedValues.resultingProducts[0].free_freight, 1);
});

test('validateFreight -> Retorna validação de frete com o cálculo de valores resultantes considerando frete pago', async ({ assert }) => {
  const validatedValues = await PabloescobarHelper.validateFreight(productsWithoutFreeFreight);
  assert.equal(validatedValues.myOrder.totalFreight, 10);
  assert.equal(validatedValues.myOrder.totalPrice, 26);
  assert.equal(validatedValues.resultingProducts[0].freightPoints, 10);
  assert.equal(validatedValues.resultingProducts[0].free_freight, 0);
});

