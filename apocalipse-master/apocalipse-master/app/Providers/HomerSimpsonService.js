'use strict';

const Log = new (use('LogHelper'))();
const Env = use('Env');
const HomerService = new (use('ApiInterceptorService'))(Env.get('HOMER_URL'));
const JarvisService = new (use('ApiInterceptorService'))(Env.get('JARVIS_URL'));
const logError = `Env: ${Env.get('NODE_ENV')} - HomerSimpsonController`;
const XavierService = new (use('ApiInterceptorService'))(Env.get('XAVIER_URL'));
const moment = use('moment');
const unique = use('node-unique-array');
const date = moment();
const cpfCnpjValidator = require('cpf-cnpj-validator');
const emailValidator = require('email-validator');
const { DateTime } = use('luxon');
const round = function(func, number, prec) {
  let tempnumber = number * Math.pow(10, prec);
  tempnumber = func(tempnumber);
  return tempnumber / Math.pow(10, prec);
};

class HomerSimpsonService {
  async getIndividualGoal(params) {
    try {
      const { participant_id, campaign_id, dateFrom } = params;

      if (!participant_id || !campaign_id){
        return { fail: true, message: 'participant or campaign not informed', status: 404 };
      }

      let query = `participant-goal/get?participant_id=${participant_id}&campaign_id=${campaign_id}`;
      const goals = await HomerService.get(query);

      const goalsExist = goals.data.length > 0;

      if (!goalsExist) {
        return { fail: true, message: 'participant and campaign not found', status: 404 };
      }

      const mechanics = await this.getIndividualMechanic(goals, params);

      if (dateFrom){
        mechanics.message = this.filterMechanicsByDate(mechanics, dateFrom);
      }

      mechanics.message = this.filterMechanicsByCampaign(mechanics, campaign_id);


      return await this.mountJson(mechanics.message);
    } catch (e) {
      Log.send(`${logError} - getParticipantIndividualGoal Endpoint - ${e.message}`);
      return { fail: true, message: e.message, status: 500 };
    }
  }


  filterMechanicsByDate(mechanics, dateFrom){

    const newDate = moment(dateFrom);
    const daysInMonth = newDate.daysInMonth();
    const monthStart = newDate.format('YYYY-MM-01');
    const monthEnd = newDate.format(`YYYY-MM-${daysInMonth}`);

    const mechanicsFilterByDate = [];
    mechanics.message.map(item => {
      const { mechanic: { begin_at, end_at } } = item;

      const mechanicStartsAt = moment(begin_at).format('YYYY-MM-DD');
      const mechanicEndsAt = moment(end_at).format('YYYY-MM-DD');

      const mechanicStartsInsideMonth = mechanicStartsAt >= monthStart && mechanicStartsAt <= monthEnd;
      const mechanicEndsInsideMonth = mechanicEndsAt >= monthStart && mechanicEndsAt <= monthEnd;
      const mechanicInsideMonthPeriod = mechanicStartsAt <= monthStart && mechanicEndsAt >= monthEnd;

      if(mechanicStartsInsideMonth){
        mechanicsFilterByDate.push(item);
      }else if(mechanicEndsInsideMonth){
        mechanicsFilterByDate.push(item);
      }else if(mechanicInsideMonthPeriod){
        mechanicsFilterByDate.push(item);
      }
    });
    return mechanicsFilterByDate;
  }

  filterMechanicsByCampaign(mechanics, campaign_id){

    const mechanicsFilterByCampaign = [];
    mechanics.message.map(item => {

      if(item.mechanic.campaign_id == campaign_id){
        mechanicsFilterByCampaign.push(item);
      }

    });
    return mechanicsFilterByCampaign;
  }

