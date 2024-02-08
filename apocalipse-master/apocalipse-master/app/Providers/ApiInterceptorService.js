'use strict';

const axios = use('axios');

class ApiInterceptorService {
  constructor(url, headers) {
    if (!headers) {
      headers = {};
    }

    const ApiInterceptor = axios.create({
      baseURL: url,
      headers
    });

    ApiInterceptor.interceptors.response.use(
      response => {
        return { status: response.status, data: response.data };
      },
      error => {
        if(error.response){
          return { status: error.response.status, data: error.response.data };
        }else {
          if (error.host) {
            return { status: 500, data: `Falha ao comunicar com o microsserviço ${error.host}` };
          } else {
            return { status: 500, data: `Falha ao comunicar com o microsserviço ${error.address}:${error.port}` };
          }
        }
      }
    );

    return ApiInterceptor;
  }
}

module.exports = ApiInterceptorService;
