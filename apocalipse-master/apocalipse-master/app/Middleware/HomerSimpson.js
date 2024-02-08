'use strict';
/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

const Env = use('Env');

class HomerSimpson {
  /**
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Function} next
   */
  async handle({ request, response, auth }, next) {
    // Call next to advance the request
    const headers = { Authorization: `bearer ${auth.getAuthHeader()}` };
    const HeimdallService = new (use('ApiInterceptorService'))(
      Env.get('HEIMDALL_HOMER_URL'),
      headers
    );

    const participant = await HeimdallService.get('token/get');
    if(request.body.participant_id && request.body.participant_id != participant.data.participant.participant_id){
      return response.status(401).json('Unauthorized');
    }
    if(request._all.participant_id && request._all.participant_id != participant.data.participant.participant_id){
      return response.status(401).json('Unauthorized');
    }
    if (participant.status === 200) {
      request.participant = participant.data ? participant.data.participant : null;
      await next();
    } else {
      return response.status(401).json('Unauthorized');
    }
  }
}

module.exports = HomerSimpson;
