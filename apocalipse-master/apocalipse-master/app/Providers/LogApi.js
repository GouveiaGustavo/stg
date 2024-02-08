const axios = require('axios');

async function logApi(data) {
  if(!data.log){
    return { message: 'Informe conteúdo para o log.', fail: true };
  }
  if(!data.endpoint){
    return { message: 'Informe um endpoint para registrar o log', fail: true };
  }

  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: process.env.AWS_LOG_API,
    headers: { 'Content-Type': 'application/json' },
    data : {
      log: data.log,
      endpoint: data.endpoint,
      environment: process.env.NODE_ENV
    }
  };
  try{
    await axios.request(config);
    return { message: 'Sucesso!', fail: false };
  }catch(e){
    return e;
  }
}


module.exports = logApi;