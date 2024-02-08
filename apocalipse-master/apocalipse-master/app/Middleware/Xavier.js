/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

const Env = use('Env');
const url = require('url');
const XavierService = new (use('ApiInterceptorService'))(Env.get('XAVIER_URL'));

class Xavier {
  /**
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Function} next
   */
  async handle({ request, response, auth }, next) {
    // Call next to advance the request
    const headers = { Authorization: `Bearer ${auth.getAuthHeader()}` };
    const HeimdallService = new (use('ApiInterceptorService'))(Env.get('HEIMDALL_AUTH_URL'));
    const user = await HeimdallService.get('user/token/get', { headers });

    if (user.data.valid) {
      const validRequest = await this.validateRequest(request, user);
      if(!validRequest){
        return response.status(401).json('Unauthorized');
      }

      request.authUserId = user.data.user.id;
      request.xavier = true;
      await next();
    } else {
      return response.status(401).json('Unauthorized');
    }
  }

  async validateRequest(request, customer){
    const userInfo = await XavierService.get(`user/${customer.data.user.id}`);

    if(userInfo.data.admin){
      return true;
    }

    if(request.body.user_id && (request.body.user_id != customer.data.user.id)){
      return false;
    }
    if(request.body.campaign_id){
      const parsedUrl = url.parse(request.request.url, true);
      const endpointHasModule = await XavierService.get(`endpoint-has-module/get?request_url=${parsedUrl.pathname}`);

      if(endpointHasModule.data){
        const moduleRoles = await XavierService.get(`module-roles/get?user_id=${customer.data.user.id}&module_id=${endpointHasModule.data.module_id}&campaign_id=${request.body.campaign_id}&view=1`);

        if(!moduleRoles.data.length > 0){
          return false;
        }
      }
    }

    if(request._all.user_id && (request._all.user_id != customer.data.user.id)){
      return false;
    }
    if(request._all.campaign_id){
      const parsedUrl = url.parse(request.request.url, true);
      const endpointHasModule = await XavierService.get(`endpoint-has-module/get?request_url=${parsedUrl.pathname}`);

      if(endpointHasModule.data){
        const moduleRoles = await XavierService.get(`module-roles/get?user_id=${customer.data.user.id}&module_id=${endpointHasModule.data.module_id}&campaign_id=${request._all.campaign_id}&view=1`);

        if(!moduleRoles.data.length > 0){
          return false;
        }
      }
    }
    return true;
  }
}

module.exports = Xavier;
