const Env = use('Env');
const Log = new (use('LogHelper'))();
const logError = `Env: ${Env.get('NODE_ENV')} - HomerSimpsonController`;
const HomerService = new (use('ApiInterceptorService'))(Env.get('HOMER_URL'));
const JarvisService = new (use('ApiInterceptorService'))(Env.get('JARVIS_URL'));
const XavierService = new (use('ApiInterceptorService'))(Env.get('XAVIER_URL'));
const { DateTime } = require('luxon');

class ValidationHelper {
  /*Base de verificação de CPF retirado do site da receita federal
    www.receita.fazenda.gov.br/aplicacoes/atcta/cpf/funcoes.js */
  async verifyCPF(strCPF, campaign_id) {
    let Soma = 0;
    let Resto = 0;
    let i = 0;
    let response = {};
    response.status = false;

    if (strCPF == '00000000000'){
      response.message = 'Invalid CPF';
      return response;
    }

    if (strCPF.length != 11) {
      response.message = 'Invalid CPF';
      return response;
    }

    for (i=1; i<=9; i++) {
      Soma = Soma + parseInt(strCPF.substring(i-1, i)) * (11 - i);
    }
    Resto = (Soma * 10) % 11;

    if ((Resto == 10) || (Resto == 11)){
      Resto = 0;
    }
    if (Resto != parseInt(strCPF.substring(9, 10)) ) {
      response.message = 'Invalid CPF';
      return response;
    }

    Soma = 0;
    for (i = 1; i <= 10; i++){
      Soma = Soma + parseInt(strCPF.substring(i-1, i)) * (12 - i);
    }
    Resto = (Soma * 10) % 11;

    if ((Resto == 10) || (Resto == 11)){
      Resto = 0;
    }

    if (Resto != parseInt(strCPF.substring(10, 11) ) ){
      response.message = 'Invalid CPF';
      return response;
    }

    const participant = await HomerService.get(`participant/get?document=${strCPF}`);

    if (participant.status === 200) {
      for (const campaign of participant.data.campaign) {
        if (campaign.campaign_id == campaign_id) {
          response.status = false;
          response.message = `Participant with specified CPF already exists for campaign ${campaign_id}`;
          return response;
        }
      }
    }

    response.status = true;
    response.message = 'Validated';
    return response;
  }

