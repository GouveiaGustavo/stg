const Log = new (use('LogHelper'))();
const Env = use('Env');
const fs = require('fs');
const environments = Env.get('NODE_ENV');
const logError = `Env: ${Env.get('NODE_ENV')} - HomerSimpsonController`;
const HomerService = new (use('ApiInterceptorService'))(Env.get('HOMER_URL'));
const JarvisService = new (use('ApiInterceptorService'))(Env.get('JARVIS_URL'));
const XavierService = new (use('ApiInterceptorService'))(Env.get('XAVIER_URL'));
const RobinService = new (use('ApiInterceptorService'))(Env.get('ROBIN_URL'));
const PabloService = new (use('ApiInterceptorService'))(Env.get('PABLO_URL'));
const JaiminhoService = new (use('ApiInterceptorService'))(Env.get('JAIMINHO_URL'));
const HomerHelperService = new (use('HomerSimpsonService'))();
const HomerSimpsonService = new (use('ApiInterceptorService'))(Env.get('HOMER_URL'));
const ValidationService = new (use('ValidationHelper'))();
const moment = use('moment');
const queryS = use('querystring');
const unique = use('node-unique-array');
const arrayhelper = new (use('ArrayHelper'))();
const querystring = use('querystring');
const momenttz = require('moment-timezone');
const { DateTime } = use('luxon');
const luxon = require('luxon');
const { validParamsCampaignAndDocuments } = require('../../Helpers/validParams');
const logApi = require('../../Providers/LogApi');
const compareParticipanteData = require('../../Helpers/compareParticipantData') 
const userAcessInfo = require('../../Helpers/userAcessInfo');
const { validate } = use('Validator');
const timeZone = Env.get('TZ');
const LogService = require('../Http/LogsController')


class HomerSimpsonController {
  async login({ request, response }) {
    try {
      const userAgent = request.header('user-agent');
      const clientIP = request.headers()['x-real-ip'] || request.ip();
      const timeZone = 'America/Sao_Paulo';
      const now = new Date().toLocaleString('pt-BR', { timeZone, timeStyle: 'medium' });

      const ipInfoResponse = await userAcessInfo(clientIP);

      const params = request.only(['login', 'password', 'campaign_id']);
      const participant = await HomerService.post('participant/login', {
        login: params.login,
        password: params.password,
        campaign_id: params.campaign_id
      });

      const logInfo = {
        endpoint: 'Login',
        log: `Login: ${params.login}, Data: ${now}, Dispositivo: ${userAgent}, Ip: ${clientIP} acessInfo: ${ipInfoResponse}`,
      };

      if (participant.status == 428) {
        let error = {};
        error.status = participant.status;
        error.data = participant.data.errorMessage;
        error.email = participant.data.email;
        error.password = participant.data.password;

        logInfo.result = 'fail';
        logInfo.campaign_id = params.campaign_id;
        logInfo.log += `, Resultado: falha ao tentar logar, Error: ${JSON.stringify(participant.data.errorMessage)}`;

        await logApi(logInfo);

        return response.status(error.status).json(error);
      }

      if (participant.status !== 200) {
        logInfo.result = 'Fail';
        logInfo.campaign_id = params.campaign_id;
        logInfo.log += `, Resultado: falha ao tentar logar, Error: ${participant.data}`;

        await logApi(logInfo);

        return response.status(participant.status).json(participant);
      }

      let query = `participant-segmentation/get?participant_id=${participant.data.participant.id}&campaign_id=${participant.data.campaign_id}&enabled=1`;

      const segmentation = await HomerService.get(query);

      const segmentationData = [];

      for (let seg of segmentation.data) {
        let segmentations = await XavierService.get(`segmentation/${seg.segmentation_id}`);
        segmentationData.push(segmentations.data);
      }

      const responseData = {
        participant: {
          id: participant.data.participant_id,
          name: participant.data.participant.name,
          surname: participant.data.participant.surname,
          email: participant.data.email,
          password: participant.data.password,
          enabled: participant.data.participant.enabled,
          leader: participant.data.leader ? participant.data.leader[0] ? participant.data.leader[0] : null : null,
          config: participant.data.config,
          profile_image: participant.data.participant.profile_image,
          typePass: participant.data.typePass,
          domain: participant.data.campaignData ? participant.data.campaignData.domain ? participant.data.campaignData.domain : false : false,
          campaign_id: participant.data.campaignData ? participant.data.campaignData.id ? participant.data.campaignData.id : false : false,
          campaignConfig: participant.data.campaignData ? participant.data.campaignData.config ? participant.data.campaignData.config : false : false,
          campaignName: participant.data.campaignData ? participant.data.campaignData.name ? participant.data.campaignData.name : false : false,
          address: participant.data.address_enabled ? participant.data.address_enabled[0] ? participant.data.address_enabled[0] : null : null,
          participant_uid: participant.data.participant_uid,
          segmentation: segmentationData,
          multifactorValidated: participant.data.multifactorValidated,
          approve_participants: participant.data.approve_participants
        },
        token: participant.data.token
      };

      logInfo.result = 'Success';
      logInfo.log = `Login: ${params.login}, Resultado: logado com sucesso, Data: ${now}, Dispositivo: ${userAgent}, IP: ${clientIP} acessInfo: ${ipInfoResponse}`;

      await logApi(logInfo);

      return response.status(participant.status).json(responseData);
    } catch (e) {
      Log.send(`${logError} login Endpoint - ${e.message}`);
      return response.status(401).json(e.message);
    }
  }

  async logout({ request, response }) {
    try{
      const participant_id = request.participant.participant_id
      const campaign_id = request.participant.campaign_id
      const clientIP = request.headers()['x-real-ip'] || request.ip();
      const timeZone = 'America/Sao_Paulo';
      const now = new Date().toLocaleString('pt-BR', { timeZone, timeStyle: 'medium' });

      const logInfo = {
        endpoint: 'logout',
        log: `participant: ${participant_id} na campanha ${campaign_id}, fez o logout em: ${now}, Ip: ${clientIP}`,
      };

       await logApi(logInfo);

    }catch(e){
      Log.send(`${logError} logout Endpoint - ${e.message}`);
      return response.status(401).json(e.message);
    }
  }


  async recovery({ request, response }) {
    try {

      const params = request.only(['campaign_id', 'uid', 'password', 'email', 'document']);
      params.userAgent = request.header('user-agent');
      params.participantIP = request.headers()['x-real-ip'] || request.ip();
      params.startTime = new Date().toLocaleString('pt-BR', { timeZone, timeStyle: 'medium' });

      const participant = await HomerService.post('participant/forget', params);

      if (participant.status === 200) {
        return response.status(200).json(participant);
      }
      if (participant.status === 404) {
        return response.status(404).json(participant);
      }
      return response.status(400).json(participant);
    } catch (e) {
      Log.send(
        `${Env.get('NODE_ENV')} - recovery Endpoint - ${e.message} - params ${querystring.stringify(
          request.only(['email', 'document', 'campaign_id', 'uid', 'password'])
        )}`
      );
      return response.status(400).json({
        response: false,
        message: e.message
      });
    }
  }
  
  async findRecoveryToken({ request, response }) {
    try {
      const { recoveryToken } = request.only(['recoveryToken']);
      
      const validateToken = await HomerService.get(`participant/find-recovery-token/get?recoveryToken=${recoveryToken}`)
  
      return response.status(validateToken.status).json(validateToken.data)
    } catch (error) {
        return response.status(500).json(error.message)
    }
  }

  async register({ request, response }) {
    try {
      const params = request.only([
        'campaign_id',
        'document',
        'name',
        'accept_whatsapp',
        'gender',
        'email',
        'password',
        'phone',
        'uid',
        'documentImages'
      ]);

      const userAgent = request.header('user-agent');
      const clientIP = request.headers()['x-real-ip'] || request.ip();
      const now = new Date().toLocaleString('pt-BR', { timeZone, timeStyle: 'medium' });
      const ipInfoResponse = await userAcessInfo(clientIP);

      if (!params.uid) {
        const emailExist = await HomerService.post('participant/check-email-exist', {
          email: params.email,
          campaign_id: params.campaign_id
        });

        if (emailExist.response === true) {
          return response.status(409).json({
            response: true,
            message: 'E-mail already exist.'
          });
        }
      }

      const fullName = params.name.split(' ');
      const firstName = fullName.shift();
      const lastName = fullName.join(' ');

      delete params.name;

      const participant = {};
      participant.name = firstName;
      participant.surname = lastName;
      //É necessário retirar o surname do cadastro do participante CNPJ para evitar problema de exibição.
      if(params.document.length == 14){
        participant.name = `${firstName} ${lastName}`;
        participant.surname = '';
      }
      participant.document = params.document;
      participant.gender_id = params.gender;
      participant.email = params.email;
      participant.password = params.password;
      participant.campaign_id = params.campaign;
      participant.welcome_mail = false;
      participant.birthdate = params.birthdate;

      if (params.segmentations) {
        participant.segmentation_id = params.segmentations;
      }

      participant.address = params.address;
      participant.contact = params.contact;
      participant.campaign_id = params.campaign_id;

      if (params.uid) {
        participant.uid = params.uid;
      }

      if (params.phone) {
        participant.accept_whatsapp = params.accept_whatsapp;
        participant.contact = params.phone;
        delete params.phone;
      }

      const { data: campaignHasParticipantImg } = await XavierService.get(`campaign-has-config/get?campaign_id=${params.campaign_id}&config_id=64`);

      if (campaignHasParticipantImg.value) {
        const { hasParticipantImg } = (JSON.parse(campaignHasParticipantImg.value));
        if (hasParticipantImg) {
          const { documentImages } = params;
          if (!documentImages || !documentImages.backImg || !documentImages.frontImg || !documentImages.faceImg) {
            return response.status(400).json({ message: 'documentImages é obrigatorio' });
          }
          participant.documentImages = documentImages;
        }
      }

      const participantAdd = await HomerService.put('participant/put', participant);

      if (participantAdd.data.id) {
        if (params.uid) {
          const logInfo = {
            endpoint: 'Register',
            log: `Informações atualizadas pelo link de ativação do participante: ${participantAdd.data.name} ${participantAdd.data.surname}, Data: ${now}, Dispositivo: ${userAgent}, Ip: ${clientIP} acessInfo: ${ipInfoResponse}`
          };

          await logApi(logInfo);

          return response.status(200).json(participantAdd);
        }

        await Promise.all(
          participantAdd.data.data.campaigns.map(async item => {
            const newParticpant = {};
            newParticpant.campaign_id = item.campaign_id;
            newParticpant.participant_id = participantAdd.data.data.id;
            newParticpant.points = 0;
            await RobinService.post('point/insert', newParticpant);
          })
        );
      }

      if (participantAdd.response) {
        return response.status(200).json(participantAdd);
      }
      return response.status(401).json(participantAdd);
    } catch (e) {
      Log.send(`${logError} register Endpoint - ${e.message}`);
      return response.status(401).json(e.message);
    }
  }

