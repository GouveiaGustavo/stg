"use strict";

const Env = use('Env');
const Log = new (use('LogHelper'))();
const HomerService = new (use('ApiInterceptorService'))(Env.get('HOMER_URL'));
const logError = `Env: ${Env.get('NODE_ENV')} - JarvisController`;
const moment = require('moment-timezone');
moment.tz.setDefault('America/Sao_paulo');


class SurveyHelper {
    async verifySurveyDateConditions(params) {
        try {
    
          const cycle = params.cycle ? params.cycle : '0';
          params.validated = false;
    
          if(params.cycle === ""){
            params.msg = 'Missing cycle parameter.';
            return params;
          }
    
          if(!params.begin_at || params.begin_at == ""){
            params.msg = 'Missing begin_at parameter.';
            return params;
          }
    
          if(!params.end_at || params.end_at == ""){
            params.msg = 'Missing end_at parameter.';
            return params;
          }
    
          let begin_at = moment.tz(params.begin_at, "America/Sao_paulo").startOf('day');
          let end_at = moment.tz(params.end_at, "America/Sao_paulo").endOf('day');
          let last_cycle_round_at;
    
          if(!begin_at.isValid() || !end_at.isValid()){
            params.msg = 'Invalid date';
            return params;
          }
    
          if(cycle > (end_at.diff(begin_at, 'days'))){
            params.msg = 'Cycle is not within begin and end dates.';
            return params;
          }
    
          if(params.last_cycle_round_at){
            last_cycle_round_at = moment.tz(params.last_cycle_round_at, "America/Sao_paulo");
            if(!last_cycle_round_at.isValid()){
              params.msg = 'Invalid date';
              return params;
            }
            if(!last_cycle_round_at.isBetween(begin_at,end_at)){
              params.msg = 'Last Cycle date is not between begin and end dates';
              return params;
            }
          }
    
          params.begin_at = begin_at.format();
          params.end_at = end_at.format();
          params.last_cycle_round_at = last_cycle_round_at.format();
    
          params.validated = true;
    
          return params;
        } catch (e) {
          Log.send(`${logError} - verifySurveyConditions - ${e.message}`);
          return e.message;
        }
      }
}

module.exports = SurveyHelper;