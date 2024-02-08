'use strict';

class validationPurchaseOrder {
  get rules () {
    return {
      campaign_id: 'required|integer',
      cash_back: 'integer',
      fee: 'integer',
      tax_invoice: 'integer',
      money: 'integer',
      point_value: 'integer',
      credits: 'integer',
      name: 'required|string',
      document: 'required|string',
      order_payment: 'string',
      ticket: 'string',
      email: 'required|email',
      phone: 'required|string',
      period: 'required|string',
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
      'email': 'O campo {{ field }} deve ser um endereço de e-mail válido.',
      'string': 'O parâmetro {{ field }} deve ser uma string.',
    };
  }

  get sanitizationRules () {
    return {
      campaign_id: 'to_int',
      cash_back: 'to_int',
      fee: 'to_int',
      tax_invoice: 'to_int',
      money: 'to_int',
      point_value: 'to_int',
      credits: 'to_int',
      name: 'escape|strip_tags',
      document: 'escape|strip_tags',
      order_payment: 'escape|strip_tags',
      ticket: 'escape|strip_tags',
      email: 'normalize_email',
      phone: 'escape|strip_tags',
      period: 'escape|strip_tags',
    };
  }
}

module.exports = validationPurchaseOrder;