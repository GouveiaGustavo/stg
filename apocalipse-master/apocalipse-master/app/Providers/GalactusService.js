'use strict';

const Env = use('Env');
const Log = new (use('LogHelper'))();
const RobinService = new (use('ApiInterceptorService'))(Env.get('ROBIN_URL'));
const FileDetailMessage = use('FileDetailMessage');
const GalactusServiceInstance = new (use('ApiInterceptorService'))(Env.get('GALACTUS20_URL'));
const XavierServiceInstance = new (use('ApiInterceptorService'))(Env.get('XAVIER_URL'));
const successStatus = 'SUCCESS';
class GalactusService{
  async runPointsRelease(fileWithDetails) {
    try {
      let rowCount = 1;
      if (fileWithDetails && fileWithDetails.fileDetail) {
        for (const row of fileWithDetails.fileDetail) {
          await this.processRow(row,fileWithDetails,rowCount);
          rowCount++;
        }
      }
      Log.sendPointsRelease(
        `${Env.get('NODE_ENV')} Liberação de Pontos - Ajustes de pontos do arquivo (${fileWithDetails.id}) na campanha (${fileWithDetails.campaign_id}) foram criados, aguardando processamento.`
      );
      return rowCount;
    } catch (error) {
      throw new Error(error);
    }
  }

  async processRow(row,fileWithDetails,rowCount){
    try {
      //São processadas apenas linhas com sucesso.
      if(row.status && row.status === successStatus){
        const line = JSON.parse(row.line);
        let item = {};
        /*Criação do objeto de ajuste.
          Os pontos são convertidos e é extraido o valor em módulo da pontuação, o preset_id = 1 indica crédito, e 2 retirada de pontos.
          O preset_id também vão determinar se os créditos voltam pra campanha através dos valores indicados na tabela robinhood.adjustment_preset.*/
        item.points = parseFloat(line.Pontos);
        if (item.points >= 0) {
          item.preset_id = 1;
        } else {
          item.preset_id = 2;
        }
        item.points = Math.abs(item.points);
        item.participant_id = line.participant_id;
        item.campaign_id = fileWithDetails.campaign_id;
        item.user_id = fileWithDetails.user_id;
        item.justification = line.Descricao;
        item.fileProcess = true;

        const adjust = await RobinService.post('adjustment-point/post', item);
        //Se o ajuste não for criado com sucesso então os pontos devem ser devolvidos a campanha.
        if(!adjust.status || adjust.status !== 200){
          const campaignCredits = await XavierServiceInstance.put(`campaign-credit/refund`, { credits: item.points, campaign_id: item.campaign_id });
          let result = JSON.parse(row.result);
          result.push(new FileDetailMessage(JSON.stringify(adjust), rowCount));
          await GalactusServiceInstance.put('file-detail/put',{
            id: row.id,
            result: JSON.stringify(result),
            status: 'ERROR'
          });
          Log.sendPointsRelease(
            `${Env.get('NODE_ENV')} Liberação de Pontos - Estorno iniciado para campanha (${fileWithDetails.campaign_id}), linha ${rowCount}, pontos (${item.points}).`
          );
          if(!campaignCredits.status || campaignCredits.status !== 200){
            Log.sendPointsRelease(
              `${Env.get('NODE_ENV')} Liberação de Pontos - Falha no estorno de pontos para campanha (${fileWithDetails.campaign_id}), linha ${rowCount}, pontos (${item.points}).`
            );
          }
        }
        return adjust;
      }
    } catch (error) {
      Log.sendPointsRelease(
        `${Env.get('NODE_ENV')} Liberação de Pontos - (${error.message}) na linha (${rowCount}).`
      );
      //Em caso de erro atualiza informações e status na tabela file_detail.
      let result = JSON.parse(row.result);
      result.push(new FileDetailMessage(error.message, rowCount));
      GalactusServiceInstance.put('file-detail/put',{
        id: row.id,
        result: JSON.stringify(result),
        status: 'ERROR'
      });
      //Se ocorrer erro e a linha não for processada corretamente os pontos devem ser devolvidos a campanha
      const line = JSON.parse(row.line);
      const campaignCredits = await XavierServiceInstance.put(`campaign-credit/refund`, { credits: parseFloat(line.Pontos), campaign_id: fileWithDetails.campaign_id });
      if(!campaignCredits.status || campaignCredits.status !== 200){
        Log.sendPointsRelease(
          `${Env.get('NODE_ENV')} Liberação de Pontos - Falha no estorno de pontos para campanha (${fileWithDetails.campaign_id}), linha (${rowCount}), pontos (${parseFloat(line.Pontos)}).`
        );
      }
    }
  }

  async removeCampaignPoints(fileWithDetails) {
    const { campaign_id, file_points: credits } = fileWithDetails;
    const creditObj = await XavierServiceInstance.put('campaign-credit/remove', { campaign_id, credits });
    return creditObj;
  }
};

module.exports = GalactusService;