  async getIndividualMechanic(participantGoal, params) {
    try {
      const MechanicsType = await JarvisService.get(`mechanic-type/all`);
      const mechanicId = participantGoal.data.map((mechanic) => mechanic.mechanic_id);
      let getMechanics = {};

      if (params.dateFrom) {
        getMechanics.dateFrom = moment(params.dateFrom).format('YYYY-MM-DD');
      }
      if (params.dateTo) {
        getMechanics.dateTo = moment(params.dateTo).format('YYYY-MM-DD');
      }
      getMechanics.id = mechanicId;

      const mechanic = await JarvisService.post(`mechanic/individual/find`, getMechanics);

      const mechanics = this.joinMechanicsWithGoals(participantGoal, mechanic, MechanicsType);

      mechanics.forEach(({ mechanic }) => {
        const lastDate = moment(mechanic.end_at);
        const currentDate = moment();
        const duration = moment.duration(lastDate.diff(currentDate)).asDays();
        mechanic.insights = {};
        if (mechanic.participantGoals.result >= mechanic.participantGoals.goal) {
          mechanic.insights.daily_reach = 0;
        } else if(currentDate > lastDate){
          mechanic.insights.daily_reach = 0;
        } else {
          mechanic.insights.daily_reach = Math.ceil((mechanic.participantGoals.goal - mechanic.participantGoals.result) / duration);
        }
      });

      return { fail: false, message: mechanics, status: 200 };
    } catch (e) {
      Log.send(`${logError} - getIndividualMechanic Endpoint - ${e.message}`);
      return { fail: true, message: e.message, status: 500 };
    }
  }


  joinMechanicsWithGoals(participantGoal, mechanic, MechanicsType){
    const mechanics = [];
    for (const item of participantGoal.data) {
      if (mechanic.data) {
        for (let mec of mechanic.data) {
          if (mec.id == item.mechanic_id) {
            for (const type of MechanicsType.data) {
              const config = JSON.parse(type.config);
              if (mec.mechanic_type_id == type.id && config.individual) {
                mec.participantGoals = item;
                mec.mechanicName = type.name;
                mechanics.push({ mechanic: mec });
              }
            }
          }
        }
      }
    }
    return mechanics;
  }

  async mountJson(mechanic) {
    try {
      if (mechanic.length <= 0) {
        return { fail: true, message: "participant don't have mechanic", status: 404 };
      }
      let data = [];
      for (const goal of mechanic) {
        const endAt = new Date(goal.mechanic.end_at).getTime();
        const nowDate = new Date().getTime();

        let situation = 'Inativa';

        if (nowDate <= endAt) {
          situation = 'Ativa';
        }
        if (nowDate > endAt) {
          situation = 'Finalizada';
        }
        data.push({
          id: goal.mechanic.id,
          enabled: goal.mechanic.enabled,
          name: goal.mechanic.mechanicName,
          mechanic_identifier:goal.mechanic.name,
          description: goal.mechanic.description,
          nomenclature: goal.mechanic.nomenclature,
          unity_type_id: goal.mechanic.unity_type_id,
          date_init: moment(goal.mechanic.begin_at).format('YYYY-MM-DD'),
          date_end: moment(goal.mechanic.end_at).format('YYYY-MM-DD'),
          day_remaining: goal.mechanic.day_remaining,
          purpose: goal.mechanic.purpose,
          cycle: goal.mechanic.cycle,
          thumbnail: goal.mechanic.thumbnail,
          sub_mechanic: goal.mechanic.sub_mechanic,
          position: goal.mechanic.participantGoals.position,
          value_reached: goal.mechanic.participantGoals.result,
          percentage_value_reached: round(
            Math.floor,
            (goal.mechanic.participantGoals.result / goal.mechanic.participantGoals.goal) * 100,
            0
          ),
          reached:
            goal.mechanic.participantGoals.result >= goal.mechanic.participantGoals.goal ? true : false,
          goals: {
            id: goal.mechanic.participantGoals.id,
            mechanic_id: goal.mechanic.participantGoals.mechanic_id,
            quantity: goal.mechanic.participantGoals.goal,
            score: goal.mechanic.participantGoals.points,
            special_award: goal.mechanic.special_award,
            enabled: goal.mechanic.participantGoals.enabled,
            created_at: goal.mechanic.participantGoals.created_at,
            updated_at: goal.mechanic.participantGoals.updated_at
          },
          tag: situation,
          insights: { daily_reach: goal.mechanic.insights.daily_reach }
        });
      }
      data = data.sort(function(a, b) {
        if (a.date > b.date) {
          return 1;
        }
        if (a.date < b.date) {
          return -1;
        }
        // a must be equal to b
        return 0;
      });

      data.forEach((item) => delete item.date);

      return { fail: false, message: { data }, status: 200 };
    } catch (e) {
      Log.send(`${logError} - mountJson Endpoint - ${e.message}`);
      return { fail: true, message: e.message, status: 500 };
    }
  }

