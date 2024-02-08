function validParamsCampaignAndDocuments(params) {
  if (!params.document) {
    return 'Valor do documento ausente';
  }

  if (!params.campaign_id) {
    return 'Valor da campanha ausente';
  }

  if (!Number.isInteger(parseInt(params.document))) {
    return 'Valor do documento não é um inteiro';
  }

  if (!Number.isInteger(parseInt(params.campaign_id))) {
    return 'Valor da campanha não é um inteiro';
  }
}

function validateParamsCampaignAndRequest(params){

  if (typeof parseInt(params.campaign_id) !== 'number' || !Number.isInteger(parseInt(params.campaign_id))) {
    return 'campaign_id invalido ou vazio';
  }

  if (!params.requestType || params.requestType.toLowerCase() !== 'child' && params.requestType.toLowerCase() !== 'parent') {
    return 'tipo de requisição incorreta ou invalida';
  }
}



module.exports = { validParamsCampaignAndDocuments, validateParamsCampaignAndRequest };