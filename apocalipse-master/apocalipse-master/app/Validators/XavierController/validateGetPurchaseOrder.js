'use strict';

class validationGetPurchaseOrder {
  get rules() {
    return {
      campaign_id: 'required|integer',
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
      'required': 'O parâmetro campaign_id é obrigatório.',
      'integer': 'O parâmetro campaign_id deve ser um número inteiro.',
    };
  }
}


module.exports = validationGetPurchaseOrder;