  async getParticipantGoals({ participant_id, campaign_id }) {
    const searchParams = new URLSearchParams({ participant_id, campaign_id }).toString();
    const goals = await HomerService.get(`participant-goal/get?${searchParams}`);
    return goals;
  }
  joinMechanicToGoals(goals, mechanics) {
    const goalsWithMechanic = [];
    goals.forEach((goal) => {
      mechanics.forEach((mechanic) => {
        if (goal.mechanic_id === mechanic.id) {
          goalsWithMechanic.push({ goal, mechanic });
        }
      });
    });
    return goalsWithMechanic;
  }
  splitGoalsByMonth(typeGoals) {
    const goalsByMonth = [];
    const months = {
      1: 'Janeiro',
      2: 'Fevereiro',
      3: 'Março',
      4: 'Abril',
      5: 'Maio',
      5: 'Junho',
      7: 'Julho',
      8: 'Agosto',
      9: 'Setembro',
      10: 'Outubro',
      11: 'Novembro',
      12: 'Dezembro'
    };
    const nowDate = DateTime.now();
    let month = nowDate.month;
    let year = nowDate.year;
    for (let i = 0; i <= 6; i++) {
      const monthGoals = typeGoals.filter(({ mechanic }) => DateTime.fromISO(mechanic.end_at).month === month && DateTime.fromISO(mechanic.end_at).year === year);
      const totalResult = monthGoals.reduce((acc, { goal }) => acc += goal.result, 0);
      const totalGoal = monthGoals.reduce((acc, { goal }) => acc += goal.goal, 0);
      goalsByMonth.push({ month: months[month], percent: ((totalResult / totalGoal) * 100 ) || 0 });
      if (month > 1) {
        month--;
      }
      else {
        month = 12;
        year--;
      }
    }
    return goalsByMonth;

  }
  getGoalsByMechanicType(mechanicsType, goalsWithMechanic) {
    const goalByMechanicType = {};
    mechanicsType.forEach(type => {
      const typeGoals = goalsWithMechanic.filter(({ mechanic }) => mechanic.mechanic_type_id === type.id);
      const goalsByMonth = this.splitGoalsByMonth(typeGoals);
      goalByMechanicType[`${type.alias}`] = goalsByMonth;
    });
    return goalByMechanicType;
  }