  async getParticipant({ request, params, response }) {
    try {
      let url = `participant/${params.id}`;
      if (request.all().campaign_id) {
        url += `?campaign_id=${request.all().campaign_id}`;
      }

      const participant = await HomerService.get(url);

      return response.status(200).json(participant);
    } catch (e) {
      Log.send(`${logError} getParticipant Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getParticipants({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'participant_id', 'code', 'page']);
      let participants = [];

      if (!params.campaign_id) {
        return response.status(400).json('Bad Request.');
      } else {
        const participant = await HomerSimpsonService.get(
          `participant/${params.participant_id}?campaign_id=${params.campaign_id}`
        );

        if (participant.status !== 200) {
          return response.status(403).json('Forbidden');
        }
      }

      if (params.page) {
        participants = await HomerService.get(
          `participant/get?campaign_id=${params.campaign_id}&page=${params.page}`
        );
      }

      if (params.campaign_id && params.participant_id && params.code) {
        participants = await HomerService.get(
          `participant/get/participants?campaign_id=${params.campaign_id}&participant_id=${params.participant_id}&code=${params.code}`
        );
      }

      return response.status(200).json(participants);
    } catch (e) {
      Log.send(`${logError} getParticipants Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getKeyValue({ request, response }) {
    try {
      let url = `data-keyvalue/getValueByParameter`;

      if (Object.keys(request.all()).length > 0) {
        const query = use('querystring');
        const queryString = query.stringify(request.all());
        url += `?${queryString}`;
      }

      const keyValue = await HomerService.get(url);

      return response.status(200).json(keyValue);
    } catch (e) {
      Log.send(`${logError} getKeyValue Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getDataKey({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'code']);

      if (!params.campaign_id || !params.code) {
        return response.status(400).json('Bad Request');
      }

      const datakey = await HomerService.get(
        `data-key/get?campaign_id=${params.campaign_id}&code=${params.code}`
      );

      return response.status(200).json(datakey);
    } catch (e) {
      Log.send(`${messageError} getDataKey Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getParticipantValidate({ request, response }) {
    try {
      const params = request.only(['uid', 'document', 'campaign_id']);
      let participant;
      if (params.uid) {
        participant = await HomerService.get(`participant/get?uid=${params.uid}`);
      } else {
        participant = await HomerService.get(
          `participant/get?document=${params.document}&campaign_id=${params.campaign_id}`
        );
      }
      return response.status(200).json(participant);
    } catch (e) {
      Log.send(`${logError} getParticipantValidate Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }


  //update birthDate

  async participantUpdateBirthDate({ request, response }) {
    const params = request.all();
    const participant = await HomerService.put('participant/simple-update-birth-date', params);
  }

  async participantUpdate({ request, response }) {
    try {
      const id = request.participant.participant_id;
      const campaign_id = request.participant.campaign_id;
      const userAgent = request.header('user-agent');
      const clientIP = request.headers()['x-real-ip'] || request.ip();
      const timeZone = 'America/Sao_Paulo';
      const now = new Date().toLocaleString('pt-BR', { timeZone, timeStyle: 'medium' });

      const params = request.only([
        'name',
        'surname',
        'document',
        'channel',
        'role',
        'email',
        'phone_id',
        'phone',
        'gender_id',
        'gender',
        'password',
        'oldPassword',
        'accept_whatsapp'
      ]);
      params.participant_id = id;
      params.campaign_id = campaign_id;

      const participant = await HomerService.put(
        'participant/simple-update',
        params
      );

      if(participant.status != 200){
        return response.status(participant.status).json({ message: participant.data });
      }

      const participantInfo = participant.data.participant;
      let participantDataAltered = 'Dados';
      if(params.password){
        participantDataAltered = 'Senha';
      }

      const logInfo = {
        endpoint: 'participant/update',
        log: `${participantDataAltered} do participante ${participantInfo.name} ${participantInfo.surname} na campanha de id:${campaign_id} alterados pelos participante, IP: ${clientIP} na data ${now} - dados de acesso: ${userAgent}.`
      };

      await logApi(logInfo);

      const data = { message: 'Registro atualizado com sucesso.' };

      return response.status(participant.status).json({ data });

    } catch (e) {
      Log.send(`${logError} participantUpdate Endpoint - ${e.message} - params: 
      ${new URLSearchParams(request.only(['document']))}`);
      return response.status(400).json(e.message);
    }
  }


  async getParticipantGoals({ request, response }) {
    try {
      const params = request.only(['mechanic_id', 'page', 'limit']);

      if (!params) {
        return response.status(401).json('Params is required.');
      }

      if (!params.mechanic_id) {
        return response.status(400).json('You need inform mechanic_id');
      }
      params.page = params.page ? params.page : 1;
      params.limit = params.limit ? params.limit : 10;
      let responseData = await this.getParticipantGoalsByMechanic(params);
      if (responseData.status == 200) {
        return response.status(200).json(responseData.data);
      } else {
        return response.status(responseData.status).json(responseData.message);
      }
    } catch (e) {
      Log.send(`${logError} getParticipantGoals Endpoint - ${e.message}`);
      return response.status(500).json(e);
    }
  }

  async getParticipantGoalsExportFile({ request, response }) {
    const params = request.only(['mechanic_id', 'file_type', 'page', 'limit']);
    try {
      if (!params) {
        return response.status(401).json('Params is required.');
      }

      if (!params.mechanic_id) {
        return response.status(400).json('You need inform mechanic_id');
      }

      if (!params.file_extension) {
        params['file_extension'] = 'csv';
      }

      params.page = params.page ? params.page : 1;
      params.limit = params.limit ? params.limit : 9999999;

      let responseData = await this.getParticipantGoalsByMechanic(params);
      if (responseData.status !== 200) {
        return response.status(responseData.status).json(responseData.message);
      }

      let isRanking = responseData.data.mechanic.mechanicType.config.ranking;

      const file = new (use('FileExportHelper'))();

      let folder = `${environments}/campaign_${responseData.data.campaign.id}`;

      let file_name = `mechanic_${responseData.data.mechanic.id}_`;
      if (
        responseData.data.mechanic && responseData.data.mechanic.mechanicType && responseData.data.mechanic.mechanicType.alias
      ) {
        file_name += `${responseData.data.mechanic.mechanicType.alias}_`;
      }

      let columns = [];

      columns.push({
        header: 'Cod. Mecanica',
        key: 'Cod. Mecanica',
        width: 10
      });
      columns.push({
        header: 'Mecanica',
        key: 'Mecanica',
        width: 255
      });
      columns.push({
        header: 'Cod. Participante',
        key: 'Cod. Participante',
        width: 10
      });
      columns.push({
        header: 'Nome',
        key: 'Nome',
        width: 100
      });
      columns.push({
        header: 'CPF',
        key: 'CPF',
        width: 15
      });
      columns.push({
        header: 'Cod. Segmentacao',
        key: 'Cod. Segmentacao',
        width: 10
      });

      if (isRanking !== 1) {
        columns.push({
          header: 'Meta',
          key: 'Meta',
          width: 10
        });
      }

      columns.push({
        header: 'Realizado',
        key: 'Realizado',
        width: 10
      });

      let headerKey = isRanking !== 1 ? 'Bateu a meta?' : 'Posicao';
      columns.push({
        header: headerKey,
        key: headerKey,
        width: 10
      });

      columns.push({
        header: 'Premiacao',
        key: 'Premiacao',
        width: 10
      });
      columns.push({
        header: 'Pontos liberados',
        key: 'Pontos liberados',
        width: 10
      });

      let lines = [];

      for (let goal of responseData.data.goals) {
        let line = {};
        line['Cod. Mecanica'] = responseData.data.mechanic.id;
        line['Mecanica'] = responseData.data.mechanic.name;
        line['Cod. Participante'] = goal.participant.id;
        line['Nome'] = `${goal.participant.name} ${goal.participant.surname}`;
        line['CPF'] = goal.participant.document;
        line['Cod. Segmentacao'] = goal.segmentation_id;

        if (isRanking !== 1) {
          line['Meta'] = goal.goal;
          line['Bateu a meta?'] = goal.hit_goal == 'Yes' ? 'Sim' : 'Nao';
        } else {
          line['Posicao'] = goal.position;
        }

        line['Realizado'] = goal.result;
        line['Premiacao'] = goal.points;
        line['Pontos liberados'] = goal.points_released ? 'Sim' : 'Nao';
        lines.push(line);
      }

      let file_path = `${folder}/downloads/mechanics`;

      let file_resp = await file.export(file_path, file_name, params.file_extension, 'goals', lines, columns);

      let awsDriver = new (use('AwsDriver'))();

      const returnS3 = await awsDriver.upload(file_resp);

      await fs.unlinkSync(file_resp);

      if (!returnS3 && !returnS3.Location) {
        return response.status(500).json('Error download file');
      }
      return response.status(200).json(returnS3.Location);
    } catch (e) {
      Log.send(`${logError} getParticipantGoalsExportFile Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getParticipantGoalsByMechanic(params) {
    try {
      let response = { status: 0, message: '', data: {} };
      let dataReturn = {
        title: '',
        view: '',
        goals: [],
        mechanic: {},
        campaign: {},
        calculatedPoints: 0,
        mechanicHasDistribute: 0
      };

      if (!params) {
        response.status = 401;
        response.message = 'Params is required.';
      }

      if (!params.mechanic_id) {
        response.status = 400;
        response.message = 'You need inform mechanic_id';
      }

      params.page = params.page ? params.page : 1;
      params.limit = params.limit ? params.limit : 10;

      let query = `mechanic/${params.mechanic_id}`;
      const mechanic = await JarvisService.get(query);

      if (mechanic.status !== 200) {
        response.status = mechanic.status;
        response.message = mechanic.data ? mechanic : `Erro get mechanic (${params.mechanic_id})`;
        return response;
      }

      let campaign_id = mechanic.data.campaign_id;
      let config = mechanic.data.mechanicType.config ? JSON.parse(mechanic.data.mechanicType.config) : {};

      let title = '';
      let view = '';

      if (config.ranking === 0 && config.fractioned === 0 && config.participate === 0) {
        title = `${mechanic.data.name} | Bateu Ganhou`;
        view = 'bateuganhou';
      }

      if (config.ranking === 1) {
        title = `${mechanic.data.name} | Ranking`;
        view = 'ranking';
      }

      let participants = [];

      if (mechanic.data.segmentation && mechanic.data.segmentation.length > 0) {
        for (const item of mechanic.data.segmentation) {
          query = `participant-segmentation/get?segmentation_id=${item.segmentation_id}&campaign_id=${campaign_id}&enabled=1`;
          const data = await HomerService.get(query);

          for (let part of data.data) {
            participants.push(part);
          }
        }
      }

      /* O bloco de if abaixo altera a exibição dos resultados do participante para mecânicas
      do tipo bateu-ganhou-merchan ou qrcode, os resultados dos seus goals, precisam ser somados, que são
      a quantidade de fotos/tokens enviados e também para evitar duplicação na tela de mensuração.*/
      let goals = {};
      let result = 0;
      let goalsComplete = {};
      if (mechanic.data.mechanicType.alias == 'bateu_ganhou_merchan' || mechanic.data.mechanicType.alias == 'qrcode') {
        query = `participant-goal/complete/get?mechanic_id=${params.mechanic_id}`;
        goalsComplete = await HomerService.get(query);

        for (let goal of goalsComplete.data) {
          result += goal.result;
        }

        query = `participant-goal/single/get?mechanic_id=${params.mechanic_id}`;
        goals = await HomerService.get(query);
        if (goals.data[0]) {
          goals.data[0].result = result;
        }

      } else {
        query = `participant-goal/complete/get?mechanic_id=${params.mechanic_id}`;
        goals = await HomerService.get(query);
      }

      if (goals.status !== 200) {
        response.status = goals.status;
        response.message = goals.data ? goals : `Erro get mechanic (${params.mechanic_id})`;
        return response;
      }

      title = `Mensuração - ${title}`;
      dataReturn.title = title;
      dataReturn.view = view;

      let executedCount = 0;
      const rankingGoal = mechanic.data.mechanicGoals.length - 1;

      /* Adicionado no if abaixo uma checagem para caso for uma mecânica do tipo progresso_lider,
      nesse caso apenas os goals dos participantes lideres cadatrados devem aparecer no cockpit,
      apesar da mecânica progresso lider possuir segmentação para lideres e merchandisers,
      para que ambos possam visualizar a mecânica.*/
      if (participants.length > 0 && mechanic.data.mechanicType.alias != 'progresso_lider') {
        for (let participant of participants) {
          participant.mensured = false;
          delete participant.participant.config;
          delete participant.participant.password;
          delete participant.participant.birthdate;
          delete participant.participant.validate_token;
          delete participant.participant.recovery_token;
          delete participant.participant.profile_image;
          delete participant.participant.participantStatus;
          delete participant.participant.created_at;
          delete participant.participant.updated_at;

          let participantGoal;

          if (goals.data || goals.data.length > 0) {
            if (config.ranking != 0 && mechanic.data.mechanicGoals[rankingGoal]) {
              participantGoal = mechanic.data.mechanicGoals[rankingGoal].quantity;
            } else if (config.ranking == 0 && mechanic.data.mechanicGoals[0]) {
              participantGoal = mechanic.data.mechanicGoals[0].quantity;
            } else {
              participantGoal = 0;
            }

            for (const goal of goals.data) {
              dataReturn.calculatedPoints += goal.points;

              if (!goal.executed_at) {
                executedCount++;
              }

              if (
                goal.participant_id == participant.participant_id && (goal.segmentation_id == participant.segmentation_id || goal.mechanic_id == mechanic.data.id)
              ) {
                goal['goal'] = participantGoal;
                if (config.ranking !== 1) {
                  goal['hit_goal'] = goal.result >= goal.goal ? 'Yes' : 'No';
                  goal['points_released'] = goal.executed_at ? 1 : 0;
                } else {
                  goal['hit_goal'] = goal.position && goal.position <= mechanic.data.mechanicGoals[rankingGoal].quantity ? 'Yes' : 'No';
                  goal['points_released'] = goal.executed_at ? 1 : 0;
                }
                goal['participant'] = participant.participant;
                participant.mensured = true;
                dataReturn.goals.push(goal);
              }
            }
          }

          if (!participant.mensured) {
            dataReturn.goals.push({
              participant: participant.participant,
              mechanic_id: parseInt(params.mechanic_id),
              segmentation_id: participant.segmentation_id,
              goal: participantGoal,
              result: 0,
              position: 9999999,
              points: mechanic.data.mechanicGoals[rankingGoal] ? mechanic.data.mechanicGoals[rankingGoal].score : 0,
              hit_goal: 'No',
              points_released: 0,
              executed_at: null,
              avaliable_on: null,
              expires_in: null
            });
          }
        }
        dataReturn.mechanicHasDistribute = participants.length == executedCount;
      } else {
        for (const goal of goals.data) {
          delete goal.participant.config;
          delete goal.participant.password;
          delete goal.participant.birthdate;
          delete goal.participant.validate_token;
          delete goal.participant.recovery_token;
          delete goal.participant.profile_image;
          delete goal.participant.participantStatus;
          delete goal.participant.created_at;
          delete goal.participant.updated_at;

          dataReturn.calculatedPoints += goal.points;

          if (config.ranking !== 1) {
            goal['hit_goal'] = goal.result >= goal.goal ? 'Yes' : 'No';
            goal['points_released'] = goal.executed_at ? 1 : 0;
          } else {
            goal.position = goal.position ? goal.position : 0;
            goal['hit_goal'] = goal.position && goal.position <= mechanic.data.mechanicGoals[rankingGoal].quantity ? 'Yes' : 'No';
            goal['points_released'] = goal.executed_at ? 1 : 0;
          }
          dataReturn.goals.push(goal);
        }
      }

      if (config.individual) {
        for (let goals of dataReturn.goals) {
          let participantGoal = await HomerService.get(`participant-goal/${goals.id}`);
          goals.goal = participantGoal.data.goal;
          goals.hit_goal = goals.result >= goals.goal ? 'Yes' : 'No';
        }
      }

      if (config.ranking === 1) {
        dataReturn.goals = dataReturn.goals.sort(function (a, b) {
          if (!a.position) {
            return 0;
          }
          if (a.position > b.position) {
            return 1;
          }
          if (a.position < b.position) {
            return -1;
          }
          if (a.position === b.position) {
            if (a.result > b.result) {
              return 1;
            }
            if (a.result < b.result) {
              return -1;
            }
            // A must be equal to b
            return 1;
          }
        });

        let count = 0;
        for (const item of dataReturn.goals) {
          if (item.position == 9999999) {
            dataReturn.goals[count].position = 0;
          }
          count += 1;
        }
      }

      delete mechanic.data.mechanic_type_id;
      delete mechanic.data.unity_type_id;
      delete mechanic.data.audience_type_id;
      delete mechanic.data.thumbnail;
      delete mechanic.data.description;
      delete mechanic.data.begin_at;
      delete mechanic.data.end_at;
      delete mechanic.data.view_to;
      delete mechanic.data.created_at;
      delete mechanic.data.updated_at;
      delete mechanic.data.mechanicGoals;
      delete mechanic.data.submechanic;
      delete mechanic.data.mechanicHasSubMechanic;
      delete mechanic.data.mechanicHasHierarchy;
      delete mechanic.data.segmentation;
      if (mechanic.data.mechanicType) {
        delete mechanic.data.mechanicType.enabled;
        delete mechanic.data.mechanicType.created_at;
        delete mechanic.data.mechanicType.updated_at;
        mechanic.data.mechanicType.config = config;
      }
      if (mechanic.data.unityType) {
        delete mechanic.data.unityType.enabled;
        delete mechanic.data.unityType.created_at;
        delete mechanic.data.unityType.updated_at;
      }
      if (mechanic.data.audienceType) {
        delete mechanic.data.audienceType.enabled;
        delete mechanic.data.audienceType.created_at;
        delete mechanic.data.audienceType.updated_at;
      }

      dataReturn.mechanic = mechanic.data;
      if (config.ranking == 1) {
        if (rankingGoal) {
          dataReturn.mechanic['rankingPosition'] = `Pontuação do 1º ao ${rankingGoal + 1}º colocado.`;
        } else {
          dataReturn.mechanic['rankingPosition'] = `Pontuação apenas para o 1º colocado`;
        }
      }
      query = `campaign/${campaign_id}`;
      let campaign = await XavierService.get(query);

      if (campaign.status !== 200) {
        response.status = campaign.status;
        response.message = campaign.data ? campaign : `Erro get campaign (${campaign_id})`;
        return response;
      }

      if (campaign.data) {
        delete campaign.data.config;
        delete campaign.data.page;
        delete campaign.data.user;
        delete campaign.data.marketplace;
        delete campaign.data.domain;
        delete campaign.data.custom_url;
        delete campaign.data.published;
        delete campaign.data.published_at;
        delete campaign.data.created_at;
        delete campaign.data.valid_from;
        delete campaign.data.valid_to;
        delete campaign.data.updated_at;
        delete campaign.data.component;
      }

      dataReturn.campaign = campaign.data;

      response.status = 200;
      response.data = dataReturn;
      return response;
    } catch (e) {
      Log.send(`${logError} getParticipantGoals Endpoint - ${e.message}`);
      response.status = 500;
      response.message = e.message;
      return response;
    }
  }

  async getAddresses({ request, response }) {
    try {
      const params = request.only(['participant_id', 'campaign_id']);

      if (!params.participant_id) {
        return response.status(400).json('You need inform a participant id.');
      }

      if (!params.campaign_id) {
        return response.status(401).json('You need inform the campaign id.');
      }

      const addresses = await HomerService.get(`address/get?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}`);

      return response.status(200).json(addresses);
    } catch (e) {
      Log.send(`${logError} getAddresses Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getAddress({ params, response }) {
    try {
      const address = await HomerService.get(`address/${params.id}`);
      return response.status(200).json(address);
    } catch (e) {
      Log.send(`${logError} getAddress Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getDistributorAddress({ params, response }) {
    try {
      const distributor = await HomerService.get(`distributor/${params.id}`);

      if (!distributor) {
        return response.status(404).json('Distributor not found');
      }

      const address = {
        status: distributor.status,
        data: {
          id: distributor.data.id,
          zipcode: distributor.data.postalcode,
          street: distributor.data.address,
          number: distributor.data.number,
          city: distributor.data.city,
          neighborhood: distributor.data.neighborhood,
          state: distributor.data.state_registration,
          complement: distributor.data.complement
        }
      };
      return response.status(200).json(address);
    } catch (e) {
      Log.send(`${logError} getDistributorAddress Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async updateAddress({ request, response }) {
    try {
      const params = request.only([
        'address_type_id',
        'title',
        'city',
        'campaign_id',
        'complement',
        'enabled',
        'id',
        'neighborhood',
        'number',
        'participant_id',
        'state',
        'street',
        'zipcode'
      ]);

      function isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
      }

      if (isNumber(params.number)) {
        const address = await HomerService.put('address/put', params);

        return response.status(200).json(address);
      } else {
        return response.status(400).json('Invalid number');
      }
    } catch (e) {
      Log.send(`${logError} updateAddress Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getMechanics({ request, response }) {
    try {
      const params = request.only([
        'participant_id',
        'campaign_id',
        'enabled',
        'insights',
        'mechanic_type_id',
        'date',
        'limit',
        'end_at',
        'created_at',
        'view_to'
      ]);
      const segmentation_id = [];
      if (!params.participant_id || !params.campaign_id) {
        return response.status(400).json('You need inform a participant id and campaign_id.');
      }
      //Load segmentations
      const segmentations = await HomerService.get(
        `participant-segmentation/get?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}`
      );
      segmentations.data.map(id => {
        segmentation_id.push(id.segmentation_id);
      });

      let homeScreen = false;
      let mechanics = {};
      if (segmentations.data.length > 0) {
        if (params.view_to || params.limit || params.created_at || params.end_at) {
          //Tela home
          mechanics = await JarvisService.get(
            `mechanic-segmentation/get?enabled=${params.enabled}&segmentations=${segmentation_id}
         &limit=${params.limit}&end_at=${params.end_at}&created_at=${params.created_at}&view_to=${params.view_to}`
          );
          homeScreen = true;
        } else if (params.mechanic_type_id && params.date) {
          //Tela metas com filtro de data e tipo de mecânica
          mechanics = await JarvisService.get(
            `mechanic-segmentation/get?enabled=${params.enabled}&segmentations=${segmentation_id}&mechanic_type_id=${params.mechanic_type_id}&date=${params.date}`
          );
        } else if (params.date) {
          //Tela metas com filtro de data
          mechanics = await JarvisService.get(
            `mechanic-segmentation/get?enabled=${params.enabled}&segmentations=${segmentation_id}&date=${params.date}`
          );
        } else if (params.mechanic_type_id) {
          //Tela metas com filtro por tipo de mecânica
          mechanics = await JarvisService.get(
            `mechanic-segmentation/get?enabled=${params.enabled}&segmentations=${segmentation_id}&mechanic_type_id=${params.mechanic_type_id}`
          );
        } else {
          //Tela metas sem filtro
          mechanics = await JarvisService.get(
            `mechanic-segmentation/get?enabled=${params.enabled}&segmentations=${segmentation_id}`
          );
        }
      }

      if(!mechanics.data){
        mechanics.data = [];
      }
      const positivationMechanicFilter = new URLSearchParams(params);
      const positivationMechanics = await HomerService.get(
        `positivation-mechanic/get?${positivationMechanicFilter.toString()}`
      );

      let hasPositivationMechanic = false;
      if(positivationMechanics.data.length > 0){
        hasPositivationMechanic = true;
        for (const positivationMechanic of positivationMechanics.data) {
          mechanics.data.push(positivationMechanic);
        }
      }

      if (mechanics.data.lenght <= 0) {
        return response.status(404).json('Participant did not have goals.');
      }

      //Load participantGoals
      const mechanicsWithGoals = await HomerHelperService.loadparticipantGoals(mechanics, params.participant_id,params.campaign_id);
      //Manipulate Mechanics
      const manipulatedMechanics = await HomerHelperService.manipulateGetMechanicsObj(mechanicsWithGoals, params, this.getParticipantGoalsByMechanic);

      if(hasPositivationMechanic){
        let manipulatedMechanicsHome = [];
        const orderedMechanics = await HomerHelperService.sortMechanicsByDate(manipulatedMechanics, homeScreen);
        if(homeScreen && params.limit){
          manipulatedMechanicsHome = orderedMechanics.slice(0,parseInt(params.limit));
          return response.status(200).json({
            status: 200,
            data: manipulatedMechanicsHome
          });
        }
        return response.status(200).json({
          status: 200,
          data: orderedMechanics
        });
      }
      return response.status(200).json({
        status: 200,
        data: manipulatedMechanics
      });
    } catch (e) {
      Log.send(
        `${logError} getMechanics Endpoint - ${e.message} - ${querystring.stringify(
          request.only(['participant_id', 'campaign_id', 'enabled', 'limit', 'end_at', 'created_at', 'view_to'
          ])
        )}`
      );
      return response.status(400).json(e.message);
    }
  }

  async getHierarchy({ params, response }) {
    try {
      const participantHierarchy = await HomerService.get(`participant/hierarchy/${params.id}`);

      return response.status(200).json(participantHierarchy);
    } catch (e) {
      Log.send(`${logError} getHierarchy Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getAllHierarchy({ request, response }) {
    try {
      const params = request.only(['campaign_id']);

      if (!params.campaign_id) {
        return response.status(400).json('Bad Request.');
      }

      const hierarchy = await HomerService.get(`hierarchy/all?campaign_id=${params.campaign_id}`);

      return response.status(200).json(hierarchy);
    } catch (e) {
      Log.send(`${logError} getAllHierarchy Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async acceptTerms({ request, response }) {
    try {
      const params = request.only(['participant_id', 'campaign_id']);
      const participant = await HomerService.post('participant/accept-terms', { participant_id: params.participant_id, campaign_id: params.campaign_id });

      return response.status(200).json(participant);
    } catch (e) {
      Log.send(`${logError} acceptTerms Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async saveData({ request, response }) {
    try {
      const data = request.all();

      let requestSaveData = [];

      let mechanic = await JarvisService.get(`mechanic/${data.mechanic_id}`);

      if (!mechanic) {
        return response.status(400).json('Mechanic not found.');
      }

      const actualDate = new Date(moment().format('YYYY-MM-DD HH:mm:ss')).getTime();
      const mechanicEndAt = new Date(moment(mechanic.data.end_at).format('YYYY-MM-DD 23:58:59')).getTime();

      if (actualDate > mechanicEndAt) {
        return response.status(400).json('The voting period has ended.');
      }

      if (Object.keys(data).length) {
        requestSaveData = await HomerService.post('participant/save/data', data);
      }

      return response.status(200).json(requestSaveData);
    } catch (e) {
      Log.send(`${logError} saveData Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getParticipantFiles({ params, request, response }) {
    try {
      let participantFiles = [];
      if (params.id) {
        let url = `participant/get/files/${params.id}`;

        if (Object.keys(request.all()).length > 0) {
          const query = use('querystring');
          const queryString = query.stringify(request.all());
          url += `?${queryString}`;
        }

        const participantF = await HomerService.get(url);
        participantFiles = participantF.data;
        participantFiles.status = participantF.status;
      }

      return response.status(200).json(participantFiles);
    } catch (e) {
      Log.send(`${logError} getParticipantFiles Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async putParticipantFiles({ request, response }) {
    try {
      for (const params of request.body) {

        if (!params.user_id) {
          return response.status(400).json('Missing user_id');
        }
        if (!params.id) {
          return response.status(400).json('Missing id');
        }

        if (params.status == false && !params.reprove_reason) {
          return response.status(400).json('Missing reproval reason.');
        }

        const media = await HomerService.get(`media/${params.id}`);

        if (media.data.status != undefined) {
          Log.send(`${logError} putParticipantFiles Endpoint - A imagem ${media.data.id} já possui status salvo e não será atualizada`);
          continue;
        }

        const today = DateTime.local().toISO();

        await HomerService.put('media/put', {
          id: params.id,
          status: params.status,
          reprove_reason: params.reprove_reason,
          user_id: params.user_id,
          analyzed_at: today
        });

        if (params.status == false) {
          Log.send(`${logError} putParticipantFiles Endpoint - A imagem ${media.data.id} foi reprovada e não renderá pontos`);
          continue;
        }

        const bateuGanhouMerchanType = await JarvisService.get(`mechanic-type/get?alias=bateu_ganhou_merchan`);
        const qrCodeType = await JarvisService.get(`mechanic-type/get?alias=qrcode`);
        const subMechanic = await JarvisService.get(`mechanic-has-submechanic/get?sub_mechanic_id=${media.data.participantHasMedia.mechanic_id}`);

        /* O bloco de processamento a seguir depende de a mecânica pai associada a foto do participante ser do
        tipo bateu-ganhou-merchan ou QRCode para aprovação e reprovação de fotos/cupons no cockpit, no caso de
        bateu ganhou merchan a mecânica diretamente associada a imagem nem sempre é associada ao critério, por isso
        é pega a mecânica a partir do parent para esse caso.*/
        let mechanic = {};
        if (subMechanic.data[0]) {
          mechanic = await JarvisService.get(`mechanic/${subMechanic.data[0].mechanic_parent_id}`);
        } else {
          mechanic = await JarvisService.get(`mechanic/${media.data.participantHasMedia.mechanic_id}`);
        }

        if (bateuGanhouMerchanType.data[0].id == mechanic.data.mechanic_type_id || qrCodeType.data[0].id == mechanic.data.mechanic_type_id) {

          const mechanicGoal = mechanic.data.mechanicGoals;
          const quantity = mechanicGoal[0].quantity;
          const points = mechanicGoal[0].score;
          const participant_id = media.data.participantHasMedia.participant_id;

          const querySegmentation = querystring.stringify({
            participant_id: media.data.participantHasMedia.participant_id,
            campaign_id: mechanic.data.campaign_id,
            enabled: 1
          });

          const participantSegmentation = await HomerService.get(`participant-segmentation/get?${querySegmentation}`);

          /* O bloco abaixo faz a distribuição dos pontos recebidos pela aprovação de fotos,
          Ele é baseado nos endpoints de participant-goals/save-goals e participant-goals/send-queue
          que fazem inserções através da participant-goal/put e transactional-point/insert-queue,
          Caso já exista um goal disponível relacionado a mesma, cujo results não passou o goal na
          participant_goal, essa entrada é utilizada, se não, uma nova entrada é criada.*/
          const queryGoal = querystring.stringify({
            participant_id: media.data.participantHasMedia.participant_id,
            mechanic_id: mechanic.data.id,
            enabled: 1
          });

          let participantGoal = await HomerService.get(`participant-goal-file-process/get?${queryGoal}`);

          let result = 1;
          const goal = quantity;
          const segmentation_id = participantSegmentation.data[0].segmentation_id;
          const mechanic_id = mechanic.data.id;
          let id = null;
          let item = {};

          if (!participantGoal.data.length) {
            item.participant_id = participant_id;
            item.segmentation_id = segmentation_id,
            item.mechanic_id = mechanic_id,
            item.points = points,
            item.result = result,
            item.goal = goal;

          } else {
            id = participantGoal.data[0].id;
            result += participantGoal.data[0].result;

            item.id = id;
            item.participant_id = participant_id;
            item.segmentation_id = segmentation_id,
            item.mechanic_id = mechanic_id,
            item.points = points,
            item.result = result,
            item.goal = goal;
          }

          participantGoal = await HomerService.put('participant-goal/put', item);

          if (qrCodeType.data[0].id == mechanic.data.mechanic_type_id) {
            const participantMechanicToken = await HomerSimpsonService.get(`participant-mechanic-token/get?mechanic_id=${mechanic_id}&media_id=${params.id}`);

            const queryUpdateGoal = querystring.stringify({
              id: participantMechanicToken.data.data[0].id,
              participant_goal_id: participantGoal.data.id
            });
            await HomerService.put(`participant-mechanic-token/updateGoal?${queryUpdateGoal}`);
          }

          if (goal <= result) {
            item.executed_at = today;
            await RobinService.post('transactional-point/insert-queue', { participant_goal_id: participantGoal.data.id });
          }
        }
      }

      return response.status(200).json('All images updated.');
    } catch (e) {
      Log.send(`${logError} putParticipantFiles Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async deleteParticipantFile({ params, response }) {
    try {
      if (params.id && params.fileid) {
        const url = `participant/${params.id}/file/${params.fileid}`;
        const deleteFile = await HomerService.delete(url);
        return response.status(200).json(deleteFile);
      }
      throw new Error('id or fileid not informed');
    } catch (e) {
      Log.send(`${logError} deleteParticipantFile Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getParticipantFilesToVoting({ params, request, response }) {
    try {
      let participantFilestoVoting = [];
      if (params.id) {
        let url = `participant/files/tovoting/${params.id}`;

        if (Object.keys(request.all()).length > 0) {
          const query = use('querystring');
          const queryString = query.stringify(request.all());
          url += `?${queryString}`;
        }

        const participantFilestoV = await HomerService.get(url);
        participantFilestoVoting = participantFilestoV.data;
        participantFilestoVoting.status = participantFilestoV.status;
      }

      return response.status(200).json(participantFilestoVoting);
    } catch (e) {
      Log.send(`${logError} getParticipantFilesToVoting Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getParticipantMechanicsToVoting({ params, request, response }) {
    try {
      let participantFilestoVoting = [];
      if (params.id) {
        let url = `participant/mechanics/tovoting/${params.id}`;

        if (Object.keys(request.all()).length > 0) {
          const query = use('querystring');
          const queryString = query.stringify(request.all());
          url += `?${queryString}`;
        }

        const participantFilestoV = await HomerService.get(url);
        participantFilestoVoting = participantFilestoV.data;
        participantFilestoVoting.status = participantFilestoV.status;
      }

      return response.status(200).json(participantFilestoVoting);
    } catch (e) {
      Log.send(`${logError} getParticipantFilesToVoting Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async votingFiles({ request, response }) {
    try {
      const data = request.all();
      let requestSaveData = [];

      if (Object.keys(data).length) {
        requestSaveData = await HomerService.post('participant/voting/files', data);
      }

      return response.status(200).json(requestSaveData);
    } catch (e) {
      Log.send(`${logError} votingFiles Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getParticipantChildren({ request, response }) {
    try {
      const params = request.only(['segmentation_id', 'page', 'limit']);

      if (!params.segmentation_id) {
        return response.status(400).json('Bad request.');
      }

      if (!params.page) {
        params.page = 1;
      }
      if (!params.limit) {
        params.limit = 20;
      }

      const participant = await HomerService.get(
        `participant/get-participant-children?segmentation_id=${params.segmentation_id}&page=${params.page}&limit=${params.limit}`
      );

      if (!participant) {
        return response.status(401).json('Participant not found.');
      }

      return response.status(200).json(participant);
    } catch (e) {
      Log.send(`${logError} getParticipantChildren Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async createOrEditParticipantChild({ request, response }) {
    try {
      const params = request.only([
        'id',
        'participant_status_id',
        'participant_leader_id',
        'code',
        'name',
        'surname',
        'email',
        'document',
        'birthdate',
        'enabled',
        'campaign_id',
        'segmentation_parent_id',
        'segmentation_id'
      ]);

      if (!params.participant_leader_id) {
        return response.status(401).json('You need inform participant leader id.');
      }

      params.document = params.document.replace(/[^\w\s]/gi, '');

      const participant = await HomerService.put('participant/edit-create-child', params);

      if (!participant) {
        return response.status(401).json('Error to create or edit participant');
      }

      return response.status(200).json(participant);
    } catch (e) {
      Log.send(`${logError} createOrEditParticipantChild Endpoint - ${e.message}`);
      return response.status(400).json('Invalid data.');
    }
  }

  async getParticipantStatus({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'alias']);
      let alias = '';

      if (!params.campaign_id) {
        return response.status(400).json('You need inform campaign id.');
      }

      if (params.alias) {
        alias = `&alias=${params.alias}`;
      }

      const participantStatus = await HomerService.get(
        `participant-status/get?campaign_id=${params.campaign_id}${alias}`
      );

      return response.status(200).json(participantStatus);
    } catch (e) {
      Log.send(`${logError} getParticipantStatus Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async distributorMassiveInsert({ request, response }) {
    try {
      const params = request.only(['distributor']);

      const distributors = await HomerService.put('distributor/massive-insert', params);

      return response.status(200).json(distributors);
    } catch (e) {
      Log.send(`${logError} - distributorMassiveInsert Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async preRegisterValidate({ request, response }) {
    try {
      const params = request.only(['document', 'campaign_id']);
      if (!params.document || !params.campaign_id) {
        return response
          .status(400)
          .json({ data: { validate: false, message: 'Bad Request - campaign or document missing' } });
      }
      const validated = await HomerService.get(
        `participant-pre-register/validate?document=${params.document}&campaign_id=${params.campaign_id}`
      );

      if (
        validated.status == 204 || validated.data.pre_register_status_id == parseInt(Env.get('PRE_REGISTER_STATUS_VALID_ID'))
      ) {
        return response.status(200).json({ data: { validate: true } });
      }
      return response.status(409).json({ data: { validate: false, message: validated.data.message } });
    } catch (e) {
      Log.send(`${logError} - preRegisterValidate Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async participantValidate({ request, response }) {
    try {
      const params = request.only(['document', 'campaign_id']);

      if (!params.document || !params.campaign_id) {
        return response.status(400).json({ message: 'O parâmetro campaign_id e document são obrigatórios.' });
      }

      const validated = await HomerService.get(
        `participant/validate?document=${params.document}&campaign_id=${params.campaign_id}`
      );

      if (validated.status == 204 ) {
        return response.status(200).json({ data: { validate: true } });
      }
      return response.status(409).json({ data: { validate: false, message: 'Documento já existe na campanha' } });
    } catch (e) {
      Log.send(`${messageError} HomersimpsonController - participantValidate Endpoint - ${e.message} - params: 
      ${new URLSearchParams(request.only(['document', 'campaign_id']))}`);
      return response.status(500).json({ message: e.message });
    }
  }

  async preRegisterPut({ request, response }) {
    try {
      let params = request.only([
        'code',             
        'name',
        'email',             
        'contact',
        'document',         
        'segmentation',
        'surname',           
        'nameMother',
        'city',              
        'state',
        'number',            
        'street',
        'zipcode',           
        'complement',
        'companyName',       
        'fantasyName',
        'neighborhood',    
        'personResponsable',
        'stateRegistration', 
        'config',
        'documentImages',    
        'pdvs',
        'id',                
        'status',
        'namemother',     
        'campaign_id',  
        'campaign_name'
      ]);

      let fields = ['campaign_id', 'pre_register_status_id'];
      let participantData = {};
      let pdvsArray = [];

      for (let y in Object.keys(params)) {
        if (!fields.includes(Object.keys(params)[y])) {
          participantData[Object.keys(params)[y]] = Object.values(params)[y];
        }
      }

      // Valida se é CPF ou CNPJ pelo numero de caracteres
      const isCNPJ = (document) => document.replace(/\D/gim, '').length > 11;
      const listIncluded = (arraylist, comparisonList) => arraylist.filter(field => !comparisonList.includes(field) || !params[field]);

      let statusPreRegister = {};

      const currentFields = Object.keys(params);

      if (params.document) {
        const validations = !params || !params.segmentation || !params.name || !params.contact || !params.campaign_id || !params.email;

        // Validação dos campo gerais CNPJ e CPF
        if (isCNPJ(params.document) ? validations : validations || !params.surname) {
          const requiredFields = [
            'segmentation',
            'campaign_id',
            'document',
            'contact',
            'email',
            'name',
            'campaign_name'
          ];

          const fieldNotFound = listIncluded(isCNPJ(params.document) ? requiredFields : [...requiredFields, 'surname'], currentFields);

          if (fieldNotFound.length) {
            return response.status(400).json(`${fieldNotFound.join(', ')} is required`);
          }
        }
      } else {
        return response.status(400).json(`document is required`);
      }

      // Validação dos campos de endereços e empresariais do formulário do modelo CPNJ
      if (isCNPJ(params.document)) {
        const requiredFieldsCNPJ = [
          'personResponsable',
          'stateRegistration',
          'neighborhood',
          'companyName',
          'fantasyName',
          'campaign_id',
          'contact',
          'zipcode',
          'street',
          'number',
          'state',
          'city'
        ];

        const fieldNotFoundCNPJ = listIncluded(requiredFieldsCNPJ, currentFields);

        if (fieldNotFoundCNPJ.length) {
          return response.status(400).json(`${fieldNotFoundCNPJ.join(', ')} is required`);
        }
      }

      const campaign = await XavierService.get(`campaign/${params.campaign_id}`);
      let campaignConfig = JSON.parse(campaign.data.config);
      if (campaignConfig.preRegisterMessage && !params.contact) {
        return response.status(400).json('Incomplete register');
      } else if (!campaignConfig.preRegisterMessage && !params.email) {
        return response.status(400).json('Incomplete register');
      }

      if (campaignConfig.hasParticipantImg) {
        if(campaignConfig.hasParticipantImg == true) {
          if(!params.documentImages || !Object.keys(params.documentImages).length) {
            return response.status(400).json('documentImages is required');
          } else if(!params.documentImages.frontImg || !params.documentImages.backImg || !params.documentImages.faceImg) {
            return response.status(400).json('documentImages parameters is required');
          }
        }
      }

      if (campaignConfig.hasParticipantPdv) {
        if (!params.pdvs || !params.pdvs.length) {
          return response.status(400).json('pdvs is required');
        } else {
          for(let pdv of params.pdvs) {
            pdv.cnpj = pdv.cnpj.replace(/[^0-9]+/g,'');
            pdv.stateRegistration = pdv.stateRegistration.replace(/[^a-zA-Z0-9]/g, '');

            if(pdv.cnpj.length !== 14) {
              return response.status(400).json('cnpj_pdv is invalid');
            }
          }
        }
        let { pdvs, ...rest } = participantData;
        participantData = rest
        pdvsArray = pdvs
        participantData.pdvs = pdvs;
      }

      const validated = await HomerService.get(
        `participant-pre-register/validate?document=${params.document}&campaign_id=${params.campaign_id}`
      );

      if (
        validated.data && validated.data.pre_register_status_id != parseInt(Env.get('PRE_REGISTER_STATUS_VALID_ID'))
      ) {
        return response.status(400).json({ data: { validate: false } });
      }

      if (!params.pre_register_status_id) {
        statusPreRegister = await HomerService.get(`pre-register-status/get?alias=CREATED`);
        params.pre_register_status_id = statusPreRegister.data[0].id;
      }

      if (params.regFix) {
        participantData.regFix = params.regFix;
      }
      const requestObj = {
        participant_data: JSON.stringify(participantData),
        campaign_id: params.campaign_id,
        pre_register_status_id: params.pre_register_status_id
      };

      const precad = await HomerService.put(`participant-pre-register/create`, requestObj);

      if (pdvsArray.length > 0) {
      const preRegisterPdvObj = {
        participant_pre_register_id: precad.data.message.id,
        campaign_id: campaign.data.id,
        pdvs: pdvsArray
      }
      const pdvsPreRegister = await HomerService.post('participant-pdv-pre-register/create', preRegisterPdvObj);
      precad.data.message.pdvs = pdvsPreRegister.data
      }

      /*Abaixo é verificado se a campanha possui ativação automática do participante, se sim,
      o participante seguirá o caminho automático, se não, continuará pelo procedimento de ativação manual.*/
      if (campaignConfig.isPreRegisterAutomatic) {
        const isPreApprovedParticipant = await HomerService.get(
          `participant-pre-approved/get?document=${params.document}&campaign_id=${params.campaign_id}`
        );

        let isPreApprovedPdvs = [];
        let participantCnpjs = [];
        if(campaignConfig.hasParticipantPdv && campaignConfig.hasParticipantPdv == true) {
          participantCnpjs = params.pdvs.map((pdv) => pdv.cnpj);

          let idsPreApprovedPdv = [];
          for (let participantCnpj of participantCnpjs) {
            const isPreApprovedPdv = await HomerService.get(
              `participant-pre-approved/get?document=${participantCnpj}&campaign_id=${params.campaign_id}&enabled=1`
            );

            isPreApprovedPdvs.push(isPreApprovedPdv.data.length);

            if (isPreApprovedPdv.data.length) {
              idsPreApprovedPdv.push(isPreApprovedPdv.data[0].id);
            };
          }
          isPreApprovedPdvs = !isPreApprovedPdvs.includes(0);
          if (isPreApprovedPdvs) {
            for (let id of idsPreApprovedPdv) {
              await HomerService.put('participant-pre-approved/disable', { id });
            }
          };
        }

        if (isPreApprovedParticipant.data.length > 0 || isPreApprovedPdvs === true) {
          const preRegister = await HomerService.get(`pre-register-status/get?alias=APPROVED`);
          statusPreRegister = preRegister.data[0].id;
          requestObj.id = precad.data.message.id;
          requestObj.justification = 'Parabéns, você foi aprovado';
          if (campaignConfig.automatic_approval_justification) {
            requestObj.justification = campaignConfig.automatic_approval_justification;
          }
          requestObj.pre_register_status_id = statusPreRegister;
          await HomerService.put('participant-pre-register/put', requestObj);
          precad.data.message.pre_register_status_id = statusPreRegister;
        }
      }
      await logApi({
        endpoint: 'preRegisterPut Endpoint',
        log:`O participante ${params.name} com o documento ${params.document}, se pré cadastrou na campanha ${params.campaign_id}`
      });
      return response.status(200).json(precad);
    } catch (e) {
      Log.send(
        `${logError} preRegisterPut Endpoint - ${e.message} - ${querystring.stringify(
          request.all()
        )}`
      );
      return response.status(500).json(e.message);
    }
  }

  async preRegisterPreStatusGetAll({ request, response }) {
    try {
      const status = await HomerService.get(`pre-register-status/all`);

      return response.status(200).json(status);
    } catch (e) {
      Log.send(`${logError} - preRegisterPreStatusGetAll Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getParticipantIndividualGoal({ request, response }) {
    try {
      const params = request.only(['participant_id', 'campaign_id', 'dateFrom', 'dateTo']);

      const ret = await HomerHelperService.getIndividualGoal(params);

      return response.status(ret.status).json(ret.message);
    } catch (e) {
      Log.send(`${logError} - getParticipantIndividualGoal Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getPreRegisters({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'page', 'search', 'pre_register_status_id']);
      let query = `?campaign_id=${params.campaign_id}&page=${params.page}`;

      if (!params.campaign_id) {
        return response.status(400).json('Bad Request.');
      }

      if (params.pre_register_status_id) {
        query = `${query}&pre_register_status_id=${params.pre_register_status_id}`;
      }

      if (params.search) {
        query = `${query}&search=${params.search}`;
      }

      const preregister = await HomerService.get(`participant-pre-register/get${query}`);
      return response.status(200).json(preregister);
    } catch (e) {
      Log.send(`${logError} - getPreRegisters Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getPreRegistersCpf({ request, response }) {
    try {
      const params = request.only([
        'campaign_id',
        'page',
        'search',
        'pre_register_status_id',
        'order',
        'orderList',
        'analysis_id'
      ]);
      let query = `?campaign_id=${params.campaign_id}&page=${params.page}`;

      if (!params.campaign_id) {
        return response.status(400).json('Bad Request.');
      }

      if (params.pre_register_status_id) {
        query = `${query}&pre_register_status_id=${params.pre_register_status_id}&analysis_id=${params.analysis_id}`;
      }

      if (params.search) {
        query = `${query}&search=${params.search}`;
      }

      const preregister = await HomerService.get(`participant-pre-register-cpf/get${query}`);

      let preRegPaginated;
      if (preregister.status == 200) {
        let ct = 0;
        for (const item of preregister.data) {
          preregister.data[ct].participant_data = JSON.parse(item.participant_data);
          ct += 1;
        }
        if (params.page) {
          if (params.order) {
            const preRegOrdenated = await arrayhelper.orderingItems(
              preregister.data,
              params.order,
              params.orderList ? params.orderList : 'ASC'
            );
            preRegPaginated = await arrayhelper.listItems(
              preRegOrdenated,
              params.page,
              params.perPage ? params.perPage : 20
            );
          }
          preRegPaginated = await arrayhelper.listItems(
            preregister.data,
            params.page,
            params.perPage ? params.perPage : 20
          );

          return response.status(200).json(preRegPaginated);
        }
        if (params.order) {
          preregister.data = await arrayhelper.orderingItems(
            preregister.data,
            params.order,
            params.orderList ? params.orderList : 'ASC'
          );
        }
      }

      return response.status(200).json(preregister.data);
    } catch (e) {
      Log.send(`${logError} - getPreRegistersCpf Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getPreRegistersCnpj({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'page', 'search', 'pre_register_status_id']);
      let query = `?campaign_id=${params.campaign_id}&page=${params.page}`;

      if (!params.campaign_id) {
        return response.status(400).json('Bad Request.');
      }

      if (params.pre_register_status_id) {
        query = `${query}&pre_register_status_id=${params.pre_register_status_id}`;
      }

      if (params.search) {
        query = `${query}&search=${params.search}`;
      }

      const preregister = await HomerService.get(`participant-pre-register-cnpj/get${query}`);

      let preRegPaginated;
      if (preregister.status == 200) {
        let ct = 0;
        for (const item of preregister.data) {
          preregister.data[ct].participant_data = JSON.parse(item.participant_data);
          ct += 1;
        }
        if (params.page) {
          if (params.order) {
            const preRegOrdenated = await arrayhelper.orderingItems(
              preregister.data,
              params.order,
              params.orderList ? params.orderList : 'ASC'
            );
            preRegPaginated = await arrayhelper.listItems(
              preRegOrdenated,
              params.page,
              params.perPage ? params.perPage : 20
            );
          }
          preRegPaginated = await arrayhelper.listItems(
            preregister.data,
            params.page,
            params.perPage ? params.perPage : 20
          );

          return response.status(200).json(preRegPaginated);
        }
        if (params.order) {
          preregister.data = await arrayhelper.orderingItems(
            preregister.data,
            params.order,
            params.orderList ? params.orderList : 'ASC'
          );
        }
      }

      return response.status(200).json(preregister.data);
    } catch (e) {
      Log.send(`${logError} - getPreRegistersCnpj Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getPreRegisterById({ params, response }) {
    try {
      const preregister = await HomerService.get(`participant-pre-register/${params.id}`);
      if (preregister.status == 200) {
        return response.status(200).json(preregister.data);
      }
      return response.status(500).json(preregister);
    } catch (e) {
      Log.send(`${logError} - getPreRegisterById Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getPreRegisterCnpjById({ params, response }) {
    try {
      const preregister = await HomerService.get(`participant-pre-register/${params.id}`);
      if (preregister.status == 200) {
        return response.status(200).json(preregister.data);
      }
      return response.status(500).json(preregister);
    } catch (e) {
      Log.send(`${logError} - getPreRegisterCnpjById Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async searchPreRegisterSituation({ request, response }) {
    try {
      const params = request.only(['search']);
      if (!params.search) {
        return response.status(400).json('Bad Request.');
      }
      const preregister = await HomerService.get(`pre-register-status/search?search=${params.search}`);
      return response.status(200).json(preregister);
    } catch (e) {
      Log.send(`${logError} - searchPreRegisterSituation Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getPreRegisterSituationById({ params, response }) {
    try {
      const preregister = await HomerService.get(`pre-register-status/${params.id}`);
      if (preregister.status == 200) {
        return response.status(200).json(preregister);
      }
      return response.status(400).json(preregister);
    } catch (e) {
      Log.send(`${logError} - getPreRegisterSituationById Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async preRegisterUpdate({ request, response }) {
    try {
      const params = request.only([
        'id',
        'campaign_id',
        'pre_register_status_id',
        'participant_id',
        'user_avaliator_id',
        'participant_data',
        'justification',
        'validated_at',
        'enabled'
      ]);
      const preregister = await HomerService.put('participant-pre-register/put', params);
      if(preregister.status !== 200){
        const { status, ...res } = preregister;
        return response.status(status).json({ data: { message: res.data.message } });
      }
      return response.status(200).json({ data: { message:'Sucesso na alteração!' } });
    } catch (e) {
      Log.send(`${logError} - preRegisterUpdate Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async preRegisterUpdateCnpj({ request, response }) {
    try {
      const params = request.only([
        'id',
        'campaign_id',
        'pre_register_status_id',
        'participant_id',
        'user_avaliator_id',
        'participant_data',
        'justification',
        'validated_at',
        'enabled'
      ]);
      const preregister = await HomerService.put('participant-pre-register/put', params);
      if(preregister.status !== 200){
        const { status, ...res } = preregister;
        return response.status(status).json({ data: { message: res.data.message } });
      }
      return response.status(200).json({ data: { message:'Sucesso na alteração!' } });
    } catch (e) {
      Log.send(`${logError} - preRegisterUpdateCnpj Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async searchPreRegisterSituation({ request, response }) {
    try {
      const params = request.only(['search']);
      if (!params.search) {
        return response.status(400).json('Bad Request.');
      }
      const preregister = await HomerService.get(`pre-register-status/search?search=${params.search}`);
      return response.status(200).json(preregister);
    } catch (e) {
      Log.send(`${logError} - searchPreRegisterSituation Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getPreRegisterSituationById({ params, response }) {
    try {
      const preregister = await HomerService.get(`pre-register-status/${params.id}`);
      if (preregister.status == 200) {
        return response.status(200).json(preregister);
      }
      return response.status(400).json(preregister);
    } catch (e) {
      Log.send(`${logError} - getPreRegisterById Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getMechanicHistory({ request, response }) {
    const { participant_id, campaign_id } = request.only(['participant_id', 'campaign_id']);
    if (!participant_id || !campaign_id) {
      return response.status(400).json({ message: 'os parametros participant_id e campaign_id são obrigatorios' });
    };
    if (isNaN(participant_id) || isNaN(campaign_id)) {
      return response.status(400).json({ message: 'os parametros participant_id e campaign_id devem ser um numero' });
    }
    const { data: goals } = await HomerHelperService.getParticipantGoals({ participant_id, campaign_id });
    const goalsExist = goals.length > 0 && typeof(goals) === 'object';
    if (!goalsExist) {
      return response.status(404).json({ message: 'nenhuma meta encontrada' });
    }
    const mechanicIds = goals.map(goal => goal.mechanic_id);
    const { data: mechanics } = await JarvisService.get(`mechanic/by-id/get?id=${mechanicIds}&enabled=1`);
    const mechanicsExist = mechanics.length > 0;
    if (!mechanicsExist) {
      return response.status(404).json({ message: 'nenhuma mecanica encontrada' });
    }
    const goalsWithMechanic = await HomerHelperService.joinMechanicToGoals(goals, mechanics);
    const { data: mechanicTypes } = await JarvisService.get(`mechanic-type/all`);
    const mechanicTypesExist = mechanicTypes.length > 0 && typeof(goals) === 'object';
    if (!mechanicTypesExist) {
      return response.status(404).json({ message: 'falha ao buscar tipos de mecanica' });
    }
    const wantedTypesAlias = [
      'bateu_ganhou',
      'bateu_ganhou_merchan',
      'focos_mensais',
      'melhor_foto',
      'progresso',
      'qrcode',
      'quiz'
    ];
    const wantedMechanicTypes = mechanicTypes.filter((type) => wantedTypesAlias.includes(type.alias));
    const mechanicsHistory = await HomerHelperService.getGoalsByMechanicType(wantedMechanicTypes, goalsWithMechanic);
    if (!mechanicsHistory) {
      return response.status(404).json({ message: 'Falha ao buscar historico de mecanicas' });
    }
    return response.status(200).json(mechanicsHistory);
  }

  async getHierarchy({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'hierarchy_parent_id']);
      if (!params.campaign_id) {
        return response.status(400).json('Bad Request.');
      }
      let query = `?campaign_id=${params.campaign_id}`;
      if (params.hierarchy_parent_id) {
        query = `${query}&hierarchy_parent_id=${params.hierarchy_parent_id}`;
      }
      const hierarchy = await HomerService.get(`hierarchy/get${query}`);
      return response.status(200).json(hierarchy);
    } catch (e) {
      Log.send(`${logError} - getHierarchy Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async putHierarchy({ request, response }) {
    try {
      const params = request.only(['id', 'campaign_id', 'name', 'hierarchy_parent_id']);
      if (!params.campaign_id) {
        return response.status(400).json('Bad Request.');
      }
      const hierarchy = await HomerService.put('hierarchy/put', params);
      return response.status(200).json(hierarchy);
    } catch (e) {
      Log.send(`${logError} - putHierarchy Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async searchHierarchy({ request, response }) {
    try {
      const params = request.only(['search', 'campaign_id']);
      if (!params.search || !params.campaign_id) {
        return response.status(400).json('Bad Request.');
      }
      const hierarchys = await HomerService.get(
        `hierarchy/search?search=${params.search}&campaign_id=${params.campaign_id}`
      );
      return response.status(200).json(hierarchys);
    } catch (e) {
      Log.send(`${logError} - searchHierarchy Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async searchParticipants({ request, response }) {
    try {
      const params = request.only(['search', 'campaign_id']);
      if (!params.search || !params.campaign_id) {
        return response.status(400).json('Bad Request.');
      }
      const participants = await HomerService.get(
        `participant/search?search=${params.search}&campaign_id=${params.campaign_id}`
      );
      return response.status(200).json(participants);
    } catch (e) {
      Log.send(`${logError} - searchParticipants Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async customSearchParticipants({ request, response }) {
    try {
      const params = request.only([
        'search',
        'campaign_id',
        'from',
        'to',
        'enabled',
        'accepted_terms',
        'ordination',
        'ordination_direction',
        'page',
        'per_page'
      ]);
      if (!params.campaign_id) {
        return response.status(400).json('Bad Request.');
      }

      const queryString = queryS.stringify(params);

      let participants = await HomerService.get(`participant/custom-search?${queryString}}`);
      let ct = 0;
      if (participants && participants.data.data.length > 0) {
        for (let item of participants.data.data) {
          const points = await RobinService.get(
            `point/get?participant_id=${item.id}&campaign_id=${params.campaign_id}`
          );
          const participantHC = await HomerSimpsonService.get(`participant-campaign/get?participant_id=${item.id}&campaign_id=${params.campaign_id}`);

          participants.data.data[ct].points = points.data;
          participants.data.data[ct].code = participantHC.data[0].code;
          participants.data.data[ct].email = participantHC.data[0].email;
          participants.data.data[ct].enabled = participantHC.data[0].enabled;
          ct += 1;
        }
      }

      return response.status(200).json(participants);
    } catch (e) {
      Log.send(`${logError} - customSearchParticipants Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getParticipantIndividualGoal({ request, response }) {
    try {
      const params = request.only(['participant_id', 'campaign_id', 'date']);

      return response.status(200).json(await HomerHelperService.getIndividualGoal(params));
    } catch (e) {
      Log.send(`${logError} - getParticipantIndividualGoal Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getParticipantIndividualGoal({ request, response }) {
    try {
      const params = request.only(['participant_id', 'campaign_id', 'dateFrom', 'dateTo']);

      const ret = await HomerHelperService.getIndividualGoal(params);

      return response.status(ret.status).json(ret.message);
    } catch (e) {
      Log.send(`${logError} - getParticipantIndividualGoal Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async putParticipants({ request, response }) {
    try {
      const logService = new LogService()
      const params = request.all();
      const userId = request.authUserId
      let participantActualSegmentation = []
      
      if (!params.campaign_id) {
        return response.status(400).json('Parâmetro campaign_id é obrigatório.');
      }

      const queryParticipantSegmentation = querystring.stringify({
          participant_id: params.id,
          campaign_id: params.campaign_id,
          enabled: 1
        });

      const participants = await HomerService.get(`participant-campaign/get?participant_id=${params.id}&campaign_id=${params.campaign_id}`);
      
      const { data } = await HomerService.get(`participant-segmentation/get?${queryParticipantSegmentation}`);
      data.forEach((objeto) => {
        if (objeto.segmentation_id) {
          participantActualSegmentation.push(`${objeto.segmentation_id}`);
        }
      });

      
      const user = await XavierService.get(`user/${userId}`);
      const userFullName = `${user.data.name && user.data.name} ${user.data.surname && user.data.surname}`

      const participant = await HomerService.put('participant/put', params);
      
      if(participant.status === 200){
        const change = compareParticipanteData(params, participants, logError, user, participantActualSegmentation)

      let logData;

      change.change.map(async (e)=>{
        logData = {
          user_id: `${userId}`,
          user_fullname: `${userFullName}`,
          campaign_id: `${request.body.campaign_id}`,
          participant_id: `${request.body.id}`, 
          environment: process.env.NODE_ENV,
          origin: `${e.valorAntigo}`,
          destiny: `${e.valorNovo}`,  
          endpoint: "participant/put",
          flag: "dados",
          type: "alteração de dados",
          };
          
          await logService.createLog(logData);
      })

        Log.sendPutParticipantData(change.message)
      }

      if(participant.status != 200){
        return response.status(participant.status).json({ message:participant.data });
      }

      return response.status(200).json(participant);
    } catch (e) {
      Log.send(`${logError} putParticipants Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getBrokers({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'page']);

      if (!params.campaign_id) {
        return response.status(400).json('Bad Request.');
      }

      if (!params.page) {
        params.page = 1;
      }

      const brokers = await HomerService.get(
        `distributor/get?campaign_id=${params.campaign_id}&page=${params.page}`
      );

      return response.status(200).json(brokers);
    } catch (e) {
      Log.send(`${logError} getBrokers Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async putBrokers({ request, response }) {
    try {
      let params = request.all();
      const onlyNumber = (value) => Number(value.replace(/\D/gim, ''));
      const documentFormat = (document) => document.padStart(14, '0');

      params['document'] = documentFormat(`${onlyNumber(params.document)}`);
      params['postalcode'] = onlyNumber(params.postalcode);

      delete params['phone'];
      delete params['phone_2'];

      let phoneConfig = () => {
        if (request.body.phone_2) {
          return {
            area_code: onlyNumber(request.body.phone.split(')')[0]),
            phone: onlyNumber(request.body.phone.split(')')[1]),
            area_code_2: onlyNumber(request.body.phone_2.split(')')[0]),
            phone_2: onlyNumber(request.body.phone_2.split(')')[1])
          };
        } else {
          return {
            area_code: onlyNumber(request.body.phone.split(')')[0]),
            phone: onlyNumber(request.body.phone.split(')')[1]),
            area_code_2: '',
            phone_2: ''
          };
        }
      };

      const data = { ...params, ...phoneConfig() };

      if (!data['campaign_id']) {
        return response.status(400).json('Bad Request.');
      }

      const brokers = await HomerService.put('distributor/put', data);

      return response.status(200).json(brokers);
    } catch (e) {
      Log.send(`${logError} - putBrokers Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getBrokerById({ params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Bad Request');
      }

      const brokers = await HomerService.get(`distributor/${params.id}`);

      return response.status(200).json(brokers);
    } catch (e) {
      Log.send(`${logError} - getBrokerById Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async saveGoals({ request, response }) {
    try {
      const params = request.only('goals');

      let goals = {};
      goals.data = [];
      let mechanicId = new unique();

      if (params.goals) {
        if (params.goals.length > 0) {
          for (let item of params.goals) {
            const data = await HomerService.put('participant-goal/put', item);
            if (data.status == 200) {
              goals.data.push(data.data);
              mechanicId.add(item.mechanic_id);
            }
          }
          goals.status = 200;
        }
      } else {
        goals = await HomerService.put('participant-goal/put', params);
      }

      for (const mechanic of mechanicId.get()) {
        const data = await this.pointsCalculate(mechanic);
      }

      return response.status(goals.status).json(goals.data);
    } catch (e) {
      Log.send(`${logError} - saveGoals Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async insertGoalsQueue({ request, response }) {
    try {
      const param = request.only('id');
      if (!param && param.id.length <= 0) {
        return response.status(204).json();
      }
      let count = 0;
      let sumGoal = 0;
      let participantGoalItem = {};

      for (const item of param.id) {
        participantGoalItem = await HomerService.get(`participant-goal/${item}`);
        sumGoal = sumGoal + participantGoalItem.data.points;
      }

      const mechanic = await JarvisService.get(
        `mechanic/${participantGoalItem.data.mechanic_id}`
      );

      const campaigncredit = await XavierService.get(`campaign-credit/get?campaign_id=${mechanic.data.campaign_id}`);

      if(sumGoal > campaigncredit.data[0].credits){
        return response.status(400).json({ message:'Saldo da campanha insuficiente.' });
      }

      for (const item of param.id) {
        const participantGoal = await HomerService.get(`participant-goal/${item}`);
        if (participantGoal && participantGoal.status == 200 && !participantGoal.data.executed_at) {
          const queue = await RobinService.post('transactional-point/insert-queue', { participant_goal_id: item });
          if(queue.status != 200){
            return response.status(queue.status).json(queue.data);
          }
          if (queue.status == 200) {
            count += 1;
            let participantPut = participantGoal.data;
            participantPut.executed_at = moment().format('YYYY-MM-DD HH:mm:ss');
            await HomerService.put('participant-goal/put', participantPut);
          }
        }
      }

      return response.status(200).json(`${count} objects sended to queue`);
    } catch (e) {
      Log.send(`${logError} - insertGoalsQueue Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async calculatePoints({ request, response }) {
    try {
      const param = request.only('mechanic_id');

      if (!param || !param.mechanic_id) {
        return response.status(204).json();
      }

      const data = await this.pointsCalculate(param.mechanic_id);

      return response.status(200).json(data);
    } catch (e) {
      Log.send(`${logError} - calculatePoints Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getMechanicValue({ request, response }) {
    try {
      const params = request.only('mechanic_id');

      const sumMechanic = await HomerService.get(
        `participant-goal/sum-points?mechanic_id=${params.mechanic_id}&avaliable=0`
      );

      return response.status(200).json(sumMechanic);
    } catch (e) {
      Log.send(`${logError} - getMechanicValue Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getPendentParticipantAcceptPoint({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'participant_id', 'page', 'limit']);

      if (!params.participant_id) {
        return response.status(400).json('participant_id is required.');
      }

      if (!params.campaign_id) {
        return response.status(400).json('campaign_id is required.');
      }

      if (!params.page) {
        params['page'] = 1;
      }

      if (!params.limit) {
        params['limit'] = 15;
      }

      const data = await HomerService.get(
        `participant-accept-point/pendent/get?campaign_id=${params.campaign_id}&participant_id=${params.participant_id}&page=${params.page}&limit=${params.limit}`
      );

      return response.status(200).json(data);
    } catch (e) {
      Log.send(`${logError} - getPendentParticipantAcceptPoint Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async putParticipantAcceptPoint({ request, response }) {
    try {
      const params = request.only([
        'id',
        'campaign_id',
        'participant_id',
        'justification',
        'flag_credit',
        'points',
        'accepted_points',
        'reason_refuse',
        'accepted_automatic',
        'accepted_user_id',
        'adjustment_point_id',
        'ticket_id',
        'action_at',
        'expires_at',
        'enabled',
        'created_at',
        'updated_at'
      ]);

      const data = await HomerService.put(`participant-accept-point/put`, params);

      return response.status(200).json(data);
    } catch (e) {
      Log.send(`${logError} - putParticipantAcceptPoint Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async participantAcceptPointApproval({ request, response }) {
    try {
      const params = request.only([
        'id',
        'accepted_points',
        'accepted_automatic',
        'reason_refuse',
        'approval_participant_id'
      ]);

      const data = await HomerService.post(`participant-accept-point/approval`, params);

      return response.status(data && data.status ? data.status : 500).json(data);
    } catch (e) {
      Log.send(`${logError} - participantAcceptPointApproval Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async pointsCalculate(mechanicId) {
    try {
      let ret = {
        pointsTotal: 0,
        totalToScore: 0,
        totalScored: 0,
        total: 0,
        pointsScored: 0,
        pointsToScore: 0,
        data: [],
        status: 200
      };

      const data = await RobinService.put('transactional-point/process-mechanic', { mechanic_id: mechanicId });
      if (!data) {
        return null;
      }
      ret.status = data.status;
      ret.data = data.data;

      for (const item of data.data) {
        if (item.points > 0) {
          ret.pointsTotal += item.points;
          ret.total += 1;
          if (item.executed_at) {
            ret.totalScored += 1;
            ret.pointsScored += item.points;
          } else {
            ret.pointsToScore += item.points;
            ret.totalToScore += 1;
          }
        }
      }
      return ret;
    } catch (e) {
      Log.send(`${logError} - pointsCalculate Endpoint - ${e.message}`);
      return e.message;
    }
  }

  async getParticipantNewsBoard({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'participant_id', 'segmentation_id', 'all_segmentations']);

      if (!params) {
        return response.status(400).json('Params not found');
      }

      if (!params.campaign_id) {
        return response.status(400).json('campaign_id (campaign) is required');
      }

      if (!params.participant_id && !params.segmentation_id) {
        return response.status(400).json('participant_id or segmentation_id is required');
      }

      let parameters = `campaign_id=${params.campaign_id}`;

      if (params.participant_id) {
        parameters += `&participant_id=${params.participant_id}`;
      }

      if (params.segmentation_id) {
        parameters += `&segmentation_id=${params.segmentation_id}`;
      }

      if (params.all_segmentations) {
        parameters += `&all_segmentations=${params.all_segmentations}`;
      }

      const data = await HomerService.get(`participant-has-news-board/get?${parameters}`);

      return response.status(200).json(data);
    } catch (e) {
      Log.send(`${logError} - getParticipantNewsBoard Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async finParticipantGoal({ request, response }) {
    try {
      const params = request.only(['mechanic_id', 'participantData', 'campaign_id']);
      let ObjectReturn = [];

      if (!params.mechanic_id || !params.participantData) {
        return response.status(400).json('You need inform mechanic id and participant data');
      }
      let participant = [];
      let query = `mechanic-segmentation/get?enabled=${1}&mechanic_id=${params.mechanic_id}`;

      const segmentations = await JarvisService.get(query);

      if (segmentations.data) {
        for (const item of segmentations.data) {
          query = `participant-goal/participant-segmentation/get?segmentation_id=${item.segmentation_id}&campaign_id=${params.mechanic_id}&participantData=${params.participantData}`;
          const data = await HomerService.get(query);
          if (data && data.status == 200) {
            participants.push(data.data);
          }
        }
      }

      if (participants.length > 0) {
        let query = `mechanic/${params.mechanic_id}`;
        const mechanic = await JarvisService.get(query);
        for (let participant of participants) {
          participant.mensured = false;
          if (goals.data || goals.data.length > 0) {
            for (const goal of goals.data) {
              if (
                goal.participant_id == participant[0].participant_id && goal.segmentation_id == participant[0].segmentation_id
              ) {
                participant.mensured = true;
                ObjectReturn.push(goal);
              }
            }
          }

          if (!participant.mensured) {
            ObjectReturn.push({
              participant_id: participant[0].participant_id,
              mechanic_id: params.mechanic_id,
              segmentation_id: participant[0].segmentation_id,
              goal: mechanic.data.mechanicGoals[0].quantity,
              result: 0,
              position: null,
              points: mechanic.data.mechanicGoals[0].score,
              executed_at: null,
              avaliable_on: null,
              expires_in: null
            });
          }
        }
      }

      return response.status(200).json(ObjectReturn);
    } catch (e) {
      Log.send(`${logError} - getParticipantGoal Endpoint - ${e.message}`);
      return e.message;
    }
  }

  async getGDERanking({ request, response }) {
    try {
      const params = request.only(['participant_id', 'campaign_id']);

      if (!params.participant_id) {
        return response.status(400).json('Missing participant_id');
      }

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id');
      }

      const participant = await HomerService.get(
        `participant-mechanic-totals/getForRanking?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}`
      );

      if (participant.status === 500) {
        return response.status(404).json('Participant not found on ranking.');
      }

      return response.status(200).json(participant);
    } catch (e) {
      Log.send(`${logError} getGDERanking Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async validateCPFOrCNPJ({ request, response }) {
    try {
      const params = request.only(['document', 'campaign_id']);
      if (!params.document) {
        return response.status(400).json('Missing CPF.');
      }

      let validDocument = {};
      validDocument.status = false;

      if (params.document.length == 11) {
        validDocument = await ValidationService.verifyCPF(params.document, params.campaign_id);
        if (!validDocument.status) {
          return response.status(400).json(validDocument);
        }
      }

      if (params.document.length == 14) {
        validDocument = await ValidationService.verifyCNPJ(params.document, params.campaign_id);
        if (!validDocument.status) {
          return response.status(400).json(validDocument);
        }
      }

      if (!validDocument.status) {
        return response.status(400).json('Invalid Document');
      }

      return response.status(200).json(validDocument);
    } catch (e) {
      Log.send(`${logError} - ValidateCPF Endpoint - ${e.message}`);
      return e.message;
    }
  }

  async participantSurveyAnswerPost({ request, response }) {
    try {
      let params = request.body[0];

      if (!params.participant_id) {
        return response.status(400).json('Missing participant_id parameter.');
      }

      if (!params.answer_id) {
        return response.status(400).json('Missing answer_id parameter.');
      }

      if (!params.survey_id) {
        return response.status(400).json('Missing survey_id parameter.');
      }

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id parameter.');
      }

      if (!params.scheduled_survey_id) {
        return response.status(400).json('Missing scheduled_survey_id parameter.');
      }

      params.answer_round_at = momenttz().tz('America/Sao_paulo').format();

      const res = await HomerSimpsonService.put(`participant-survey-answer/put`, params);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} participantSurveyAnswerPost Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async participantSurveyAnswerDelete({ request, params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Missing id parameter.');
      }

      const res = await HomerSimpsonService.delete(`participant-survey-answer/${params.id}`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} participantSurveyAnswerDelete Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async participantSurveyAnswerAll({ request, response }) {
    try {
      const res = await HomerSimpsonService.get(`participant-survey-answer/all`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} participantSurveyAnswerAll Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async participantSurveyAnswerGet({ request, response }) {
    try {
      const params = request.only(['id', 'participant_id', 'answer_id', 'survey_id', 'campaign_id', 'survey_question', 'answer_round_at', 'scheduled_survey_id', 'config', 'enabled']);

      const stringParams = querystring.stringify(params);

      const res = await HomerSimpsonService.get(`participant-survey-answer/get?${stringParams}`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} participantSurveyAnswerGet Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async participantSurveyAnswerPut({ request, response }) {
    try {
      const params = request.body[0];

      if (!params.id) {
        return response.status(400).json('Missing id parameter.');
      }

      params.answer_round_at = momenttz().tz('America/Sao_paulo').format();;

      const res = await HomerSimpsonService.put('participant-survey-answer/put', params);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} - participantSurveyAnswerPut Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async participantSurveyAnswerFind({ params, response }) {
    try {

      if (!params.id) {
        return response.status(400).json('Missing id parameter.');
      }

      const res = await HomerSimpsonService.get(`participant-survey-answer/${params.id}`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} participantSurveyAnswerFind Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getParticipantByToken({ request, response }) {
    try {
      const params = request.only(['participant_uid', 'participant_id']);
      let participant;
      if (!params.participant_uid && !params.participant_id) {
        return response.status(400).json('Missing participant_identifier');
      }

      if (params.participant_uid) {
        participant = await HomerService.get(`participant/token/get?participant_uid=${params.participant_uid}`);
      } else {
        participant = await HomerService.get(`participant/token/get?participant_id=${params.participant_id}`);
      }
      if (participant.status !== 200) {
        return response.status(participant.status).json(participant);
      }

      let query = `participant-segmentation/get?participant_id=${participant.data.participant.id}&campaign_id=${participant.data.campaign_id}&enabled=1`;

      const segmentation = await HomerService.get(query);

      const segmentationsName = [];

      for (let seg of segmentation.data) {
        let segmentations = await XavierService.get(`segmentation/${seg.segmentation_id}`);
        segmentationsName.push(segmentations.data);
      }

      const responseData = {
        participant: {
          id: participant.data.participant_id,
          name: participant.data.participant.name,
          surname: participant.data.participant.surname,
          document: participant.data.participant.document,
          email: participant.data.email,
          leader: participant.data.leader,
          enabled: participant.data.enabled,
          config: participant.data.config,
          segmentations: segmentationsName
        }
      };

      return response.status(participant.status).json(responseData);
    } catch (e) {
      Log.send(`${logError} getParticipantByToken - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async ParticipantQuizResultsGet({ request, response }) {
    try {
      const params = request.only([
        'campaign_id',
        'mechanic_id',
        'participant_id',
        'page',
        'perPage'
      ]);

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id');
      }

      if (!params.mechanic_id) {
        return response.status(400).json('Missing mechanic_id');
      }

      if (!params.participant_id) {
        return response.status(400).json('Missing participant_id');
      }

      const participantHasCampaign = await HomerService.get(`participant-campaign/get?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}&enabled=1`);

      if (!participantHasCampaign) {
        return response.status(400).json('Participant does not belong to specified campaign');
      }

      if (!params.page) {
        params.page = 1;
      }
      if (!params.perPage) {
        params.perPage = 10;
      }

      /* A parte abaixo busca as respostas dadas pelo participante e a lista de perguntas da mechanic quiz*/
      const paramsQuizQuestions = {};
      paramsQuizQuestions.mechanic_id = params.mechanic_id;
      paramsQuizQuestions.campaign_id = params.campaign_id;
      paramsQuizQuestions.enabled = 1;
      paramsQuizQuestions.page = params.page;
      paramsQuizQuestions.perPage = params.perPage;

      const stringParamsQuizQuestions = querystring.stringify(paramsQuizQuestions);

      const mechanicQuizQuestions = await JarvisService.get(`mechanic-quiz-paginated/get?${stringParamsQuizQuestions}`);

      const paramsQuizAnswers = {};
      let participantAnswers = [];

      for (let mechanicQuizQuestion of mechanicQuizQuestions.data.data) {
        paramsQuizAnswers.mechanic_quiz_id = mechanicQuizQuestion.id;
        paramsQuizAnswers.campaign_id = params.campaign_id;
        paramsQuizAnswers.participant_id = params.participant_id;
        paramsQuizAnswers.enabled = 1;

        const stringParamsQuizAnswers = querystring.stringify(paramsQuizAnswers);

        let participantAnswer = await HomerService.get(`participant-quiz-answer/get?${stringParamsQuizAnswers}`);
        participantAnswers.push(participantAnswer);
      }

      /* O código abaixo monta as informações necessárias para a exibição no front pela variável finalResponse
      Se o participante não tiver respostas é retornando o finalResponse vazio*/
      let finalResponse = {};
      if (!participantAnswers[0].data.length) {
        return response.status(200).json(finalResponse);
      }

      const mechanic = await JarvisService.get(`mechanic/${params.mechanic_id}`);

      const mechanicGoal = mechanic.data.mechanicGoals;
      const quantity = mechanicGoal[0].quantity;
      const points = mechanicGoal[0].score;

      const queryGoal = querystring.stringify({
        participant_id: params.participant_id,
        mechanic_id: params.mechanic_id,
        enabled: 1
      });
      let participantGoal = await HomerService.get(`participant-goal/get?${queryGoal}`);

      delete paramsQuizQuestions.page;
      delete paramsQuizQuestions.perPage;
      const stringParamsQuizForCount = querystring.stringify(paramsQuizQuestions);
      const mechanicQuizForCount = await JarvisService.get(`mechanic-quiz/get?${stringParamsQuizForCount}`);

      /* O bloco for abaixo foi necessário para pegar a contagem de todas as repostas corretas
      para exibição, independente da paginação.*/
      finalResponse.correct_answers = 0;
      finalResponse.incorrect_answers = 0;
      const paramsQuizCorrectAnswers = {};
      for (let mechanicQuizCount of mechanicQuizForCount.data) {
        paramsQuizCorrectAnswers.mechanic_quiz_id = mechanicQuizCount.id;
        paramsQuizCorrectAnswers.campaign_id = params.campaign_id;
        paramsQuizCorrectAnswers.participant_id = params.participant_id;
        paramsQuizCorrectAnswers.enabled = 1;

        const stringParamsQuizCorrectAnswers = querystring.stringify(paramsQuizCorrectAnswers);

        let participantAnswer = await HomerService.get(`participant-quiz-answer/get?${stringParamsQuizCorrectAnswers}`);
        if (participantAnswer.data[0].flag_correct_answer) {
          finalResponse.correct_answers++;
        } else {
          finalResponse.incorrect_answers++;
        }
      }

      if (!participantGoal.data.length) {
        finalResponse.total_points_earned = 0;
      } else {
        finalResponse.total_points_earned = participantGoal.data[0].points;
      }
      finalResponse.results = [];
      let count = 0;
      for (let participantAnswer of participantAnswers) {
        const mechanicQuizQuestion = await JarvisService.get(`mechanic-quiz/${participantAnswer.data[0].mechanic_quiz_id}`);
        const mechanicQuizCorrectAnswer = await JarvisService.get(`mechanic-quiz-answer/get?mechanic_quiz_id=${participantAnswer.data[0].mechanic_quiz_id}&flag_correct_answer=1`);

        finalResponse.results.push({});
        finalResponse.results[count].id = participantAnswer.data[0].mechanic_quiz_id;
        finalResponse.results[count].points_earned = points;
        finalResponse.results[count].question = mechanicQuizQuestion.data.question;
        finalResponse.results[count].answer = participantAnswer.data[0].answer;
        if (participantAnswer.data[0].flag_correct_answer) {
          finalResponse.results[count].correct_answer = null;
        } else {
          finalResponse.results[count].correct_answer = mechanicQuizCorrectAnswer.data[0].answer;
          finalResponse.results[count].points_earned = 0;
        }
        finalResponse.results[count].correct = participantAnswer.data[0].flag_correct_answer;

        count++;
      }

      finalResponse.lastPage = mechanicQuizQuestions.data.lastPage;
      finalResponse.page = mechanicQuizQuestions.data.page;
      finalResponse.perPage = mechanicQuizQuestions.data.perPage;
      finalResponse.total = mechanicQuizQuestions.data.total;

      return response.status(200).json(finalResponse);
    } catch (e) {
      Log.send(`${logError} ParticipantQuizResultsGet Endpoint - ${e.message} - params: ${querystring.stringify(request.only([
        'campaign_id',
        'mechanic_id',
        'participant_id',
        'page',
        'perPage'
      ]))}`);
      return response.status(500).json(e.message);
    }
  }

  async ParticipantQuizAnswersPost({ request, response }) {
    try {
      const params = request.only([
        'campaign_id',
        'mechanic_id',
        'participant_id',
        'participant_answers'
      ]);

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id');
      }

      if (!params.mechanic_id) {
        return response.status(400).json('Missing mechanic_id');
      }

      if (!params.participant_id) {
        return response.status(400).json('Missing participant_id');
      }

      if (!params.participant_answers) {
        return response.status(400).json('Missing participant_answers');
      }

      const participantHasCampaign = await HomerService.get(`participant-campaign/get?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}&enabled=1`);

      if (!participantHasCampaign.data.length) {
        return response.status(400).json('Participant does not belong to specified campaign');
      }

      const mechanic = await JarvisService.get(`mechanic/${params.mechanic_id}`);

      const today = DateTime.local().toISO();
      if (mechanic.data.end_at < today || mechanic.data.begin_at > today) {
        return response.status(400).json('Mecânica fora da data de resposta.');
      }

      const paramsQuizAnswers = {};
      paramsQuizAnswers.mechanic_quiz_id = params.participant_answers[0].question;
      paramsQuizAnswers.campaign_id = params.campaign_id;
      paramsQuizAnswers.participant_id = params.participant_id;
      paramsQuizAnswers.enabled = 1;

      const stringParamsQuizAnswers = querystring.stringify(paramsQuizAnswers);

      let participantAnswer = await HomerService.get(`participant-quiz-answer/get?${stringParamsQuizAnswers}`);
      if (participantAnswer.data.length) {
        return response.status(400).json('Quiz já respondido pelo participante.');
      }

      /* O bloco abaixo realiza o cálculo de respostas corretas dadas pelo participante */
      let correctAnswers = 0;
      for (let participant_answer of params.participant_answers) {
        params.mechanic_quiz_id = participant_answer.question;
        params.answer_id = participant_answer.answer;
        params.flag_correct_answer = false;

        const answer = await JarvisService.get(`mechanic-quiz-answer/${participant_answer.answer}`);

        params.answer = answer.data.answer;

        if (answer.data.flag_correct_answer) {
          params.flag_correct_answer = true;
          correctAnswers++;
        }

        await HomerService.put('participant-quiz-answer/put', params);
      }

      /* O código abaixo faz a distribuição dos pontos recebidos pelo acerto de perguntas do quiz,
      Ele é baseado nos endpoints de participant-goals/save-goals e participant-goals/send-queue
      que fazem inserções através da participant-goal/put e transactional-point/insert-queue,
      Para essa mecânica o participante não deve ter entrada ainda na participant_goals
      quando as respostas são enviadas, por isso não tem uma busca dos goals antes de salvar.
      Mecânica de quiz não possui mensuração, os pontos são enviados por resposta correta.*/

      const mechanicGoal = mechanic.data.mechanicGoals;
      const quantity = mechanicGoal[0].quantity;
      const points = mechanicGoal[0].score;
      const participant_id = params.participant_id;

      const querySegmentation = querystring.stringify({
        participant_id: params.participant_id,
        campaign_id: params.campaign_id,
        enabled: 1
      });

      const participantSegmentation = await HomerService.get(`participant-segmentation/last/get?${querySegmentation}`);

      if (!participantSegmentation.data) {
        return response.status(404).json('Segmentação do participante não foi encontrada');
      }

      let result = correctAnswers;
      const goal = quantity;
      const segmentation_id = participantSegmentation.data.segmentation_id;
      const mechanic_id = params.mechanic_id;
      let item = {};

      item.participant_id = participant_id;
      item.segmentation_id = segmentation_id;
      item.mechanic_id = mechanic_id;
      item.points = correctAnswers * points;
      item.result = result;
      item.goal = quantity;

      const participantGoal = await HomerService.put('participant-goal/put', item);

      if (goal <= result) {
        item.executed_at = today;
        await RobinService.post('transactional-point/insert-queue', { participant_goal_id: participantGoal.data.id });
      }

      return response.status(200).json('Perguntas analisadas com sucesso.');
    } catch (e) {
      Log.send(`${logError} - ParticipantQuizAnswersPost Endpoint - ${e.message} - params: ${querystring.stringify(request.only([
        'campaign_id',
        'mechanic_id',
        'participant_id',
        'participant_answers'
      ]))}`);
      return response.status(500).json(e.message);
    }
  }

  async qrcodeTokenProcess({ request, response }) {
    try {
      let params = request.only(['participant_id', 'campaign_id', 'token', 'invoice_url', 'invoice_key', 'invoice_value', 'mechanic_id']);

      if (!params.token) {
        return response.status(400).json('Missing token parameter.');
      }

      if (!params.participant_id) {
        return response.status(400).json('Missing participant_id parameter.');
      }

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id parameter.');
      }

      if (!params.mechanic_id) {
        return response.status(400).json('Missing mechanic_id parameter.');
      }

      if (!params.invoice_url) {
        return response.status(400).json('Missing invoice_url parameter.');
      }

      if (!params.invoice_key) {
        return response.status(400).json('Missing invoice_key parameter.');
      }

      if (!params.invoice_value) {
        return response.status(400).json('Missing invoice_value parameter.');
      }

      const mechanicParams = querystring.stringify({
        campaign_id: params.campaign_id,
        token: params.token,
        mechanic_id: params.mechanic_id,
        enabled: 1
      });

      const tokenInfo = await JarvisService.get(`mechanic-token/getSingle?${mechanicParams}`);

      if (!tokenInfo.data) {
        return response.status(400).json('Token invalid or already used.');
      }

      let mediaParams = {};
      mediaParams.src = params.invoice_url;
      const media = await HomerSimpsonService.put('media/put', mediaParams);

      params.token_id = tokenInfo.data.id;
      params.mechanic_id = tokenInfo.data.mechanic_id;
      params.media_id = media.data.id;
      const participantMechanicToken = await HomerSimpsonService.put('participant-mechanic-token/put', params);

      let participantHasMediaParams = {};
      participantHasMediaParams.participant_id = params.participant_id;
      participantHasMediaParams.participant_upload_id = params.participant_id;
      participantHasMediaParams.media_id = media.data.id;
      participantHasMediaParams.mechanic_id = params.mechanic_id;
      await HomerSimpsonService.put('participant-has-media/put', participantHasMediaParams);

      const id = params.token_id;
      const participant_id = params.participant_id;
      const tokenDeactivationParams = {
        id,
        participant_id
      };
      const tokenDeactivation = await JarvisService.put('mechanic-token-use/put', tokenDeactivationParams);

      if (tokenDeactivation.status != 200) {
        return response.status(400).json(`Error on token deactivation: ${tokenDeactivation.data}`);
      }

      return response.status(200).json(participantMechanicToken);
    } catch (e) {
      Log.send(`${logError} - qrcodeTokenProcess Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async qrcodeTokenDelete({ request, params, response }) {
    try {
      if (!params.id) {
        return response.status(400).json('Missing id parameter.');
      }

      const res = await HomerSimpsonService.delete(`participant-mechanic-token/${params.id}`);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} qrcodeTokenDelete Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async qrcodeTokenStatus({ request, response }) {
    try {
      const params = request.only(['participant_id', 'campaign_id', 'page', 'limit', 'dateFrom', 'dateTo', 'mechanic_id']);

      if (!params.participant_id) {
        return response.status(400).json('Missing participant_id parameter.');
      }

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id parameter.');
      }

      if (!params.mechanic_id) {
        return response.status(400).json('Missing mechanic_id parameter.');
      }

      if (!params.page) {
        params.page = 1;
      }

      const stringParams = querystring.stringify(params);

      let results = await HomerSimpsonService.get(`participant-mechanic-token/get?${stringParams}`);

      results = results.data;

      results.total_qrcodes = 0;
      delete results.data.total;

      let qrcodes = [];

      const mechanic = await JarvisService.get(`mechanic/${params.mechanic_id}`);

      /* O bloco abaixo bate os ids de participant_goal com os da transactional_point, para verificar
      se o qrcode já foi processado e soma os valores dos pontos dos qrcodes que bateram a meta para exibição.*/
      results.total_points = 0;
      for (let result of results.data) {

        const mediaInfo = await HomerService.get(`media/${result.media_id}`);
        if (mediaInfo.data.status == 0) {
          result.status = 'error';
        } else {

          if (result.participant_goal) {
            result.status = 'validated';

            results.total_qrcodes += 1;

            if (result.participant_goal.goal >= result.participant_goal.result) {
              results.total_points += result.participant_goal.points;

              const queryTransactional = querystring.stringify({ participant_goal_id: result.participant_goal.id });
              const transactional = await RobinService.get(`transactional-point/get?${queryTransactional}`);

              if (!transactional.data) {
                result.status = 'pending';
                results.total_qrcodes -= 1;
                results.total_points -= result.participant_goal.points;
              }
            }
          } else {
            result.status = 'pending';
          }
        }

        let finalObject = {};
        finalObject.id = result.id;
        finalObject.date = DateTime.fromISO(result.computed_at);
        finalObject.tax_key = result.invoice_key;
        finalObject.total_points_qrcode = mechanic.data.mechanicGoals[0].score;
        finalObject.status = result.status;
        qrcodes.push(finalObject);
      }

      const finalResult = {};

      finalResult.page = results.page;
      finalResult.perPage = results.perPage;
      finalResult.lastPage = results.lastPage;
      finalResult.data = {};
      finalResult.data.total_points = results.total_points;
      finalResult.data.total_qrcodes = results.total_qrcodes;
      finalResult.data.qrcodes = qrcodes;

      return response.status(200).json(finalResult);
    } catch (e) {
      Log.send(`${logError} qrcodeTokenStatus Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async updateCnpj({ request, response }) {
    try {
      const params = request.only(['participants']);

      const res = await HomerSimpsonService.post(`update-cnpj`, params);

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`${logError} updateCnpj Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getCopaKOFRanking({ request, response }) {
    try {
      const params = request.only(['participant_id', 'campaign_id']);

      if (!params.participant_id) {
        return response.status(400).json('Missing participant_id');
      }

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id');
      }

      let finalResponse = {};

      const mechanicTypeAlias = 'copa_kof';

      const participantSegmentations = await HomerService.get(`participant-segmentation/tree/get?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}`);

      let filters = {
        segmentation_id: participantSegmentations.data[0].segmentation_id,
        alias: mechanicTypeAlias
      };

      const filterString = querystring.stringify(filters);

      //Busca as mecânicas copa kof atrelada a segmentação do participante
      const mechanic = await JarvisService.get(`mechanic/segmentation-alias/get?${filterString}`);

      if (mechanic.status != 200) {
        Log.send(`Mechanic not found - getCopaKOFRanking Endpoint - params: ${querystring.stringify(request.only([
          'participant_id',
          'campaign_id'
        ]))}`);
        return response.status(404).json(finalResponse);
      }

      filters.segmentation_id = participantSegmentations.data[1].segmentation_id;
      const regionalFilters = querystring.stringify({
        ...filters,
        sub_mechanic: 1
      });
      const regionalMechanic = await JarvisService.get(`mechanic/segmentation-alias/get?${regionalFilters}`);

      if (regionalMechanic.status != 200) {
        Log.send(`Regional Mechanic not found - getCopaKOFRanking Endpoint - params: ${querystring.stringify(request.only([
          'participant_id',
          'campaign_id'
        ]))}`);
        return response.status(404).json(finalResponse);
      }

      filters.segmentation_id = participantSegmentations.data[2].segmentation_id;
      const gvFilters = querystring.stringify({
        ...filters,
        sub_mechanic: 1
      });
      const gvMechanic = await JarvisService.get(`mechanic/segmentation-alias/get?${gvFilters}`);

      if (gvMechanic.status != 200) {
        Log.send(`GV Mechanic not found - getCopaKOFRanking Endpoint - params: ${querystring.stringify(request.only([
          'participant_id',
          'campaign_id'
        ]))}`);
        return response.status(404).json(finalResponse);
      }

      const parentMechanicId = mechanic.data.id;
      const middleMechanicId = regionalMechanic.data.id;
      const intermediateMechanicId = gvMechanic.data.id;

      const gvTotals = await HomerService.get(
        `participant-mechanic-totals/getForCopaKOFRanking?parent_mechanic_id=${parentMechanicId}&middle_mechanic_id=${middleMechanicId}&intermediate_mechanic_id=${intermediateMechanicId}&campaign_id=${params.campaign_id}`
      );

      if (gvTotals.status != 200) {
        Log.send(`Ranking not found - getCopaKOFRanking Endpoint - params: ${querystring.stringify(request.only([
          'participant_id',
          'campaign_id'
        ]))}`);
        return response.status(404).json(finalResponse);
      }

      finalResponse.segmentation = gvTotals.data[0].parentMechanic;
      finalResponse.regional = gvTotals.data[0].regionalMechanic;
      finalResponse.ranking = [];
      let count = 0;
      for (let gvTotal of gvTotals.data) {
        finalResponse.ranking.push({});
        finalResponse.ranking[count].position = gvTotal.position;
        finalResponse.ranking[count].gv_name = gvTotal.gvMechanic;
        finalResponse.ranking[count].coupon_total = gvTotal.totals;
        count++;
      }

      return response.status(200).json(finalResponse);
    } catch (e) {
      Log.send(`${logError} getCopaKOFRanking Endpoint - ${e.message} - params: ${querystring.stringify(request.only([
        'participant_id',
        'campaign_id'
      ]))}`);
      return response.status(500).json(e.message);
    }
  }

  async getParticipantPageViewed({ request, response }) {
    try {
      const { code, participant_id, campaign_id } = request.only(['code', 'participant_id', 'campaign_id']);

      if (!code) {
        return response.status(400).json('Missing "code" parameter.');
      }

      if (!participant_id) {
        return response.status(400).json('Missing "participant_id" parameter.');
      }

      if (!campaign_id) {
        return response.status(400).json('Missing "campaign_id" parameter.');
      }

      const menu_page_campaign = await XavierService.get(`menu-page/get?code=${code}`);

      const participant_has_campaign = await HomerSimpsonService.get(
        `participant-campaign/get?participant_id=${participant_id}&campaign_id=${campaign_id}`
      );

      const params = {
        menu_page_campaign_id: menu_page_campaign.data[0].id,
        participant_has_campaign_id: participant_has_campaign.data[0].id
      };

      const result = await HomerSimpsonService.put('participant-page-viewed/put', params);

      return response.status(200).json(result);
    } catch (e) {
      Log.send(
        `${logError} updateCnpj Endpoint - ${e.message} - ${querystring.stringify(
          request.only(['code', 'participant_id', 'campaign_id'])
        )}`
      );
      return response.status(500).json(e.message);
    }
  }

  async postParticipantGoal({ request, response }) {
    try {
      const params = request.only(['token', 'document', 'mechanic', 'result', 'goal', 'position']);

      const campaign_select = 103;

      if (!params.token) {
        return response.status(400).json({ tpErro: 1, mensagem: 'Missing token parameter.' });
      }

      if (!params.document) {
        return response.status(400).json({ tpErro: 1, mensagem: 'Missing document parameter.' });
      }

      if (!params.mechanic) {
        return response.status(400).json({ tpErro: 1, mensagem: 'Missing mechanic parameter.' });
      }

      if (!params.result) {
        return response.status(400).json({ tpErro: 1, mensagem: 'Missing result parameter.' });
      }

      if (params.position < 0) {
        return response.status(400).json({ tpErro: 1, mensagem: 'Invalid value.' });
      }

      const resultParticipant = await HomerSimpsonService.get(
        `participant-document/get?${querystring.stringify({ document: params.document })}`
      );

      if (resultParticipant.data.length === 0) {
        return response.status(400).json({ tpErro: 1, mensagem: 'Participant not found.' });
      }

      const resultMechanic = await JarvisService.get(
        `mechanic/get?${querystring.stringify({ name: params.mechanic, campaign_id: campaign_select })}`
      );

      if (resultMechanic.data.length === 0) {
        return response.status(400).json({ tpErro: 1, mensagem: 'Mechanic not found.' });
      }

      const { data } = await XavierService.get(`campaign/get-tmp?id=${campaign_select}`);

      if (data.data.length === 0) {
        return response.status(400).json({ tpErro: 1, mensagem: 'Campaign not found.' });
      }

      if (data.data[0].campaign_uid !== params.token) {
        return response.status(401).json({ tpErro: 1, mensagem: 'Invalid Token!' });
      }

      const query = {
        mechanic_id: resultMechanic.data[0].id,
        participant_id: resultParticipant.data.id,
        result: params.result,
        goal: params.goal,
        position: params.position,
        token: params.token,
        mechanic_type_id: resultMechanic.data[0].mechanic_type_id,
        campaign_select
      };

      const resultJarvis = await JarvisService.put(
        `customer/participant-goal/put?${querystring.stringify(query)}`
      );

      return response.status(200).json(resultJarvis);
    } catch (e) {
      Log.send(
        `${logError} postParticipantGoal Endpoint - ${e.message} - ${querystring.stringify(
          request.only(['token', 'document', 'mechanic', 'result', 'goal', 'position'])
        )}`
      );
      return response.status(500).json({ tpErro: 1, message: e.message });
    }
  }

  async participantHasDistributor({ request, response }) {
    const params = request.only(['distributor_id', 'campaign_id', 'participants']);

    if (!params.distributor_id) {
      return response.status(400).json({ message: 'Distributor ID not entered' });
    }

    if (!params.campaign_id) {
      return response.status(400).json({ message: 'Campaign ID not entered' });
    }

    if (!params.participants) {
      return response.status(400).json({ message: 'Participants not entered' });
    }

    if (!params.participants[0]) {
      return response.status(400).json({ message: 'No participant informed' });;
    }


    const distributorNotExist = await HomerService.get(`distributor/${params.distributor_id}`);

    if (distributorNotExist.status != 200) {
      return response.status(400).json({ message: 'Distributor not found' });
    }

    if (distributorNotExist.data.campaign_id != params.campaign_id) {
      return response.status(400).json({ message: 'distributor does not belong to this campaign' });
    }

    const campaignNotExist = await XavierService.get(`campaign/${params.campaign_id}`);

    if (campaignNotExist.status != 200) {
      return response.status(400).json({ message: 'Campaign not found' });
    }

    const update = await HomerService.put('distributor-participants', params);

    return response.status(update.status).json(update);

  }

  async distributors({ request, response }) {
    try {
      const { campaign_id } = request.only(['campaign_id']);

      if (!campaign_id) {
        return response.status(400).json({ message: 'Campaign ID not entered' });
      }

      const campaignNotExist = await XavierService.get(`campaign/${campaign_id}`);

      if (campaignNotExist.status != 200) {
        return response.status(400).json({ message: 'Campaign not found' });
      }

      const distributors = await HomerService.get(
        `distributors?campaign_id=${campaign_id}`
      );

      return response.status(distributors.status).json(distributors);
    } catch (e) {
      Log.send(`${logError} distributors Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async postParticipantHasProductAlert({ request, response }) {
    try {
      const params = request.only([
        'product_id',
        'marketplace_product_id',
        'participant_id',
        'campaign_id',
        'enabled'
      ]);

      const campaign = await XavierService.post(
        `campaign/get?id=${params.campaign_id}`
      );

      if(!params.campaign_id || campaign.status != 200) {
        return response.status(400).json({ message: 'O parâmetro campaign_id não foi inserido ou é inválido.' });
      }

      const product = await PabloService.get(
        `product/${params.product_id}`
      );
      if(!params.product_id || product.status != 200) {
        return response.status(400).json({ message: 'O parâmetro product_id não foi inserido ou é inválido.' });
      }

      if(!params.marketplace_product_id || product.data.marketplaceProduct.id != params.marketplace_product_id) {
        return response.status(400).json({ message: 'O parâmetro marketplace_product_id não foi inserido ou é inválido.' });
      }

      const participant = await HomerService.get(
        `participant/${params.participant_id}`
      );

      if(!params.participant_id || participant.status != 200) {
        return response.status(400).json({ message: 'O parâmetro participant_id não foi inserido ou é inválido.' });
      }

      if(isNaN(params.enabled) || params.enabled > 1 || params.enabled < 0) {
        return response.status(400).json({ message: 'O parâmetro enabled não foi inserido ou é inválido.' });
      }

      const participantHasProductAlert = await HomerService.post(
        `participant-has-product-alert/create?${querystring.stringify(params)}`
      );
      if (participantHasProductAlert.status != 200) {
        return response.status(participantHasProductAlert.status).json({ message: participantHasProductAlert.data });
      }

      return response.status(participantHasProductAlert.status).json({ data: participantHasProductAlert.data });
    } catch(e) {
      Log.send(`${logError} Create ParticipahtHasProductAlert Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getParticipantHasProductAlert({ request, response }) {
    try {
      const params = request.only([
        'product_id',
        'marketplace_product_id',
        'participant_id',
        'campaign_id',
        'enabled'
      ]);

      const participantHasProductAlert = await HomerService.get(
        `participant-has-product-alert/get?${querystring.stringify(params)}`
      );

      if (participantHasProductAlert.status != 200) {
        return response.status(participantHasProductAlert.status).json({ message: participantHasProductAlert.data });
      }

      return response.status(participantHasProductAlert.status).json({ data: participantHasProductAlert.data });
    } catch(e) {
      Log.send(`${logError} Create ParticipahtHasProductAlert Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async createOrUpdateWishlist({ request, response }) {
    const body = request.only([
      'participant_id',
      'campaign_id',
      'product_id',
      'enabled'
    ]);

    try {
      const result = await HomerService.post('participant-wishlists/create-update', body );

      if (result.status == 200) {
        const msg = {
          message: result.data.enabled == 1 ? 'Added to wish list' : 'Removed from wish list'
        }

        return response.status(200).json({ enabled: result.data.enabled, ...msg });
      }

    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - HomersimpsonController - createOrUpdateWishlist Endpoint - ${e.message} - params: 
      ${new URLSearchParams(request.only(['participant_id','campaign_id','product_id','enabled']))}`);
    }
  }

  async wishlist({ request, response }) {
    const { participantId, campaignId } = request.only(['participantId', 'campaignId']);

    try {
      const result = await HomerService.get(`participant-wishlists/wishlist?participantId=${participantId}&campaignId=${campaignId}`);

      if (result.status == 200) {
        return response.status(200).json(result);
      }
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - HomersimpsonController - wishlist Endpoint - ${e.message} - params: 
      ${new URLSearchParams(request.only(['participantId','campaignId']))}`);
    }
  }

  async getSingleItem({ request, response }) {
    const { participantId, campaignId, productId } = request.only(['participantId', 'campaignId', 'productId']);

    try {
      const result = await HomerService.get(`participant-wishlists/single-item?productId=${productId}&participantId=${participantId}&campaignId=${campaignId}`);

      if (result.status == 200) {
        return response.status(200).json(result.data);
      }

    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - HomersimpsonController - getSingleItem Endpoint - ${e.message} - params: 
      ${new URLSearchParams(request.only(['participantId','campaignId','productId']))}`);
    }
  }

  async multifactorAuthentication({ request, response }) {
    try {
      const params = request.only(['login', 'mfa_password', 'campaign_id']);
      const partHasCampaign = await HomerService.get(`participant/login-info/get?login=${params.login}&campaign_id=${params.campaign_id}`);
      if (partHasCampaign.data.MFA_tries > 3){
        this.multifactorAuthenticationSendCode(params.login, params.campaign_id);
      }
      if (!params.campaign_id || !params.login || !params.mfa_password) {
        return response.status(400).json({ message: 'Login ou id da campanha ou senha mfa não informados.' });
      }
      
      const { data: campaignHasUnifiedLogin } = await XavierService.get(`campaign-has-config/get?campaign_id=${params.campaign_id}&config_key=unifiedLogin`);
      if (campaignHasUnifiedLogin.value && (JSON.parse(campaignHasUnifiedLogin.value)).unifiedLogin == true) {
        const { data: participantHasCampaign } = await HomerSimpsonService.get(`participant/get-by-login/get?login=${params.login}`);
        params.campaign_id = participantHasCampaign[0][0].campaign_id
      }

      const participant = await HomerService.get(`participant/login-info/get?login=${params.login}&campaign_id=${params.campaign_id}`);
      if (participant.data.fail) {
        return response.status(404).json({ message: 'Não foi possível validar o participante' });
      }

      if(participant.data.mfa_creation_date){
        let mfaDate = luxon.DateTime.fromISO(participant.data.mfa_creation_date);
        const diff = luxon.Interval.fromDateTimes(mfaDate , luxon.DateTime.local());
        const diffMinutes = diff.length('minutes');
        if(diffMinutes > 5){
          return response.status(404).json({ message: 'Senha expirada.' });
        }else{
          let validPassword = await HomerService.post(`mfa-compare/post`, {
            encripted_password: participant.data.mfa_password,
            mfa_password:params.mfa_password
          });
          if(validPassword.status == 200 && validPassword.data){
            let participantHasCampaign = {
              id: participant.data.id,
              mfa_login_date:luxon.DateTime.local(),
              MFA_tries: 0
            };
            await HomerService.put(`participant-campaign/put`, participantHasCampaign);
            return response.status(200).json({ data: { message: 'MFA validada com sucesso' } });
          }else{
            partHasCampaign.data.MFA_tries = partHasCampaign.data.MFA_tries + 1;
            let participantHasCampaign = {
              id: partHasCampaign.data.id,
              MFA_tries: partHasCampaign.data.MFA_tries
            };
            await HomerService.put(`participant-campaign/put`, participantHasCampaign);
            return response.status(400).json({ message: 'Senha errada ou inválida.' });
          }
        }
      }else{
        return response.status(404).json({ message: 'Não existe senha gerada para o participante, ou última data de criação é inválida.' });
      }
    } catch (e) {
      Log.send(`${logError} HomersimpsonController - multifactorAuthentication Endpoint - ${e.message} - params:
      ${new URLSearchParams(request.only(['campaign_id','login', 'mfa_password']))}`);
      return response.status(500).json({ message: e.message });
    }
  }

  async multifactorAuthenticationSendCode({ request, response }) {
    try {
      let params = request.only(['login', 'campaign_id']);

      if (!params.campaign_id || !params.login) {
        return response.status(400).json({ message: 'Login ou id da campanha não informados.' });
      }
      const { data: campaignHasUnifiedLogin } = await XavierService.get(`campaign-has-config/get?campaign_id=${params.campaign_id}&config_key=unifiedLogin`);

      if (campaignHasUnifiedLogin.value && (JSON.parse(campaignHasUnifiedLogin.value)).unifiedLogin == true) {
        const { data: participantHasCampaign } = await HomerSimpsonService.get(`participant/get-by-login/get?login=${params.login}`);
        params.campaign_id = participantHasCampaign[0][0].campaign_id
      }

      const participant = await HomerService.get(`participant/login-info/get?login=${params.login}&campaign_id=${params.campaign_id}`);
      if (participant.data.fail) {
        return response.status(404).json({ message: 'Não foi possível validar o participante' });
      }

      const newPassword = ('0000' + Math.floor(Math.random() * (9999))).slice(-4);

      let mfa_password = await HomerService.post(`mfa-encription/post`, { mfa_password:newPassword });

      let participantHasCampaign = {
        id: participant.data.id,
        mfa_password: mfa_password.data.encripted_password,
        mfa_creation_date:luxon.DateTime.local(),
        MFA_tries: 0
      };

      await HomerService.put(`participant-campaign/put`, participantHasCampaign);

      const emailObj = {};
      const emailConfig = {
        ParticipantName: participant.data.participant.name,
        Mfa_Cod: newPassword
      };

      emailObj.campaign = params.campaign_id;
      emailObj.drive = Env.get('EMAIL_DRIVE');
      emailObj.from = Env.get('EMAIL_SENDER');
      emailObj.template = 'EnvioSenhaMFA';
      emailObj.variables = emailConfig;
      emailObj.to = participant.data.email;
      emailObj.variables = emailConfig;
      let emailResponse = await JaiminhoService.post('send', emailObj);

      Log.send(`multifactorAuthenticationSendCode Endpoint - MFA enviado para o participante (${params.login}), na campanha (${params.campaign_id}).`);

      if(emailResponse.status != 200){
        Log.send(`${logError} HomersimpsonController - multifactorAuthenticationSendCode Endpoint - ${emailResponse.data} - params:
        ${new URLSearchParams(request.only(['campaign_id','login']))}`);
        return response.status(500).json({ message: `Houve um problema com a geração do email. ${emailResponse.data}` });
      }

      return response.status(200).json({ data: { message: 'Código gerado com sucesso' } });
    } catch (e) {
      Log.send(`${logError} HomersimpsonController - multifactorAuthenticationSendCode Endpoint - ${e.message} - params:
      ${new URLSearchParams(request.only(['campaign_id','login']))}`);
      return response.status(500).json({ message: e.message });
    }
  }

  async getPossiblePoints({ request, response }) {
    try {
      const params = request.only(['participant_id', 'campaign_id']);

      if (!params.participant_id || !params.campaign_id) {
        return response.status(400).json(`É necessário informar o 'participant_id' e o 'campaign_id'.`);
      }
      //Load segmentations
      const segmentation_id = [];
      const segmentations = await HomerService.get(
        `participant-segmentation/get?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}`
      );
      segmentations.data.map(id => {
        segmentation_id.push(id.segmentation_id);
      });

      params.dateFrom = moment().format('YYYY-MM-DD');
      const focos = await HomerHelperService.getIndividualGoal(params);
      let mechanics = {};

      if(segmentations.data.length > 0){
        mechanics = await JarvisService.get(`mechanic-segmentation/get?enabled=${1}&segmentations=${segmentation_id}&date=${params.dateFrom}`);
      }

      if (focos.status == 404 && !mechanics.data) {
        return response.status(404).json({ message: 'O participante não possui mecânicas.' });
      }

      const mechanicsWithGoals = await HomerHelperService.loadparticipantGoals(mechanics, params.participant_id,params.campaign_id);
      const possiblePointsObject = await HomerHelperService.getPossiblePointsCalc(mechanicsWithGoals, focos, params.participant_id);

      return response.status(200).json(possiblePointsObject);
    } catch (e) {
      Log.send(`${logError} getPossiblePoints Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async externalPositivationGoalUpdate({ request, response }) {
    try {
      let params = request.only([
        'token',
        'campaignId',
        'mechanicId',
        'data'
      ]);

      if (!params.token) {
        return response.status(400).json({ message:'Faltando o parâmetro token.' });
      }

      if (!params.campaignId) {
        return response.status(400).json({ message:'Faltando parâmetro campaignId.' });
      }

      if (!params.mechanicId) {
        return response.status(400).json({ message:'Faltando o parâmetro mechanicId.' });
      }

      if (!params.data) {
        return response.status(400).json({ message:'Faltando o parâmetro data.' });
      }

      let isTokenValid = await ValidationService.validateExternalToken(params.token);

      if(!isTokenValid.status){
        return response.status(403).json({ message:isTokenValid.message });
      }

      let isCampaignMechanicValid = await ValidationService.validateCampaignMechanic(params.campaignId, params.mechanicId);

      if(!isCampaignMechanicValid.status){
        return response.status(404).json({ message:isCampaignMechanicValid.message });
      }

      HomerService.put(`positivation/goal/put`, params);

      return response.status(200).json({ data: { message: 'Atualização enviada com sucesso' } });
    } catch (e) {
      Log.send(`${logError} HomersimpsonController - externalPositivationGoalUpdate Endpoint - ${e.message} params:
      ${new URLSearchParams(request.only(['campaignId','mechanicId']))}`);
      return response.status(500).json({ message: e.message });
    }
  }

  async getListParticipantHasPdv({ request, response }) {
    try {
      const participant_id = request.participant.participant_id;
      const campaign_id = request.participant.campaign_id;

      const campaign = await XavierService.post(`campaign/get?id=${campaign_id}`);

      if(!campaign_id || isNaN(campaign_id) || campaign.status !== 200) {
        return response.status(400).json({ message: 'O parâmetro campaign_id não foi inserido ou é inválido.' });
      }

      const participantHasCampaign = await HomerService.get(
        `participant-campaign/get?participant_id=${participant_id}&campaign_id=${campaign_id}`
      );

      if (!participantHasCampaign.data.length) {
        return response.status(400).json({ message: 'Esse participante não pertence a campanha especificada.' });
      }

      const participantHasPdv = await HomerService.get(
        `participant-has-pdv/get?${querystring.stringify({ participant_id, campaign_id })}`
      );

      if(participantHasPdv.status !== 200) {
        return response.status(participantHasPdv.status).json({ message: participantHasPdv.data });
      }

      return response.status(participantHasPdv.status).json({ data: participantHasPdv.data });
    } catch(e) {
      Log.send(`${logError} GET ParticipantHasPdvList Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getSupportKey({ request, response }) {
    try {
      const params = request.only(['participant_id', 'campaign_id', 'user_id']);

      const messages = [
        !params.participant_id && 'O parâmetro participant_id é obrigatório.',
        !params.campaign_id && 'O parâmetro campaign_id é obrigatório.',
        !params.user_id && 'O parâmetro user_id é obrigatório.',
        isNaN(params.participant_id) || typeof params.participant_id === 'string' && 'O valor do parâmetro participant_id deve ser numérico.',
        isNaN(params.campaign_id) || typeof params.campaign_id === 'string' && 'O valor do parâmetro campaign_id deve ser numérico.',
        isNaN(params.user_id) || typeof params.user_id === 'string' && 'O valor do parâmetro user_id deve ser numérico.',
      ].filter(Boolean);

      if (messages.length) {
        return response.status(400).json({ message: messages[0] });
      }

      const participantHasCampaign = await HomerService.get(
        `participant-campaign/get?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}`
      );
      if (participantHasCampaign.data.length == 0){
        return {message: 'participante não pertence a campanha enviada'}
      }

      const campaign = await XavierService.post(`campaign/get?id=${params.campaign_id}`);
      if (!campaign.data){
        return {message: 'campanha não localizada'}
      }

      const user = await XavierService.get(`user/${params.user_id}`);
      if (!user.data){
        return { message: 'usuario não localizado'}
      }

      const result = await HomerHelperService.supportKey(params);
      return response.json({ data: result.data });
    } catch (e) {
      Log.send(`${logError} Get SupportKey Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async createParticipandPdvGrouped({ request, response }) {
    try {
      const params = request.only([ 'participant_id', 'campaign_id', 'pdvs' ]);

      const campaign = await XavierService.post(`campaign/get?id=${params.campaign_id}`);

      if(!params.campaign_id || isNaN(params.campaign_id) || campaign.status !== 200) {
        return response.status(400).json({ message: 'O parâmetro campaign_id não foi inserido ou é inválido.' });
      }

      const participant = await HomerService.get(`participant/${params.participant_id}`);

      if(!params.participant_id || isNaN(params.participant_id) || participant.status !== 200) {
        return response.status(400).json({ message: 'O parâmetro participant_id não foi inserido ou é inválido.' });
      }

      const participantHasCampaign = await HomerService.get(
        `participant-campaign/get?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}`
      );

      if (!participantHasCampaign.data.length) {
        return response.status(400).json({ message: 'Esse participante não pertence a campanha especificada.' });
      }

      const participantPdvGrouped = await HomerService.post('participant-has-pdv/create-group', params);

      if(participantPdvGrouped.status !== 200) {
        return response.status(participantPdvGrouped.status).json({ message: participantPdvGrouped.data });
      }

      return response.status(participantPdvGrouped.status).json({ data: participantPdvGrouped.data });
    } catch(e) {
      Log.send(`${logError} - POST - Create Group - ParticipantHasPdv - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async updateByParticipant({ request, response }) {
    try {
      const params = request.only([
        'id',
        'campaign_id',
        'pre_register_status_id',
        'participant_id',
        'participant_data',
        'justification'
      ]);

      const validateParams = await HomerHelperService.validateParams(params.campaign_id, params.participant_id);
      if(validateParams) {
        return response.status(validateParams.status).json({ message: validateParams.message });
      }

      const errors = [];
      const messages = [
        (!params.pre_register_status_id || isNaN(params.pre_register_status_id)) && errors.push('O parâmetro pre_register_status_id não foi inserido ou é inválido.'),
        (params.pre_register_status_id == 1) && errors.push('É necessário APROVAR ou REPROVAR um pré-registro.'),
        (!params.justification || typeof(params.justification) !== 'string') && errors.push('O parâmetro justification não foi inserido ou é inválido.')
      ];
      if (errors.length) {
        return response.status(400).json({ message: errors[0] });
      }

      const responsePreRegister = await HomerService.put('participant-pre-register/update-by-participant', params);
      if(responsePreRegister.status !== 200) {
        return response.status(responsePreRegister.status).json({ message: responsePreRegister.data });
      }

      return response.status(responsePreRegister.status).json({ data: responsePreRegister.data });
    } catch(e) {
      Log.send(`${logError} - PUT - Update By Participant - ParticipantPreRegister - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getParticipantsBySegmentation({ request, response }) {
    try {

      const params = request.only([
        'participant_id',
        'campaign_id',
        'page',
        'perPage'
      ]);

      const validateParams = await HomerHelperService.validateParams(params.campaign_id, params.participant_id);
      if(validateParams) {
        return response.status(validateParams.status).json({ message: validateParams.message });
      }

      const participantLastSegmentation = await HomerService.get(`participant-segmentation/last/get?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}`);
      if(participantLastSegmentation.status !== 200) {
        return response.status(participantLastSegmentation.status).json({ message: 'Erro ao resgatar segmentação do participante. Verifique seu cadastro.' });
      }

      const participantSegmentation = await XavierService.get(`segmentation/${participantLastSegmentation.data.segmentation_id}`);
      if(participantSegmentation.status !== 200) {
        return response.status(400).json({ message: 'Erro ao resgatar segmentação do participante. Verifique seu cadastro.' });
      }

      if(!participantSegmentation.data.segmentation_parent_id) {
        return response.status(400).json({ message: 'O participante não tem Distribuidor (Segmentação pai). Verifique seu cadastro.' });
      }
      params.participantParentSegmentation = participantSegmentation.data.segmentation_parent_id;

      const queryParams = `participant_id=${params.participant_id}&campaign_id=${params.campaign_id}&participantParentSegmentation=${params.participantParentSegmentation}&page=${params.page}&perPage=${params.perPage}`;
      const responseData = await HomerService.get(`participant/all/get-by-segmentation?${queryParams}`);

      if(responseData.status !== 200) {
        return response.status(responseData.status).json({ message: responseData.data });
      }

      return response.status(200).json(responseData.data);
    } catch(e) {
      Log.send(`${logError} - GET - Participants By Segmentation - Participant - ${e.message}`);
      return response.status(500).json(e.message);
    }
  };

  async getParticipantsPreRegisterBySegmentation({ request, response }){
    try{
      const params = request.only([
        'participant_id',
        'campaign_id',
        'page',
        'perPage'
      ]);

      let validateParams = await HomerHelperService.validateParams(params.campaign_id, params.participant_id);
      if(validateParams) {
        return response.status(validateParams.status).json({ message: validateParams.message });
      }

      const participantLastSegmentation = await HomerService.get(`participant-segmentation/last/get?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}`);
      if (participantLastSegmentation.status !== 200){
        return response.status(participantLastSegmentation.status).json({ message: 'Erro ao resgatar segmentação do participante. Verifique seu cadastro.' });
      }
      params.segmentation = participantLastSegmentation.data.segmentation_id;

      const parentSegmentation = await XavierService.get(`segmentation/${params.segmentation}`);
      if (parentSegmentation.status !== 200){
        return response.status(parentSegmentation.status).json({ message: 'Erro ao resgatar segmentação do participante. Verifique seu cadastro.' });
      }

      params.seg = parentSegmentation;

      if(!params.seg.data.segmentation_parent_id){
        return response.status(400).json({ message: 'O participante não tem Distribuidor (Segmentação pai). Verifique seu cadastro.' });

      }

      const result = await HomerService.post('participant/all/get-by-pre-register-segmentation', params);

      if(result.status !== 200) {
        return response.status(result.status).json({ message: result.data });
      }

      return response.status(200).json(result);

    }catch(e){
      Log.send(`${logError} - GET - Participants pré-register By Segmentation - Participant - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getEligibleParticipants({ request, response }){
    try{
      const params = request.only(['document', 'campaign_id']);
      let validate = validParamsCampaignAndDocuments(params);

      if(validate){
        return response.status(422).json({ message: validate });
      }else{
        let result = await HomerHelperService.getElegibleForCampaign(params);
        return response.status(200).json(result);
      }
    }catch(e){
      Log.send(`${logError} - GET - elegible Participant - ${e.message}`);
    }
  }

  // metodos que trabalham com o cargo
  async createJob({ request, response }) {
    const params = request.only(['job', 'campaignId']);
    const errors = [];

    if (!params.job || typeof params.job !== 'string' || !params.job.trim()) {
      errors.push('O parâmetro "job" é obrigatório e deve ser uma string não vazia.');
    }

    if (!params.campaignId || typeof params.campaignId !== 'number' || !Number.isInteger(params.campaignId)) {
      errors.push('O parâmetro "campaignId" é obrigatório e deve ser um número inteiro.');
    }

    if (errors.length > 0) {
      return response.status(400).json({ message: errors });
    }

    try {
      const result = await HomerHelperService.createJob(params);
      return response.json({ data: result.data });
    } catch (e) {
      Log.send(`${logError} CreateJob Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getEmbedded({request, response }){ {
    try {
      const params = request.only(['participant_id', 'document', 'group_id', 'report_id', 'dataset'])
      const generateToken = await HomerService.post('participant-generate-token/post', params);
      return generateToken;
    } catch (e) {
      return response.status(400).json(e.message);
    }
  }
  }

  async updateJob({ request, response }) {
    const params = request.only(['id', 'job', 'campaign_id']);
    const errors = [];

    if (!params.job || typeof params.job !== 'string' || !params.job.trim()) {
      errors.push('O parâmetro "job" é obrigatório e deve ser uma string não vazia.');
    }

    if (!params.campaign_id || typeof params.campaign_id !== 'number' || !Number.isInteger(params.campaign_id)) {
      errors.push('O parâmetro "campaign_id" é obrigatório e deve ser um número inteiro.');
    }

    if (errors.length > 0) {
      return response.status(400).json({ message: errors });
    }

    try {
      const result = await HomerHelperService.updateJob(params);
      return response.json({ data: result.data });
    } catch (e) {
      Log.send(`${logError} UpdateJob Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async deleteJob({ request, response }) {
    const params = request.only(['id', 'campaign_id']);
    const errors = [];

    if (!params.id || typeof params.id !== 'number') {
      errors.push('O parâmetro id é obrigatório e deve ser numérico.');
    }

    if (!params.campaign_id || typeof params.campaign_id !== 'number') {
      errors.push('O parâmetro campaign_id é obrigatório e deve ser numérico.');
    }

    if (errors.length > 0) {
      return response.status(400).json({ message: errors });
    }

    try {
      const result = await HomerHelperService.deleteJob(params);
      return response.json({ data: result.data });
    } catch (e) {
      Log.send(`${logError} DeleteJob Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }


  async getJob({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'participant_id']);

      params.campaign_id = Number(params.campaign_id);

      if (!params.campaign_id || typeof params.campaign_id !== 'number' || !Number.isInteger(params.campaign_id)) {
        return response.status(400).json({ message: 'O parâmetro campaign_id é obrigatório e deve ser um número inteiro.' });
      }

      const result = await HomerHelperService.getJob(params);
      return response.json({ data: result.data });
    } catch (e) {
      Log.send(`${logError} getJob Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async createHistoricParticipantHistoric({ request, response }) {
    try {
      const params = request.only(['job_id', 'participant_id', 'campaign_id']);
      const errors = [];

      if (!params.job_id || typeof params.job_id !== 'number' || !Number.isInteger(params.job_id)) {
        errors.push('O parâmetro job_id é obrigatório e deve ser um número inteiro.');
      }

      if (!params.participant_id || typeof params.participant_id !== 'number' || !Number.isInteger(params.participant_id)) {
        errors.push('O parâmetro participant_id é obrigatório e deve ser um número inteiro.');
      }

      if (!params.campaign_id || typeof params.campaign_id !== 'number' || !Number.isInteger(params.campaign_id)) {
        errors.push('O parâmetro campaign_id é obrigatório e deve ser um número inteiro.');
      }

      if (errors.length > 0) {
        return response.status(400).json({ message: errors });
      } else {
        const result = await HomerHelperService.createHistoricJob(params);
        return response.json({ data: result.data });
      }
    } catch (e) {
      Log.send(`${logError} Post create-historic-participant-job Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getHistoricParticipantHistoric({ request, response }) {
    try {
      const params = request.only(['participant_id', 'campaign_id']);
      params.participant_id = Number(params.participant_id);
      params.campaign_id = Number(params.campaign_id);
      const errors = [];

      if (!params.participant_id || typeof params.participant_id !== 'number' || isNaN(params.participant_id)) {
        errors.push('O parâmetro participant_id é obrigatório e deve ser um número válido.');
      }

      if (!params.campaign_id || typeof params.campaign_id !== 'number' || isNaN(params.campaign_id)) {
        errors.push('O parâmetro campaign_id é obrigatório e deve ser um número válido.');
      }

      if (errors.length > 0) {
        return response.status(400).json({ message: errors });
      } else {
        const result = await HomerHelperService.getHistoricJob(params);
        return response.json({ data: result.data });
      }
    } catch (e) {
      Log.send(`${logError} Post create-historic-participant-job Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }


  async putHistoricParticipantHistoric({ request, response }) {
    try {
      const params = request.only(['id', 'job_id', 'participant_id']);
      const errors = [];

      if (!params.participant_id || typeof params.participant_id !== 'number' || isNaN(params.participant_id)) {
        errors.push('O parâmetro participant_id é obrigatório e deve ser um número válido.');
      }

      if (!params.id || typeof params.id !== 'number' || isNaN(params.id)) {
        errors.push('O parâmetro id é obrigatório e deve ser um número válido.');
      }

      if (!params.job_id || typeof params.job_id !== 'number' || isNaN(params.job_id)) {
        errors.push('O parâmetro job_id é obrigatório e deve ser um número válido.');
      }

      if (errors.length > 0) {
        return response.status(400).json({ message: errors });
      } else {
        const result = await HomerHelperService.updateHistoricJob(params);
        return response.json({ data: result.data });
      }
    } catch (e) {
      Log.send(`${logError} Post create-historic-participant-job Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getCampaignsByParticipants({ request, response }) {
    try {
      const params = request.only(['login', 'campaignId']);

      if (!params.login || !params.campaignId) {
        throw new Error('Parâmetros ausentes. Você deve fornecer login e campaignId.');
      }

      const toIntCampaignId = Number(params.campaignId);
      const correctParams = HomerHelperService.identifyEmailOrCPF(params.login, toIntCampaignId);

      if (!correctParams) {
        throw new Error('Parâmetros inválidos. Verifique o formato do login ou do campaignId.');
      }

      const campainByParticipant = await HomerService.post('campaigns-by-participant/post', correctParams);

      if (campainByParticipant.data === 'Participante não encontrado') {
        return response.status(200).json({ message: 'Participante não encontrado' });
      }

      const validCampaignByParticipant = await HomerHelperService.validCampaignByParticipant({
        parentId: toIntCampaignId,
        participantCampaign: campainByParticipant
      });

      return validCampaignByParticipant;
    } catch (e) {
      const errorMessage = `${logError} get-campaign by participant Endpoint - ${e.message}`;
      Log.send(errorMessage);
      return response.status(400).json({ error: e.message });
    }
  }

  async postSpecialRule({ request, response }) {
    try {
      const params = request.only(['participant_id', 'campaign_id']);

      const participantHasCampaign = await HomerService.get(`participant-campaign-first/get?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}`);

      const isValidSpecialRule = await HomerHelperService.isValidSpecialRule(participantHasCampaign.data.special_rule_accepted_terms_at);

      if(!isValidSpecialRule.status){
        return { data:isValidSpecialRule.data };
      }

      const result = await HomerService.post('special-rule/post', params);

      if(result.status != 200){
        return response.status(result.status).json({ data: result });
      }
      return response.status(200).json({ data: 'Gravação de data de aceite realizada com sucesso' });

    } catch (e) {
      Log.send(`${logError} HomerSimpsonController - postSpecialRule Endpoint - ${e.message} - params: 
      ${new URLSearchParams(request.only(['participant_id', 'campaign_id']))}`);
      return response.status(500).json(e.message);
    }
  }

  async getPreApprovedPdv({ request, response }){
    try{
      const params = request.only(['document']);
      if(!params.document){
        return response.status(400).json({ data: { message: 'Informe o documento.' } });
      }
      const result = await HomerService.post('participant-pre-approved/getList', params);
      return response.status(200).json(result);
    }catch(e){
      Log.send(`${logError} - GET - getPreApprovedPdv - ${e.message}`);
    }
  }

  // Participant Accepted Regulation
  async getParticipantAcceptedRegulation({ request, response }) {
    try{
      const params = request.all();
      const queryParams = (new URLSearchParams(params)).toString()
      const result = await HomerService.get(`participant-accepted-regulation/get?${queryParams}`);
      return response.status(result.status).json(result.data);
    }catch(e){
      Log.send(`${logError} - GET - getParticipantAcceptedRegulation - ${e.message}`);
    }
  }

  async postParticipantAcceptedRegulation({ request, response }) {
    try{
      const body = request.body;
      const result = await HomerService.post('participant-accepted-regulation/post', body);
      return response.status(result.status).json(result.data);
    }catch(e){
      Log.send(`${logError} - GET - getParticipantAcceptedRegulation - ${e.message}`);
    }
  }
}

module.exports = HomerSimpsonController;
