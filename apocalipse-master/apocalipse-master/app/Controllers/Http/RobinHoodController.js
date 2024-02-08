'use strict';

const Log = new (use('LogHelper'))();
const Env = use('Env');
const RobinService = new (use('ApiInterceptorService'))(Env.get('ROBIN_URL'));
const HomerService = new (use('ApiInterceptorService'))(Env.get('HOMER_URL'));
const JarvisService = new (use('ApiInterceptorService'))(Env.get('JARVIS_URL'));
const PabloService = new (use('ApiInterceptorService'))(Env.get('PABLO_URL'));
const XavierService = new (use('ApiInterceptorService'))(Env.get('XAVIER_URL'));
const messageError = `Env: ${Env.get('NODE_ENV')} - RobinHoodController - `;
const querystring = use('querystring');
const moment = use('moment-timezone');
moment.tz.setDefault('America/Sao_paulo');
const LogService = require('../Http/LogsController')

class RobinHoodController {
  async getPoints({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'participant_id']);

      // if (params.participant_id != request.authUserId) {
      //   return response.status(403).json('Forbidden');
      // }

      const points = await RobinService.get(
        `point/get?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}`,
      );

      return response.status(200).json(points.data);
    } catch (e) {
      Log.send(`${messageError} getPoints Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getExtract({ request, response }) {
    try {
      const params = request.only([
        'participant_id',
        'campaign_id',
        'period',
        'expire_in',
        'flag_credit',
        'flag_accounting',
        'page',
        'limit',
      ]);

      // if (params.participant_id != request.authUserId) {
      //   return response.status(403).json('Forbidden');
      // }

      if (!params.page) {
        params.page = 1;
      }
      if (!params.limit) {
        params.limit = 20;
      }
      let query = `?page=${params.page}&participant_id=${params.participant_id}&campaign_id=${params.campaign_id}&limit=${params.limit}`;

      if (params.period) {
        query += `&period=${params.period}`;
      }

      if (params.flag_credit) {
        query += `&flag_credit=${params.flag_credit}`;
      }

      if (params.flag_accounting) {
        query += `&flag_accounting=${params.flag_accounting}`;
      }

      const extracts = await RobinService.get(`transactional-point/get${query}`);

      async function beforeReturn(item) {
        if (item.adjustment_id && item.adjustmentPoints) {
          return {
            title: item.adjustmentPoints.justification,
            date: null,
            type: 'Ajuste',
          };
        }
        if (item.participant_goal_id) {
          let mechResult;

          const participantGoals = await HomerService.get(`participant-goal/${item.participant_goal_id}`);

          if (participantGoals.status === 200) {
            const { mechanic_id } = participantGoals.data;
            const mechanic = await JarvisService.get(`mechanic/${mechanic_id}`);

            if (mechanic.status === 200) {
              if (mechanic.data.mechanicType.config.ranking === 1) {
                mechResult = ` / ${participantGoals.data.result}ª Colocação`;
              } else {
                mechResult = ` / ${participantGoals.data.result} ${mechanic.data.nomenclature}`;
              }

              return {
                title: `${mechanic.data.mechanicType.name} / ${mechanic.data.purpose}${mechResult}`,
                period: '',
                date: null,
                type: 'Meta Atingida',
              };
            }
          }
        } else if (item.reward_id) {
          const reward = await HomerService.get(`participant-reward/${item.reward_id}`);

          if (reward.status === 200) {
            const order = await PabloService.get(
              `order/${reward.data.order_id}?campaign_id=${params.campaign_id}`,
            );

            let title = '';
            let type = '';

            if (item.flag_accounting === true) {
              title = `Resgate solicitado ${
                order.status === 200 ? `- Pedido nº #${reward.data.order_id}` : ''
                }`;
              type = 'Resgate';
            } else if (item.flag_credit === 1 && item.flag_processed === 1 && item.flag_confirmed === 1) {
              title = `Estorno de resgate ${
                order.status === 200 ? `- Pedido nº #${reward.data.order_id}` : ''
                }`;
              type = 'Estorno';
            } else {
              title = `Resgate efetuado${
                order.status === 200 ? ` - Pedido nº #${reward.data.order_id}` : ''
                }`;
              type = 'Resgate';
            }
            return {
              title,
              date: order.data.created_at,
              type,
            };
          }
        } else {
          return {
            title: 'Saldo do dia',
            date: item.created_at,
            type: 'Saldo',
          };
        }
      }

      let ct = 0;
      for (let extract of extracts.data.data) {
        let details = await beforeReturn(extract);

        if (!details) {
          details = { title: '', date: '', type: '' };
        }

        extracts.data.data[ct].details = details;
        ct += 1;
      }

      let queryExpiration = `?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}`;

      if (params.period) {
        queryExpiration += `&period=${params.period}`;
      }

      if (params.flag_credit) {
        queryExpiration += `&flag_credit=${params.flag_credit}`;
      }

      if (params.flag_accounting) {
        queryExpiration += `&flag_accounting=${params.flag_accounting}`;
      }

      let points_expiring_current_month = 0;
      let points_expiring_30_days = 0;
      let points_expiring_60_days = 0;
      let points_expiring_90_days = 0;

      let res = await RobinService.get(`expire-points/get?${query}&enabled=1`);

      if(res.data.length != 0){
        const manualExtract = res.data[0];
        extracts.data.manual_expire = manualExtract.points + " " + manualExtract.justification + " " + manualExtract.period;
      }
      const extractsExpiration = await RobinService.get(`transactional-point/getExpirationInfo${queryExpiration}`);

      ct = 0;
      for (let extractExpiration of extractsExpiration.data) {
        extractExpiration = this.processExpirirationInfo(extractExpiration)
        if(extractExpiration.expiring_current_month == true){
          points_expiring_current_month = points_expiring_current_month + (extractExpiration.points - extractExpiration.points_used);
        }
        if(extractExpiration.expires_30_days == true){
          points_expiring_30_days = points_expiring_30_days + (extractExpiration.points - extractExpiration.points_used);
        }
        if(extractExpiration.expires_60_days == true){
          points_expiring_60_days = points_expiring_60_days + (extractExpiration.points - extractExpiration.points_used);
        }
        if(extractExpiration.expires_90_days == true){
          points_expiring_90_days = points_expiring_90_days + (extractExpiration.points - extractExpiration.points_used);
        }
        ct += 1;
      }

      if(res.data.length != 0){
        extracts.data.points_expiring_current_month = 0;
        extracts.data.points_expiring_30_days = 0;
        extracts.data.points_expiring_60_days = 0;
        extracts.data.points_expiring_90_days = 0;
      }else{
        extracts.data.points_expiring_current_month = points_expiring_current_month;
        extracts.data.points_expiring_30_days = points_expiring_30_days;
        extracts.data.points_expiring_60_days = points_expiring_60_days;
        extracts.data.points_expiring_90_days = points_expiring_90_days;
      }

      return response.status(200).json(extracts);
    } catch (e) {
      Log.send(`${messageError} getExtract Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getExpirationInfo({ request, response }) {
    try {
      const params = request.only([
        'participant_id',
        'campaign_id',
        'period',
        'expire_in',
        'flag_credit',
        'flag_accounting'
      ]);

      if (!params.participant_id) {
        return response.status(400).json('Missing participant_id');
      }

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id');
      }

      // if (params.participant_id != request.authUserId) {
      //   return response.status(403).json('Forbidden');
      // }

      let query = `?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}`;

      if (params.period) {
        query += `&period=${params.period}`;
      }

      if (params.flag_credit) {
        query += `&flag_credit=${params.flag_credit}`;
      }

      if (params.flag_accounting) {
        query += `&flag_accounting=${params.flag_accounting}`;
      }

      let res = await RobinService.get(`expire-points/get${query}&enabled=1`);

      const extracts = await RobinService.get(`transactional-point/getExpirationInfo${query}`);

      let points_expiring_current_month = 0;
      let points_expiring_30_days = 0;
      let points_expiring_60_days = 0;
      let points_expiring_90_days = 0;

      if(res.data.length != 0){
          const manualExtract = res.data[0];
          extracts.manual_expire = manualExtract.points + " " + manualExtract.justification + " " + manualExtract.period;
      }

      let ct = 0;
      for (let extract of extracts.data) {
        extract = this.processExpirirationInfo(extract)
        if(extract.expiring_current_month == true){
          points_expiring_current_month = points_expiring_current_month + (extract.points - extract.points_used);
        }
        if(extract.expires_30_days == true){
          points_expiring_30_days = points_expiring_30_days + (extract.points - extract.points_used);
        }
        if(extract.expires_60_days == true){
          points_expiring_60_days = points_expiring_60_days + (extract.points - extract.points_used);
        }
        if(extract.expires_90_days == true){
          points_expiring_90_days = points_expiring_90_days + (extract.points - extract.points_used);
        }
        ct += 1;
      }
      if(res.data.length != 0){
        extracts.points_expiring_current_month = 0;
        extracts.points_expiring_30_days = 0;
        extracts.points_expiring_60_days = 0;
        extracts.points_expiring_90_days = 0;
      }else{
      extracts.points_expiring_current_month = points_expiring_current_month;
      extracts.points_expiring_30_days = points_expiring_30_days;
      extracts.points_expiring_60_days = points_expiring_60_days;
      extracts.points_expiring_90_days = points_expiring_90_days;
      }

      return response.status(200).json(extracts);
    } catch (e) {
      Log.send(`${messageError} getExpirationInfo Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getAdjustmentPoint({ request, response }) {
    try {
      const params = request.only([
        'id',
        'participant_id',
        'campaign_id',
        'order_id',
        'ticket_id',
        'participant_goal_id',
        'justification',
        'points',
        'flag_credit',
        'flag_sensitize_campaing_balance',
        'flag_processed',
        'user_id',
      ]);
      let query = 'adjustment-point/get?'
      if (params.id) { query += `id=${params.id}&` }
      if (params.campaign_id) { query += `campaign_id=${params.campaign_id}&` }
      if (params.participant_id) { query += `participant_id=${params.participant_id}&` }
      if (params.order_id) { query += `order_id=${params.order_id}&` }
      if (params.ticket_id) { query += `ticket_id=${params.ticket_id}&` }
      if (params.participant_goal_id) { query += `participant_goal_id=${params.participant_goal_id}&` }
      if (params.flag_credit) { query += `flag_credit=${params.flag_credit}&` }
      if (params.flag_sensitize_campaing_balance) { query += `flag_sensitize_campaing_balance=${params.flag_sensitize_campaing_balance}&` }
      if (params.flag_processed) { query += `flag_processed=${params.flag_processed}&` }
      if (params.user_id) { query += `user_id=${params.user_id}&` }

      const adjust = await RobinService.get(query);

      return response.status(200).json(adjust.data);
    } catch (e) {
      Log.send(`${messageError} getAdjustmentPoint Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async AdjusmentPointPost({ request, response }) {
    try { 
      const logService = new LogService()
      const params = request.only(['data']);
      const userId = request.authUserId
      let sendQueueSuccess = [];
      let sendQueueFailed = [];

      const user = await XavierService.get(`user/${userId}`);
      const userFullName = `${user.data.name && user.data.name} ${user.data.surname && user.data.surname}`

      for (const item of params.data) {
        item.points = parseFloat(item.points);
        item.participant_id = parseInt(item.participant_id);
        item.campaign_id = parseInt(item.campaign_id);
        item.flag_credit = parseInt(item.flag_credit);
        item.user_id = request.authUserId
        if (item.preset_id) {
          item.preset_id = parseInt(item.preset_id)
        }
        item.flag_sensitize_campaing_balance = item.flag_sensitize_campaing_balance ? parseInt(item.flag_sensitize_campaing_balance) : null;

        const adjust = await RobinService.post('adjustment-point/post', item);
        if (adjust.status == 200) {
          sendQueueSuccess.push({ message: adjust.data, item: item });
        } else {
          sendQueueFailed.push({ message: adjust.data, item: item });
        }
      }

          let logData = {
          user_id: `${params.data[0].user_id}`,
          user_fullname: `${userFullName}`,
          campaign_id: `${params.data[0].campaign_id}`,
          participant_id: `${params.data[0].participant_id}`,
          environment: process.env.NODE_ENV,
          endpoint: "AdjusmentPointPost",
          flag: "pontos",
          type: params.data[0].preset_id === 1 ? "pontos atribuidos" :
                params.data[0].preset_id === 2 ? "pontos retirados" :
                params.data[0].preset_id === 3 ? "resgate de pontos" :
                params.data[0].preset_id === 4 ? "pontos zerados" : "estorno de pontos",
          point: parseInt(params.data[0].points)
        };
          
        await logService.createLog(logData);

      return response.status(200).json({ sendQueueSuccess, sendQueueFailed });
    } catch (e) {
      Log.send(`${messageError} AdjusmentPointPost Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getAllPresets({ response }) {
    try {
      const preset = await RobinService.get('adjustment-preset/all');

      return response.status(200).json(preset.data);
    } catch (e) {
      Log.send(`${messageError} getAllPresets Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getAllEnabledPresets({ response }) {
    try {

      const preset = await RobinService.get('adjustment-preset/all-enabled');

      return response.status(200).json(preset.data);
    } catch (e) {
      Log.send(`${messageError} getAllEnabledPresets Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getPresets({ request, response }) {
    try {
      const params = request.only([
        'id',
        'name',
        'code',
        'description',
        'enabled',
      ]);

      let query = 'adjustment-preset/get?'
      if (params.name) { query += `name=${params.name}` };
      if (params.code) { query += `code=${params.code}` };
      if (params.description) { query += `description=${params.description}` };
      if (params.enabled) { query += `enabled=${params.enabled}` };


      const preset = await RobinService.get(query);

      return response.status(200).json(preset.data);
    } catch (e) {
      Log.send(`${messageError} getPresets Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async putPresets({ request, response }) {
    try {
      const params = request.only([
        'id',
        'name',
        'code',
        'description',
        'enabled',
        'config',
        'user_id'
      ]);

      if (!params.id && (!params.user_id || !params.code || !params.name || !params.config)) {
        return response.status(401).json('missing parameters (user_id,code,name,config)');
      }

      const preset = await RobinService.put('adjustment-preset/put', params);

      return response.status(200).json(preset.data);
    } catch (e) {
      Log.send(`${messageError} putPresets Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  processExpirirationInfo(extract){
    const today = moment.tz('America/Sao_paulo');
    extract.expiring_current_month = false;
    extract.expires_30_days = false;
    extract.expires_60_days = false;
    extract.expires_90_days = false;

    let days_to_expiration = 0;
    let expire_date = new Date(extract.expire_in);
    let moment_of_expiration = moment.tz(expire_date, 'America/Sao_paulo');

    if(!isNaN(expire_date) && moment_of_expiration.isValid()){
      if(moment_of_expiration.isSame(today,'month') && extract.points != extract.points_used && extract.flag_set_to_expire == 1){
        extract.expiring_current_month = true;
      }
      days_to_expiration = moment_of_expiration.diff(today, 'days');
      if(days_to_expiration <= 30 && days_to_expiration >= 0 && extract.points != extract.points_used && extract.flag_set_to_expire == 1){
        extract.expires_30_days = true;
      }
      if(days_to_expiration <= 60 && days_to_expiration >= 0 && extract.points != extract.points_used && extract.flag_set_to_expire == 1){
        extract.expires_60_days = true;
      }
      if(days_to_expiration <= 90 && days_to_expiration >= 0 && extract.points != extract.points_used && extract.flag_set_to_expire == 1){
        extract.expires_90_days = true;
      }
    }
    extract.days_to_expiration = days_to_expiration;
    return(extract);
  }
}

module.exports = RobinHoodController;
