'use strict';

class ValidatePreRegisterPut {
 get rules() {
    return {
      code: 'string',
      name: 'string',
      email: 'email',
      contact: 'string',
      document: 'string',
      segmentation: 'array',
      surname: 'string',
      nameMother: 'string',
      city: 'string',
      state: 'string',
      number: 'string',
      street: 'string',
      zipcode: 'string',  
      complement: 'string',
      fantasyName: 'string',
      neighborhood: 'string',
      personResponsable: 'string',
      stateRegistration: 'string',
      config: 'object',
      documentImages: 'object', 
      pdvs: 'array',
      id: 'integer',
      status: 'integer',
      campaign_id: 'integer',
      campaign_name: 'string',
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
      'object': 'O campo {{ field }} deve ser um objeto.',
      'array': 'O campo {{ field }} deve ser um array.',
    };
  }

  get sanitizationRules() {
    return {
      document: 'escape|strip_tags',
      name: 'escape|strip_tags',
      surname: 'escape|strip_tags',
      email: 'normalize_email',
      contact: 'escape|strip_tags',
      nameMother: 'escape|strip_tags',
      campaign_name: 'escape|strip_tags',
    };
  }
}

module.exports = ValidatePreRegisterPut;