  async loadparticipantGoals(mechanics, participant_id, campaign_id) {
    try {
      await Promise.all(
        mechanics.data.map(async (mechanic, key) => {
          let participantGoals = {};
          /* O bloco de if abaixo altera a exibição dos resultados do participante para mecânicas
          do tipo progresso lider, os resultados dos seus goals, precisam ser puxados das metas de seus líderes.*/
          if (mechanics.data[key].alias == 'progresso_lider') {

            const participant = await HomerService.get(`participant/${participant_id}`);

            const queryHierarchy = querystring.stringify({
              search: 'Lider',
              campaign_id: campaign_id
            });
            const leaderHierarchy = await HomerService.get(`hierarchy/search?${queryHierarchy}`);

            let leaderId = 0;
            for (let hierarchy of participant.data.hierarchy) {
              if (hierarchy.hierarchy_id == leaderHierarchy.data[0].id) {
                leaderId = hierarchy.participant_leader_id;
              }
            }

            /* Abaixo é verificada a segmentação do participante, caso ele seja lider, a meta é buscada com seu próprio id,
            se não, significa que ele é merchandiser. Então sua meta é buscada a partir do leaderId da busca de hierarquia.*/
            const queryParticipantSegmentation = querystring.stringify({
              participant_id: participant_id,
              campaign_id: campaign_id,
              enabled: 1
            });

            const participantSegmentation = await HomerService.get(`participant-segmentation/last/get?${queryParticipantSegmentation}`);

            const liderSegmentation = await XavierService.get(`segmentation/${participantSegmentation.data.segmentation_id}`);

            if (liderSegmentation.data.name == 'LIDER') {
              participantGoals = await HomerService.get(
                `participant-goal/get?participant_id=${participant_id}&mechanic_id=${mechanic.mechanic_id}`
              );
            } else {
              participantGoals = await HomerService.get(
                `participant-goal/get?participant_id=${leaderId}&mechanic_id=${mechanic.mechanic_id}`
              );
            }
            /* O trecho a seguir popula o goals da mecânica de progresso de líder para exibição,
            caso não tenha sido encontrado o participant-goal, uma flag para remoçao dessa entrada na exibição
            é setada.*/
            if (participantGoals.data.length > 0) {
              if (!mechanics.data[key].goals[0]) {
                mechanics.data[key].goals.push({});
              }
              mechanics.data[key].goals[0].id = participantGoals.data[0].id;
              mechanics.data[key].goals[0].mechanic_id = participantGoals.data[0].mechanic_id;
              mechanics.data[key].goals[0].quantity = participantGoals.data[0].goal;
              mechanics.data[key].goals[0].score = 0;
              mechanics.data[key].goals[0].special_award = '';
              mechanics.data[key].goals[0].enabled = participantGoals.data[0].enabled;
              mechanics.data[key].goals[0].created_at = participantGoals.data[0].created_at;
              mechanics.data[key].goals[0].updated_at = participantGoals.data[0].updated_at;
            } else {
              mechanics.data[key].progressoLiderSemGoal = true;
            }
          } else {
            participantGoals = await HomerService.get(
              `participant-goal/get?participant_id=${participant_id}&mechanic_id=${mechanic.mechanic_id}`
            );
          }

          mechanics.data[key].participantGoals = participantGoals.data;
          mechanics.data[key].uid = `${mechanic.mechanic_id}_${key}`;

          /* O bloco de if abaixo altera a exibição dos resultados do participante para mecânicas
          do tipo bateu-ganhou-merchan, os resultados dos seus goals, precisam ser somados, que são
          a quantidade de fotos enviadas.*/
          if (mechanics.data[key]) {
            if (mechanics.data[key].alias == 'bateu_ganhou_merchan') {
              let result = 0;
              let totalGoal = [];
              totalGoal.push(participantGoals.data[0]);
              for (let participantGoal of participantGoals.data) {
                result += participantGoal.result;
              }
              if (participantGoals.data[0]) {
                totalGoal[0].result = result;
                mechanics.data[key].participantGoals = totalGoal;
              }
            }
          }
        })
      );
      return mechanics;
    } catch (e) {
      Log.send(`${logError} - getPossiblePoints Endpoint - ${e.message}`);
      return { message: e.message, status: 500 };
    }
  }

  async getPossiblePointsCalc(mechanics, focos, participant_id) {
    try {
      let sumAvailablePoints = 0;
      let sumValueReached = 0;

      if (mechanics.data[0]) {
        await Promise.all(
          mechanics.data.map(async (item) => {
            //Quiz
            if (item.alias === 'quiz' && item.enabled_mechanic == 1) {
              let quizValueReached = 0;
              let correct_answer = 0;
              const mechanicQuizCorrectAnswer = await JarvisService.get(`mechanic-quiz-answer/get?mechanic_id=${item.mechanic_id}&flag_correct_answer=1`);
              const participantAnswer = await HomerService.get(`participant-quiz-answer/get?participant_id=${participant_id}`);
              const mechanicQuiz = await JarvisService.get(`mechanic-quiz/get?mechanic_id=${item.mechanic_id}`);
              const total_answer = mechanicQuiz.data.length;

              for (const answer of participantAnswer.data) {
                for (const itemMechanicQuiz of mechanicQuizCorrectAnswer.data) {
                  if (answer.answer_id == itemMechanicQuiz.id) {
                    correct_answer++;
                  }
                }
              }
              if (item.participantGoals[0]) {
                if (item.participantGoals[0].result >= item.goals[0].quantity) {
                  quizValueReached = correct_answer * item.goals[0].score;
                }
              }
              //Calcula pontos disponiveis em mecanicas quiz
              const quizPointsAvailable = item.goals[0].score * total_answer;

              sumAvailablePoints += quizPointsAvailable;
              sumValueReached += quizValueReached;
            }
            //Ranking
            if (item.alias === 'ranking' && item.enabled_mechanic == 1) {
              let rankingPointsAvailable = 0;
              let rankingValueReached = 0;

              for (const rankingGoal of item.goals) {
                if(item.participantGoals[0] && item.goals[0]){
                  const positionInArray = item.participantGoals[0].position - 1;
                  if(item.goals[positionInArray]){
                    rankingValueReached = item.goals[positionInArray].score;
                  }
                }
                if (rankingGoal.score > rankingPointsAvailable) {
                  rankingPointsAvailable = rankingGoal.score;
                }
              }
              sumAvailablePoints += rankingPointsAvailable;
              sumValueReached += rankingValueReached;
            }
            //Outras mecânicas
            if (item.alias != 'ranking' && item.alias != 'quiz' && item.alias != 'focos_mensais' && item.enabled_mechanic == 1) {
              let mechanicPointsAvailable = 0;
              let mechanicValueReached = 0;
              if (item.participantGoals[0]) {
                if (item.participantGoals[0].result >= item.goals[0].quantity) {
                  mechanicValueReached = item.goals[0].score;
                }
              }
              if (item.goals[0]) {
                mechanicPointsAvailable = item.goals[0].score;
              }
              sumAvailablePoints += mechanicPointsAvailable;
              sumValueReached += mechanicValueReached;
            }
          })
        );
      }
      //Focos
      if (focos.message.data) {
        focos.message.data.map((item) => {
          if (item.enabled == 1) {
            let focosPointsAvailable = 0;
            let focosValueReached = 0;
            if (item.value_reached >= item.goals.quantity) {
              focosValueReached = item.goals.score;
            }
            if (item.goals) {
              focosPointsAvailable = item.goals.score;
            }
            sumAvailablePoints += focosPointsAvailable;
            sumValueReached += focosValueReached;
          }
        });
      }

      let percentageValueReached = 0;
      if (sumAvailablePoints == 0 && sumValueReached == 0) {
        percentageValueReached = 0;
      } else {
        percentageValueReached = (sumValueReached / sumAvailablePoints) * 100;
      }

      return {
        percentage_value_reached: percentageValueReached,
        value_reached: sumValueReached,
        total_available_points: sumAvailablePoints
      };
    } catch (e) {
      Log.send(`${logError} - getPossiblePoints Endpoint - ${e.message}`);
      return { message: e.message, status: 500 };
    }
  }

