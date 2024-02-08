const LogsService = require('../../Providers/LogsService');

class LogsController {
  constructor() {
    this.logsService = new LogsService();
  }

async createLog(Params) {
  let params = Params;
  let result = await this.logsService.createLogs(params);
  return result;
}

  async getLogByFilter({ request, response }) {
    let params = request.all();
    let result = await this.logsService.getLogByFilter(params);
    return response.status(result.status).json(result.data);
  }

  async getLogsCount({ request, response }) {
    let params = request.all();
    let result = await this.logsService.getLogsCount(params);
    return response.status(result.status).json(result.data);
  }
}

module.exports = LogsController;
