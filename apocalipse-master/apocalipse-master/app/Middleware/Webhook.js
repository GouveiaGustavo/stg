'use strict'
/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */
const Env = use("Env");

class Webhook {
  /**
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Function} next
   */
  async handle({
    request,
    response
  }, next) {
    // call next to advance the request
    const token = request.only("token");
    if (token.token !== Env.get("WEBHOOK_TOKEN")) {
      return response.status(401).json({ Message: "Unauthorized"});
    }
    await next()
  }
}

module.exports = Webhook