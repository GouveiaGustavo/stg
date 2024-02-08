'use strict'
/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */
const Env = use("Env");

class Uatu {
  /**
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Function} next
   */
  async handle({ request, response, }, next) {
    const token = request.only("token");
    if (token.token !== Env.get("UATU_NESTLE_JWT_TOKEN")) {
      return response.status(404).json("Não Autorizado");
    }
    // call next to advance the request
    await next()
  }

  /**
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Function} next
   */
  async wsHandle({ request }, next) {

    // call next to advance the request
    await next()
  }
}

module.exports = Uatu
