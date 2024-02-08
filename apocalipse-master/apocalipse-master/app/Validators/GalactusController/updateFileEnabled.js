'use strict';

class UpdateFileEnabled {
  get rules () {
    return {
      id: 'required|integer',
      enabled: 'required|integer'
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
      id: 'to_int',
      enabled: 'to_int'
    };
  }
}

module.exports = UpdateFileEnabled;