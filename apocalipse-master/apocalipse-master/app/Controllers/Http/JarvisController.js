const Env = use('Env');
const Log = new (use('LogHelper'))();
const messageError = `Env: ${Env.get('NODE_ENV')} - JarvisController - `;
const HomerSimpsonService = new (use('ApiInterceptorService'))(Env.get('HOMER_URL'));
const XavierService = new (use('ApiInterceptorService'))(Env.get('XAVIER_URL'));
const JarvisService = new (use('ApiInterceptorService'))(Env.get('JARVIS_URL'));
const HomerSimpsonInstance = new (use('App/Controllers/Http/HomerSimpsonController'))();
const SurveyService = new (use('SurveyHelper'))();
const ValidationService = new (use('ValidationHelper'))();
const dates = new Date();
const date = new Date(`${dates.getFullYear()}-${dates.getMonth() + 1}-${dates.getDate()}`);
const logError = `Env: ${Env.get('NODE_ENV')} - JarvisController`;
const querystring = use('querystring');
const moment = require('moment-timezone');
moment.tz.setDefault('America/Sao_paulo');
const { DateTime } = require('luxon');
const logApi = require('../../Providers/LogApi');

class JarvisController {
  async distributePoints({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'mechanic_id']);

      const awardPoints = await HomerSimpsonService.get(
        `participant-goal/sumPoints?mechanic_id=${params.mechanic_id}`
      );
      const campaign_credits = await XavierService.get(
        `campaign-credit/get?campaign_id=${params.campaign_id}`
      );
    } catch (e) {
      Log.send(`${messageError} distributePoints Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getMechanic({ params, response }) {
    try {
      const mechanic = await JarvisService.get(`mechanic/${params.id}`);

      return response.status(200).json(mechanic);
    } catch (e) {
      Log.send(`${messageError} getMechanic Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async gdeByParticipant({ request, response }) {
    try {
      const params = request.only(['participant_id', 'date']);

      if(!params.hasOwnProperty('participant_id')){
        return response.status(400).json('participant_id is required');
      }

      let query = `mechanic/gde-participant?participant_id=${params.participant_id}`;

      if (params.date) {
        query += `&date=${params.date}`;
      }

      const mechanicGDE = await JarvisService.get(`${query}`);

      if (mechanicGDE.status === 500) {
        return response.status(404).json('Participant not found on ranking.');
      }

      return response.status(200).json(mechanicGDE);
    } catch (e) {
      Log.send(`${messageError} gdeByParticipant Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async kofByParticipant({ request, response }) {
    try {
      const params = request.only(['participant_id', 'date']);

      if(!params.hasOwnProperty('participant_id')){
        return response.status(400).json('participant_id is required');
      }

      let query = `mechanic/kof-participant?participant_id=${params.participant_id}`;

      if (params.date) {
        query += `&date=${params.date}`;
      }

      const kofMechanic = await JarvisService.get(`${query}`);

      if (kofMechanic.status === 500 || kofMechanic.status === 404) {
        return response.status(404).json(kofMechanic.data);
      }

      return response.status(200).json(kofMechanic);
    } catch (e) {
      Log.send(`${logError} kofByParticipant Endpoint - ${e.message} - params: ${
        querystring.stringify(request.only([
          'participant_id',
          'date'
        ]))}`);
      return response.status(500).json(e.message);
    }
  }

  async countMechanics({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'enabled', 'begin_at', 'end_at']);

      let query = `mechanic/count?`;

      if (params.campaign_id) {
        query = `campaign_id=${params.campaign_id}&`;
      }
      if (params.enabled) {
        query = `enabled=${params.enabled}&`;
      }
      if (params.begin_at) {
        query = `begin_at=${params.begin_at}&`;
      }
      if (params.end_at) {
        query = `end_at=${params.end_at}`;
      }

      return response.status(200).json(await JarvisService.get(query));
    } catch (e) {
      Log.send(`${logError} - countMechanics Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getMechanics({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'sub_mechanic', 'ordination_direction', 'search', 'enabled', 'begin_at', 'end_at', 'page', 'limit']);
      let url = 'mechanic/get';

      if (Object.keys(params).length) {
        url += `?${querystring.stringify(params)}`;
      }

      const result = await JarvisService.get(url);

      result.data.data.map(item => {
        item.begin_at = DateTime.fromISO(item.begin_at).toFormat('yyyy-MM-dd HH:mm:ss');
        item.end_at = DateTime.fromISO(item.end_at).toFormat('yyyy-MM-dd HH:mm:ss');
        item.view_to = DateTime.fromISO(item.view_to).toFormat('yyyy-MM-dd HH:mm:ss');
      });

      return response.status(200).json(result);
    } catch (e) {
      Log.send(`${logError} - getMechanics Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async allMechanicTypes({ response }) {
    try {
      return response.status(200).json(await JarvisService.get('mechanic-type/all'));
    } catch (e) {
      Log.send(`${logError} - allMechanicTypes Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async putMechanicTypes({ request, response }) {
    try {
      const params = request.only(['id', 'name', 'config', 'show_front', 'enabled']);

      let query = `mechanic/get?`;

      if (params.campaign_id) {
        query += `campaign_id=${params.campaign_id}&`;
      }
      if (params.enabled) {
        query += `enabled=${params.enabled}&`;
      }
      if (params.begin_at) {
        query += `begin_at=${params.begin_at}&`;
      }
      if (params.end_at) {
        query += `end_at=${params.end_at}`;
      }

      return response.status(200).json(await JarvisService.get(query));
    } catch (e) {
      Log.send(`${logError} - putMechanicTypes Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getAllAudienceTypes({ request, response }) {
    try {
      const data = await JarvisService.get('audience-type/all');
      return response.status(200).json(data);
    } catch (e) {
      Log.send(`${logError} - getAllAudienceTypes Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getAllUnityTypes({ request, response }) {
    try {
      const data = await JarvisService.get('unity-type/all');
      return response.status(200).json(data);
    } catch (e) {
      Log.send(`${logError} - getAllUnityTypes Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async allMechanicTypes({ response }) {
    try {
      return response.status(200).json(await JarvisService.get('mechanic-type/all'));
    } catch (e) {
      Log.send(`${logError} - allMechanicTypes Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async putMechanicTypes({ request, response }) {
    try {
      const params = request.only(['id', 'name', 'config', 'show_front', 'enabled']);

      let query = `mechanic/get?`;

      if (params.campaign_id) {
        query = `campaign_id=${params.campaign_id}&`;
      }
      if (params.enabled) {
        query = `enabled=${params.enabled}&`;
      }
      if (params.begin_at) {
        query = `begin_at=${params.begin_at}&`;
      }
      if (params.end_at) {
        query = `end_at=${params.end_at}`;
      }

      return response.status(200).json(await JarvisService.get(query));
    } catch (e) {
      Log.send(`${logError} - putMechanicTypes Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async putMechanic({ request, response }) {
    try {
      const params = request.all();
      const userId = request.authUserId;

      const mechanic = await JarvisService.put('mechanic/put', params);

      if(params.id) {
        await logApi({
          endpoint: 'putMechanic',
          log:`A configuração da mecânica: ${params.id} foi alterada pelo usuario ${userId}`
        });
      }

      return response.status(200).json(mechanic);
    } catch (e) {
      Log.send(`${logError} - putMechanic Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async deleteMechanic({ request, response }) {
    try {
      const params = request.only(['id','user_id']);
      let mechanicHasDistribute = false;

      if(!params.id){
        return response.status(400).json({message: 'É necessário informar o id da mecânica.'});
      }
      
      const mechanicConfig = await HomerSimpsonInstance.getParticipantGoalsByMechanic({mechanic_id: params.id});
      if(mechanicConfig.status != 200){
        return response.status(400).json({ message:  'Falha na seleção de mecânica, verifique o id.' });
      }
      //Repetição para descobrir se a mecânica possui pontos distribuidos.
      for (const goal of mechanicConfig.data.goals) {
        if(goal.points_released == 1){
          mechanicHasDistribute = true;
        }
      }

      if(mechanicHasDistribute){
        return response.status(400).json({ message:  'A Mecânica já possui pontos distribuídos e não pode ser excluída.' });
      }

      if(!mechanicConfig.data.mechanic.enabled){
        return response.status(400).json({ message:  'A mecânica informada já está desativada.' });
      }

      const deletedMechanic = await JarvisService.delete(`mechanic/mechanic-delete/${params.id}`);
      
      if(deletedMechanic.status != 200){
        return response.status(deletedMechanic.status).json({message: deletedMechanic.data});
      }

      const user = await XavierService.get(`user/${params.user_id}`);
      const date = new Date();
      if(params.user_id){
        Log.send(`deleteMechanic - O usuário ${user.data.name} ${user.data.surname} (user_id: ${params.user_id}), excluíu a mecânica ${mechanicConfig.data.title} (mechanic_id: ${params.id}) ás ${date.toLocaleTimeString()} do dia ${date.toLocaleDateString()}.`);
      }else{
        Log.send(`deleteMechanic - Um usuário desconhecido excluíu a mecânica ${params.id} ás ${date.toLocaleTimeString()} do dia ${date.toLocaleDateString()}.`);
      }

      return response.status(200).json({message: 'Mecânica excluída com sucesso!'});
    } catch (e) {
      Log.send(`${logError} - DeleteMechanic Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getMechanicType({ request, response }) {
    try {
      const params = request.only(['alias']);
      let query = '?';

      if (params.alias) {
        query = `${query}alias=${params.alias}`;
      }

      const mechanicType = await JarvisService.get(`mechanic-type/get${query}`);

      return response.status(200).json(mechanicType);
    } catch (e) {
      Log.send(`${logError} - putMechanic Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyPost({ request, response }) {
    try {
      let params = request.body[0];

      if(!params.name){
        return response.status(400).json('Missing name parameter.');
      }

      if(!params.user_id){
        return response.status(400).json('Missing user_id parameter.');
      }

      if(!params.survey_type_id){
        return response.status(400).json('Missing survey_type_id parameter.');
      }

      if(!params.survey_question){
        return response.status(400).json('Missing survey_question parameter.');
      }

      const validSurveyConditions = await SurveyService.verifySurveyDateConditions(params);

      if(validSurveyConditions.validated == false){
        return response.status(400).json(validSurveyConditions.msg);
      }

      const today = moment.tz('America/Sao_paulo');
      params.last_cycle_round_at = today.format();

      if (params.segmentation_ids){
        for (let id of params.segmentation_ids) {
          const segmentation = await XavierService.get(`segmentation/${id}`);
          if (!segmentation.data) {
            return response.status(400).json({ message: `Segmentação ${id} não encontrada` });
          }
        }
      }

      const res = await JarvisService.put(`survey/put`, params);

      if (res.status !== 200){
        return response.status(400).json({ message: 'Erro ao salvar enquete' });
      }

      const failedSegmentations = [];
      if(params.segmentation_ids){
        for (let id of params.segmentation_ids) {
          const surveyHasSeg = await JarvisService.post('survey-has-segmentation/create', { survey_id: res.data.id, segmentation_id: id });
          if (surveyHasSeg.status !== 200) {
            failedSegmentations.push(id);
          }
        }
      }
      if (failedSegmentations.length) {
        return response.status(200).json({ ...res, failedSegmentations });
      }

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} surveyPost Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyDelete({ request, params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Missing id parameter.');
      }

      const res = await JarvisService.delete(`survey/${params.id}`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} surveyDelete Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyAll({ request, response }) {
    try {
      const res = await JarvisService.get(`survey/all`);

      const surveysData = res.data;

      for(let surveyData of surveysData){
        const totalParticipantAnswers = await HomerSimpsonService.get(`participant-survey-answer/count?survey_id=${surveyData.id}`);
        surveyData.total_answers = totalParticipantAnswers.data;
      }

      return response.status(200).json(surveysData);
    } catch (e) {
      Log.send(`${logError} surveyAll Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyGet({ request, response }) {
    try {
      const params = request.only(['id', 'user_id', 'survey_type_id', 'name', 'survey_question', 'cycle', 'config', 'begin_at', 'end_at', 'enabled', 'campaign_id', 'page', 'limit']);

      if (!params.limit) {
        params.limit = 10;
      }
      if (!params.page) {
        params.page = 1;
      }

      const stringParams = querystring.stringify(params);

      let res = {};

      res = await JarvisService.get(`survey/get?${stringParams}`);

      const surveysData = res.data;

      for(let surveyData of surveysData.data){
        const userInfo = await XavierService.get(`user/${surveyData.user_id}`);
        surveyData.user_name = userInfo.data.name;

        const totalParticipantAnswers = await HomerSimpsonService.get(`participant-survey-answer/count?survey_id=${surveyData.id}`);
        surveyData.total_answers = totalParticipantAnswers.data;
      }

      return response.status(200).json(surveysData);
    } catch (e) {
      Log.send(`${logError} surveyGet Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyPut({ request, response }) {
    try {
      const params = request.body[0];

      if (!params.id) {
        return response.status(400).json('Missing id parameter.');
      }

      const validSurveyConditions = await SurveyService.verifySurveyDateConditions(params);

      if(validSurveyConditions.validated == false){
        return response.status(400).json(validSurveyConditions.msg);
      }

      if (params.segmentation_ids){
        for (let id of params.segmentation_ids) {
          const segmentation = await XavierService.get(`segmentation/${id}`);
          if (!segmentation.data) {
            return response.status(400).json({ message: `Segmentação ${id} não encontrada.` });
          }
        }
      }

      const res = await JarvisService.put('survey/put', params);

      if (res.status !== 200){
        return response.status(400).json({ message: 'Erro ao editar enquete.' });
      }

      if(params.id){
        const surveyHasSegRemove = await JarvisService.delete(`survey-has-segmentation/delete?survey_id=${res.data.id}`);
        if(!surveyHasSegRemove){
          return response.status(400).json({ message: `Falha na remoção de segmentações antigas` });
        }
      }

      const failedSegmentations = [];
      if(params.segmentation_ids){
        for (let id of params.segmentation_ids) {
          const surveyHasSeg = await JarvisService.post('survey-has-segmentation/create', { survey_id: res.data.id, segmentation_id: id });
          if (surveyHasSeg.status !== 200) {
            failedSegmentations.push(id);
          }
        }
      }
      if (failedSegmentations.length) {
        return response.status(200).json({ ...res, failedSegmentations });
      }

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} - surveyPut Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyFind({ params, response }) {
    try {

      if (!params.id) {
        return response.status(400).json('Missing id parameter.');
      }

      const res = await JarvisService.get(`survey/${params.id}`);

      const { data: segmentations } = await JarvisService.get(`survey-has-segmentation/get?survey_id=${res.data.id}`);
      res.data.segmentation_ids = segmentations.map((seg) => seg.segmentation_id);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} surveyFind Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyHasCampaignPost({ request, response }) {
    try {
      const params = request.body[0];

      if(!params.campaign_id){
        return response.status(400).json('Missing campaign_id parameter.');
      }

      if(!params.survey_id){
        return response.status(400).json('Missing survey_id parameter.');
      }

      if(!params.user_id){
        return response.status(400).json('Missing user_id parameter.');
      }

      const res = await JarvisService.put(`survey-has-campaign/put`, params);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} surveyHasCampaignPost Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyHasCampaignDelete({ request, params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Missing id parameter.');
      }

      const res = await JarvisService.delete(`survey-has-campaign/${params.id}`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} surveyHasCampaignDelete Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyHasCampaignAll({ request, response }) {
    try {
      const res = await JarvisService.get(`survey-has-campaign/all`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} surveyHasCampaignAll Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyHasCampaignGet({ request, response }) {
    try {
      const params = request.only(['id', 'campaign_id', 'survey_id', 'user_id', 'enabled']);

      const stringParams = querystring.stringify(params);

      const res = await JarvisService.get(`survey-has-campaign/get?${stringParams}`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} surveyHasCampaignGet Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyHasCampaignPut({ request, response }) {
    try {
      const params = request.body[0];

      if(!params.id){
        return response.status(400).json('Missing id parameter.');
      }

      const res = await JarvisService.put('survey-has-campaign/put', params);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} - surveyHasCampaignPut Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyHasCampaignFind({ params, response }) {
    try {

      if (!params.id) {
        return response.status(400).json('Missing id parameter.');
      }

      const res = await JarvisService.get(`survey-has-campaign/${params.id}`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} surveyHasCampaignFind Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyTypePost({ request, response }) {
    try {
      let params = request.body[0];

      if(!params.name){
        return response.status(400).json('Missing name parameter.');
      }

      const res = await JarvisService.put(`survey-type/put`, params);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} surveyTypePost Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyTypeDelete({ request, params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Missing id parameter.');
      }

      const res = await JarvisService.delete(`survey-type/${params.id}`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} surveyTypeDelete Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyTypeAll({ request, response }) {
    try {
      const res = await JarvisService.get(`survey-type/all`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} surveyTypeAll Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyTypeGet({ request, response }) {
    try {
      const params = request.only(['id', 'name', 'config', 'enabled']);

      const stringParams = querystring.stringify(params);

      const res = await JarvisService.get(`survey-type/get?${stringParams}`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} surveyTypeGet Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyTypePut({ request, response }) {
    try {
      const params = request.body[0];

      if(!params.id){
        return response.status(400).json('Missing id parameter.');
      };

      const res = await JarvisService.put('survey-type/put', params);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} - surveyType Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyTypeFind({ params, response }) {
    try {

      if (!params.id) {
        return response.status(400).json('Missing id parameter.');
      }

      const res = await JarvisService.get(`survey-type/${params.id}`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} surveyTypeFind Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyAnswerPost({ request, response }) {
    try {
      for(const params of request.body){
        if(!params.survey_id){
          return response.status(400).json('Missing survey_id parameter.');
        }

        await JarvisService.put(`survey-answer/put`, params);
      }

      return response.status(200).json('All entries succesfully added');
    } catch (e) {
      Log.send(`${logError} surveyAnswerPost Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyAnswerDelete({ request, params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Missing id parameter.');
      }

      const res = await JarvisService.delete(`survey-answer/${params.id}`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} surveyAnswerDelete Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyAnswerAll({ request, response }) {
    try {
      const res = await JarvisService.get(`survey-answer/all`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} surveyAnswerAll Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyAnswerGet({ request, response }) {
    try {
      const params = request.only(['id', 'survey_id', 'answer', 'icon', 'config', 'enabled']);

      const stringParams = querystring.stringify(params);

      const res = await JarvisService.get(`survey-answer/get?${stringParams}`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} surveyAnswerGet Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyAnswerPut({ request, response }) {
    try {
      for(const params of request.body){

        if(!params.survey_id){
          return response.status(400).json('Missing survey_id parameter.');
        }

        await JarvisService.put(`survey-answer/put`, params);
      }

      return response.status(200).json('Saved succesfully');
    } catch (e) {
      Log.send(`${logError} - surveyAnswerPut Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async surveyAnswerFind({ params, response }) {
    try {

      if (!params.id) {
        return response.status(400).json('Missing id parameter.');
      }

      const res = await JarvisService.get(`survey-answer/${params.id}`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} surveyAnswerFind Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async scheduledSurvey({ request, response }) {
    try {
      const params = request.only(['id', 'campaign_id', 'survey_id', 'config', 'enabled', 'participant_id']);

      let stringParams = new URLSearchParams(params);

      const segmentations = await HomerSimpsonService.get(`participant-segmentation/get?campaign_id=${params.campaign_id}&participant_id=${params.participant_id}`);
      let surveys = [];
      let res = {};

      for (const segmentation of segmentations.data) {
        stringParams.append('segmentation_id', segmentation.segmentation_id);
        const survey = await JarvisService.get(`scheduled-survey/get?${stringParams.toString()}`);
        if(survey.data.length){
          surveys.push(...survey.data);
        }
        stringParams.delete('segmentation_id');
      }
      //O bloco abaixo serve para remover surveys repetidos
      surveys = surveys.reduce((acc, item) => {
        if(!acc.some(survey => survey.survey_id === item.survey_id)) {
          acc.push(item);
        }
        return acc;
      }, []);

      let surveysWithoutSegmentation = await JarvisService.get(`scheduled-survey/get?${stringParams}`);

      res.data = [...surveys,...surveysWithoutSegmentation.data];
      let surveyIds = [];
      let filterIds = [];

      for(let scheduledSurveys of res.data){
        surveyIds.push(scheduledSurveys.id);
      }

      for(let survey of surveyIds){
        const participantAnswers = await HomerSimpsonService.get(
          `participant-survey-answer/get?campaign_id=${params.campaign_id}&participant_id=${params.participant_id}&scheduled_survey_id=${survey}`);
        if (participantAnswers.data.length > 0){
          filterIds.push(survey);
        }
      }

      for(let filterId of filterIds){
        res.data = res.data.filter(({ id }) => id !== filterId);
      }

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} scheduledSurveyAll Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async MechanicQuizTypeDelete({ request, params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Missing id parameter.');
      }

      const res = await JarvisService.delete(`mechanic-quiz-type/${params.id}`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} MechanicQuizTypeDelete Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async MechanicQuizTypeAll({ request, response }) {
    try {
      const res = await JarvisService.get(`mechanic-quiz-type/all`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} MechanicQuizTypeAll Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async MechanicQuizTypeGet({ request, response }) {
    try {
      const params = request.only(['id', 'name', 'alias', 'config', 'enabled']);

      const stringParams = querystring.stringify(params);

      const res = await JarvisService.get(`mechanic-quiz-type/get?${stringParams}`);

      if (!res) {
        return response.status(404).json('Mechanic quiz type not found.');
      }

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} MechanicQuizTypeGet Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async MechanicQuizTypePut({ request, response }) {
    try {
      const params = request.only(['id', 'name', 'alias', 'config', 'enabled']);

      const res = await JarvisService.put('mechanic-quiz-type/put', params);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} - MechanicQuizTypePut Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async MechanicQuizTypeFind({ params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Missing id parameter.');
      }

      const res = await JarvisService.get(`mechanic-quiz-type/${params.id}`);

      if (!res.data) {
        return response.status(404).json('Mechanic quiz type not found.');
      }

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} MechanicQuizTypeFind Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async MechanicQuizAll({ request, response }) {
    try {
      const res = await JarvisService.get(`mechanic-quiz/all`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} MechanicQuizAll Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async MechanicQuizGet({ request, response }) {
    try {
      const params = request.only([
        'id',
        'campaign_id',
        'mechanic_id',
        'mechanic_quiz_type_id',
        'question',
        'weight',
        'enabled'
      ]);

      const stringParams = querystring.stringify(params);

      const res = await JarvisService.get(`mechanic-quiz/get?${stringParams}`);

      if (!res) {
        return response.status(404).json('Mechanic quiz not found.');
      }

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} MechanicQuizGet Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async MechanicQuizPut({ request, response }) {
    try {
      const params = request.only([
        'id',
        'campaign_id',
        'mechanic_id',
        'mechanic_quiz_type_id',
        'question',
        'weight',
        'enabled'
      ]);

      const res = await JarvisService.put('mechanic-quiz/put', params);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} - MechanicQuizPut Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async MechanicQuizFind({ params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Missing id parameter.');
      }

      const res = await JarvisService.get(`mechanic-quiz/${params.id}`);

      if (!res.data) {
        return response.status(404).json('Mechanic quiz not found.');
      }

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} MechanicQuizFind Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async MechanicQuizAnswerAll({ request, response }) {
    try {
      const res = await JarvisService.get(`mechanic-quiz-answer/all`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} MechanicQuizAnswerAll Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async MechanicQuizAnswerGet({ request, response }) {
    try {
      const params = request.only([
        'id',
        'campaign_id',
        'mechanic_id',
        'mechanic_quiz_id',
        'answer',
        'isCorrect',
        'enabled'
      ]);

      const stringParams = querystring.stringify(params);

      const res = await JarvisService.get(`mechanic-quiz-answer/get?${stringParams}`);

      if (!res) {
        return response.status(404).json('Quiz answer not found.');
      }

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} MechanicQuizAnswerGet Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async MechanicQuizAnswerPut({ request, response }) {
    try {
      const params = request.only([
        'id',
        'campaign_id',
        'mechanic_id',
        'mechanic_quiz_id',
        'answer',
        'isCorrect',
        'enabled'
      ]);

      const res = await JarvisService.put('mechanic-quiz-answer/put', params);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} - MechanicQuizAnswerPut Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async MechanicQuizAnswerFind({ params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Missing id parameter.');
      }

      const res = await JarvisService.get(`mechanic-quiz-answer/${params.id}`);

      if (!res.data) {
        return response.status(404).json('Quiz answer not found.');
      }

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} MechanicQuizAnswerFind Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async ParticipantQuizQuestionsGet({ request, response }) {
    try {
      let params = request.only([
        'campaign_id',
        'mechanic_id'
      ]);

      if(!params.campaign_id){
        return response.status(400).json('Missing campaign_id');
      }

      if(!params.mechanic_id){
        return response.status(400).json('Missing mechanic_id');
      }

      params.enabled = 1;

      const stringParamsQuestions = querystring.stringify(params);

      const mechanicQuizQuestions = await JarvisService.get(`mechanic-quiz/get?${stringParamsQuestions}`);

      if (!mechanicQuizQuestions.data.length) {
        return response.status(404).json('Quiz not found.');
      }

      /* O bloco a seguir busca as respostas e as relaciona com suas respectivas perguntas.
      Montado de modo a enviar no final a variável questions conforme padrão esperado no front-end.
      Que é cada pergunta contendo suas informações de id e title, e o mesmo para as respostas.*/
      let data = {};
      let questions = [];
      let countQuestions = 0;
      for(let mechanicQuizQuestion of mechanicQuizQuestions.data){
        questions.push({});
        questions[countQuestions].id = mechanicQuizQuestion.id;
        questions[countQuestions].title = mechanicQuizQuestion.question;

        params.mechanic_quiz_id = mechanicQuizQuestion.id;
        const stringParamsAnswers = querystring.stringify(params);

        const mechanicQuizAnswers = await JarvisService.get(`mechanic-quiz-answer/get?${stringParamsAnswers}`);
        questions[countQuestions].answers = [];

        let countAnswers = 0;
        let answers = [];
        for(let mechanicQuizAnswer of mechanicQuizAnswers.data){
          answers.push({});
          questions[countQuestions].answers = answers;
          questions[countQuestions].answers[countAnswers].id = mechanicQuizAnswer.id;
          questions[countQuestions].answers[countAnswers].text = mechanicQuizAnswer.answer;
          countAnswers ++;
        }
        countQuestions ++;
      }

      data.questions = questions;
      return response.status(200).json(data);
    } catch (e) {
      Log.send(`${logError} ParticipantQuizQuestionsGet Endpoint - ${e.message} - params: ${
        querystring.stringify(request.only([
          'campaign_id',
          'mechanic_id'
        ]))}`);
      return response.status(500).json(e.message);
    }
  }

  async getRule({ request, response }) {
    try {
      let params = request.only([
        'campaign_id'
      ]);

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id parameter.');
      }

      let filters = {
        campaign_id: params.campaign_id,
        enabled: 1
      };

      const filterString = querystring.stringify(filters);

      let rules = {};

      const results = await JarvisService.get(`rule/get?${filterString}`);

      if (!results.data.length > 0) {
        return response.status(404).json(rules);
      }

      rules.media = results.data[0].media;
      rules.title = results.data[0].title;
      rules.content = results.data[0].content;
      rules.moreInformation = results.data[0].pdf;

      return response.status(200).json(rules);
    } catch (e) {
      Log.send(`${logError} getRule Endpoint - ${e.message} - params: ${
        querystring.stringify(request.only([
          'campaign_id'
        ]))}`);
      return response.status(500).json(e.message);
    }
  }

  async getPrize({ request, response }) {
    try {
      let params = request.only([
        'campaign_id'
      ]);

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id parameter.');
      }

      let filters = {
        campaign_id: params.campaign_id,
        enabled: 1
      };

      const filterString = querystring.stringify(filters);

      let images = [];

      const results = await JarvisService.get(`prize/get?${filterString}`);

      if (!results.data.length > 0) {
        return response.status(404).json(images);
      }

      let count = 0;
      for(let result of results.data){
        images.push({});
        images[count].id = result.id;
        images[count].img_url = result.media;
        count ++;
      }

      return response.status(200).json(images);
    } catch (e) {
      Log.send(`${logError} getPrize Endpoint - ${e.message} - params: ${
        querystring.stringify(request.only([
          'campaign_id'
        ]))}`);
      return response.status(500).json(e.message);
    }
  }

  async getChallenges({ request, response }) {
    try {
      let params = request.only([
        'campaign_id',
        'participant_id',
        'date'
      ]);

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id parameter.');
      }

      if (!params.participant_id) {
        return response.status(400).json('Missing participant_id parameter.');
      }

      const participantSegmentations = await HomerSimpsonService.get(`participant-segmentation/tree/get?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}`);

      if(!participantSegmentations.data.length > 0){
        return response.status(404).json('Segmentação do participante não foi encontrada.');
      }

      let filters = {
        segmentation_id: participantSegmentations.data[0].segmentation_id,
        campaign_id: params.campaign_id,
        begin_at: params.date,
        enabled: 1
      };

      const filterString = querystring.stringify(filters);

      let challenges = [];

      const results = await JarvisService.get(`challenge/get?${filterString}`);

      if (!results.data.length > 0) {
        return response.status(404).json(challenges);
      }

      let count = 0;
      for(let result of results.data){
        challenges.push({});
        challenges[count].id = result.id;
        challenges[count].challenge_name = result.name;
        challenges[count].point_value = result.score;
        challenges[count].challenge_description = result.description;
        challenges[count].challenge_image = result.thumbnail;
        count ++;
      }

      return response.status(200).json(challenges);
    } catch (e) {
      Log.send(`${logError} getChallenges Endpoint - ${e.message} - params: ${
        querystring.stringify(request.only([
          'campaign_id',
          'participant_id',
          'date'
        ]))}`);
      return response.status(500).json(e.message);
    }
  }

  async getPerfectPlays({ request, response }) {
    try {
      let params = request.only([
        'campaign_id',
        'channel_id',
        'kpi_id'
      ]);

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id parameter.');
      }

      let filters = {
        campaign_id: params.campaign_id,
        channel_id: params.channel_id,
        enabled: 1
      };

      if(params.kpi_id){
        filters.kpi_id = params.kpi_id;
      }

      const filterString = querystring.stringify(filters);

      let perfectPlays = [];

      const results = await JarvisService.get(`channel-kpi/get?${filterString}`);

      if (!results.data.length > 0) {
        return response.status(404).json(perfectPlays);
      }

      let count = 0;
      for(let perfectPlay of results.data){
        perfectPlays.push({});
        perfectPlays[count].id = perfectPlay.id;
        perfectPlays[count].channel_id = perfectPlay.channel_id;
        if(perfectPlay.channel_id){
          const channel = await JarvisService.get(`channel/${perfectPlay.channel_id}`);
          perfectPlays[count].channel_name = channel.data.name;
        }
        perfectPlays[count].channel_thumbnail = perfectPlay.channel_thumbnail;
        perfectPlays[count].kpi_id = perfectPlay.kpi_id;
        if(perfectPlay.kpi_id){
          const kpi = await JarvisService.get(`kpi/${perfectPlay.kpi_id}`);
          perfectPlays[count].kpi_name = kpi.data.name;
        }
        perfectPlays[count].kpi_thumbnail = perfectPlay.kpi_thumbnail;
        count ++;
      }

      return response.status(200).json(perfectPlays);
    } catch (e) {
      Log.send(`${logError} getPerfectPlays Endpoint - ${e.message} - params: ${
        querystring.stringify(request.only([
          'campaign_id',
          'channel_id',
          'kpi_id'
        ]))}`);
      return response.status(500).json(e.message);
    }
  }

  async getCopaKOFInfo({ request, response }) {
    try {
      let params = request.only([
        'campaign_id'
      ]);

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id parameter.');
      }

      let filters = {
        campaign_id: params.campaign_id,
        enabled: 1
      };

      const filterString = querystring.stringify(filters);

      let data = {};

      const rules = await JarvisService.get(`rule/get?${filterString}`);
      const prizes = await JarvisService.get(`prize/get?${filterString}`);
      const challenges = await JarvisService.get(`challenge/get?${filterString}`);
      const perfectPlays = await JarvisService.get(`channel-kpi/get?${filterString}`);

      data.rules = {};
      if(rules.data.length > 0){
        data.rules.media = rules.data[0].media;
        data.rules.title = rules.data[0].title;
        data.rules.content = rules.data[0].content;
        data.rules.moreInformation = rules.data[0].pdf;
      }

      data.images = [];
      let count = 0;
      for(const prize of prizes.data){
        data.images.push({});
        data.images[count].id = prize.id;
        data.images[count].img_url = prize.media;
        count ++;
      }

      data.challenges = [];
      count = 0;
      for(const challenge of challenges.data){
        let segmentation = {};
        if(challenge.segmentation_id){
          segmentation = await XavierService.get(`segmentation/${challenge.segmentation_id}`);
        }
        data.challenges.push({});
        data.challenges[count].id = challenge.id;
        data.challenges[count].challenge_name = challenge.name;
        data.challenges[count].begin_at = challenge.begin_at;
        data.challenges[count].end_at = challenge.end_at;
        data.challenges[count].view_to = challenge.view_to;
        data.challenges[count].point_value = challenge.score;
        if(challenge.segmentation_id){
          data.challenges[count].segmentation_id = segmentation.data.id;
          data.challenges[count].segmentation_name = segmentation.data.name;
        }
        data.challenges[count].challenge_description = challenge.description;
        data.challenges[count].challenge_image = challenge.thumbnail;
        count++;
      }

      data.perfectPlays = [];
      count = 0;
      for(const perfectPlay of perfectPlays.data){
        data.perfectPlays.push({});
        data.perfectPlays[count].id = perfectPlay.id;
        data.perfectPlays[count].channel_id = perfectPlay.channel_id;
        data.perfectPlays[count].channel_thumbnail = perfectPlay.channel_thumbnail;
        data.perfectPlays[count].kpi_id = perfectPlay.kpi_id;
        data.perfectPlays[count].kpi_thumbnail = perfectPlay.kpi_thumbnail;
        if(perfectPlay.channel_id){
          const channel = await JarvisService.get(`channel/${perfectPlay.channel_id}`);
          data.perfectPlays[count].channel_name = channel.name;
        }
        if(perfectPlay.kpi_id){
          const kpi = await JarvisService.get(`kpi/${perfectPlay.kpi_id}`);
          data.perfectPlays[count].kpi_name = kpi.name;
        }
        count ++;
      }

      return response.status(200).json(data);
    } catch (e) {
      Log.send(`${logError} getCopaKOFInfo Endpoint - ${e.message} - params: ${
        querystring.stringify(request.only([
          'campaign_id'
        ]))}`);
      return response.status(500).json(e.message);
    }
  }

  async getCopaKOFSegmentation({ request, response }) {
    try {
      let params = request.only([
        'campaign_id'
      ]);

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id parameter.');
      }

      let filters = { campaign_id: params.campaign_id };

      const filterString = querystring.stringify(filters);

      const campaignSegmentations = await XavierService.get(`segmentation/get?${filterString}`);

      let segmentation = [];

      if (!campaignSegmentations.data.length > 0) {
        return response.status(404).json(segmentation);
      }

      let count = 0;
      for(const campaignSegmentation of campaignSegmentations.data){
        segmentation.push({});
        segmentation[count].id = campaignSegmentation.id;
        segmentation[count].name = campaignSegmentation.name;
        count ++;
      }

      return response.status(200).json(segmentation);
    } catch (e) {
      Log.send(`${logError} getCopaKOFSegmentation Endpoint - ${e.message} - params: ${
        querystring.stringify(request.only([
          'campaign_id'
        ]))}`);
      return response.status(500).json(e.message);
    }
  }

  async getCopaKOFChannel({ request, response }) {
    try {
      let params = request.only([
        'campaign_id'
      ]);

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id parameter.');
      }

      let filters = { campaign_id: params.campaign_id };

      const filterString = querystring.stringify(filters);

      const result = await JarvisService.get(`channel/get?${filterString}`);

      let channels = [];

      if (!result.data.length > 0) {
        return response.status(404).json(channels);
      }

      let count = 0;
      for(const channel of result.data){
        channels.push({});
        channels[count].id = channel.id;
        channels[count].name = channel.name;
        count ++;
      }

      return response.status(200).json(channels);
    } catch (e) {
      Log.send(`${logError} getCopaKOFChannel Endpoint - ${e.message} - params: ${
        querystring.stringify(request.only([
          'campaign_id'
        ]))}`);
      return response.status(500).json(e.message);
    }
  }

  async getCopaKOFKpi({ request, response }) {
    try {
      let params = request.only([
        'campaign_id'
      ]);

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id parameter.');
      }

      let filters = { campaign_id: params.campaign_id };

      const filterString = querystring.stringify(filters);

      const result = await JarvisService.get(`kpi/get?${filterString}`);

      let kpis = [];

      if (!result.data.length > 0) {
        return response.status(404).json(kpis);
      }

      let count = 0;
      for(const kpi of result.data){
        kpis.push({});
        kpis[count].id = kpi.id;
        kpis[count].name = kpi.name;
        count ++;
      }

      return response.status(200).json(kpis);
    } catch (e) {
      Log.send(`${logError} getCopaKOFKpi Endpoint - ${e.message} - params: ${
        querystring.stringify(request.only([
          'campaign_id'
        ]))}`);
      return response.status(500).json(e.message);
    }
  }

  async getOnePageTeam({ request, response }){
    try {
      const params = request.only(['participant_id', 'date']);

      const data = await JarvisService.get(`team-result/get?participant_id=${params.participant_id}&date=${params.date}`);

      return response.status(200).json(data);
    } catch (e) {
      Log.send(`${logError} getOnePageTeam Endpoint - ${e.message} - params: ${
        querystring.stringify(request.only([
          'participant_id', 'date'
        ]))}`);
      return response.status(500).json(e.message);
    }
  }

  async getOnePageFocus({ request, response }){
    try {
      let { participant_id, date, code } = request.only(['participant_id', 'date', 'code']);

      const query = {
        participant_id: participant_id,
        date: date
      };

      if(code){
        query['code'] = code;
      }

      const data = await JarvisService.get(`focus-sum/get?${querystring.stringify(query)}`);

      return response.status(200).json(data);
    } catch (e) {
      Log.send(`${logError} getOnePageFocus Endpoint - ${e.message} - params: ${
        querystring.stringify(request.only([
          'participant_id', 'date', 'code'
        ]))}`);
      return response.status(500).json(e.message);
    }
  }

  async putCopaKOFInfo({ request, response }) {
    try {
      let params = request.only([
        'campaign_id',
        'rules',
        'images',
        'challenges',
        'perfectPlays'
      ]);

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id parameter.');
      }

      if (!params.rules) {
        return response.status(400).json('Missing rules parameter.');
      }

      if (!params.images) {
        return response.status(400).json('Missing images parameter.');
      }

      if (!params.challenges) {
        return response.status(400).json('Missing challenges parameter.');
      }

      if (!params.perfectPlays) {
        return response.status(400).json('Missing perfectPlays parameter.');
      }

      const mechanicTypeCopaKOF = await JarvisService.get(`mechanic-type/get?alias=copa_kof`);
      const mechanicTypeId = mechanicTypeCopaKOF.data[0].id;

      for(const challenge of params.challenges){
        challenge.mechanic_type_id = mechanicTypeId;
        challenge.campaign_id = params.campaign_id;
        challenge.name = challenge.challenge_name;
        challenge.score = challenge.point_value;
        challenge.description = challenge.challenge_description;
        challenge.thumbnail = challenge.challenge_image;
        challenge.nomenclature = 'pontos';
        challenge.begin_at = DateTime.fromFormat(challenge.begin_at, 'dd/MM/yyyy').toISO();
        challenge.end_at = DateTime.fromFormat(challenge.end_at, 'dd/MM/yyyy').toISO();
        challenge.view_to = DateTime.fromFormat(challenge.view_to, 'dd/MM/yyyy').toISO();
        if(!challenge.begin_at || !challenge.end_at || !challenge.view_to){
          return response.status(400).json('Data de configuração de desafio inválida.');
        }
        await JarvisService.put('challenge/put', challenge);
      }

      for(const perfectPlay of params.perfectPlays){
        perfectPlay.campaign_id = params.campaign_id;
        await JarvisService.put('channel-kpi/put', perfectPlay);
      }

      /* Abaixo é buscado o campo Rules da tabela jarvis.rules, pois pelo menos por enquanto,
      sempre existirá apenas um campo Rule ativo a cada momento. Então para evitar criar 2 rules,
      que possam estar ativas ao mesmo tempo, é buscado do banco a regra para editar com seu id.*/
      let filters = {
        campaign_id: params.campaign_id,
        enabled: 1
      };

      const filterString = querystring.stringify(filters);

      const rules = await JarvisService.get(`rule/get?${filterString}`);

      if(rules.data.length > 0){
        params.rules.id = rules.data[0].id;
      }

      params.rules.pdf = params.rules.moreInformation;
      params.rules.campaign_id = params.campaign_id;
      params.rules.mechanic_type_id = mechanicTypeId;

      await JarvisService.put('rule/put',params.rules);

      for(const prize of params.images){
        prize.mechanic_type_id = mechanicTypeId;
        prize.campaign_id = params.campaign_id;
        prize.media = prize.img_url;
        await JarvisService.put('prize/put',prize);
      }

      return response.status(200).json('Dados salvos com sucesso.');
    } catch (e) {
      Log.send(`${logError} putCopaKOFInfo Endpoint - ${e.message} - params: ${
        querystring.stringify(request.only([
          'campaign_id',
          'rules',
          'images',
          'challenges',
          'perfectPlays'
        ]))}`);
      return response.status(500).json(e.message);
    }
  }

  async deleteCopaKOFPrize({ request, params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Missing id parameter.');
      }

      params.enabled = 0;

      await JarvisService.put('prize/put',params);

      return response.status(200).json('Dado deletado com sucesso.');
    } catch (e) {
      Log.send(`${logError} deleteCopaKOFPrize Endpoint - ${e.message} - params: ${params.id}`);
      return response.status(500).json(e.message);
    }
  }

  async deleteCopaKOFChallenge({ request, params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Missing id parameter.');
      }

      params.enabled = 0;

      await JarvisService.put('challenge/put',params);

      return response.status(200).json('Dado deletado com sucesso.');
    } catch (e) {
      Log.send(`${logError} deleteCopaKOFChallenge Endpoint - ${e.message} - params: ${params.id}`);
      return response.status(500).json(e.message);
    }
  }

  async deleteCopaKOFPerfectPlay({ request, params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Missing id parameter.');
      }

      params.enabled = 0;

      await JarvisService.put('channel-kpi/put',params);

      return response.status(200).json('Dado deletado com sucesso.');
    } catch (e) {
      Log.send(`${logError} deleteCopaKOFPerfectPlay Endpoint - ${e.message} - params: ${params.id}`);
      return response.status(500).json(e.message);
    }
  }

  async getRekognitionLabel({ request, response }){
    try {
      let params = request.only([
        'campaign_id'
      ]);

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id parameter.');
      }

      let filters = {
        campaign_id: params.campaign_id,
        enabled: 1
      };

      const filterString = querystring.stringify(filters);

      const result = await JarvisService.get(`ai-campaign-label/get?${filterString}`);

      let labels = [];

      if (!result.data.length > 0) {
        return response.status(404).json(labels);
      }

      let count = 0;
      for(const label of result.data){
        labels.push({});
        labels[count].id = label.id;
        labels[count].label = label.label;
        count ++;
      }

      return response.status(200).json(labels);
    } catch (e) {
      Log.send(`${logError} getRekognitionLabel Endpoint - ${e.message} - params: ${
        querystring.stringify(request.only([
          'campaign_id'
        ]))}`);
      return response.status(500).json(e.message);
    }
  }

  async externalMechanicUpdate({ request, response }){
    try {
      let params = request.only([
        'token',
        'data'
      ]);

      if (!params.token) {
        return response.status(400).json('Missing token parameter.');
      }

      if (!params.data) {
        return response.status(400).json('Missing data parameter.');
      }

      const tokenValidation = await JarvisService.get(`external/token/get?token=${params.token}`);
      if (tokenValidation.status != 200) {
        return response.status(403).json({ message: 'Invalid token!' });
      }

      if (tokenValidation.data.enabled == 0) {
        return response.status(403).json({ message: 'Unauthorized, token disabled!' });
      }


      await JarvisService.put(`external/token-historic/put`, { external_token_id: tokenValidation.data.id, external_token:tokenValidation.data.token });
      Log.send(`${logError} - ${tokenValidation.data.name} - Solicitou o envio de dados pelo endpoint external/focus-update.`);

      let results = [];
      for(let line of params.data){
        let resultLine = {};

        const validations = await ValidationService.validateExternalFocusUpdate(line);

        if(validations.status){
          line.external_process_status = validations.message;
          line.enabled = 0;
          await JarvisService.put(`external/mechanic-update/put`, line);
          resultLine.status = validations.status;
          resultLine.message = validations.message;
          results.push(resultLine);
          continue;
        }

        line.campaign_id = validations.campaign_id;
        line.external_config_id = line.configuration_id;
        line.external_process_status = 'Sucesso';
        const updateStatus = await JarvisService.put(`external/mechanic-update/put`, line);

        if(updateStatus.status == 200){
          resultLine.status = 'Sucesso';
        }else{
          resultLine.status = 'Error';
          resultLine.message = `${updateStatus}`;
          Log.send(
            `Env: ${Env.get('NODE_ENV')} - JarvisController - externalMechanicUpdate Endpoint -  ${updateStatus}`
          );
        };

        results.push(resultLine);
      }

      JarvisService.put(`focus-external/update`);

      return response.status(200).json(results);
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - JarvisController - externalMechanicUpdate Endpoint -  ${e.message}`
      );
      return response.status(500).json(e.message);
    }
  }

  async getAllExternalMechanicConfig({ request, response }) {
    try {
      const params = request.only(['campaign_id','page','perPage']);
      const filters = new URLSearchParams(params);

      if(!params.campaign_id){
        return response.status(400).json({ message: 'É necessário informar a propriedade campaign_id' });
      }

      const mechanics = await JarvisService.get(`external/mechanic-config/all?${filters.toString()}`);

      if(mechanics.data.total <= 0){
        return response.status(400).json({ message: 'Nenhuma configuração de mecânica encontrada.' });
      }

      return response.status(200).json(mechanics);
    } catch (e) {
      Log.send(`${messageError} getAllExternalMechanicConfig Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getSingleMechanicConfig({ params, response }) {
    try {
      const { id } = params;
      if(!id){
        return response.status(400).json({ message: 'É necessário informar o ID' });
      }
      const config = await JarvisService.get(`external/mechanic-config/${id}`);
      if(config.status !== 200){
        return response.status(400).json({ message: 'Não foi encontrada a configuração informada, verifique o ID.' });
      }

      const { status, data } = await JarvisService.get(`external/mechanic-config/${id}`);

      let mechanicConfig = {};
      let segmentationIds = [];
      let products = [];
      let invoiceTypes = [];
      if (status === 200 && data) {
        const {
          externalConfigHasSegmentation,
          hyperaConfigHasProduct,
          hyperaConfigHasInvoiceType,
          ...rest
        } = data;

        if (externalConfigHasSegmentation && externalConfigHasSegmentation.length) {
          externalConfigHasSegmentation.forEach(item => {
            segmentationIds.push(item.segmentation_id);
          });
        }

        if (hyperaConfigHasProduct && hyperaConfigHasProduct.length) {
          hyperaConfigHasProduct.forEach(item => {
            products.push({ weight:item.weight, product:item.hyperaProduct });
          });
        }
        if (hyperaConfigHasInvoiceType && hyperaConfigHasInvoiceType.length) {
          hyperaConfigHasInvoiceType.forEach(item => {
            invoiceTypes.push(item.hyperaInvoiceType);
          });
        }

        mechanicConfig = {
          ...rest,
          products,
          invoiceTypes,
          segmentationIds
        };
      }

      if(status !== 200){
        return response.status(400).json({ message: 'Nenhuma configuração de mecânica encontrada.' });
      }

      return response.status(200).json(mechanicConfig);
    } catch (e) {
      Log.send(`${messageError} getSingleMechanicConfig Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async externalMechanicConfig({ request, response }) {
    try {
      const { token } = request.only(['token']);

      if (!token) {
        return response.status(403).json({ message: 'Missing token parameter!' });
      }

      const { data } = await JarvisService.get(`external/token/get?token=${token}`);

      if (!data) {
        return response.status(403).json({ message: 'Invalid token!' });
      }

      if(!data.enabled){
        return response.status(403).json({ message: 'Unauthorized, token disabled!' });
      }

      const result = await JarvisService.get(`external/mechanic-config/get?external_token_id=${data.id}`);

      if(result.data.length > 0){
        await JarvisService.put(`external/token-historic/put`, { external_token_id: data.id, external_token:data.token });

        Log.send(`${logError} - ${data.name} - Solicitou as configurações da tabela external_mechanic_config.`);

        let finalResponse = [];

        for(let mechanicConfiguration of result.data){
          let mechanicType = {
            id: null,
            name: null
          };
          if(mechanicConfiguration.hyperaMechanicType){
            mechanicType = {
              id: mechanicConfiguration.hyperaMechanicType.id,
              name: mechanicConfiguration.hyperaMechanicType.mechanic_name
            };
          }

          let invoiceTypes = [];
          if(mechanicConfiguration.hyperaConfigHasInvoiceType.length > 0){
            for(let invoiceType of mechanicConfiguration.hyperaConfigHasInvoiceType){
              if(invoiceType.hyperaInvoiceType){
                invoiceTypes.push({
                  id: invoiceType.hyperaInvoiceType.id,
                  invoice_type: invoiceType.hyperaInvoiceType.name
                });
              }
            }
          }

          let products = [];
          if(mechanicConfiguration.hyperaConfigHasProduct.length > 0){
            for(let product of mechanicConfiguration.hyperaConfigHasProduct){
              if(product.hyperaProduct){
                products.push({
                  ean: product.hyperaProduct.ean,
                  product: product.hyperaProduct.name,
                  key: product.hyperaProduct.family,
                  weight: product.weight
                });
              }
            }
          }

          let segmentations = [];

          if(mechanicConfiguration.externalConfigHasSegmentation.length > 0){
            for(let segmentation of mechanicConfiguration.externalConfigHasSegmentation){
              let segmentationTree = await XavierService.get(`segmentation-tree/get?segmentation_id=${segmentation.segmentation_id}`);
              if(segmentationTree.data){
                let length = segmentationTree.data.length;
                if (length >= 3){
                  segmentations.push({
                    'UF':segmentationTree.data[length-1].name,
                    'grupo':segmentationTree.data[length-2].name,
                    'cargo':segmentationTree.data[length-3].name
                  });
                }
              }
            }
          }

          finalResponse.push(
            {
              id: mechanicConfiguration.id,
              begin_at: mechanicConfiguration.begin_at,
              end_at: mechanicConfiguration.end_at,
              begin_at_mechanic: mechanicConfiguration.begin_at_mechanic,
              end_at_mechanic: mechanicConfiguration.end_at_mechanic,
              invoice_types: invoiceTypes,
              config: mechanicConfiguration.config,
              goal:mechanicConfiguration.goal,
              goal_max: mechanicConfiguration.goal_max,
              goal_min: mechanicConfiguration.goal_min,
              multiplier: mechanicConfiguration.multiplier,
              points: mechanicConfiguration.points,
              mechanic_type: mechanicType,
              products: products,
              PED_file: mechanicConfiguration.PED_file,
              segmentations: segmentations
            }
          );
        }

        return response.status(200).json(finalResponse);
      }else{
        return response.status(400).json({ message: 'No results linked to this token' });
      }
    } catch (e) {
      Log.send(
        `${logError} externalMechanicConfig Endpoint - ${e.message} - ${querystring.stringify(
          request.only(['token'])
        )}`
      );
      return response.status(500).json({ message: e.message });
    }
  }

  async getHyperaProducts({ request, response }) {
    try {
      const params = request.only(['family']);

      if(!params.family){
        return response.status(400).json({ message: 'É necessário informar a propriedade family!' });
      }

      const products = await JarvisService.get(`external/mechanic-product-list/get?family=${params.family}`);

      if(products.data.length <= 0){
        return response.status(400).json({ message: 'Nenhum produto encontrado.' });
      }

      return response.status(200).json({ data:products.data });
    } catch (e) {
      Log.send(`${messageError} getHyperaProducts Endpoint - ${e.message} - params ${new URLSearchParams(
        request.only(['family'])
      )}`);
      return response.status(500).json(e.message);
    }
  }

  async postExternalMechanicConfig({ request, response }) {
    try {
      const params = request.body;

      if(!params){
        return response.status(400).json({ message: 'É necessário informar os parâmetros' });
      }

      const validations = await ValidationService.validateExternalMechanicConfig(params);

      if(validations.status){
        return response.status(400).json({ message:validations.message });
      }else{
        const data = await JarvisService.post(`external/mechanic-config/post`, params);

        return response.status(200).json({ data:data.data });
      }
    } catch (e) {
      Log.send(`${messageError} postExternalMechanicConfig Endpoint - ${e.message} - params ${new URLSearchParams(
        request.body
      )}`);
      return response.status(500).json(e.message);
    }
  }

  async putExternalMechanicConfig({ request, response }) {
    try {
      const params = request.body;

      if(!params || !params.id){
        return response.status(400).json({ message: 'É necessário informar os parâmetros e ID da configuração.' });
      }

      if((params.ranking && params.hasOwnProperty('ranking_mechanic')) && !params.ranking_mechanic.id){
        return response.status(400).json({ message: 'É necessário informar o ID do ranking para atualizar esta configuração.' });
      }

      const config = await JarvisService.get(`external/mechanic-config/${params.id}`);
      if(config.status !== 200){
        return response.status(400).json({ message: 'Não foi encontrada a configuração informada, verifique o ID.' });
      }

      const validations = await ValidationService.validateExternalMechanicConfig(params);

      if(validations.status){
        return response.status(400).json({ message:validations.message });
      }else{
        const { data } = await JarvisService.put(`external/mechanic-config/put`, params);
        return response.status(200).json(data);
      }
    } catch (e) {
      Log.send(`${messageError} putExternalMechanicConfig Endpoint - ${e.message} - params ${new URLSearchParams(
        request.body
      )}`);
      return response.status(500).json(e.message);
    }
  }

  async externalMechanicConfigRelease({ params, response }) {
    try {
      const { id } = params;
      if(!id){
        return response.status(400).json({ message: 'É necessário informar o ID' });
      }
      const config = await JarvisService.get(`external/mechanic-config/${id}`);
      if(config.status !== 200){
        return response.status(400).json({ message: 'Não foi encontrada a configuração informada, verifique o ID.' });
      }

      const { status, data } = await JarvisService.put(`external/mechanic-config-release/${id}`);
      if(status !== 200){
        return response.status(400).json({ message: 'Falha na liberação' });
      }

      await logApi({
        endpoint: 'externalMechanicConfigRelease Endpoint',
        log:`A configuração de mecânica id:${id} foi liberada na data:${DateTime.local().toISO()}`
      });
      return response.status(200).json(data);
    } catch (e) {
      Log.send(`${messageError} externalMechanicConfigRelease Endpoint - ${e.message}}`);
      return response.status(500).json(e.message);
    }
  }

  async externalMechanicConfigDisable({ params, response }) {
    try {
      const { id } = params;
      if(!id){
        return response.status(400).json({ message: 'É necessário informar o ID' });
      }
      const config = await JarvisService.get(`external/mechanic-config/${id}`);
      if(config.status !== 200){
        return response.status(400).json({ message: 'Não foi encontrada a configuração informada, verifique o ID.' });
      }

      const { status, data } = await JarvisService.put(`external/mechanic-config-disable/${id}`);
      if(status !== 200){
        return response.status(400).json({ message: 'Falha ao remover configuração de mecânica.' });
      }

      await logApi({
        endpoint: 'externalMechanicConfigDisable Endpoint',
        log:`A configuração de mecânica id:${id} foi desabilitada na data:${DateTime.local().toISO()}`
      });
      return response.status(200).json(data);
    } catch (e) {
      Log.send(`${messageError} externalMechanicConfigDisable Endpoint - ${e.message}}`);
      return response.status(500).json(e.message);
    }
  }

  async getHyperaMechanicTypes({ request, response }) {
    try {

      const mechanicTypes = await JarvisService.get(`hypera-mechanic-type/all`);

      if(mechanicTypes.status != 200){
        return response.status(400).json({ message: 'Houve um erro na comunicação com o endpoint.' });
      }

      if(mechanicTypes.data.length <= 0){
        return response.status(400).json({ message: 'Nenhum tipo de mecânica encontrado.' });
      }

      let finalResponse = [];
      for(let mechanicType of mechanicTypes.data){
        finalResponse.push({
          id: mechanicType.id,
          name:mechanicType.mechanic_name
        });
      }

      return response.status(200).json({ data: finalResponse });
    } catch (e) {
      Log.send(`${messageError} getHyperaMechanicTypes Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getHyperaInvoiceTypes({ request, response }) {
    try {

      const invoiceTypes = await JarvisService.get(`hypera-invoice-type/all`);

      if(invoiceTypes.status != 200){
        return response.status(400).json({ message: 'Houve um erro na comunicação com o endpoint.' });
      }

      if(invoiceTypes.data.length <= 0){
        return response.status(400).json({ message: 'Nenhum Tipo de nota fiscal encontrado.' });
      }

      let finalResponse = [];
      for(let invoiceType of invoiceTypes.data){
        finalResponse.push({
          id: invoiceType.id,
          name:invoiceType.name
        });
      }

      return response.status(200).json({ data: finalResponse });
    } catch (e) {
      Log.send(`${messageError} getHyperaInvoiceTypes Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async externalPositivationMechanicCreate({ request, response }){
    try {
      const params = request.body;

      if (!params.token) {
        return response.status(400).json({ message: 'É necessário informar o Token.' });
      }

      const isTokenValid = await ValidationService.validateExternalToken(params.token);

      if(!isTokenValid.status){
        return response.status(403).json({ message: isTokenValid.message });
      }

      const positivationMechanicResponse = await JarvisService.post(`create/positivation-mechanic`, params);

      if(positivationMechanicResponse.status != 200){
        return response.status(positivationMechanicResponse.status).json({ message: positivationMechanicResponse.data.message });
      }

      return response.status(200).json({ data: { message:'Mecânica gravada com sucesso!', mechanicId: positivationMechanicResponse.data.mechanicId } });
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - JarvisController - externalPositivationMechanicCreate Endpoint -  ${e.message}`
      );
      return response.status(500).json(e.message);
    }
  }

  async externalPositivationMechanicUpdate({ request, response }){
    try {
      const params = request.body;

      if (!params.token) {
        return response.status(400).json({ message: 'É necessário informar o Token.' });
      }

      const isTokenValid = await ValidationService.validateExternalToken(params.token);

      if(!isTokenValid.status){
        return response.status(403).json({ message: isTokenValid.message });
      }

      const positivationMechanicResponse = await JarvisService.put(`update/positivation-mechanic`, params);

      if(positivationMechanicResponse.status != 200){
        return response.status(positivationMechanicResponse.status).json({ message: positivationMechanicResponse.data.message });
      }

      return response.status(200).json({ data: { message:'Mecânica atualizada com sucesso!' } });
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - JarvisController - externalPositivationMechanicUpdate Endpoint -  ${e.message}`
      );
      return response.status(500).json(e.message);
    }
  }
}

module.exports = JarvisController;