  async manipulateGetMechanicsObj(mechanics, params, getParticipantGoalsByMechanic) {
    try {
      const manipulatedReturn = [];
      const dateNow = moment().format('YYYY-MM-DD');
      await Promise.all(
        // eslint-disable-next-line no-unused-vars
        mechanics.data.map(async (item,index) => {
          const manipulate = {};
          let participantScore = 0;
          let participantPosition = 0;
          let updatedAt = '';
          manipulate.id = item.mechanic_id;
          manipulate.enabled = item.enabled_mechanic;
          manipulate.name = item.name;
          if(item.positivationName){
            manipulate.name = item.positivationName;
          }
          manipulate.mechanicIdentifier = item.mechanicName;
          manipulate.description = item.purpose;
          manipulate.fullDescription = item.description;
          manipulate.nomenclature = item.nomenclature;
          manipulate.alias = item.alias;
          manipulate.unity_type_id = item.unity_type_id;
          manipulate.unityType = item.unityType;
          manipulate.dateInit = moment(item.begin_at).format('YYYY-MM-DD');
          manipulate.dateEnd = moment(item.end_at).format('YYYY-MM-DD');
          manipulate.dateView = moment(item.view_to).format('YYYY-MM-DD');
          const end_at = moment(item.end_at).format('YYYY-MM-DD'); // Formatando data final da mecanica
          const limit_date = moment(end_at); // Data final da mecanica
          const current_date = moment(new Date()).format('YYYY-MM-DD'); // Data de hoje
          const duration = moment.duration(limit_date.diff(current_date)); //Calcula diferença entre as datas
          const days = duration.asDays(); // Salva diferença em dias
          if (current_date >= end_at) {
            manipulate.day_remaining = 0; // Se a data atual for maior que a data limite então não resta dias.
          } else if (days > 0 && days < 1) {
            manipulate.day_remaining = 1; // Se faltar menos de um dia mostrar o valor 1
          } else {
            manipulate.day_remaining = days; //Salva o calculo dos dias restantes.
          }
          manipulate.cycle = item.cycle;
          manipulate.thumbnail = item.thumbnail;
          manipulate.sub_mechanic = item.sub_mechanic;
          manipulate.position = 0;
          if(item.participantGoals){
            if (item.participantGoals[0] && item.participantGoals[0].result !== 0) {
              participantScore = item.participantGoals[0].result;
              participantPosition = item.participantGoals[0].position;
              updatedAt = item.participantGoals[0].updated_at;
            }
          }
          manipulate.config = item.config;
          manipulate.mechanicConfig = item.mechanicConfig;
          manipulate.valueReached = participantScore;
          manipulate.updatedAt = updatedAt ? moment(updatedAt).format('YYYY-MM-DD') : null;
          if(item.alias === 'positivacao'){
            manipulate.updatedAt = moment(item.updatedAt).format('YYYY-MM-DD');
            manipulate.positivationData = {};
            manipulate.positivationData.customTitle = item.custom_title;
            manipulate.positivationData.rewardMessage = item.reward_message;
            manipulate.positivationData.rewardNomenclature = item.reward_nomenclature;
            manipulate.positivationData.totalPositivatedAmount = item.totalPositivatedAmount;
            manipulate.positivationData.points = item.points;
            manipulate.positivationData.families = item.families;
          }
          if(item.goals){
            if (item.goals[0] && item.goals[0] != undefined) {
              manipulate.percentage_value_reached = (participantScore / item.goals[0].quantity) * 100;
            } else {
              manipulate.percentage_value_reached = 0;
            }
          }
          manipulate.rankingPosition = participantPosition;
          manipulate.totalGoalValue = item.quantity ? item.quantity : null;
          manipulate.goals = item.goals ? item.goals : null;
          if (manipulate.dateEnd >= dateNow) {
            if (manipulate.dateInit <= dateNow) {
              manipulate.tag = 'Ativa';
            } else {
              manipulate.tag = 'Inativa';
              if(item.quizAnswered){
                if (item.quizAnswered == false) {
                  item.quizAnswered = true;
                }
              }
            }
          } else {
            manipulate.tag = 'Finalizada';
            if(item.quizAnswered){
              if (item.quizAnswered == false) {
                item.quizAnswered = true;
              }
            }
          }
          if (manipulate.name == 'Quiz') {
            manipulate.quizAnswered = item.quizAnswered ? item.quizAnswered : null;
          }
          manipulatedReturn.push(manipulate);
          /* If a seguir remove mecânicas que não devem aparecer na exibição da home do participante*/
          if (manipulate.name == 'Focos Mensais' || manipulate.name == 'Copa KOF' || item.progressoLiderSemGoal) {
            manipulatedReturn.splice(manipulatedReturn.length - 1);
          }

          //Insights
          if (params.insights == 1) {
            manipulate.insights = {};
            //Calculo de alcance diario
            if (item.alias === 'bateu_ganhou' || item.alias === 'bateu_ganhou_merchan' || item.alias === 'progresso_lider' || item.alias === 'progresso' || item.alias === 'qrcode') {
              const lastDate = moment(item.end_at);
              const currentDate = moment();
              const duration = moment.duration(lastDate.diff(currentDate)).asDays();
              if (item.goals[0] && item.goals[0] != undefined) {
                if (participantScore >= item.goals[0].quantity) {
                  manipulate.insights.daily_reach = 0; //Se já bateu a meta
                } else if (currentDate > lastDate) {
                  manipulate.insights.daily_reach = 0; //Se já acabou a mecânica
                } else {
                  manipulate.insights.daily_reach = Math.ceil((item.goals[0].quantity - participantScore) / duration); // Se não bateu a meta
                }
              }
            }
            //Calculo de posição
            if (item.alias === 'bateu_ganhou' || item.alias === 'bateu_ganhou_merchan' || item.alias === 'progresso_lider' || item.alias === 'progresso' || item.alias === 'qrcode' || item.alias === 'ranking' || item.alias === 'ranking_merchan' || item.alias === 'quiz') {
              let goalPositionInArray = 0;
              const participantGoalsByMechanic = await HomerService.get(`participant-goal/all-by-mechanic?mechanic_id=${item.mechanic_id}`);
              let responseData = await getParticipantGoalsByMechanic({ mechanic_id: item.mechanic_id }); // Busca todos os participantes da mecanica

              if (item.participantGoals[0] && item.participantGoals[0].result !== 0) {
                goalPositionInArray = participantGoalsByMechanic.data.findIndex(participantGoal => participantGoal.participant_id == item.participantGoals[0].participant_id);
                const ranking_position = goalPositionInArray + 1;
                manipulate.insights.total_positions = responseData.data.goals.length;
                manipulate.insights.ranking_position = ranking_position;
              } else {
                manipulate.insights.ranking_position = responseData.data.goals.length; //Se o participante não possui pontuação, então sera mostrado a ultima posição do ranking
                manipulate.insights.total_positions = responseData.data.goals.length;
              }
              //Calculo para subir de posicao
              if (item.alias === 'ranking' || item.alias === 'ranking_merchan') {
                if (goalPositionInArray != 0) {
                  const nextPositionInArray = goalPositionInArray - 1;
                  manipulate.insights.points_to_up = (participantGoalsByMechanic.data[nextPositionInArray].result + 1) - manipulate.valueReached;
                } else {
                  manipulate.insights.points_to_up = 0;
                }
              }
            }
            //Perguntas corretas quiz
            if (item.alias === 'quiz') {
              const mechanicQuizCorrectAnswer = await JarvisService.get(`mechanic-quiz-answer/get?mechanic_id=${item.mechanic_id}&flag_correct_answer=1`);
              const participantAnswer = await HomerService.get(`participant-quiz-answer/get?participant_id=${params.participant_id}`);
              const mechanicQuiz = await JarvisService.get(`mechanic-quiz/get?mechanic_id=${item.mechanic_id}`);
              let correct_answer = 0;

              for (const answer of participantAnswer.data) {
                for (const mechanicQuiz of mechanicQuizCorrectAnswer.data) {
                  if (answer.answer_id == mechanicQuiz.id) {
                    correct_answer++;
                  }
                }
              }
              manipulate.insights.total_answer = mechanicQuiz.data.length;
              manipulate.insights.correct_answer = correct_answer;
            }
          }
        })
      );
      return manipulatedReturn;
    } catch (e) {
      Log.send(`${logError} - getMechanics Endpoint - ${e.message}`);
      return { message: e.message, status: 500 };
    }
  }

