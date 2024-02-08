'use strict'

const Log = new (use('LogHelper'))();
const Env = use('Env');
const MarykayService = new (use('ApiInterceptorService'))(Env.get('MARYKAY_URL'));
const JaiminhoService = new (use('ApiInterceptorService'))(Env.get('JAIMINHO_URL'));
const logError = `Env: ${Env.get('NODE_ENV')} - MaryKayController`;
const validator = use('validator');

class MaryKayController {
    async websiteRegister({ request, response }) {
        try {
            const params = request.only(['name', 'email', 'phone', 'office', 'company', 'madeIncentive', 'qtParticipant']);

            if (!params || !params.email) {
                return response.status(400).json('Invalid data');
            }

            if (!validator.isEmail(params.email)) {
                return response.status(400).json('Invalid email');
            }

            const negativeEmail = await MarykayService.get(`email-negative/all-enabled`);
            const negativeWord = await MarykayService.get(`word-negative/all-enabled`);

            if (negativeEmail && negativeEmail.data) {
                for (const invalidEmail of negativeEmail.data) {
                    if (invalidEmail.email === params.email) {
                        return response.status(400).json('Invalid email');
                    }
                }
            }

            if (negativeWord && negativeWord.data) {
                for (const invalidWord of negativeWord.data) {
                    if (validator.contains(params.email, invalidWord.word)) {
                        return response.status(400).json('Invalid email');
                    }
                }
            }

            await MarykayService.put(`lead-register/put`, params);

            const send = await this.sendWebsiteContact(params);
            return response.status(200).json(send.message);
        } catch (e) {
            Log.send(`${logError} - websiteRegister Endpoint - ${e.message}`);
            return response.status(500).json(e.message);
        }
    }

    async sendWebsiteContact(params) {
        try {
            const code = 'WEBSITEREGISTER';
            const senderData = await MarykayService.get(`sender/get?code=${code}&enabled=1`);

            if (senderData.status != 200) {
                return { status: senderData.status, message: 'no senderdata registered' };
            }

            let emailObj = {
                drive: senderData.data[0].drive,
                to: senderData.data[0].to,
                from: senderData.data[0].from,
                reply_to_name: params.name,
                reply_to_email: params.email,
                template: senderData.data[0].template,
                variables: params
            };
            const send = await JaiminhoService.post('insert', emailObj);

            return { status: send.status, message: 'register sended to email' };
        } catch (e) {
            Log.send(`${logError} - sendWebsiteContact Endpoint - ${e.message}`);
            return { status: 500, message: e.message };

        }

    }

    async getWordNegative({ response }) {
        try {
            const negativeWord = await MarykayService.get(`word-negative/all-enabled`);
            return response.status(negativeWord.status).json(negativeWord.data);
        } catch (e) {
            Log.send(`${logError} - getWordNegative Endpoint - ${e.message}`);
            return response.status(500).json(e.message);
        }
    }

    async getEmailNegative({ response }) {
        try {
            const negativeEmail = await MarykayService.get(`email-negative/all-enabled`);
            return response.status(negativeEmail.status).json(negativeEmail.data);
        } catch (e) {
            Log.send(`${logError} - getEmailNegative Endpoint - ${e.message}`);
            return response.status(500).json(e.message);
        }
    }


    async putWordNegative({ request, response }) {
        try {
            const params = request.only(['word']);

            await MarykayService.put(`word-negative/put`, params);

            const negativeWord = await MarykayService.get(`word-negative/all-enabled`);
            return response.status(negativeWord.status).json(negativeWord.data);
        } catch (e) {
            Log.send(`${logError} - putWordNegative Endpoint - ${e.message}`);
            return response.status(500).json(e.message);
        }
    }

    async putEmailNegative({ request, response }) {
        try {
            const params = request.only(['email']);

            await MarykayService.put(`email-negative/put`, params);

            const negativeEmail = await MarykayService.get(`email-negative/all-enabled`);
            return response.status(negativeEmail.status).json(negativeEmail.data);
        } catch (e) {
            Log.send(`${logError} - putEmailNegative Endpoint - ${e.message}`);
            return response.status(500).json(e.message);
        }
    }

    async deleteWordNegative({ request, response }) {
        try {
            const params = request.only(['id']);

            if (!params && !params.id) {
                return response.status(401).json('No data informed');
            }
            await MarykayService.post(`word-negative/remove`, params);

            const negativeWord = await MarykayService.get(`word-negative/all-enabled`);
            return response.status(negativeWord.status).json(negativeWord.data);
        } catch (e) {
            Log.send(`${logError} - deleteWordNegative Endpoint - ${e.message}`);
            return response.status(500).json(e.message);
        }
    }

    async deleteEmailNegative({ request, response }) {
        try {
            const params = request.only(['id']);
            if (!params && !params.id) {
                return response.status(401).json('No data informed');
            }
            await MarykayService.post(`email-negative/remove`, params);

            const negativeEmail = await MarykayService.get(`email-negative/all-enabled`);
            return response.status(negativeEmail.status).json(negativeEmail.data);
        } catch (e) {
            Log.send(`${logError} - deleteEmailNegative Endpoint - ${e.message}`);
            return response.status(500).json(e.message);
        }
    }
}

module.exports = MaryKayController
