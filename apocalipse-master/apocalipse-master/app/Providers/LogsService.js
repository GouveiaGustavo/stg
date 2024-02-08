const Env = use('Env');
const LogService = new (use('ApiInterceptorService'))(Env.get('LOGURL'));

class LogsService{
  async createLogs(params){
    let result = await LogService.post('logs', params);
    return result
  }

  async getLogs(params){
    let result = await LogService.get('logs', {params});
    return result
  }

  async getLogByFilter(params){
    let result = await LogService.get(`logs/filters/one`, {params});
    return result
  }

  async getLogsCount(params) {
    return await LogService.get(`logs/count`, {params});
  }
}

module.exports = LogsService