  sortMechanicsByDate(mechanics, homeScreen) {
    try {
      if(homeScreen){
        mechanics.sort((a, b) => b.endAt > a.endAt);
      }else{
        mechanics.sort((a, b) => b.dateInit < a.dateInit);
      }
      return mechanics;
    } catch (error) {
      Log.send(`${logError} - getMechanics Endpoint - ${e.message}`);
      return { message: e.message, status: 500 };
    }
  }

  async supportKey(param) {
    try{
      const suportKey = await HomerService.post(`support-key/post`, param);
      return suportKey;
    }catch(e){
      Log.send(`${logError} - supportKey Endpoint - ${e.message}`);
      return { message: e.message, status: 500 };
    }
  }

  async validateParams(campaign_id, participant_id) {
    const campaign = await XavierService.post(`campaign/get?id=${campaign_id}`);
    if(!campaign_id || isNaN(campaign_id) || campaign.status !== 200) {
      return { message: 'O parâmetro campaign_id não foi inserido ou é inválido.', status: 400 };
    }

    const participant = await HomerService.get(`participant/${participant_id}`);
    if(!participant_id || isNaN(participant_id) || participant.status !== 200) {
      return { message: 'O parâmetro participant_id não foi inserido ou é inválido.', status: 400 };
    }

    const participantHasCampaign = await HomerService.get(
      `participant-campaign/get?participant_id=${participant_id}&campaign_id=${campaign_id}`
    );
    if (!participantHasCampaign.data.length) {
      return { message: 'Esse participante não pertence a campanha especificada.', status: 400 };
    }
  }

