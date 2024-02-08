'use strict';
const InpayServiceObj = new(use('InpayService'));

class InpayServiceController {
  async verifyPoints({ request, response }) {
    const participant_id = request.participant ? request.participant.participant_id : null;
    const campaign_id = request.participant ? request.participant.campaign_id : null;
    const points = request.qs.points || null;
    const verifyPointsResponse = await InpayServiceObj.verifyPoints(points, participant_id, campaign_id);
    return response.status(verifyPointsResponse.status).json(verifyPointsResponse.data);
  }

  async calculateTaxes({ request, response }) {
    const campaign_id = request.participant ? request.participant.campaign_id : null;
    const value = request.qs.value || null;
    const calculateTaxesResponse = await InpayServiceObj.calculateTaxes(campaign_id, value);
    return response.status(calculateTaxesResponse.status).json(calculateTaxesResponse.data);
  }

  async getComissionValue({ request, response }) {
    const campaign_id = request.participant ? request.participant.campaign_id : null;
    const comissionValueResponse = await InpayServiceObj.getComissionValue(campaign_id);
    return response.status(comissionValueResponse.status).json(comissionValueResponse.data);
  }

  async getAll({ request, response }) {
    const participant_id = request.participant ? request.participant.participant_id : null;
    const campaign_id = request.participant ? request.participant.campaign_id : null;
    const page = request.qs.page || null;
    const itemsPerPage = request.qs.itemsPerPage || null;
    const getAllResponse = await InpayServiceObj.getAll(participant_id, campaign_id, page, itemsPerPage);
    return response.status(getAllResponse.status).json(getAllResponse.data);
  }

  async reedem({ request, response }) {
    const participant_id = request.participant ? request.participant.participant_id : null;
    const campaign_id = request.participant ? request.participant.campaign_id: null;
    const pdv_id = request.all().pdv_id || null;
    const value = request.all().value || null;
    const reedemResponse = await InpayServiceObj.reedem(participant_id, campaign_id, value, pdv_id);
    return response.status(reedemResponse.status).json(reedemResponse.data);
  }
}

module.exports = InpayServiceController;
