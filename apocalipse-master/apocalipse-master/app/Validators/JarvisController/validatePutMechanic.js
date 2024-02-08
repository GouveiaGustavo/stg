'use strict';

class ValidatePutMechanic {
  get rules() {
    return {
      name: 'string',
      audience_type_id: 'integer',
      purpose: 'string',
      cycle: 'string',
      description: 'string',
      config: 'json',
      begin_at: 'date',
      end_at: 'date',
      view_to: 'date',
      goals: 'array',
      'goals.*.quantity': 'integer',
      'goals.*.score': 'integer',
      'goals.*.special_award': 'string',
      'goals.*.id': 'integer',
      'goals.*.index': 'number',
      campaign_id: 'integer',
      id: 'integer',
      mechanic_type_id: 'integer',
      mechanic_quiz_type_id: 'integer',
      segmentations: 'array',
      user_id: 'integer',
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
      'json': 'O campo {{ field }} deve ser um JSON válido.',
      'date': 'O campo {{ field }} deve ser uma data válida.',
      'array': 'O campo {{ field }} deve ser um array.',
      'number': 'O campo {{ field }} deve ser um número.',
    };
  }
}

module.exports = ValidatePutMechanic;
