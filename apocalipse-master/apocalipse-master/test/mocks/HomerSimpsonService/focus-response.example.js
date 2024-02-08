const focusExpectedResponse = { fail: false, message: { data: [
  {
    'id': 41683,
    'enabled': 1,
    'name': 'Focos Mensais',
    'mechanic_identifier': 'TESTE TESTE',
    'description': 'ATINGIR 3PP ACIMA DO MES ANTERIOR',
    'nomenclature': 'COB',
    'unity_type_id': 1,
    'date_init': '2022-10-06',
    'date_end': '2023-02-17',
    'day_remaining': 58,
    'purpose': '3PP VS MA',
    'cycle': 'STILLS',
    'thumbnail': null,
    'sub_mechanic': 0,
    'position': 0,
    'value_reached': 90,
    'percentage_value_reached': 90,
    'reached': false,
    'goals': {
      'id': 3317734,
      'mechanic_id': 41683,
      'quantity': 100,
      'score': 100,
      'special_award': null,
      'enabled': 1,
      'created_at': '2022-11-25 14:39:24',
      'updated_at': '2022-12-16 15:17:13'
    },
    'tag': 'Finalizada',
    'insights': { 'daily_reach': 1 }
  }
]
}, status: 200
};

const focusErrorResponse = {
  fail: true,
  message: 'Cannot read property \'length\' of undefined',
  status: 500
};

module.exports = { focusExpectedResponse, focusErrorResponse };