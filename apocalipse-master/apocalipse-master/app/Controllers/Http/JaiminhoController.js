'use strict';

const Log = new (use('LogHelper'))();
const Env = use('Env');
const JaiminhoService = new (use('ApiInterceptorService'))(Env.get('JAIMINHO_URL'));

class JaiminhoController {
  async sendWebsiteContact({ request, response }) {
    try {
      const params = request.only(['name', 'email', 'phone', 'office', 'company']);

      let emailObj = {};
      emailObj.drive = 'sendgrid';
      emailObj.to = 'vamos@incentivar.io';
      emailObj.from = 'noreply@incentivar.io';
      emailObj.reply_to_name = params.name;
      emailObj.reply_to_email = params.email;
      emailObj.template = 'IncentivarWebsiteContact';
      emailObj.variables = params;
      const send = await JaiminhoService.post('insert', emailObj);

      return response.status(200).json(send);
    } catch (e) {
      Log.send('Env: ' + Env.get('NODE_ENV') + ' - JaiminhoController - send Endpoint - ' + e.message);
      return response.status(500).json(e.message);
    }
  }
}

module.exports = JaiminhoController;
