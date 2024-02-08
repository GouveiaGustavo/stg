const Env = use('Env');
const Log = new (use('LogHelper'))();
const querystring = use('querystring');
const logError = `Env: ${Env.get('NODE_ENV')} - OracleController`;
const HomerService = new (use('ApiInterceptorService'))(Env.get('HOMER_URL'));
const OracleService = new (use('ApiInterceptorService'))(Env.get('ORACLE_URL'));
const XavierService = new (use('ApiInterceptorService'))(Env.get('XAVIER_URL'));

class OracleController {
  async allTickets({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'participant_id']);

      // If(params.participant_id != request.authUserId){
      //   Return response.status(403).json('Unauthorized.');
      // }

      const tickets = await OracleService.get(
        `twu-ticket/all?campaign_id=${params.campaign_id}&participant_id=${params.participant_id}`
      );

      return response.status(200).json(tickets);
    } catch (e) {
      Log.send(`${logError} - allTickets Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async put({ request, response }) {
    try {
      const params = request.only([
        'id',
        'participant_id',
        'campaign_id',
        'content',
        'subject_id',
        'situation_id',
        'user_id',
        'enabled',
        'sended_by',
        'identifier',
        'satisfaction',
        'created_at',
        'closed_at',
        'subject',
        'limit',
        'page',
        'perPage'
      ]);

      const ticket = await OracleService.put(`twu-ticket/put`, params);

      return response.status(200).json(ticket);
    } catch (e) {
      Log.send(`${logError} - put Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async updateTicket({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'situation_id', 'ticket_id', 'user_id']);

      if (!params.campaign_id || (!params.ticket_id && !(params.situation_id || params.user_id))) {
        return response.status(401).json('Missing basic data on request');
      }

      const ticket = await OracleService.put(`twu-ticket/update-ticket`, params);

      return response.status(ticket.status).json(ticket.data);
    } catch (e) {
      Log.send(`${logError} - updateTicket Endpoint - ${e.message}`);
      return response.status(e.status).json(e.message);
    }
  }

  async getAllSituations({ request, response }) {
    try {
      const status = await OracleService.get(`twu-situation/all`);

      return response.status(200).json(status);
    } catch (e) {
      Log.send(`${logError} - put Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getTicketsById({ request, response }) {
    try {
      const params = request.only(['historic_id']);
      const ticket = await OracleService.get(`twu-ticket/${params.historic_id}`);

      return response.status(200).json(ticket);
    } catch (e) {
      Log.send(`${logError} - getTicketsById Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getTickets({ request, response }) {
    try {
      const params = request.only([
        'id',
        'code',
        'document',
        'participant_id',
        'campaign_id',
        'subject_id',
        'situation_id',
        'situation',
        'user_id',
        'enabled',
        'identifier',
        'satisfaction',
        'created_at',
        'closed_at',
        'subject',
        'limit',
        'page',
        'perPage',
        'search'
      ]);

      if (!params.campaign_id) {
        return response.status(400).json('Bad Request.');
      }

      if (params.search) {
        if (params.search.indexOf('#') == 0) {
          params.identifier = params.search.replace('#', '%23');
        } else {
          let queryParticipant = `participant/search?campaign_id=${params.campaign_id}&search=${params.search}`;
          const participant = await HomerService.get(`${queryParticipant}`);

          if (participant && participant.data && participant.data[0]) {
            params.participant_id = participant.data[0].id;
          } else {
            return response.status(404).json('Participant not found.');
          }
        }
      }

      let query = 'twu-ticket/get?';

      if (params.id) {
        query += `id=${params.id}&`;
      }
      if (params.participant_id) {
        query += `participant_id=${params.participant_id}&`;
      }
      if (params.campaign_id) {
        query += `campaign_id=${params.campaign_id}&`;
      }
      if (params.subject_id) {
        query += `subject_id=${params.subject_id}&`;
      }
      if (params.situation_id) {
        query += `situation_id=${params.situation_id}&`;
      }
      if (params.situation) {
        query += `situation=${params.situation}&`;
      }
      if (params.user_id) {
        query += `user_id=${params.user_id}&`;
      }
      if (params.enabled) {
        query += `enabled=${params.enabled}&`;
      }
      if (params.identifier) {
        query += `identifier=${params.identifier.replace('#', '%23')}&`;
      }
      if (params.satisfaction) {
        query += `satisfaction=${params.satisfaction}&`;
      }
      if (params.created_at) {
        query += `created_at=${params.created_at}&`;
      }
      if (params.closed_at) {
        query += `closed_at=${params.closed_at}&`;
      }
      if (params.page) {
        query += `page=${params.page}&`;
      }
      if (params.perPage) {
        query += `perPage=${params.perPage}`;
      }

      const { data } = await OracleService.get(query);

      return response.status(200).json(data);
    } catch (e) {
      Log.send(`${logError} - getTickets Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }
  async getHistoric({ request, response }) {
    try {
      const params = request.only(['ticket_id']);
      const historic = await OracleService.get(`twu-historic/get?ticket_id=${params.ticket_id}`);

      return response.status(200).json(historic.data);
    } catch (e) {
      Log.send(`${logError} - getHistoric Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async createTicket({ request, response }) {
    try {
      const params = request.only([
        'subject_id',
        'attachment',
        'content',
        'sended_by',
        'campaign_id',
        'participant_id',
        'ticket_id'
      ]);

      let uri = 'twu-ticket';

      if (params.ticket_id) {
        uri = 'twu-historic';
      }

      const data = await OracleService.put(`${uri}/put`, params);

      return response.status(200).json(data);
    } catch (e) {
      Log.send(`${logError} - createTicket Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getSubjects({ request, response }) {
    try {
      const params = request.only(['campaign_id']);

      if (!params.campaign_id) {
        return response.status(500).json('You need inform campaign_id.');
      }

      const subjects = await OracleService.get(`twu-subject/get?campaign_id=${params.campaign_id}`);

      return response.status(200).json(subjects);
    } catch (e) {
      Log.send(`${logError} - getSubjects Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async putHistoric({ request, response }) {
    try {
      const params = request.only([
        'id',
        'attachment',
        'content',
        'sended_by',
        'campaign_id',
        'participant_id',
        'ticket_id',
        'user_id',
        'participant_id'
      ]);

      if (!params.ticket_id) {
        return response.status(401).json('ticket_id not informed');
      }

      const uri = 'twu-historic';

      return response.status(200).json(await OracleService.put(`${uri}/put`, params));
    } catch (e) {
      Log.send(`${logError} - putHistoric Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async twuDataBoard({ request, response }) {
    try {
      const params = request.only(['campaign_id']);

      if (!params.campaign_id) {
        return response.status(400).json('Bad Request');
      }

      const dataBoard = await OracleService.get(`twu-ticket/data-board?campaign_id=${params.campaign_id}`);
      return response.status(200).json(dataBoard);
    } catch (e) {
      Log.send(`${logError} - twuDataBoard Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getTicketsResume({ request, response }) {
    try {
      const params = request.only(['campaign_id']);

      if (!params.campaign_id) {
        return response.status(400).json('Bad Request');
      }

      const resume = await OracleService.get(`twu-ticket/resume?campaign_id=${params.campaign_id}`);
      return response.status(200).json(resume);
    } catch (e) {
      Log.send(`${logError} - getTicketsResume Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async ticketsPost({ request, response }) {
    try {
      const params = request.only(['token', 'campaign_id', 'content', 'participant_id', 'subject_id', 'sended_by']);

      if (!params.token) {
        return response.status(400).json({ type_error: 1, message: 'Missing token parameter.' });
      }

      if (!params.campaign_id) {
        return response.status(400).json({ type_error: 1, message: 'Missing campaign_id parameter.' });
      }

      if (!params.content) {
        return response.status(400).json({ type_error: 1, message: 'Missing content parameter.' });
      }

      if (!params.participant_id) {
        return response.status(400).json({ type_error: 1, message: 'Missing participant_id parameter.' });
      }

      if (!params.subject_id) {
        return response.status(400).json({ type_error: 1, message: 'Missing subject_id parameter.' });
      }

      if (!params.sended_by) {
        return response.status(400).json({ type_error: 1, message: 'Missing sended_by parameter.' });
      }

      const resultXavier = await XavierService.get(`campaign/get-tmp?id=${params.campaign_id}`);

      if (resultXavier.data.length === 0) {
        return response.status(400).json({ type_error: 1, message: 'Campaign not found.' });
      }

      if (resultXavier.data['data'][0].campaign_uid !== params.token) {
        return response.status(401).json({ type_error: 1, message: 'Invalid Token!' });
      }

      await OracleService.put(`twu-ticket/put`, params);

      return response.status(200).json({ type_error: 0, message: 'ok' });
    } catch (e) {
      Log.send(
        `${logError} ticketsPost Endpoint - ${e.message} - ${querystring.stringify(
          request.only(['token', 'campaign_id', 'content', 'participant_id', 'subject_id', 'sended_by'])
        )}`
      );
      return response.status(500).json({ type_error: 1, message: e.message });
    }
  };
}

module.exports = OracleController;
