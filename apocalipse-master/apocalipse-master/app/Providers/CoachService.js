'use strict';

const Env = use('Env');
const CoachServices = new (use('ApiInterceptorService'))(Env.get('COACH_URL'));

class CoachService{

  async getCnpj(param){
    try {
      return await CoachServices.get(`/api/v1/getUserByCnpj/${param.cnpj}/${param.id}`);
    } catch (error) {
      throw new Error(error);
    }
  };

  async getParticipantId(param){
    try {
      return await CoachServices.get(`/api/v1/findone/${param}`);
    } catch (error) {
      throw new Error(error);
    }
  };

};


module.exports = CoachService;