'use strict';

const { focusArray } =  require ("../../mocks/HomerSimpsonService/focus-array.example");
const { focusExpectedResponse, focusErrorResponse } =  require ("../../mocks/HomerSimpsonService/focus-response.example");
const { mechanics, focos } = require('../../mocks/HomerSimpsonService/mechanics-array.example');
const { getMechanicsMock, getMechanicsResponse } = require('../../mocks/HomerSimpsonService/getmechanics-array.example');
const { test } = use('Test/Suite')('Homer Simpsom Service');

const HomerHelperService = new (use('HomerSimpsonService'))();

test('filterMechanicsByDate -> Retorna mensagens filtradas caso data inicial da mechanic  esteja dentro do mes da data informada', ({ assert }) => {
  const mechanics = {
    message: [
      {
        mechanic: {
          begin_at: '2022-11-01T03:00:00.000Z',
          end_at: '2022-11-24T03:00:00.000Z'
        }
      },
      {
        mechanic: {
          begin_at: '2022-01-01T03:00:00.000Z',
          end_at: '2022-01-24T03:00:00.000Z'
        }
      }
    ]
  };

  const messages = HomerHelperService.filterMechanicsByDate(mechanics, '2022-11-24');
  assert.equal(messages.length, 1);
});

test('filterMechanicsByDate -> Retorna mensagens filtradas caso data final da mechanic esteja dentro do mes da data informada', ({ assert }) => {
  const mechanics = {
    message: [
      {
        mechanic: {
          begin_at: '2022-10-01T03:00:00.000Z',
          end_at: '2022-11-22T03:00:00.000Z'
        }
      },
      {
        mechanic: {
          begin_at: '2022-01-01T03:00:00.000Z',
          end_at: '2022-01-24T03:00:00.000Z'
        }
      }
    ]
  };

  const messages = HomerHelperService.filterMechanicsByDate(mechanics, '2022-11-24');
  assert.equal(messages.length, 1);
});


test('filterMechanicsByDate -> Retorna mensagens filtradas caso data inicial da mechanic  esteja fora do mes da data informada E o fim dela esteja também fora do mês', ({ assert }) => {
  const mechanics = {
    message: [
      {
        mechanic: {
          begin_at: '2022-10-01T03:00:00.000Z',
          end_at: '2023-01-24T03:00:00.000Z'
        }
      },
      {
        mechanic: {
          begin_at: '2022-01-01T03:00:00.000Z',
          end_at: '2022-01-24T03:00:00.000Z'
        }
      }
    ]
  };

  const messages = HomerHelperService.filterMechanicsByDate(mechanics, '2022-11-24');
  assert.equal(messages.length, 1);
});

test('filterMechanicsByDate -> Retorna vazio se condições da data informada não forem cumpridas', ({ assert }) => {
  const mechanics = {
    message: [
      {
        mechanic: {
          begin_at: '2021-10-01T03:00:00.000Z',
          end_at: '2021-01-24T03:00:00.000Z'
        }
      },
      {
        mechanic: {
          begin_at: '2021-01-01T03:00:00.000Z',
          end_at: '2021-01-24T03:00:00.000Z'
        }
      },
      {
        mechanic: {
          begin_at: '2021-10-01T03:00:00.000Z',
          end_at: '2021-01-24T03:00:00.000Z'
        }
      },
      {
        mechanic: {
          begin_at: '2019-01-01T03:00:00.000Z',
          end_at: '2019-01-24T03:00:00.000Z'
        }
      }
    ]
  };

  const messages = HomerHelperService.filterMechanicsByDate(mechanics, '2022-11-24');
  assert.equal(messages.length, 0);
});

test('mountJson -> Retorna o objeto correto caso receba o array de mecanicas', async ({ assert }) => {

const focus = await HomerHelperService.mountJson(focusArray)

assert.deepEqual(focus, focusExpectedResponse);
});

test('mountJson -> Retorna o objeto correto caso nao receba parametros', async ({ assert }) => {

  const focus = await HomerHelperService.mountJson()

  assert.deepEqual(focus, focusErrorResponse);
  });

test('getPossiblePointsCalc -> Retorna o calculo correto dos pontos possíveis', async ({ assert }) => {
  const possiblePointsObj = {
    percentage_value_reached: 96.48506151142355,
    value_reached: 2745,
    total_available_points: 2845
  };
  const respPossiblePointsCalc = await HomerHelperService.getPossiblePointsCalc(mechanics, focos);
  assert.deepEqual(respPossiblePointsCalc, possiblePointsObj);
});

test('manipulateGetMechanicsObj -> Retorna a mecânica no formato correto (insights:off)', async ({ assert }) => {
  const params = {
    participant_id: '59866',
    campaign_id: '122',
    enabled: '1',
    insights: '0',
    date: '2023-01-09'
  };
  const manipulatedMechanics = await HomerHelperService.manipulateGetMechanicsObj(getMechanicsMock, params);
  assert.deepEqual(manipulatedMechanics, getMechanicsResponse);
});

