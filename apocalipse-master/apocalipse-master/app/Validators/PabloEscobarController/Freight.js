'use strict';

class Freight {
  get rules () {
    return {
      zipcode: 'required|integer',
      product_id: 'required|integer',
      marketplace_id: 'required|integer',
      campaign_id: 'required|integer',
      participant_id: 'required|integer'
    };
  }

  get validateAll() {
    return true;
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages[0]);
  }

  get messages() {
    return {
      'required': 'O parâmetro {{ field }} é obrigatório.',
      'integer': 'O parâmetro {{ field }} deve ser um número inteiro.'
    };
  }

  get sanitizationRules () {
    return {
      participant_id: 'to_int',
      campaign_id: 'to_int',
      marketplace_id: 'to_int',
      product_id: 'to_int'
    };
  }
}

module.exports = Freight;