  async getElegibleForCampaign(params){
    const campaignResult = [];
    const result = await HomerService.post('participant-pre-approved/getList', params);
    const campaignHasCampaign = await XavierService.get(`campaign-has-campaign/get?parent_campaign_id=${params.campaign_id}`);

    let childCampaignId = campaignHasCampaign.data.map((e)=> { return e.sub_campaign_id});

    if(result.data.length > 0){
      for(const data of result.data){
        if (childCampaignId.includes(data.campaign_id)){
          let campaignConfig = await XavierService.get(`campaign/${data.campaign_id}`);
          campaignResult.push(this.elegibleParticipantObject(campaignConfig));
        }
      }
      return {data: campaignResult};
    }else{
      return {message: 'participante não localizado'};
    }
  }

  elegibleParticipantObject(params){
    let configs = JSON.parse(params.data.config);

    let fullobject = ({
      campaignId: params.data.id,
      name: params.data.name,
      hasParticipantImg: configs.hasParticipantImg,
      hasParticipantPdv: configs.hasParticipantPdv,
      img180x80: configs.img180x80,
      description: params.data.description
    });
    return fullobject;
  }

  async createJob(data){
    const result = await HomerService.post(`job/create`, data);
    return result;
  }

  async updateJob(data){
    try{
      const result = await HomerService.put(`job/update`, data);
      return result;
    }catch(e){
      Log.send(`${logError} - updateJob Endpoint - ${e.message}`);
      return { message: e.message, status: 500 };
    }
  }