test('joinMechanicToGoals -> Retorna um objeto com o goal e sua respectiva mecanica', async ({ assert }) => {
  const goals = [{ mechanic_id: 1 }];
  const mechanics = [{ id: 1 }];
  const expectedgoalsWithMechanic = [ { goal: { mechanic_id: 1 }, mechanic: { id: 1 } } ];
  const goalsWithMechanic = await HomerHelperService.joinMechanicToGoals(goals, mechanics);
  assert.deepEqual(goalsWithMechanic, expectedgoalsWithMechanic);
});
test('joinMechanicToGoals -> Retorna um array vazio se nao houverem mecanicas com id identico ao mechanic_id dentro do goal', async ({ assert }) => {
  const goals = [{ mechanic_id: 1 }];
  const mechanics = [{ id: 2 }];
  const goalsWithMechanic = await HomerHelperService.joinMechanicToGoals(goals, mechanics);
  assert.deepEqual(goalsWithMechanic, []);
});
test('splitGoalsByMonth -> Espera que retorne um array  ', async ({ assert }) => {
  const goalsWithMechanic =[
    {
      goal: { id: 1 },
      mechanic: { mechanic_id: 1, end_at: '01/01/2000' }
    }
  ];
  const goalsByMonth = await HomerHelperService.splitGoalsByMonth(goalsWithMechanic);
  assert.isArray(goalsByMonth);
});
test('splitGoalsByMonth -> Espera um array de tamanho 7', async ({ assert }) => {
  const goalsWithMechanic =[
    {
      goal: { id: 1 },
      mechanic: { mechanic_id: 1, end_at: '01/01/2000' }
    }
  ];
  const goalsByMonth = await HomerHelperService.splitGoalsByMonth(goalsWithMechanic);
  assert.lengthOf(goalsByMonth, 7);
});
test('splitGoalsByMonth -> Espera que contenha uma chave "month" e "percent" no primeiro objeto ', async ({ assert }) => {
  const goalsWithMechanic =[
    {
      goal: { id: 1 },
      mechanic: { mechanic_id: 1, end_at: '01/01/2000' }
    }
  ];
  const goalsByMonth = await HomerHelperService.splitGoalsByMonth(goalsWithMechanic);
  assert.hasAllKeys(goalsByMonth[0], ['month', 'percent']);
});
test('splitGoalsByMonth -> Espera que o valor de "month" no primeiro objeto seja uma string ', async ({ assert }) => {
  const goalsWithMechanic =[
    {
      goal: { id: 1 },
      mechanic: { mechanic_id: 1, end_at: '01/01/2000' }
    }
  ];
  const goalsByMonth = await HomerHelperService.splitGoalsByMonth(goalsWithMechanic);
  assert.isString(goalsByMonth[0].month);
});
test('splitGoalsByMonth -> Espera que o valor de "percent" no primeiro objeto seja um numero ', async ({ assert }) => {
  const goalsWithMechanic =[
    {
      goal: { id: 1 },
      mechanic: { mechanic_id: 1, end_at: '01/01/2000' }
    }
  ];
  const goalsByMonth = await HomerHelperService.splitGoalsByMonth(goalsWithMechanic);
  assert.isNumber(goalsByMonth[0].percent);
});
test('splitGoalsByMonth -> Espera que o valor de "percent" no primeiro objeto seja 0 ', async ({ assert }) => {
  const goalsWithMechanic =[
    {
      goal: { id: 1 },
      mechanic: { mechanic_id: 1, end_at: '01/01/2000' }
    }
  ];
  const goalsByMonth = await HomerHelperService.splitGoalsByMonth(goalsWithMechanic);
  assert.propertyVal(goalsByMonth[0], 'percent', 0);
});
test('getGoalsByMechanicType -> Espera que o retorno seja um objeto ', async ({ assert }) => {
  const mechanicsType = [{ id: 1, alias: 'bateu_ganhou' }];
  const goalsWithMechanic =[
    {
      goal: { id: 1 },
      mechanic: { mechanic_type_id: 1 }
    }
  ];
  const goalByMechanicType = await HomerHelperService.getGoalsByMechanicType(mechanicsType, goalsWithMechanic);
  assert.isObject(goalByMechanicType);
});
test('getGoalsByMechanicType -> Espera que o objeto retornado tenha uma chave "bateu_ganhou" ', async ({ assert }) => {
  const mechanicsType = [{ id: 1, alias: 'bateu_ganhou' }];
  const goalsWithMechanic =[
    {
      goal: { id: 1 },
      mechanic: { mechanic_type_id: 1 }
    }
  ];
  const goalByMechanicType = await HomerHelperService.getGoalsByMechanicType(mechanicsType, goalsWithMechanic);
  assert.property(goalByMechanicType, 'bateu_ganhou');
});
test('getGoalsByMechanicType -> Espera que a chave "bateu_ganhou" tenha um array ', async ({ assert }) => {
  const mechanicsType = [{ id: 1, alias: 'bateu_ganhou' }];
  const goalsWithMechanic =[
    {
      goal: { id: 1 },
      mechanic: { mechanic_type_id: 1 }
    }
  ];
  const goalByMechanicType = await HomerHelperService.getGoalsByMechanicType(mechanicsType, goalsWithMechanic);
  assert.isArray(goalByMechanicType.bateu_ganhou);
});
test('getGoalsByMechanicType -> Espera que nao traga a chave "bateu_ganhou" ', async ({ assert }) => {
  const mechanicsType = [];
  const goalsWithMechanic = [];
  const goalByMechanicType = await HomerHelperService.getGoalsByMechanicType(mechanicsType, goalsWithMechanic);
  assert.doesNotHaveAnyKeys(goalByMechanicType, ['bateu_ganhou']);
});

test('isValidSpecialRule -> Retorna se a special rule é válida, precisa estar nula para ser válida', async ({ assert }) => {
  const special_rule_accepted_terms_at = null;
  const response = await HomerHelperService.isValidSpecialRule(special_rule_accepted_terms_at);
  assert.equal(true, response.status);
});

test('isValidSpecialRule -> Retorna se a special rule é válida, qualquer valor diferente de nulo vai ser inválido', async ({ assert }) => {
  const special_rule_accepted_terms_at = '2023-09-25T10:00:00';
  const response = await HomerHelperService.isValidSpecialRule(special_rule_accepted_terms_at);
  assert.equal(false, response.status);
});