  /*Base de verificação de CNPJ,
    https://www.geradorcnpj.com/javascript-validar-cnpj.htm */
  async verifyCNPJ(cnpj, campaign_id) {

    let response = {};
    response.status = false;

    cnpj = cnpj.replace(/[^\d]+/g,'');

    if(cnpj == ''){
      response.message = 'Invalid CNPJ';
      return response;
    }

    if (cnpj.length != 14){
      response.message = 'Invalid CNPJ';
      return response;
    }

    // Elimina CNPJs invalidos conhecidos
    if (cnpj == '00000000000000' ||
            cnpj == '11111111111111' ||
            cnpj == '22222222222222' ||
            cnpj == '33333333333333' ||
            cnpj == '44444444444444' ||
            cnpj == '55555555555555' ||
            cnpj == '66666666666666' ||
            cnpj == '77777777777777' ||
            cnpj == '88888888888888' ||
            cnpj == '99999999999999') {
      response.message = 'Invalid CNPJ';
      return response;
    }

    // Valida DVs
    let tamanho = cnpj.length - 2
    let numeros = cnpj.substring(0,tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    let i = 0;
    for (i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2)
        pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(0)) {
      response.message = 'Invalid CNPJ';
      return response;
    }

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0,tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2)
        pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(1)) {
      response.message = 'Invalid CNPJ';
      return response;
    }

    const participant = await HomerService.get(`participant/get?document=${cnpj}`);

    if (participant.status === 200) {
      for (const campaign of participant.data.campaign) {
        if (campaign.campaign_id == campaign_id) {
          response.status = false;
          response.message = `Participant with specified CNPJ already exists for campaign ${campaign_id}`;
          return response;
        }
      }
    }

    response.status = true;
    response.message = 'Validated';
    return response;

  }

  // Abaixo temos a validação de data e hora de pagamento. o weekday representa o dia da semana.
  // Sendo 1 segunda e 7 domingo
  checkDateTime() {
    let response = {
      status: 200,
      message: 'Validated'
    };
    try {
      const curTime = DateTime.now();

      const weekday = curTime.weekday;

      if(weekday == 6 || weekday == 7){
        response.status = 403;
        response.message = 'Payment outside of week day is not allowed.';
        return response;
      }else{
        const startOfPeriod = DateTime.now().startOf('day').plus({ hours:8 });
        const endOfPeriod = DateTime.now().endOf('day').minus({ hours:4 });
        if(!(curTime > startOfPeriod) || !(curTime < endOfPeriod)){
          response.status = 403;
          response.message = 'Payment outside of work hours is not allowed.';
          return response;
        }
      }

      return response;
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - ValidationHelper - checkDateTime Endpoint -  ${e.message}`
      );
      response.status = 500;
      response.message = e.message;
      return response;
    }
  }

  validateEmail (emailAdress) {
    let regexEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (emailAdress.match(regexEmail)) {
      return true;
    } else {
      return false;
    }
  }

  async validateExternalFocusUpdate (line) {
    let resultLine = {};

    if (!line.goal) {
      resultLine.status = 'Error';
      resultLine.message = 'Faltando parâmetro goal';
      return resultLine;
    }

    if (!line.result) {
      resultLine.status = 'Error';
      resultLine.message = 'Faltando parâmetro result';
      return resultLine;
    }

    if (line.points < 0) {
      resultLine.status = 'Error';
      resultLine.message = 'Faltando parâmetro points';
      return resultLine;
    }

    if (!line.grupo) {
      resultLine.status = 'Error';
      resultLine.message = 'Faltando parâmetro grupo';
      return resultLine;
    }

    if (!line.cargo) {
      resultLine.status = 'Error';
      resultLine.message = 'Faltando parâmetro cargo';
      return resultLine;
    }

    if (!line.email) {
      resultLine.status = 'Error';
      resultLine.message = 'Faltando parâmetro email';
      return resultLine;
    }

    if (!line.configuration_id) {
      resultLine.status = 'Error';
      resultLine.message = 'Faltando parâmetro configuration_id';
      return resultLine;
    }

    if(isNaN(line.result) || isNaN(line.goal) || isNaN(line.points)){
      resultLine.status = 'Error';
      resultLine.message = 'Invalido parâmetro result, goal ou points, valor deve ser um número.';
      return resultLine;
    }

    if(line.result < 0 || line.goal < 0 || line.points < 0){
      resultLine.status = 'Error';
      resultLine.message = 'Invalido parâmetro result, goal ou points, valor deve ser maior do que 0.';
      return resultLine;
    }

    if(!(typeof line.cargo === 'string') || !(typeof line.grupo === 'string') || !(typeof line.email === 'string')){
      resultLine.status = 'Error';
      resultLine.message = 'Invalido parâmetro cargo, grupo ou email, valor deve ser um string';
      return resultLine;
    }

    const validationEmail = this.validateEmail(line.email);
    if((!validationEmail)){
      resultLine.status = 'Error';
      resultLine.message = 'Invalido parâmetro email.';
      return resultLine;
    }

    const config = await JarvisService.get(`external/mechanic-config/${line.configuration_id}`);
    if(config.data.campaign_id){
      resultLine.campaign_id = config.data.campaign_id;
    }else{
      resultLine.status = 'Error';
      resultLine.message = 'Invalido parâmetro configuration_id.';
      return resultLine;
    }

    if(!config.data.finished){
      resultLine.status = 'Error';
      resultLine.message = 'Foi informada uma mecânica ainda não liberada.';
      return resultLine;
    }

    return resultLine;
  }

  async validateExternalMechanicConfig (line) {
    let resultLine = {};
    //Se não existir um id de configuração então é considerado como criação de configuração.
    if (!line.id) {
      if (!line.campaign_id || isNaN(line.campaign_id)) {
        resultLine.status = true;
        resultLine.message = 'Faltando ou invalido o parâmetro campaign_id';
        return resultLine;
      }

      const campaign = await XavierService.get(`campaign/${line.campaign_id}`);
      if (campaign.status != 200) {
        resultLine.status = true;
        resultLine.message = 'Campanha não encontrada';
        return resultLine;
      }
    }

    if (!line.client_mechanic_type || isNaN(line.client_mechanic_type)) {
      resultLine.status = true;
      resultLine.message = 'Faltando ou invalido o parâmetro client_mechanic_type';
      return resultLine;
    }

    if (!line.name) {
      resultLine.status = true;
      resultLine.message = 'Faltando parâmetro name';
      return resultLine;
    }

    if (!line.audience_type_id || isNaN(line.audience_type_id)) {
      resultLine.status = true;
      resultLine.message = 'Faltando ou invalido o parâmetro audience_type_id';
      return resultLine;
    }

    const audienceType = await JarvisService.get(`audience-type/${line.audience_type_id}`);

    if(audienceType.status != 200){
      resultLine.status = true;
      resultLine.message = 'Tipo de público não encontrado';
      return resultLine;
    }

    if (!line.purpose) {
      resultLine.status = true;
      resultLine.message = 'Faltando parâmetro purpose';
      return resultLine;
    }

    if (!line.description) {
      resultLine.status = true;
      resultLine.message = 'Faltando parâmetro description';
      return resultLine;
    }

    if (!line.nomenclature) {
      resultLine.status = true;
      resultLine.message = 'Faltando parâmetro nomenclature';
      return resultLine;
    }

    if (!line.invoice_type) {
      resultLine.status = true;
      resultLine.message = 'Faltando parâmetro invoice_type';
      return resultLine;
    }

    if (!line.cycle) {
      resultLine.status = true;
      resultLine.message = 'Faltando parâmetro cycle';
      return resultLine;
    }

    if (!line.invoice_type.length > 0) {
      resultLine.status = true;
      resultLine.message = 'Faltando parâmetro invoice_type';
      return resultLine;
    }

    if (!line.nomenclature) {
      resultLine.status = true;
      resultLine.message = 'Faltando parâmetro nomenclature';
      return resultLine;
    }

    if (line.points < 0 || isNaN(line.points)) {
      resultLine.status = true;
      resultLine.message = 'Faltando ou invalido parâmetro points';
      return resultLine;
    }

    if (!line.hasOwnProperty('ranking')) {
      resultLine.status = true;
      resultLine.message = 'Faltando parâmetro ranking';
      return resultLine;
    }

    for(let invoiceType of line.invoice_type){
      if (invoiceType < 0 || isNaN(invoiceType)) {
        resultLine.status = true;
        resultLine.message = 'Faltando ou invalido parâmetro invoice_type';
        return resultLine;
      }
    }

    if (!line.PED_file) {
      resultLine.status = true;
      resultLine.message = 'Faltando parâmetro PED_file';
      return resultLine;
    }

    if (!line.config) {
      resultLine.status = true;
      resultLine.message = 'Faltando parâmetro config';
      return resultLine;
    }

    if (!line.products) {
      resultLine.status = true;
      resultLine.message = 'Faltando parâmetro products';
      return resultLine;
    }

    if (!line.products.length > 0) {
      resultLine.status = true;
      resultLine.message = 'Faltando parâmetro products';
      return resultLine;
    }

    let productsList = [];

    for(let product of line.products){
      if (!product.product_id) {
        resultLine.status = true;
        resultLine.message = 'Faltando ou invalido parâmetro product_id';
        return resultLine;
      }

      if (!product.product_id.length > 0) {
        resultLine.status = true;
        resultLine.message = 'Faltando ou invalido parâmetro product_id';
        return resultLine;
      }

      if (!product.weight < 0 || isNaN(product.weight)) {
        resultLine.status = true;
        resultLine.message = 'Faltando ou invalido parâmetro weight';
        return resultLine;
      }

      for(let productId of product.product_id){
        if(productsList.includes(productId)){
          resultLine.status = true;
          resultLine.message = 'Não é permitida a entrada de 2 produtos iguais para uma mesma configuração';
          return resultLine;
        }

        const hyperaProduct = await JarvisService.get(`hypera-product/${productId}`);

        if(hyperaProduct.status != 200){
          resultLine.status = true;
          resultLine.message = `Existe um produto na listagem que não foi encontrado, id: ${productId}`;
          return resultLine;
        }

        if(productsList.includes(productId)){
          resultLine.status = true;
          resultLine.message = 'Não é permitida a entrada de 2 produtos iguais para uma mesma configuração';
          return resultLine;
        }

        productsList.push(productId);
      }
    }

    if (!line.segmentations) {
      resultLine.status = true;
      resultLine.message = 'Faltando parâmetro segmentations';
      return resultLine;
    }

    if (!line.segmentations.length > 0) {
      resultLine.status = true;
      resultLine.message = 'Faltando parâmetro segmentations';
      return resultLine;
    }

    let segmentationsList = [];

    for(let segmentation of line.segmentations){
      if (segmentation < 0 || isNaN(segmentation)) {
        resultLine.status = true;
        resultLine.message = 'Faltando ou invalido parâmetro segmentations';
        return resultLine;
      }

      const segmentationSearch = await XavierService.get(`segmentation/${segmentation}`);

      if(segmentationSearch.status != 200){
        resultLine.status = true;
        resultLine.message = `Segmentação especificada não encontrada, id: ${segmentation}.`;
        return resultLine;
      }

      if(segmentationsList.includes(segmentation)){
        resultLine.status = true;
        resultLine.message = 'Não é permitida a entrada de 2 segemntações iguais para uma mesma configuração';
        return resultLine;
      }

      segmentationsList.push(segmentation);
    }

    if (!line.begin_at_mechanic) {
      resultLine.status = true;
      resultLine.message = 'Faltando parâmetro begin_at_mechanic';
      return resultLine;
    }

    if (!line.end_at_mechanic) {
      resultLine.status = true;
      resultLine.message = 'Faltando parâmetro end_at_mechanic';
      return resultLine;
    }

    if (!line.view_to) {
      resultLine.status = true;
      resultLine.message = 'Faltando parâmetro view_to';
      return resultLine;
    }

    const validationBegin = DateTime.fromFormat(line.begin_at_mechanic,'yyyy-MM-dd');
    const validationEnd = DateTime.fromFormat(line.end_at_mechanic,'yyyy-MM-dd');
    const validationViewTo = DateTime.fromFormat(line.view_to,'yyyy-MM-dd');
    if((validationBegin.invalid || validationEnd.invalid || validationViewTo.invalid)){
      resultLine.status = true;
      resultLine.message = 'Invalido begin_at_mechanic, end_at_mechanic ou view_to, favor usar formato yyyy-MM-dd';
      return resultLine;
    }

    if(validationBegin.ts >= validationEnd.ts){
      resultLine.status = true;
      resultLine.message = 'Invalido begin_at_mechanic ou end_at_mechanic, data final deve ser após inicial';
      return resultLine;
    }

    const mechanicType = await JarvisService.get(`hypera-mechanic-type/${line.client_mechanic_type}`);

    if(mechanicType.status != 200){
      resultLine.status = true;
      resultLine.message = 'Tipo de mecânica do cliente não encontrada.';
      return resultLine;
    }

    if(mechanicType.data.mechanic_name == 'Vendeu Ganhou Simples'){
      if (line.goal <= 0 || isNaN(line.goal)) {
        resultLine.status = true;
        resultLine.message = 'Faltando ou invalido parâmetro goal';
        return resultLine;
      }
    }else if(mechanicType.data.mechanic_name == 'Vendeu Ganhou Múltiplo ou progressivo (Faixa Bônus)'){
      if (line.goal_max < 0 || isNaN(line.goal_max)) {
        resultLine.status = true;
        resultLine.message = 'Faltando ou invalido parâmetro goal_max';
        return resultLine;
      }
      if (line.goal_min < 0 || isNaN(line.goal_min)) {
        resultLine.status = true;
        resultLine.message = 'Faltando ou invalido parâmetro goal_min';
        return resultLine;
      }
      if (line.goal_min >= line.goal_max) {
        resultLine.status = true;
        resultLine.message = 'Meta mínima deve ser menor do que meta máxima';
        return resultLine;
      }
      if (line.multiplier <= 0 || isNaN(line.multiplier)) {
        resultLine.status = true;
        resultLine.message = 'Faltando ou invalido parâmetro multiplier';
        return resultLine;
      }
    }else if(mechanicType.data.mechanic_name == 'Bateu Ganhou (Metas por produto)'){
      if (!line.begin_at) {
        resultLine.status = true;
        resultLine.message = 'Faltando parâmetro begin_at';
        return resultLine;
      }

      if (!line.end_at) {
        resultLine.status = true;
        resultLine.message = 'Faltando parâmetro end_at';
        return resultLine;
      }

      const validationBeginPeriod = DateTime.fromFormat(line.begin_at,'yyyy-MM-dd');
      const validationEndPeriod = DateTime.fromFormat(line.end_at,'yyyy-MM-dd');
      if((validationBeginPeriod.invalid || validationEndPeriod.invalid)){
        resultLine.status = true;
        resultLine.message = 'Invalido begin_at ou end_at, favor usar formato yyyy-MM-dd';
        return resultLine;
      }

      if(validationBeginPeriod.ts >= validationEndPeriod.ts){
        resultLine.status = true;
        resultLine.message = 'Invalido begin_at ou end_at, data final deve ser após inicial';
        return resultLine;
      }
    }else {
      resultLine.status = true;
      resultLine.message = 'Tipo de mecânica não esperado';
      return resultLine;
    }

    if(line.ranking){
      if (!line.ranking_mechanic) {
        resultLine.status = true;
        resultLine.message = 'Faltando parâmetro ranking_mechanic';
        return resultLine;
      }

      if (!line.ranking_mechanic.name) {
        resultLine.status = true;
        resultLine.message = 'Faltando parâmetro name do ranking';
        return resultLine;
      }

      if (!line.ranking_mechanic.cycle) {
        resultLine.status = true;
        resultLine.message = 'Faltando parâmetro cycle do ranking';
        return resultLine;
      }

      if (!line.ranking_mechanic.purpose) {
        resultLine.status = true;
        resultLine.message = 'Faltando parâmetro purpose do ranking';
        return resultLine;
      }

      if (!line.ranking_mechanic.description) {
        resultLine.status = true;
        resultLine.message = 'Faltando parâmetro description do ranking';
        return resultLine;
      }

      if (!line.ranking_mechanic.nomenclature) {
        resultLine.status = true;
        resultLine.message = 'Faltando parâmetro nomenclature do ranking';
        return resultLine;
      }

      if (!line.ranking_mechanic.audience_type_id || isNaN(line.ranking_mechanic.audience_type_id)) {
        resultLine.status = true;
        resultLine.message = 'Faltando ou invalido o parâmetro audience_type_id do ranking';
        return resultLine;
      }

      if (!line.ranking_mechanic.hasOwnProperty('multiple_ranking')) {
        resultLine.status = true;
        resultLine.message = 'Faltando parâmetro multiple_ranking';
        return resultLine;
      }

      const audienceTypeRanking = await JarvisService.get(`audience-type/${line.ranking_mechanic.audience_type_id}`);

      if(audienceTypeRanking.status != 200){
        resultLine.status = true;
        resultLine.message = 'Tipo de público não encontrado para ranking';
        return resultLine;
      }

      if (!line.ranking_mechanic.unity_type_id || isNaN(line.ranking_mechanic.unity_type_id)) {
        resultLine.status = true;
        resultLine.message = 'Faltando ou invalido o parâmetro unity_type_id do ranking';
        return resultLine;
      }

      const unityTypeRanking = await JarvisService.get(`unity-type/${line.ranking_mechanic.unity_type_id}`);

      if(unityTypeRanking.status != 200){
        resultLine.status = true;
        resultLine.message = 'Tipo de unidade não encontrada para ranking';
        return resultLine;
      }

      if(unityTypeRanking.data.name == 'Unidade'){
        if (!line.ranking_mechanic.ranking_goals) {
          resultLine.status = true;
          resultLine.message = 'Faltando parâmetro ranking_goals do ranking';
          return resultLine;
        }

        if (!line.ranking_mechanic.ranking_goals.length > 0) {
          resultLine.status = true;
          resultLine.message = 'Faltando parâmetro ranking_goals do ranking';
          return resultLine;
        }

        let goalsList = [];

        for(let goalInfo of line.ranking_mechanic.ranking_goals){
          if (goalInfo.goal <= 0 || isNaN(goalInfo.goal)) {
            resultLine.status = true;
            resultLine.message = 'Faltando ou invalido parâmetro goal da meta de ranking';
            return resultLine;
          }
          if (goalInfo.points <= 0 || isNaN(goalInfo.points)) {
            resultLine.status = true;
            resultLine.message = 'Faltando ou invalido parâmetro points da meta de ranking';
            return resultLine;
          }

          if(goalsList.includes(goalInfo.goal)){
            resultLine.status = true;
            resultLine.message = 'Não é permitida a entrada de 2 metas de posições iguais no mesmo ranking';
            return resultLine;
          }

          goalsList.push(goalInfo.goal);
        }
      }else if(unityTypeRanking.data.name == 'Percentual'){
        if (line.ranking_mechanic.ranking_value <= 0 || isNaN(line.ranking_mechanic.ranking_value)) {
          resultLine.status = true;
          resultLine.message = 'Faltando ou invalido parâmetro ranking_value da meta de ranking';
          return resultLine;
        }
        if (line.ranking_mechanic.ranking_points <= 0 || isNaN(line.ranking_mechanic.ranking_points)) {
          resultLine.status = true;
          resultLine.message = 'Faltando ou invalido parâmetro ranking_points da meta de ranking';
          return resultLine;
        }
      }else{
        resultLine.status = true;
        resultLine.message = 'Tipo de unidade não esperado';
        return resultLine;
      }
    }
    return resultLine;
  }

  async validateExternalToken (token) {
    const tokenValidation = await JarvisService.get(`external/token/get?token=${token}`);
    if (tokenValidation.status != 200) {
      return ({ status:false, message: 'Token inválido.' });
    }

    if (tokenValidation.data.enabled == 0) {
      return ({ status:false, message: 'Não autorizado, token está desativado.' });
    }

    await JarvisService.put(`external/token-historic/put`, { external_token_id: tokenValidation.data.id, external_token:tokenValidation.data.token });
    Log.send(`${logError} - ${tokenValidation.data.name} - Solicitou o envio de dados pelo endpoint external/positivation-goal-update.`);

    return ({ status: true ,message: 'Succeso.' });
  }

  async validateCampaignMechanic (campaign_id, mechanic_id) {
    if(!Number.isInteger(campaign_id) || campaign_id < 0){
      return ({ status:false, message: 'Id de campanha inválido.' });
    }

    if(!Number.isInteger(mechanic_id) || mechanic_id < 0){
      return ({ status:false, message: 'Id de mecânica inválido.' });
    }

    const mechanic = await JarvisService.get(`mechanic/get?campaign_id=${campaign_id}&id=${mechanic_id}`);

    if (mechanic.status != 200) {
      return ({ status:false, message: 'Houve um problema ao relacionar a mecânica com a campanha.' });
    }

    if (mechanic.data.length <= 0) {
      return ({ status:false, message: 'Mecânica não encontrada com a campanha enviada.' });
    }

    const mechanicType = await JarvisService.get(`mechanic-type/get?alias=positivacao`);
    if (mechanic.data[0].mechanic_type_id != mechanicType.data[0].id){
      return ({ status:false, message: 'Mecânica relacioanda não é do tipo positivação.' });
    }

    return ({ status: true ,message: 'Succeso.' });
  }
} module.exports = ValidationHelper;