  async deleteJob(data){
    const result = await HomerService.post(`job/delete`, data);
    return result;
  }

  async getJob(data){
    try{
      const result = await HomerService.post(`job/list`, data);
      return result;
    }catch(e){
      Log.send(`${logError} - getJobs Endpoint - ${e.message}`);
      return { message: e.message, status: 500 };
    }
  }

  async createHistoricJob(data){
    try{
      const result = await HomerService.post(`job/historic-participant-job`, data);
      return result;
    }catch(e){
      Log.send(`${logError} - creteJob Endpoint - ${e.message}`);
      return { message: e.message, status: 500 };
    }
  }

  async updateHistoricJob(data){
    try{
      const result = await HomerService.put(`update/historic-participant-job`, data);
      return result;
    }catch(e){
      Log.send(`${logError} - creteJob Endpoint - ${e.message}`);
      return { message: e.message, status: 500 };
    }
  }

  async getHistoricJob(data){
    try{
      const result = await HomerService.post(`get/historic-participant-job`, data);
      return result;
    }catch(e){
      Log.send(`${logError} - creteJob Endpoint - ${e.message}`);
      return { message: e.message, status: 500 };
    }
  }

  identifyEmailOrCPF(login, campaignId) {
    const toIntCampaignId = Number(campaignId);

    if (typeof login !== 'string' || typeof campaignId !== 'number' || campaignId < 0 || Number.isNaN(toIntCampaignId)) {
      throw new Error('Parâmetros inválidos. login deve ser uma string e campaignId deve ser um número não negativo.');
    }


    if (emailValidator.validate(login)) {
      return { email: login, campaignId };
    }

    if (cpfCnpjValidator.cpf.isValid(login) || cpfCnpjValidator.cnpj.isValid(login)) {
      const type = cpfCnpjValidator.cpf.isValid(login) ? 'CPF' : 'CNPJ';
      const validLength = cpfCnpjValidator.cpf.isValid(login) ? 11 : 14;

      if (login.length !== validLength) {
        throw new Error(`${type} inválido. Deve conter exatamente ${validLength} dígitos.`);
      }

      return { [type.toLowerCase()]: login, campaignId };
    }

    return null;
  }

  campaignByParticipantObj(params){
    let configs = JSON.parse(params.data.config);
    let fullobject = ({
      campaignId: params.data.id,
      name: params.data.name,
      img180x80: configs.img180x80,
      domain:params.data.domain
    });
    return fullobject;
  }

  async validCampaignByParticipant(params) {
    try {
      const config = params.participantCampaign.data;
      const parentId = params.parentId;

      let campaignResult = [];

      const campaignHasCampaign = await XavierService.get(`campaign-has-campaign/get?parent_campaign_id=${parentId}`);
      let childCampaignId = campaignHasCampaign.data.map((e) => {
        return e.sub_campaign_id;
      });

      for (let campaign of config) {
        if (childCampaignId.includes(campaign.campaign_id)) {
          let campaignConfig = await XavierService.get(`campaign/${campaign.campaign_id}`);
          campaignResult.push(this.campaignByParticipantObj(campaignConfig));
        }
      }

      return campaignResult;

    } catch (e) {
      Log.send(`${logError} - get-campagign by participant Endpoint - ${e.message}`);
      return { message: e.message, status: 500 };
    }
  }

  async isValidSpecialRule(special_rule_accepted_terms_at){
    try{

      let response = {
        data:{},
        status: true
      };
      if(special_rule_accepted_terms_at){
        response.data = `Participante já aceitou os termos em ${special_rule_accepted_terms_at}`;
        response.status = false;
      }

      return response;
    }catch(e){
      Log.send(`${logError} HomerSimpsonService - isValidSpecialRule Endpoint - ${e.message} - params: 
      ${new URLSearchParams(special_rule_accepted_terms_at)}`);
      return { message: e.message, status: 500 };
    }
  }
}

module.exports = HomerSimpsonService;