const axios = require('axios');

async function userAcessInfo(clientIP){
  try{
    const ipInfoResponse = await axios.get(`https://ipinfo.io/${clientIP}/json`);
    const ipInfoData = JSON.stringify(ipInfoResponse.data) || null;
    return ipInfoData
  }catch(e){
    return e.message;
  }
}

module.exports = userAcessInfo