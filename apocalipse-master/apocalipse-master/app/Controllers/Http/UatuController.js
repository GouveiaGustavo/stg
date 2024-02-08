'use strict'

const Log = new (use('LogHelper'))();
const Env = use('Env');
const UatuService = new (use('ApiInterceptorService'))(Env.get('UATU_URL'));
const messageError = `Env: ${Env.get('NODE_ENV')} - UatuController - `;

class UatuController {
    async getMelhorFotoByDateRange({ request, response }) {
        try {
            const data = await UatuService.get(`report/melhor-foto/get?campaign_id=6`);

            return response.status(data.status).json(data.data);
        } catch (e) {
            Log.send(`${messageError} - getMelhorFotoByDateRange Endpoint - ${e.message}`);
        }
    }
    async getRankingMerchanByDateRange({ request, response }) {
        try {
            const data = await UatuService.get(`report/ranking-merchan/get?campaign_id=6`);

            return response.status(data.status).json(data.data);
        } catch (e) {
            Log.send(`${messageError} - getRankingMerchanByDateRange Endpoint - ${e.message}`);
        }
    }
}

module.exports = UatuController
