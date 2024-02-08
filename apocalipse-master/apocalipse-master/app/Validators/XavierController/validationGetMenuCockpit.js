'use strict';

class ValidationMenuCockpit {
  get rules () {
    return {
      campaign_id: 'required|integer',
      user_id: 'required|integer'
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
      user_id: 'to_int'
    };
  }
}

module.exports = ValidationMenuCockpit;