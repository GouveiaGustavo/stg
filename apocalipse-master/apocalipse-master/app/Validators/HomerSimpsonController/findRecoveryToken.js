'use strict';

class findRecoveryToken {
  get rules () {
    return {
      recoveryToken: 'required|string'
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
      'integer': 'O parâmetro {{ field }} deve ser um número inteiro.',
      'string': 'O parâmetro {{ field }} deve ser uma string.'
    };
  }
}

module.exports = findRecoveryToken;