'use strict';

class RecoveryValidator {
  get rules() {
    return {
      email: 'email',
      document: 'string',
      campaign_id: 'integer',
      uid: 'string',
      password: 'string',
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
      'required': 'O campo {{ field }} é obrigatório.',
      'integer': 'O campo {{ field }} deve ser um número inteiro.',
      'string': 'O campo {{ field }} deve ser uma string.',
      'email': 'O campo {{ field }} deve ser um endereço de e-mail válido.',
    };
  }

  get sanitizationRules() {
    return {
      document: 'escape|strip_tags',
      uid: 'escape|strip_tags',
      password: 'escape|strip_tags',
    };
  }
}

module.exports = RecoveryValidator;
