const Log = new (use('LogHelper'))();
const Env = use('Env');
const GalactusService = new (use('ApiInterceptorService'))(Env.get('GALACTUS20_URL'));
const XavierService = new (use('ApiInterceptorService'))(Env.get('XAVIER_URL'));
const GalactusProviderService = new (use('GalactusService'))();
const { DateTime } = use('luxon');

class GalactusController {
  async getFileTypeEnabled({ request, response }) {
    try {
      const params = request.only(['campaign_id']);
      const page = await GalactusService.get(`file-type/enabled/get?campaign_id=${params.campaign_id}`);

      return response.status(200).json(page.data);
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - GalactusController - getFileTypeEnabled Endpoint - ${e.message}`,
      );
      return response.status(500).json(e.message);
    }
  }

  async getFileStatusEnabled({ request, response }) {
    try {
      const page = await GalactusService.get(`file-status/enabled/get`);

      return response.status(200).json(page.data);
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - GalactusController - getFileStatusEnabled Endpoint - ${e.message}`,
      );
      return response.status(500).json(e.message);
    }
  }

  async getParamsPagination({ request, response }) {
    try {
      let fields = [
        'file_type_id',
        'campaign_id',
        'file_status_id',
        'from',
        'to',
        'original_name',
        'page',
        'limit',
        'pending_points'
      ];

      let parameters = '';

      let fieldsEndPoint = request.all();

      for (let i in fields) {
        for (let y in Object.keys(fieldsEndPoint)) {
          if (fields[i] == Object.keys(fieldsEndPoint)[y])
            parameters += `${fields[i]}=${Object.values(fieldsEndPoint)[y]}&`;
        }
      }

      parameters = parameters.substr(0, parameters.length - 1);

      const urlEndPoint = 'file/params/get';

      const page = await GalactusService.get(`${urlEndPoint}?${parameters}`);

      return response.status(200).json(page.data);
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - GalactusController - getParamsPagination Endpoint - ${e.message}`,
      );
      return response.status(500).json(e.message);
    }
  }

  async runPointsRelease({ params, response }) {
    try {
      const { file_id } = params;
      //Busca as informações da planilha de upload de pontos que estão salvas na tabela file_detail.
      const fileRequest = await GalactusService.get(`file-with-detail/${file_id}`);
      if(!fileRequest.data.length){
        return response.status(400).json({ message: 'Arquivo não encontrado.' });
      }
      const fileWithDetails = fileRequest.data[0];

      if(fileWithDetails.points_release_date){
        return response.status(400).json({ message: 'Liberação de pontos já foi executada para este arquivo.' });
      }

      if(!fileWithDetails.file_points){
        return response.status(400).json({ message: 'O arquivo não possui pontos para serem distribuídos.' });
      }

      if(!fileWithDetails.campaign_id){
        return response.status(400).json({ message: 'O arquivo não possui um identificador de campanha.' });
      }

      const campaigncredit = await XavierService.get(`campaign-credit/get?campaign_id=${fileWithDetails.campaign_id}`);
      if(!campaigncredit.data[0].credits || campaigncredit.data[0].credits < fileWithDetails.file_points){
        return response.status(400).json({ message: 'Campanha não possui créditos suficientes.' });
      }

      Log.sendPointsRelease(
        `${Env.get('NODE_ENV')} Liberação de Pontos - Enviada para o arquivo (${file_id}) na campanha (${fileWithDetails.campaign_id}).`
      );
      //Remove pontos da campanha.
      await GalactusProviderService.removeCampaignPoints(fileWithDetails);
      //Envia linhas para o processamento.
      GalactusProviderService.runPointsRelease(fileWithDetails);
      //Atualiza horario de liberação dos pontos.
      await GalactusService.put('file/put',{
        id: file_id,
        points_release_date: DateTime.local().toISO()
      });

      return response.status(200).json({ data:{ message: `Liberação de pontos executada para arquivo de id: ${file_id}` } });

    } catch (e) {
      Log.sendPointsRelease(
        `Env: ${Env.get('NODE_ENV')} - GalactusController - runPointsRelease Endpoint - ${e.message}`
      );
      return response.status(500).json(e.message);
    }
  }

  async updateFileEnabled({ request, response }) {
    try {
      const params = request.all();
      const fileRequest = await GalactusService.get(`file-with-detail/${params.id}`);

      if(!fileRequest.data.length){
        return response.status(400).json({ message: 'Arquivo não encontrado.' });
      }

      const fileWithDetails = fileRequest.data[0];

      if(fileWithDetails.points_release_date){
        return response.status(400).json({ message: 'Liberação de pontos já foi executada para este arquivo.' });
      }

      const filePut = await GalactusService.put('file/put', params);

      if(filePut.status != 200){
        return response.status(filePut.status).json({ data:{ message: 'Falha na atualização do campo enabled' }});
      }
      
      return response.status(200).json({ data:{ message: 'Atualização realizada com sucesso!' }});

    } catch (e) {
      Log.sendPointsRelease(
        `Env: ${Env.get('NODE_ENV')} - GalactusController - updateFileEnabled Endpoint - ${e.message}`
      );
      return response.status(500).json(e.message);
    }
  }
}

module.exports = GalactusController;
