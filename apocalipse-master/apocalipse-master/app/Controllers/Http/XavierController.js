const Log = new (use('LogHelper'))();
const Env = use('Env');
const logError = `Env: ${Env.get('NODE_ENV')} - XavierController`;
const XavierService = new (use('ApiInterceptorService'))(Env.get('XAVIER_URL'));
const RobinService = new (use('ApiInterceptorService'))(Env.get('ROBIN_URL'));
const HomerSimpsonService = new (use('ApiInterceptorService'))(Env.get('HOMER_URL'));
const querystring = require('querystring');
const JarvisService = new (use('ApiInterceptorService'))(Env.get('JARVIS_URL'));
const XavierHelperService = new (use('XavierService'))();
const HeimdallService = new (use('ApiInterceptorService'))(Env.get('HEIMDALL_AUTH_URL'));
const { validateParamsCampaignAndRequest } = require('../../Helpers/validParams');
const logApi = require('../../Providers/LogApi');
const LogService = require('../Http/LogsController')


class XavierController {

  async menuPageDelete({ request, params, response }) {
    try {

      if (!params.id) {
        return response.status(400).json('Bad request.');
      }

      params.enabled = false;

      const res = await XavierService.put(`menu-page/put`,params);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} menuPageDelete Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async menuPageAll({ request, response }) {
    try {
      const res = await XavierService.get(`menu-page/all`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} menuPageAll Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async menuPageGet({ request, response }) {
    try {
      const params = request.only(['id', 'code', 'url', 'enabled']);

      const q = querystring.stringify(params);

      const res = await XavierService.get(`menu-page/get?${q}`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} menuPageGet Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async menuPagePut({ request, response }) {
    try {
      let params = request.body[0];

      if (!params.code || !params.url || !params.name || !params.description) {
        return response.status(400).json('Missing parameters.');
      }

      if (!params.id) {
        const menuPage = await XavierService.get(`menu-page/get?code=${params.code}`);
        if (menuPage.data[0]) {
          params.id = menuPage.data[0].id;
          params.hasIconWeb = menuPage.hasIconWeb;
          params.hasIconApp = menuPage.hasIconApp;
          params.orderWeb = menuPage.orderWeb;
          params.orderApp = menuPage.orderApp;
          params.hasIcon = menuPage.hasIcon;
        }
      }

      for(params of request.body) {
        await XavierService.put(`menu-page/put`, params);
      }

      return response.status(200).json(true);
    } catch (e) {
      Log.send(`${logError} menuPagePut Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async menuPageFind({ params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Bad request.');
      }

      const res = await XavierService.get(`menu-page/${params.id}`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} menuPageFind Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async menuPageCampaignDelete({ request, params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Bad request.');
      }

      const res = await XavierService.delete(`menu-page-campaign/${params.id}`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} menuPageCampaignDelete Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async menuPageCampaignAll({ request, response }) {
    try {
      const res = await XavierService.get(`menu-page-campaign/all`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} menuPageCampaignAll Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async menuPageCampaignGet({ request, response }) {
    try {

      const params = request.only(['id', 'campaign_id', 'participant_id', 'user_id']);

      let participantInfo;
      let campaign;
      let campaignInfo;

      if(params.participant_id){
        participantInfo = await HomerSimpsonService.get(`participant/get?id=${params.participant_id}&campaign_id=${params.campaign_id}`);

        campaign = participantInfo.data.campaign;

        const campaignsIds = campaign.map(campaignId => campaignId.id);

        if (!campaignsIds.indexOf(params.campaign_id)) {
          return response.status(400).json('Participant does not have access to specified campaign.');
        }
      }else if(params.user_id){
        const userInfo = await XavierService.get(`user/${params.user_id}?campaign_id=${params.campaign_id}`);
        if (!userInfo.data || params.campaign_id != userInfo.data.roles[0].campaign_id) {
          return response.status(400).json('User does not have access to specified campaign.');
        }
      }else{
        return response.status(400).json('User or participant not informed.');
      }

      campaignInfo = await XavierService.get(`campaign/${params.campaign_id}`);

      const q = querystring.stringify(params);

      let res = await XavierService.get(`menu-page-campaign/get?${q}`);

      if(params.hasOwnProperty('participant_id')){
        const mechanicGDE = await JarvisService.get(`mechanic/gde-participant?participant_id=${params.participant_id}`);

        if(mechanicGDE.data.resultsData && !mechanicGDE.data.resultsData.length){
          res.data = res.data.filter(menu => {
            return menu.code != 'GDE';
          });
        }
      }

      let finalResponse = await Promise.all(res.data.map(async (data) => {
        const menuPageInfo = await XavierService.get(`menu-page/get?id=${data.menu_page_id}`);

        if (menuPageInfo.data[0]) {
          const responseWithMenuPageData = Object.assign({}, data, menuPageInfo.data[0]);
          responseWithMenuPageData.config = data.config;
          responseWithMenuPageData.enabled = data.enabled;
          responseWithMenuPageData.name = data.name;
          responseWithMenuPageData.description = data.description;
          responseWithMenuPageData.menu_page_campaign_id = data.id;
          return responseWithMenuPageData;
        }
      }));


      if (campaignInfo && participantInfo) {
        let indice;
        indice = campaign.map((index) => {
          return index.campaign_id;
        });

        for(let i = 0; i < indice.length ; i++){
          if(params.campaign_id == campaign[i].campaign_id){
            indice = i;
          }
        }

        const participantConfig = JSON.parse(campaign[indice].config);
        const campaignConfig = JSON.parse(campaignInfo.data.config);

        if (campaignConfig.haveMerchandiseMechanic == 1) {
          if (!participantConfig){
            finalResponse = finalResponse.filter(({ code }) => code !== 'GALLERY' && code !== 'VOTE');
          }else {
            if ((participantConfig.leader == 0 || !participantConfig.leader) && participantConfig.merchandiser == 0) {
              finalResponse = finalResponse.filter(({ code }) => code !== 'GALLERY' && code !== 'VOTE');
            }

            if (participantConfig.leader == 1 && participantConfig.merchandiser != 1) {
              finalResponse = finalResponse.filter(({ code }) => code !== 'GALLERY');
            }

            if (participantConfig.leader != 1 && participantConfig.merchandiser == 1) {
              finalResponse = finalResponse.filter(({ code }) => code !== 'VOTE');
            }
          }
        } else {
          finalResponse = finalResponse.filter(({ code }) => code !== 'GALLERY' && code !== 'VOTE');
        }
      }

      const hasTraditional = await HomerSimpsonService.get(`participant-segmentation/tree/get?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}`);

      if(hasTraditional && hasTraditional.data[0]){
        const segmentation = await XavierService.get(`segmentation/${hasTraditional.data[0].segmentation_id}`);

        if(segmentation.data.name === 'TRADICIONAL'){
          const hierarchy = participantInfo.data.hierarchy;

          if(hierarchy.length > 0){
            hierarchy.forEach(item => {
              if(item.participant_id === item.participantLeader.id){
                if(!(item.hierarchy.name === 'EXECUTIVO' || item.hierarchy.name === 'GERENTE')){
                  finalResponse = finalResponse.filter(({ code }) => code !== 'ONEPAGE');
                }
              }
            });
          }else{
            finalResponse = finalResponse.filter(({ code }) => code !== 'ONEPAGE');
          }
        }else{
          finalResponse = finalResponse.filter(({ code }) => code !== 'ONEPAGE');
        }
      }

      return response.status(200).json(finalResponse);
    } catch (e) {
      Log.send(`${logError} menuPageCampaignGet Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async menuPageCampaignPut({ request, response }) {
    try {
      const params = request.all();
      const userId = request.authUserId
      const data = Object.values(params);

      for (const menu of data) {
        let menuPageCampaign = await XavierService.get(`menu-page-campaign/get?code=${menu.code}&campaign_id=${menu.campaign_id}`);
        if (menuPageCampaign.data[0]) {
          menu.id = menuPageCampaign.data[0].id;
        }
        await XavierService.put(`menu-page-campaign/put`, menu);
        let menuPage = await XavierService.get(`menu-page/get?id=${menu.menu_page_id}`);
        if(menuPage.data[0]){
          menuPage.data[0].url = menu.url;
          menuPage.data[0].hasIconWeb = menu.hasIconWeb;
          menuPage.data[0].hasIconApp = menu.hasIconApp;
          menuPage.data[0].orderWeb = menu.orderWeb;
          menuPage.data[0].orderApp = menu.orderApp;
          menuPage.data[0].hasIcon = menu.hasIcon;
          await XavierService.put(`menu-page/put`, menuPage.data[0]);
        }
      }

      logApi({
        endpoint: 'menuPageCampaignPut',
        log: `Usuario: ${userId}, alterou menus na campanhaa campanha: ${params.campaign_id}`,
      });

      return response.status(200).json(true);
    } catch (e) {
      Log.send(`${logError} menuPageCampaignPut Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async menuPageCampaignFind({ params, response }) {
    try {

      if (!params.id) {
        return response.status(400).json('Bad request.');
      }

      const res = await XavierService.get(`menu-page-campaign/${params.id}`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} menuPageCampaignFind Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getCampaign({ request, response }) {
    try {
      const params = request.only(['domain']);

      if (!params.domain) {
        return response.status(404).json('Campaign not found.');
      }

      let campaign = await XavierService.post('campaign/get', {
        domain: params.domain
      });

      if (!campaign.data) {
        campaign = await XavierService.post('campaign/get', {
          custom_url: params.domain
        });
      }

      return response.status(200).json(campaign);
    } catch (e) {
      Log.send(`${logError} getCampaign Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getFaq({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'frequent', 'page', 'perPage']);
      let query = `faq/get?campaign_id=${params.campaign_id}`;

      if (params.page) {
        query += `&page=${params.page}`;
      }
      if (params.perPage) {
        query += `&perPage=${params.perPage}`;
      }
      if (params.frequent) {
        query += `&frequent=${params.frequent}`;
      }

      const faq = await XavierService.get(query);

      return response.status(200).json(faq);
    } catch (e) {
      Log.send(`${logError} getFaq Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async putFaq({ request, response }) {
    try {
      const params = request.only(['id', 'campaign_id', 'title', 'answer', 'frequent', 'enabled']);

      const faq = await XavierService.put(`faq/put`, params);

      return response.status(200).json(faq);
    } catch (e) {
      Log.send(`${logError} putFaq Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async putFaqMass({ request, response }) {
    try {
      const params = request.only(['id', 'campaign_id', 'title', 'answer', 'frequent', 'enabled']);
      let faqs = [];

      for (const faq of params) {
        const data = await XavierService.put(`faq/put`, faq);
        faqs.push(data);
      }

      return response.status(200).json(faqs);
    } catch (e) {
      Log.send(`${logError} putFaqMass Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }
  
  async login({ request, response }) {
    try {

      const { email, password }= request.only(['email', 'password']);
      const user = await XavierService.get(`user/get-one?email=${email}`)

      const token = await HeimdallService.post('user/token/post', {
        login: email,
        password,
      });
      
      if (token.status !== 200) {
        return response.status(token.status).json(token.data);
      }

      if (user.status === 200) {
        const { data } = token
        user.data.token = { token: data.token, type: 'bearer', refreshToken: null };
        return response.status(200).json(user);
      }

      return response.status(401).json(user);
    } catch (e) {
      Log.send(`${logError} login Endpoint - ${e.message}`);
      return response.status(401).json(e.message);
    }
  }

  async getModuleGroups({ request, response }) {
    try {
      const params = request.only(['user_id', 'campaign_id']);

      if (!params.campaign_id) {
        return response.status(400).json('Bad Request');
      }

      let query = `?campaign_id=${params.campaign_id}`;

      if (params.user_id) {
        query = `${query}&user_id=${params.user_id}`;
      }

      const moduleGroups = await XavierService.get(`module-group/all${query}`);

      if (moduleGroups.status == 200) {
        return response.status(200).json(moduleGroups);
      }
      return response.status(401).json(moduleGroups);
    } catch (e) {
      Log.send(`${logError} getModuleGroups Endpoint - ${e.message}`);
      return response.status(401).json(e.message);
    }
  }

  async allModules({ request, response }) {
    try {
      const modules = await XavierService.get('module/all');

      if (modules.status == 200) {
        return response.status(200).json(modules);
      }
      return response.status(401).json(modules);
    } catch (e) {
      Log.send(`${logError} allModules Endpoint - ${e.message}`);
      return response.status(401).json(e.message);
    }
  }

  async getModules({ request, response }) {
    try {
      const params = request.only(['url', 'campaign_id', 'user_id']);

      if (!params.campaign_id || !params.url || !params.user_id) {
        return response.status(400).json('Bad Request.');
      }

      const modules = await XavierService.get(
        `module/get?url=${params.url}&campaign_id=${params.campaign_id}&user_id=${params.user_id}`
      );

      if (modules.status == 200) {
        return response.status(200).json(modules);
      }
      return response.status(400).json(modules);
    } catch (e) {
      Log.send(`${logError} getModules Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getModuleById({ params, response }) {
    try {
      const modules = await XavierService.get(`module/${params.id}`);

      if (modules.status == 200) {
        return response.status(200).json(modules);
      }
      return response.status(401).json(modules);
    } catch (e) {
      Log.send(`${logError} getModuleById Endpoint - ${e.message}`);
      return response.status(401).json(e.message);
    }
  }

  async searchModule({ request, response }) {
    try {
      const params = request.only(['search']);

      if (!params.search) {
        return response.status(400).json('Bad Request.');
      }

      const modules = await XavierService.get(`module/search?search=${params.search}`);

      return response.status(200).json(modules);
    } catch (e) {
      Log.send(`${logError} searchModule Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getCustomers({ request, response }) {
    try {
      const params = request.only(['page']);
      const customers = await XavierService.get(`customer/get?page=${params.page}`);

      if (customers.status == 200) {
        return response.status(200).json(customers);
      }
      return response.status(401).json(customers);
    } catch (e) {
      Log.send(`${logError} getCustomers Endpoint - ${e.message}`);
      return response.status(401).json(e.message);
    }
  }

  async getCustomerById({ params, response }) {
    try {
      const customer = await XavierService.get(`customer/${params.id}`);

      if (customer.status == 200) {
        return response.status(200).json(customer.data);
      }
      return response.status(401).json(customer);
    } catch (e) {
      Log.send(`${logError} getCustomerById Endpoint - ${e.message}`);
      return response.status(401).json(e.message);
    }
  }

  async getCampaigns({ request, response }) {
    try {
      const params = request.only(['page', 'user_id']);
      let query = '';

      if (params.user_id) {
        query = `&user_id=${params.user_id}`;
      }

      const campaigns = await XavierService.get(`campaign/get-tmp?page=${params.page}${query}`);

      if (campaigns.status == 200) {
        return response.status(200).json(campaigns);
      }
      return response.status(400).json(campaigns);
    } catch (e) {
      Log.send(`${logError} getCampaigns Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getCampaignByCustomerId({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'customer_id']);

      if(!params.campaign_id || !params.customer_id){
        return response.status(400).json({ 'message':'Faltando os parâmetros campaign_id ou customer_id.' });
      }

      const requestCampaign = await XavierService.get(`campaign/${params.campaign_id}`);

      if(requestCampaign.status != 200){
        return response.status(404).json({ 'message':'Campanha não encontrada.' });
      }

      const customer = await XavierService.get(`customer/${params.customer_id}`);

      if(customer.status != 200){
        return response.status(404).json({ 'message':'Cliente não encontrado.' });
      }

      const campaigns = await XavierService.get(`campaign-by-customer/${params.customer_id}`);

      let finalResponse = {};

      finalResponse.data = [];

      let isCustomerCampaign = false;

      for(let campaign of campaigns.data){
        if(campaign.id != params.campaign_id){
          finalResponse.data.push({
            name: campaign.name,
            campaign_id: campaign.id
          });
        }else if(campaign.id == params.campaign_id){
          isCustomerCampaign = true;
        }
      }

      if(!isCustomerCampaign){
        return response.status(400).json({ 'message':'Campanha enviada não possui vinculos com o cliente.' });
      }

      return response.status(200).json(finalResponse);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - XavierController - getCampaignByCustomerId Endpoint - ${e.message} - params: 
      ${new URLSearchParams(request.only(['campaign_id', 'customer_id']))}`);
      return response.status(500).json(e.message);
    }
  }

  async getUserById({ params, response }) {
    try {
      const user = await XavierService.get(`user/${params.id}`);
      if (user.status == 200) {
        return response.status(200).json(user.data);
      }
      return response.status(401).json(user);
    } catch (e) {
      Log.send(`${logError} getUserById Endpoint - ${e.message}`);
      return response.status(401).json(e.message);
    }
  }

  async userUpdate({ request, response }) {
    try {
      const params = request.only([
        'id',
        'name',
        'surname',
        'email',
        'document',
        'config',
        'password',
        'enabled'
      ]);

      if (!params) {
        return response.status(400).json('Bad request.');
      }

      if (!params.password) {
        delete params.password;
      }

      const update = await XavierService.put('user/put', params);

      if (update) {
        return response.status(200).json(update);
      }
      return response.status(401).json('Something wrong.');
    } catch (e) {
      Log.send(`${logError} userUpdate Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getSegmentationByParentId({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'segmentation_parent_id', 'keyword']);
      let query = '';

      if (!params.campaign_id && !params.segmentation_parent_id) {
        return response.status(401).json('Invalid request.');
      }

      if (params.segmentation_parent_id) {
        query = `&segmentation_parent_id=${params.segmentation_parent_id}`;
      }

      if(params.keyword){
        query = query + `&keyword=${params.keyword}`;
      }

      let segmentation = await XavierService(`segmentation/get?campaign_id=${params.campaign_id}${query}`);

      if(params.keyword){
        let result = segmentation.data.filter(data => data.name.split(' ',2)[0] == params.keyword.toUpperCase().split(' ',2)[0]);
        segmentation.data = result;
      }

      return response.status(200).json(segmentation);
    } catch (e) {
      Log.send(`${logError} getSegmentationByParentId Endpoint - ${e.message}`);
      return response.status(401).json(e.message);
    }
  }

  async recoveryPassword({ request, response }) {
    try {
      const params = request.only(['email']);

      if (!params.email) {
        return response.status(401).json('Bad request');
      }

      const send = await XavierService.post('user/recovery-password', params);

      return response.status(200).json(send);
    } catch (e) {
      Log.send(`${logError} recoveryPassword Endpoint - ${e.message}`);
      return response.status(401).json(e.message);
    }
  }

  async changePassword({ request, response }) {
    try {
      const params = request.only(['id', 'token', 'password']);

      if ((!params.token && !params.id) || !params.password) {
        return response.status(400).json('Bad request');
      }

      const change = await XavierService.post('user/change-password', params);

      return response.status(200).json(change);
    } catch (e) {
      Log.send(`${logError} changePassword Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async sendInvite({ request, response }) {
    try {
      const logService = new LogService()
      const userId = request.authUserId
      const params = request.only(['campaign_id', 'participant_id', 'isSms','user_id']);

      const user = await XavierService.get(`user/${userId}`);
      const userFullName = `${user.data.name && user.data.name} ${user.data.surname && user.data.surname}`
    
      if (!params.campaign_id || !params.isSms) {
        return response.status(400).json({ message: 'os parametros campaign_id e isSms são obrigatorios.'});
      }
    
      XavierService.post('campaign/resend-invites', params)
        .then(() => {
        })
        .catch((error) => {
          return response.status(500).json(error.message);
        });

        logApi({
        endpoint: 'sendInvite',
        log: `Usuario: ${userId} enviou email de ativação para o participante ${params.participant_id} na campanha ${params.campaign_id}`,
      });

        let logData = {
          user_id: `${userId}`,
          user_fullname: `${userFullName}`,
          campaign_id: `${params.campaign_id}`,
          participant_id: `${params.participant_id}`, 
          environment: process.env.NODE_ENV, 
          endpoint: "sendInvite",
          flag: "dados",
          type: `link de ativação`,
          };
          
          await logService.createLog(logData);

        return response.status(200).json({ message: 'Email/SMS enviado.' });
      } catch (e) {
      Log.send(
        `${logError} sendInvite Endpoint - ${e.message} - ${querystring.stringify(
          request.only(['campaign_id', 'participant_id','sms', 'email'])
        )}`
      );
      return response.status(400).json(e.message);
    }
  }

  async getManager({ request, response }) {
    try {
      const params = request.only(['page']);

      if (!params.page) {
        params.page = 1;
      }

      const q = querystring.stringify(params);

      const manager = await XavierService.get(`user/get?${q}`, params);

      return response.status(200).json(manager);
    } catch (e) {
      Log.send(`${logError} getManager Endpoint - ${e.message}`);
      return response.status(401).json(e.message);
    }
  }

  async getManagerByCampaign({ request, response }) {
    try {
      const params = request.only(['campaign_id']);

      if (!params) {
        return response.status(401).json('No campaign informed');
      }
      let managers = [];

      const manager = await XavierService.get(`user-campaign/get?campaign_id=${params.campaign_id}`);
      if (manager && manager.data[0]) {
        for (const item of manager.data) {
          if (item.user[0].enabled) {
            managers.push({
              user_id: item.user_id,
              manager: `${item.user[0].name} ${item.user[0].surname}`
            });
          }
        }
      } else {
        return response.status(204).json('No manager found in this campaign');
      }
      return response.status(200).json(managers);
    } catch (e) {
      Log.send(`${logError} getManagerByCampaign Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getCampaignPage({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'url', 'participant_id', 'id']);

      if (params.id) {
        const campaignPage = await XavierService.get(
          `campaign-page/getOne?id=${params.id}`
        );
        const { data: segmentations } = await XavierService.get(`campaign-page-has-segmentation/get?campaign_page_id=${campaignPage.data.id}`);
        campaignPage.data.segmentation_ids = segmentations.map((seg) => seg.segmentation_id);
        return response.status(200).json(campaignPage);
      }

      const { data: participantSegmentations } = await HomerSimpsonService.get(`participant-segmentation/get?campaign_id=${params.campaign_id}&participant_id=${params.participant_id}`);
      let campaignPages = [];

      for (const segmentation of participantSegmentations) {
        const campaignPage = await XavierService.get(
          `campaign-page/getOne?campaign_id=${params.campaign_id}&url=${params.url}&segmentation_id=${segmentation.segmentation_id}`
        );
        if(Object.keys(campaignPage.data).length){
          campaignPages.push(campaignPage);
        }
      }

      if(campaignPages.length){
        campaignPages = XavierHelperService.getLatestCampaignPage(campaignPages);
      }else{
        campaignPages = await XavierService.get(
          `campaign-page/withoutSegmentation?campaign_id=${params.campaign_id}&url=${params.url}`
        );
      }

      if(params.url === 'rules'){
        campaignPages = await XavierService.get(
          `campaign-page/getOne?campaign_id=${params.campaign_id}&url=${params.url}`);
      }

      return response.status(200).json(campaignPages);
    } catch (e) {
      Log.send(`${logError} getCampaignPage Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getCampaignPageAll({ request, response }) {
    const params = request.only(['campaign_id', 'url', 'page', 'limit']);

    const query = (new URLSearchParams(params)).toString();
    try {
      const campaignPages = await XavierService.get(`campaign-page/get?${query}`);
      return response.status(200).json(campaignPages);
    } catch (error) {
      Log.send(`${logError} getCampaignPageAll Endpoint - ${error.message}`);
      return response.status(500).json(error.message);
    }
  }

  async campaignPagePut({ request, response }) {
    try {
      let params = request.only([
        'id',
        'name',
        'campaign_id',
        'url',
        'content',
        'content_app',
        'status',
        'begin_at',
        'end_at',
        'segmentation_ids'
      ]);

      if ((!params.id && !params.campaign_id) || !params.url) {
        return response.status(400).json('Bad Request.');
      }

      if ((params.url !== 'rules') && (!params.begin_at || !params.end_at || !params.status)) {
        return response.status(400).json({ message: 'Os atributos begin_at, end_at e status são obrigatórios.' });
      }

      if (params.segmentation_ids){
        for (let id of params.segmentation_ids) {
          const segmentation = await XavierService.get(`segmentation/${id}`);
          if (!segmentation.data) {
            return response.status(400).json({ message: `segmentação ${id} não encontrada` });
          }
        }
      }

      if (params.id) {
        const page = await XavierService.get(`campaign-page/get?id=${params.id}`);
        if (!page.data.length) {
          return response.status(400).json({ message: `comunicação de id ${params.id} não encontrada` });
        }
      }

      const pagePut = await XavierService.put('campaign-page/put', params);

      if (!pagePut){
        return response.status(400).json({ message: 'erro ao salvar comunicação' });
      }

      if(params.id){
        const campaignPageHasSegRemove = await XavierService.delete(`campaign-page-has-segmentation/delete?campaign_page_id=${pagePut.data.id}`);
        if(!campaignPageHasSegRemove){
          return response.status(400).json({ message: `falha na remoção de segmentações antigas` });
        }
      }

      const failedSegmentations = [];
      if(params.segmentation_ids){
        for (let id of params.segmentation_ids) {
          const campaignPageHasSeg = await XavierService.post('campaign-page-has-segmentation/create', { campaign_page_id: pagePut.data.id, segmentation_id: id });
          if (campaignPageHasSeg.status !== 200) {
            failedSegmentations.push(id);
          }
        }
      }
      if (failedSegmentations.length) {
        return response.status(200).json({ ...pagePut, failedSegmentations });
      }

      return response.status(200).json(pagePut);
    } catch (e) {
      Log.send(`${logError} campaignPagePut Endpoint - ${e.message}`);
      return response.status(401).json(e.message);
    }
  }

  async getCampaignById({ params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Bad request.');
      }

      const campaign = await XavierService.get(`campaign/${params.id}`);

      if (!campaign) {
        return response.status(404).json('Campaign not found');
      }

      let campaignHasConfig = [];
      for(let config of campaign.data.campaignHasConfig){
        let value = JSON.parse(config.value);
        let key = config.campaignConfig[0].key;
        campaignHasConfig.push({
          config_id: config.config_id,
          campaign_has_config_id: config.id,
          key:key,
          valueRaw:config.value,
          value:value[key]
        });
      }
      campaign.data.campaignHasConfig = campaignHasConfig;


      let unifiedCampaigns = [];
      for(let unifiedCampaign of campaign.data.unifiedCampaigns){
        unifiedCampaigns.push({
          name:unifiedCampaign.subCampaign[0].name,
          campaign_id:unifiedCampaign.sub_campaign_id
        });
      }
      campaign.data.unifiedCampaigns = unifiedCampaigns;

      return response.status(200).json(campaign);
    } catch (e) {
      Log.send(`${logError} getCampaignById Endpoint - ${e.message}`);
      return response.status(401).json(e.message);
    }
  }

  async putCampaign({ request, response }) {
    try {
      const params = request.only([
        'id',
        'customer_id',
        'name',
        'title',
        'page_title',
        'domain',
        'sender_email',
        'campaign_email',
        'published',
        'valid_from',
        'valid_to',
        'marketplaces',
        'config',
        'custom_url',
        'page',
        'user_id',
        'mechanic_types',
        'unified_campaigns',
        'description'
      ]);

      const campaign = await XavierService.put('campaign/put', params);

      return response.status(200).json(campaign);
    } catch (e) {
      Log.send(`${logError} putCampaign Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async putCampaignConfig({ request, response }) {
    try {
      const params = request.only([
        'id',
        'customer_id',
        'name',
        'title',
        'page_title',
        'domain',
        'sender_email',
        'campaign_email',
        'published',
        'valid_from',
        'valid_to',
        'marketplaces',
        'config',
        'custom_url',
        'page'
      ]);

      const campaign = await XavierService.put('campaign/config/put', params);

      return response.status(200).json(campaign);
    } catch (e) {
      Log.send(`${logError} putCampaignConfig Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getBanner({ request, response }) {
    try {
      const params = request.only(['id', 'banner_type_id', 'campaign_id', 'enabled', 'page','participant_id']);

      if (!params.campaign_id) {
        return response.status(400).json('Bad Request.');
      }

      let query = new URLSearchParams(params);
      query.delete('participant_id');

      const segmentations = await HomerSimpsonService.get(`participant-segmentation/get?campaign_id=${params.campaign_id}&participant_id=${params.participant_id}`);
      let banners = [];
      for (const segmentation of segmentations.data) {
        query.append('segmentation_id',segmentation.segmentation_id);
        const banner = await XavierService.get(`banner/get?${query.toString()}`);
        if(banner.data.length){
          banners.push(...banner.data);
        }
        query.delete('segmentation_id');
      }
      //O bloco abaixo serve para remove banners repetidos
      banners = banners.reduce((acc, item) => {
        if(!acc.some(banner => banner.banner_id === item.banner_id)) {
          acc.push(item);
        }
        return acc;
      }, []);

      const bannersWithoutSegmentation = await XavierService.get(`banner/get?${query.toString()}`);
      let res = [...banners,...bannersWithoutSegmentation.data];

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} getBanner Endpoint - ${e.message}`);
      return response.status(401).json(e.message);
    }
  }

  async getBannerList({ request, response }) {
    try {
      const params = request.only(['id', 'banner_type_id', 'campaign_id','page']);

      if (!params.campaign_id) {
        return response.status(400).json({ message: 'O parâmetro campaign_id é obrigatório.' });
      }

      let query = new URLSearchParams(params);
      const banner = await XavierService.get(`banner-list/get?${query.toString()}`);

      return response.status(200).json(banner);
    } catch (e) {
      Log.send(`${logError} getBannerList Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async customerPut({ request, response }) {
    try {
      const params = request.only([
        'id',
        'name',
        'fantasy_name',
        'main_activity',
        'document',
        'state_registration',
        'email',
        'postalcode',
        'address',
        'neighborhood',
        'city',
        'state',
        'phone'
      ]);

      const customer = await XavierService.put('customer/put', params);

      return response.status(200).json(customer);
    } catch (e) {
      Log.send(`${logError} customerPut Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getCampaignsByEmail({ request, response }) {
    try {
      const params = request.only(['email']);

      if (!params.email) {
        return response.status(400).json('Bad Request.');
      }

      const user = await XavierService.get(`user/get?email=${params.email}&paginate=false`);

      return response.status(200).json(user);
    } catch (e) {
      Log.send(`${logError} getCampaignsByEmail Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getFaqById({ params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Bad Request.');
      }

      const faq = await XavierService.get(`faq/${params.id}`);

      return response.status(200).json(faq.data);
    } catch (e) {
      Log.send(`${logError} getFaqById Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async searchCustomer({ request, response }) {
    try {
      const params = request.only(['search']);

      if (!params.search) {
        return response.status(400).json('Bad Request.');
      }

      const customer = await XavierService.get(`customer/search?search=${params.search}`);

      return response.status(200).json(customer);
    } catch (e) {
      Log.send(`${logError} searchCustomer Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async searchCampaign({ request, response }) {
    try {
      const params = request.only(['search']);

      if (!params.search) {
        return response.status(400).json('Bad Request.');
      }

      const campaign = await XavierService.get(`campaign/search?search=${params.search}`);

      return response.status(200).json(campaign);
    } catch (e) {
      Log.send(`${logError} searchCampaign Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getBannerById({ params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Bad Request.');
      }

      const banner = await XavierService.get(`banner/${params.id}`);
      if(banner.status !== 200){
        return response.status(400).json({ message: 'Banner não encontrado' });
      }
      const bannerHasSegmentation = await XavierService.get(`banner-has-segmentation/get?banner_id=${params.id}`);
      if(bannerHasSegmentation.data.length){
        banner.data.segmentation_ids = bannerHasSegmentation.data.map((bhs) => bhs.segmentation_id);
      }

      return response.status(200).json(banner);
    } catch (e) {
      Log.send(`${logError} getBannerById Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async putBanner({ request, response }) {
    try {
      const params = request.only([
        'id',
        'banner_type_id',
        'media',
        'responsive_media',
        'name',
        'begin_at',
        'end_at',
        'link',
        'campaign_id',
        'enabled',
        'segmentation_ids'
      ]);

      if (!params) {
        return response.status(401).json('Bad request.');
      }

      if (!params.begin_at || !params.end_at || !params.name) {
        return response.status(400).json('Os campos nome, data de inicio e fim são obrigatórios.');
      }

      if(params.segmentation_ids){
        for (let id of params.segmentation_ids) {
          const segmentation = await XavierService.get(`segmentation/${id}`);
          if (!segmentation.data) {
            return response.status(400).json({ message: `Segmentação ${id} não encontrada` });
          }
        }
      }

      const update = await XavierService.put('banner/put', params);

      if (update) {
        // Se for uma edição de banner
        if(params.id){
          const bannerHasSegRemove = await XavierService.post('banner-has-segmentation/remove', { banner_id: update.data.id });
          if(!bannerHasSegRemove){
            return response.status(400).json({ message: `Falha na remoção de segmentações antigas` });
          }
        }
        const failedSegmentations = [];
        if(params.segmentation_ids){
          for (let segmentation_id of params.segmentation_ids) {
            const bannerHasSeg = await XavierService.post('banner-has-segmentation/create', { banner_id: update.data.id, segmentation_id });
            if (bannerHasSeg.status !== 200) {
              failedSegmentations.push(segmentation_id);
            }
          }
        }
        if (failedSegmentations.length) {
          return response.status(200).json({ ...update, failedSegmentations });
        }

        return response.status(200).json(update);
      }
      return response.status(400).json('Algo deu errado.');
    } catch (e) {
      Log.send(`${logError} putBanner Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async searchBannerType({ request, response }) {
    try {
      const params = request.only(['search']);

      if (!params.search) {
        return response.status(400).json('Bad Request.');
      }

      const bannerType = await XavierService.get(`banner-type/search?search=${params.search}`);

      return response.status(200).json(bannerType);
    } catch (e) {
      Log.send(`${logError} searchBannerType Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getAllBannerType({ request, response }) {
    try {
      const bannerType = await XavierService.get(`banner-type/all`);

      return response.status(200).json(bannerType);
    } catch (e) {
      Log.send(`${logError} getAllBannerType Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getBannerTypeById({ params, response }) {
    try {
      const banner = await XavierService.get(`banner-type/${params.id}`);

      if (banner.status == 200) {
        return response.status(200).json(banner);
      }
      return response.status(401).json(banner);
    } catch (e) {
      Log.send(`${logError} getBannerTypeById Endpoint - ${e.message}`);
      return response.status(401).json(e.message);
    }
  }

  async getNewsBoard({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'page', 'enabled']);

      if (!params.campaign_id) {
        return response.status(400).json('Bad Request.');
      }

      let query = `?campaign_id=${params.campaign_id}`;

      if (params.page) {
        query = `${query}&page=${params.page}`;
      }

      if (params.enabled) {
        query = `${query}&enabled=${params.enabled}`;
      }

      const banners = await XavierService.get(`news-board/get${query}`);

      return response.status(200).json(banners);
    } catch (e) {
      Log.send(`${logError} getNewsBoard Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getNewsBoardById({ params, response }) {
    try {
      if (!params) {
        return response.status(400).json('Params not found');
      }

      if (!params.id) {
        return response.status(400).json('news_board_id is required');
      }

      const newsBoardResponse = await XavierService.get(`news-board/${params.id}`);

      if (newsBoardResponse.status !== 200) {
        return response
          .status(newsBoardResponse.status)
          .json(newsBoardResponse.data ? newsBoardResponse.data : `News-board not found`);
      }

      const participantNewsBoardResponse = await HomerSimpsonService.get(
        `participant-has-news-board/complete/get?news_board_id=${newsBoardResponse.data.id}`
      );

      if (participantNewsBoardResponse.status !== 200) {
        if (participantNewsBoardResponse.status !== 400)
          return response
            .status(participantNewsBoardResponse.status)
            .json(
              participantNewsBoardResponse.data ? participantNewsBoardResponse.data : `News-board not found`
            );
      }

      if (participantNewsBoardResponse.data && participantNewsBoardResponse.data.length > 0) {
        let participants = [];
        let segmentations = [];

        for (let item of participantNewsBoardResponse.data) {
          if (item.participant) {
            participants.push(item.participant.code ? item.participant.code : item.participant.document);
          } else if (item.segmentation_id) {
            segmentations.push(item.segmentation_id);
          }
        }

        newsBoardResponse.data['participants'] = participants;

        if (segmentations && segmentations.length > 0) {
          let segmentation_ids = [];

          for (let id of segmentations) {
            const segmentationResponse = await XavierService.get(`segmentation/${id}`);

            if (segmentationResponse.status !== 200) {
              if (segmentationResponse.status !== 400)
                return response
                  .status(segmentationResponse.status)
                  .json(segmentationResponse.data ? segmentationResponse.data : `News-board not found`);
            }

            if (segmentationResponse.data) {
              segmentation_ids.push(segmentationResponse.data.id);
            }
          }

          newsBoardResponse.data['segmentation_ids'] = segmentation_ids;
        }
      }

      return response.status(200).json(newsBoardResponse.data);
    } catch (e) {
      Log.send(`${logError} - getNewsBoardById Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async putNewsBoard({ request, response }) {
    try {
      const params = request.only([
        'id',
        'title',
        'thumb',
        'responsive_thumb',
        'image',
        'responsive_image',
        'type',
        'content',
        'popup',
        'begin_at',
        'end_at',
        'enabled',
        'campaign_id',
        'segmentation_ids',
        'participants'
      ]);

      const newsboard = await XavierService.put('news-board/put', params);

      return response.status(200).json(newsboard);
    } catch (e) {
      Log.send(`${logError} putNewsBoard Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getAllSegmentation({ request, response }) {
    try {
      const params = request.only(['campaign_id']);
      let query = '';

      if (params.campaign_id) {
        query = `?campaign_id=${params.campaign_id}`;
      }

      const segmentations = await XavierService.get(`segmentation/all${query}`);

      return response.status(200).json(segmentations);
    } catch (e) {
      Log.send(`${logError} getAllSegmentation Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getSegmentation({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'segmentation_parent_id']);

      if (!params.campaign_id) {
        return response.status(400).json('Bad Request.');
      }

      let query = `?campaign_id=${params.campaign_id}`;

      if (params.segmentation_parent_id) {
        query = `${query}&segmentation_parent_id=${params.segmentation_parent_id}`;
      }

      const segmentation = await XavierService.get(`segmentation/get${query}`);

      return response.status(200).json(segmentation);
    } catch (e) {
      Log.send(`${logError} getSegmentation Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getSegmentationById({ params, response }) {
    try {
      const segmentation = await XavierService.get(`segmentation/${params.id}`);
      return response.status(200).json(segmentation);
    } catch (e) {
      Log.send(`${logError} getSegmentationById Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async putSegmentation({ request, response }) {
    try {
      const params = request.only(['id', 'campaign_id', 'name', 'segmentation_parent_id']);

      if (!params.campaign_id) {
        return response.status(400).json('Bad Request.');
      }

      const segmentation = await XavierService.put('segmentation/put', params);

      return response.status(200).json(segmentation);
    } catch (e) {
      Log.send(`${logError} putSegmentation Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async searchSegmentation({ request, response }) {
    try {
      const params = request.only(['search', 'campaign_id', 'page']);

      params.page = params.page ? params.page : 1;

      if (!params.search) {
        return response.status(400).json({ message: 'Faltando o parâmetro search.' });
      }

      if (!params.campaign_id) {
        return response.status(400).json({ message: 'Faltando o parâmetro campaign_id.' });
      }

      const campaign = await XavierService.get(`campaign/${params.campaign_id}`);

      if (campaign.status != 200) {
        return response.status(400).json({ message: 'Campanha não encontrada.' });
      }

      const segmentations = await XavierService.get(
        `segmentation/search?search=${params.search}&campaign_id=${params.campaign_id}&page=${params.page}`
      );

      if(segmentations.status != 200){
        return response.status(400).json({ message: `Houve um erro ao buscar as segmentações.` });
      }

      if(segmentations.data.segmentations.length <= 0){
        return response.status(400).json({ message: `Não foram encontrados resultados.` });
      }

      let finalResponse = {};
      finalResponse.data = [];
      for(let segmentation of segmentations.data.segmentations){
        finalResponse.data.push(segmentation);
      }

      finalResponse.page = segmentations.data.page;
      finalResponse.lastPage = segmentations.data.lastPage;
      finalResponse.total = segmentations.data.total;
      return response.status(200).json(finalResponse);
    } catch (e) {
      Log.send(`${logError} searchSegmentation Endpoint - ${e.message} - params ${new URLSearchParams(
        request.only(['search', 'campaign_id'])
      )}`);
      return response.status(400).json(e.message);
    }
  }

  async putModuleRoles({ request, response }) {
    try {
      const params = request.only([
        'module_id',
        'user_id',
        'campaign_id',
        'user_who_gave',
        'view',
        'insert',
        'edit',
        'delete',
        'default_role_id'
      ]);

      if (
        (!params.module_id && !params.default_role_id) ||
        !params.user_id ||
        !params.campaign_id ||
        !params.user_who_gave
      ) {
        return response.status(400).json('Bad request.');
      }

      const moduleRoles = await XavierService.put('module-roles/put', params);

      return response.status(200).json(moduleRoles);
    } catch (e) {
      Log.send(`${logError} putModuleRoles Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async deleteModuleRoles({ params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Bad Request.');
      }

      const deleteRole = await XavierService.get(`module-roles/delete/${params.id}`);

      return response.status(200).json(deleteRole);
    } catch (e) {
      Log.send(`${logError} deleteModuleRoles Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getAllDefaultRoles({ request, response }) {
    try {
      const defaultRoles = await XavierService.get('default-roles/all');

      return response.status(200).json(defaultRoles);
    } catch (e) {
      Log.send(`${logError} getAllDefaultRoles Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getSumTotalTransactional({ request, response }) {
    try {
      const params = request.only(['campaign_id']);

      if (!params.campaign_id) {
        return response.status(400).json('Bad request');
      }

      const data = await XavierService.get(
        `campaign-credit/sum-total-transactional?campaign_id=${params.campaign_id}`
      );

      return response.status(200).json(data);
    } catch (e) {
      Log.send(`${logError} getSumTotalTransactional Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getSumGoals({ request, response }) {
    try {
      const params = request.only(['campaign_id']);

      if (!params.campaign_id) {
        return response.status(400).json('Bad request');
      }

      const sumGoals = await XavierService.get(`campaign-credit/sum-goals?campaign_id=${params.campaign_id}`);
      const sumAdjustment = await RobinService.get(`adjustment-point/sum/get?campaign_id=${params.campaign_id}`);
      sumGoals.data[0].credits -= sumAdjustment.data[0].credits;

      return response.status(200).json(sumGoals);
    } catch (e) {
      Log.send(`${logError} getSumGoals Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getCampaignCredit({ request, response }) {
    try {
      const params = request.only(['campaign_id']);

      if (!params.campaign_id) {
        return response.status(400).json('Bad request');
      }

      const data = await XavierService.get(`campaign-credit/get?campaign_id=${params.campaign_id}`);

      return response.status(200).json(data);
    } catch (e) {
      Log.send(`${logError} getCampaignCredit Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getExtractList({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'flag_credit', 'page']);

      if (!params.campaign_id) {
        return response.status(400).json('Bad Request');
      }

      if (!params.page) {
        params.page = 1;
      }

      let query = `?campaign_id=${params.campaign_id}&page=${params.page}`;

      if (params.flag_credit === '0' || params.flag_credit === '1') {
        query = `${query}&flag_credit=${params.flag_credit}`;
      }

      const data = await XavierService.get(`campaign-credit-transactional/extract${query}`);

      return response.status(200).json(data);
    } catch (e) {
      Log.send(`${logError} getExtractList Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async validateDomain({ request, response }) {
    try {
      
      const params = request.only(['campaign_id', 'domain', 'type']);

      if (!params.domain && !params.type) {
        return response.status(400).json('Bad Request');
      }

      const data = await XavierService.get(
        `validate-domain?campaign_id=${params.campaign_id}&domain=${params.domain}&type=${params.type}`
      );

      return response.status(200).json(data);
    } catch (e) {
      Log.send(`${logError} validateDomain Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async purchaseOrder({ request, response }) {
    const userId = request.authUserId
    try {
        const params = request.only([
        'campaign_id',
        'cash_back',
        'fee',
        'tax_invoice',
        'money',
        'point_value',
        'credits',
        'name',
        'document',
        'order_payment',
        'ticket',
        'email',
        'phone',
        'period',
        'quantity_card',
        'value_card',
        'payment_points'
      ]);

      const buyPoints = await XavierService.put('purchase-order/put', params);

      logApi({
        endpoint: 'purchaseOrder',
        log: `Usuario: ${userId}, Adquiriu ${params.money} pontos para a campanha: ${params.campaign_id}`,
      });

      return response.status(200).json(buyPoints);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - XavierController - purchaseOrder Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getPurchaseOrderById({ params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Bad Request');
      }

      const purchaseOrder = await XavierService.get(`purchase-order/${params.id}`);

      return response.status(200).json(purchaseOrder);
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - XavierController - getPurchaseOrderById Endpoint - ${e.message}`
      );
      return response.status(500).json(e.message);
    }
  }

  async getPurchaseOrder({ request, response }) {
    try {
      const params = request.only(['campaign_id']);

      const buyPoints = await XavierService.get(`purchase-order/get?campaign_id=${params.campaign_id}`);

      return response.status(200).json({ data: buyPoints.data });
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - XavierController - getPurchaseOrder Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async QueuePurchaseOrder({ request, response }) {
    try {
      const data = request.only(['id']);

      const queueRet = await XavierService.post(`purchase-order/queue`, {
        id: data.id
      });

      return response.status(200).json(queueRet);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - XavierController - QueuePurchaseOrder Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }


  async validityAll({request, response}){
    try {
      const validitys = await XavierService.get(`validity/all`);
      return response.status(200).json(validitys);
    } catch (error) {

    }
  }


  async getCampaignHasMechanic({ request, response }) {
    try {
      const params = request.only(['campaign_id']);
      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id parameter.');
      }

      const campaignHasMechanic = await XavierService.get(`campaign-mechanic/get?campaign_id=${params.campaign_id}&enabled=1`);

      let mechanics = [];

      if(campaignHasMechanic.data && campaignHasMechanic.data.length > 0){
        let count = 0;
        for(let mechanic of campaignHasMechanic.data){
          const mechanicType = await JarvisService.get(`mechanic-type/${mechanic.mechanic_type_id}`);
          mechanics.push({});
          mechanics[count].id = mechanicType.data.id;
          mechanics[count].name = mechanicType.data.name;
          mechanics[count].alias = mechanicType.data.alias;
          count ++;
        }
      }

      return response.status(200).json(mechanics);
    } catch (e) {
      Log.send(`${logError} getCampaignHasMechanic Endpoint - ${e.message} - params: ${
        querystring.stringify(request.only([
          'campaign_id'
        ]))}`);
      return response.status(401).json(e.message);
    }
  }

  async getUnifiedCampaigns({ request, response }) {
    try {
      let { campaignId } = request.only(['campaignId']);
      if (!campaignId) {
        return response.status(400).json({ message: 'parametro campaignId necessário' });
      }
      if (isNaN(campaignId)){
        return response.status(400).json({ message: 'o parametro CampaignId deve ser um número' });
      }

      campaignId = Number(campaignId);
      const { data: campaignHasCampaign } = await XavierService.get(`campaign-has-campaign/get?parent_campaign_id=${campaignId}`);
      if (!campaignHasCampaign.length){
        return response.status(400).json({ message: 'falha ao buscar campanhas atreladas a essa campanha' });
      }

      const unifiedCampaignsIds = campaignHasCampaign.map((campaign) => campaign.sub_campaign_id);
      let unifiedCampaigns = await XavierHelperService.getCampaignsByIdsArray(unifiedCampaignsIds);
      if (!unifiedCampaigns.length){
        return response.status(400).json({ message: 'falha ao buscar pelas campanhas unificadas' });
      }

      unifiedCampaigns = unifiedCampaigns.map((campaign) => {
        const { id, name } = campaign;
        return { id, name };
      });

      const configKeys = ['hasParticipantPdv', 'hasParticipantImg'];
      const campaignsWithConfigs = await XavierHelperService.addConfigToCampaignsArray(unifiedCampaigns, configKeys);

      return response.status(200).json(campaignsWithConfigs);

    } catch (e) {
      Log.send(`${logError} getUnifiedCampaigns Endpoint - ${e.message} - params: ${
        querystring.stringify(request.only([
          'campaignId'
        ]))}`);
      return response.status(401).json(e.message);
    }
  }

  async getSegmentationGroup ({ request, response }) {
    const { campaign_id } = request.only(['campaign_id']);
    if (!campaign_id) {
      return response.status(400).json({ message: 'O parâmetro campaign_id é obrigatório.' });
    }

    try {
      const groups = await XavierService.get(`/segmentation-group/get?campaign_id=${campaign_id}`);
      if(!groups.data.length){
        return response.status(400).json({ message: 'Não existem grupos de segmentação para serem exibidos nesta campanha.' });
      }
      const promises = groups.data.map(group => XavierService.get(`segmentation-has-group/get?segmentation_group_id=${group.id}`));
      const groupSegs = await Promise.all(promises);
      const groupsWithSegmentation = XavierHelperService.addSegmentationIdsToGroups(groups, groupSegs);
      const groupsWithSegFamily = await XavierHelperService.addSegmentationFamilyToGroups(groupsWithSegmentation);

      response.status(groups.status).json(groupsWithSegFamily);
    } catch (error) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - XavierController - getSegmentationGroup Endpoint - ${error.message}`);
      return response.status(400).json({ message: error.message });
    }
  }

  async createSegmentationGroup ({ request, response }) {
    const { name, campaign_id, segmentation_ids } = request.only(['campaign_id', 'name', 'segmentation_ids']);
    if(!name || typeof name !== 'string' || !campaign_id || typeof campaign_id !== 'number'){
      return response.status(400).json({ message: 'Os parâmetros name e campaign_id são obrigatórios.' });
    }
    if(!segmentation_ids || segmentation_ids.length === 0){
      return response.status(400).json({ message: 'Para criação do grupo é necessário o envio de segmentações.' });
    }
    try {
      for (const id of segmentation_ids) {
        const segmentationValidation = await XavierService.get(`segmentation/get?segmentation_parent_id=${id}&campaign_id=${campaign_id}`);
        if(segmentationValidation.status !== 200){
          return response.status(400).json({ message: 'Falha na validação do nível da segmentação.' });
        }
        if (segmentationValidation.data.length) {
          return response.status(400).json({ message: 'Devem ser enviadas apenas segmentações de último nível.' });
        }
      }
      const { status, data: group } = await XavierService.post(`/segmentation-group/create`, { name, campaign_id });
      if(status !== 200){
        return response.status(400).json({ message: 'Falha na criação do grupo.' });
      }
      const promises = segmentation_ids.map(segId => XavierService.post(`segmentation-has-group/create`, { segmentation_group_id: group.id, segmentation_id: segId }));
      const segHasGroups = await Promise.all(promises);
      const failedSegmentations = segHasGroups.filter((seg) => seg.status !== 200);
      if (failedSegmentations.length) {
        return response.status(400).json({ message: 'Falha ao salvar uma ou mais segmentações ao grupo.' });
      }

      return response.status(status).json({ message:'Grupo criado com sucesso!' });
    } catch (error) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - XavierController - createSegmentationGroup Endpoint - ${error.message}`);
      return response.status(400).json({ message: error.message });
    }
  }

  async updateSegmentationGroup ({ request, response }) {
    const { id, name, segmentation_ids } = request.only(['id', 'name', 'segmentation_ids']);
    if(!id || typeof id !== 'number'){
      return response.status(400).json({ message: 'O ID do grupo é obrigatório.' });
    }
    if(!name && !segmentation_ids){
      return response.status(400).json({ message: 'Deve ser informado o parâmetro name ou segmentation_ids para realizar uma atualização.' });
    }
    try {
      const findGroup = await XavierService.get(`/segmentation-group/get?id=${id}`);
      if(!findGroup.data.length){
        return response.status(400).json({ message:'O grupo informado não foi encontrado.' });
      }
      if (name) {
        if(typeof name !== 'string'){
          return response.status(400).json({ message: 'O parâmetro name deve estar no formato correto.' });
        }
        const group = await XavierService.put(`/segmentation-group/update`, { id, name });
        if(group.status !== 200){
          return response.status(400).json({ message:'Falha na atualização de nome.' });
        }
      }
      if(segmentation_ids) {
        if(segmentation_ids.length){
          const segmentation_group = await XavierService.get(`/segmentation-group/get?id=${id}`);
          if(segmentation_group.status === 200 && segmentation_group.data.length){
            const campaign_id = segmentation_group.data[0].campaign_id;
            for (const segmentation_id of segmentation_ids) {
              const segmentationValidation = await XavierService.get(`segmentation/get?segmentation_parent_id=${segmentation_id}&campaign_id=${campaign_id}`);
              if(segmentationValidation.status !== 200){
                return response.status(400).json({ message: 'Falha na validação do nível da segmentação.' });
              }
              if (segmentationValidation.data.length) {
                return response.status(400).json({ message: 'Devem ser enviadas apenas segmentações de último nível.' });
              }
            }
          }
        }
        const deleted = await XavierService.delete(`segmentation-has-group/deleteByGroup?segmentation_group_id=${id}`);
        if(deleted.status !== 200){
          return response.status(400).json({ message: 'Falha na remoção de segmentações antigas.' });
        }
        const promises = segmentation_ids.map(segId => XavierService.post(`segmentation-has-group/create`, { segmentation_group_id: id, segmentation_id: segId }));
        const segHasGroups = await Promise.all(promises);

        const failedSegmentations = segHasGroups.filter((seg) => seg.status !== 200);
        if (failedSegmentations.length) {
          return response.status(400).json({ message: 'Falha ao salvar uma ou mais segmentações ao grupo.' });
        }
      }
      return response.status(200).json({ message:'Grupo atualizado com sucesso!' });
    } catch (error) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - XavierController - updateSegmentationGroup Endpoint - ${error.message}`);
      return response.status(400).json({ message: error.message });
    }
  }

  async deleteSegmentationHasGroup({ request, response }){
    try {
      const { segmentation_group_id, segmentation_id } = request.only(['segmentation_group_id', 'segmentation_id']);
      if (!segmentation_group_id || !segmentation_id) {
        return response.status(400).json({ message: 'Os parâmetros segmentation_group_id e segmentation_id são obrigatórios.' });
      }
      const deleted = await XavierService.delete(`segmentation-has-group/delete?segmentation_group_id=${segmentation_group_id}&segmentation_id=${segmentation_id}`);
      if(deleted.status !== 200){
        return response.status(deleted.status).json({ message: deleted.data.message });
      }
      return response.status(200).json({ message: 'Segmentação removida do grupo com sucesso!' });
    } catch (error) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - XavierController - deleteSegmentationHasGroup Endpoint - ${error.message}`);
      return response.status(500).json({ message: error.message });

    }
  }

  async deleteSegmentationGroup({ request, response }){
    try {
      const { segmentation_group_id } = request.only(['segmentation_group_id']);
      if (!segmentation_group_id) {
        return response.status(400).json({ message: 'O parâmetro segmentation_group_id é obrigatório.' });
      }
      const deleteSegmentationHasGroup = await XavierService.delete(`segmentation-has-group/deleteByGroup?segmentation_group_id=${segmentation_group_id}`);
      if(deleteSegmentationHasGroup.status !== 200){
        return response.status(deleteSegmentationHasGroup.status).json({ message: deleteSegmentationHasGroup.data.message });
      }
      const deleteSegmentationGroup = await XavierService.delete(`segmentation-group/${segmentation_group_id}`);
      if(deleteSegmentationGroup.status !== 200){
        return response.status(deleteSegmentationGroup.status).json({ message: deleteSegmentationGroup.data.message });
      }
      return response.status(200).json({ message: 'Grupo removido com sucesso!' });
    } catch (error) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - XavierController - deleteSegmentationGroup Endpoint - ${error.message}`);
      return response.status(500).json({ message: error.message });
    }
  }

  async getCampaignConfig({ request, response }) {
    const params = request.only(['campaign_id', 'requestType']);
    let validParams = validateParamsCampaignAndRequest(params);

    if (validParams){
      return response.status(422).json({ message: validParams });
    }else{
      try {
        let campaignConfigs;

        if (params.requestType === 'parent') {
          campaignConfigs = await XavierHelperService.getParentCampaignConfig(params);
        } else {
          campaignConfigs = await XavierHelperService.getChildConfigs(params);
        }
        return response.status(200).json(campaignConfigs);
      } catch (e) {
        Log.send(`Env: ${Env.get('NODE_ENV')} - XavierController - get parent and child campaign config Endpoint - ${e.message}`);
        return response.status(500).json(e.message);
      }
    }
  }

  async getGtmId({ request, response }) {
    const { campaignId } = request.params;
    if (!campaignId) {
      return response.status(400).json({ message: 'parâmetro campaignId é obrigatório'});
    }
    try {
      const id = await XavierService.get(`campaign/gtm-id/${campaignId}`)
      return response.status(200).json(id);
    } catch (error) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - XavierController - getGtmId Endpoint - ${error.message} - params: 
      ${new URLSearchParams(request.params)}`);
      return response.status(500).json(error.message);
    }

  }

  async getMoviDesk({ request, response }) {
    const { campaignId } = request.params;
    if (!campaignId) {
      return response.status(400).json({ message: 'parâmetro campaignId é obrigatório'});
    }
    try {
      const id = await XavierService.get(`campaign/movidesk-key/${campaignId}`)
      return response.status(200).json(id);
    } catch (error) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - CampaignController - getKeyMoviDesk Endpoint - ${error.message} - params: 
      ${new URLSearchParams(request.params)}`);
      return response.status(500).json(error.message);
    }
  }

  async getRegulation({ request, response }) {
    const params = request.only(['campaign_id', 'limit']);
    const queryParams = (new URLSearchParams(params)).toString()
    try {
      return await XavierService.get(`regulation/get?${queryParams}`)
    } catch (error) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - CampaignController - getRegulation Endpoint - ${error.message} - params: ${queryParams}`);
      return response.status(500).json(error.message);
    }
  }

  async getOneRegulation({ request, response }) {
    const id = request.params.id;
    try {
      return await XavierService.get(`regulation/get-one/${id}`)
    } catch (error) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - CampaignController - getOneRegulation Endpoint - ${error.message} - params: ${queryParams}`);
      return response.status(500).json(error.message);
    }
  }

}

module.exports = XavierController;
