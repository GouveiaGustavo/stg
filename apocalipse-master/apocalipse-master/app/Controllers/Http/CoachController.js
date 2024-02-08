'use strict';
const Env = use('Env');
const Log = new (use('LogHelper'))();
const logError = `Env: ${Env.get('NODE_ENV')} - coachController`;
const CoachService = require('../../Providers/CoachService');

class CoachController {

  async getCnpj({ request, response }){
    try{
      const getData = new CoachService();
      let paramsData = { cnpj: request.qs.cnpj, id: request.qs.id };
      let result = await getData.getCnpj(paramsData);
      return response.status(200).json(result);
    }catch(e){
      Log.send(`${logError} CoachController - getCnpj - ${e.message} params:
      ${new URLSearchParams(request.qs.id, request.qs.cnpj)}`);
      return response.status(500).json({ message: e.message });
    }
  }

  async getParticipantId({ request, response }){
    try{
      const id = request.params.id;
      let getData = new CoachService();
      let result = await getData.getParticipantId(id);
      return response.status(200).json(result);
    }catch(e){
      Log.send(`${logError} CoachController - getParticipantId - ${e.message} params:
      ${new URLSearchParams(request.params.id)}`);
      return response.status(500).json({ message: e.message });
    }
  }
}


module.exports = CoachController;