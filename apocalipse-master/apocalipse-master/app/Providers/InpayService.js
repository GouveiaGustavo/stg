'use strict';

const Env = use('Env');
const InpayServiceUrl = new (use('ApiInterceptorService'))(Env.get('INPAY_SERVICE_URL'));

class InpayService {
  async verifyPoints(points, participant_id, campaign_id) {
    return await InpayServiceUrl.get(`inpay-service/verification/points/`, { params: { points, participant_id, campaign_id } });
  }

  async calculateTaxes(campaign_id, value) {
    return await InpayServiceUrl.get(`inpay-service/fitce-order/calculate-taxes/`, { params: { campaign_id, value } });
  }

  async getComissionValue(campaign_id) {
    return await InpayServiceUrl.get(`inpay-service/fitce-order/get-comission-value`, { params: { campaign_id } });
  }

  async getAll(participant_id, campaign_id, page, itemsPerPage) {
    return await InpayServiceUrl.get(`inpay-service/fitce-order/get-all`, { params: { participant_id, campaign_id, page, itemsPerPage } });
  }

  async reedem(participant_id, campaign_id, value, pdv_id) {
    return await InpayServiceUrl.post(`inpay-service/fitce-order/reedem`, { participant_id, campaign_id, value, pdv_id });
  }
};


module.exports = InpayService;