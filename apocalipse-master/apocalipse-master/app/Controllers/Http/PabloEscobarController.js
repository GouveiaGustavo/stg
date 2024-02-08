'use strict';

const Env = use('Env');
const Log = new (use('LogHelper'))();
const { DateTime } = require('luxon');
const querystring = require('querystring');
const helper = new (use('PabloEscobarHelper'))();
const validationHelper = new (use('ValidationHelper'))();
const PabloService = new (use('ApiInterceptorService'))(Env.get('PABLO_URL'));
const RobinService = new (use('ApiInterceptorService'))(Env.get('ROBIN_URL'));
const HomerService = new (use('ApiInterceptorService'))(Env.get('HOMER_URL'));
const XavierService = new (use('ApiInterceptorService'))(Env.get('XAVIER_URL'));
const ExtraLogs = Env.get('EXTRA_LOG');
const awsSqsViaAvaliableQueue = Env.get('AWS_SQS_QUEUE_VIA_AVALIABLE');
const environment = Env.get('NODE_ENV');

let campaignConfig = null;

class PabloEscobarController {
  async getPaginateByCategoryId({ request, response }) {
    try {
      const querystring = use('querystring');
      const params = request.only(['campaign_id', 'category_id', 'search', 'page', 'per_page']);

      if (!params.campaign_id || !params.category_id) {
        return response.status(400).json('Bad Request.');
      }

      let url = 'product-paginate-cockpit';

      if (Object.keys(params).length) {
        url += `?${querystring.stringify(params)}`;
      }

      const products = await PabloService.get(url);

      return response.status(200).json(products.data);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - getPaginateByCategoryId Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getCategory({ request, response }) {
    try {
      const params = request.only(['category_partner_id']);

      if (!params.category_partner_id) {
        return response.status(400).json('You need inform a category_partner_id.');
      }

      const category = await PabloService.get(
        `marketplace-category/get?marketplace_id=${marketplace_id}&category_partner_id=${params.category_partner_id}`
      );

      return response.status(200).json(category);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController - getCategory Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getCategories({ request, response }) {
    try {
      const params = request.only(['campaign_id']);
      const categories = await PabloService.get(`category/get?campaign_id=${params.campaign_id}`);

      return response.status(200).json(categories);
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - PabloEscobarController - getCategories Endpoint - ${e.message}`
      );
      return response.status(400).json(e.message);
    }
  }

  async getProducts({ request, response }) {
    try {
      const self = this;
      const params = request.only([
        'campaign_id',
        'category_id',
        'keywords',
        'limit',
        'page',
        'orderby',
        'participant_id',
        'wishlist',
        'page_name',
        'search_id'
      ]);

      if (!params.campaign_id) {
        return response.status(400).json({ message: 'campaign_id not found.' });
      }

      let query = `product-paginate/get?campaign_id=${params.campaign_id}&enabled=1`;

      if (params.category_id) {
        query += `&category_id=${params.category_id}`;
      }

      if (params.wishlist) {
        query += `&wishlist=${params.wishlist}`;
        query += `&participant_id=${params.participant_id}`;
      }

      if (params.page && params.page !== 0) {
        query += `&page=${params.page}`;
      }

      if (params.keywords) {
        query += `&keywords=${params.keywords}`;
      }

      if (params.limit) {
        query += `&limit=${params.limit}`;
      }

      if (params.orderby) {
        query += `&orderby=${params.orderby}`;
      }

      if (params.participant_id) {
        query += `&participant_id=${params.participant_id}`;
      }
      if (params.page_name) {
        query += `&page_name=${params.page_name}`;
      }
      if (params.search_id) {
        query += `&search_id=${params.search_id}`;
      }

      const products = await PabloService.get(query);

      const productsFiltered = [];
      let priceOfPoints = 0;
      let pricePoints = 0;
      let productFiltered = {};
      let ct = 0;

      let wishlist = [];

      if(params.participant_id && !params.wishlist) {
        const url = `participant-wishlists/wishlist?participantId=${params.participant_id}&campaignId=${params.campaign_id}`;
        const wishlistResult = await HomerService.get(url);  

        if (wishlistResult.status == 200) 
          wishlist = wishlistResult.data.map(item => item.product_id);
      }

      for (const product of products.data.data) {
        await beforeReturn(product, params, ct);
        ct += 1;
      }

      async function beforeReturn(product, params, key) {
        // Points
        if(product.price_points === null){
          priceOfPoints = await self.convertToPoints(product.price_of, params.campaign_id);

          pricePoints = await self.convertToPoints(product.price, params.campaign_id);
        }else{
          priceOfPoints = product.price_points;

          pricePoints = product.price_points;
        }

        const MarketPlaceAvaliable = await PabloService.get(`marketplace/${product.marketplace_id}`);
        const mktAvaliableConfig = JSON.parse(MarketPlaceAvaliable.data.config);

        // Images
        const partnerData = JSON.parse(product.partner_data);
        const { images } = partnerData;
        delete product.partner_data;
        const image = await self.getProductImages(images, mktAvaliableConfig.url_file_images, 0);

        productFiltered = {
          id: product.product_id,
          marketplace_product_id: product.id,
          imgProduct: image && image.image ? image.image : null,
          name: product.name,
          description: product.description,
          producer: product.producer,
          priceOf: priceOfPoints.points > pricePoints.points ? priceOfPoints.points : null,
          pricePer: pricePoints.points ? pricePoints.points : pricePoints,
          discountStamp: null,
          total: product.total,
          marketplace_alias: MarketPlaceAvaliable.data.alias,
          enabled: product.enabled,
          available: product.avaliable,
          inWishlist: params.wishlist ? true : wishlist.includes(product.product_id)
        };

        if(product.avaliable != 1 || product.enabled != 1) {
          const participantHasProductAlert = await HomerService.get(
            `participant-has-product-alert/get?product_id=${product.product_id}&marketplace_product_id=${product.id}&participant_id=${params.participant_id}&campaign_id=${params.campaign_id}`
          );

          productFiltered.hasProductAlert = participantHasProductAlert.data.enabled ? participantHasProductAlert.data.enabled : 0
        }

        products.data.data[ct] = productFiltered;
      }
      return response.status(200).json(products);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController - getProducts Endpoint - ${e.message} - params: ${new URLSearchParams(
        request.only([
          'campaign_id',
          'category_id'
        ]))}`);
      return response.status(400).json(e.message);
    }
  }

  async getProduct({ request, response }) {
    try {
      const params = request.only(['product_id', 'campaign_id', 'participant_id']);

      if (!params.product_id || !params.campaign_id) {
        return response.status(400).json({});
      }

      const product = await PabloService.get(`product/${params.product_id}`);

      if (!product) {
        return response.status(404).json('Product not found');
      }

      const MarketPlaceAvaliable = await PabloService.get(
        `marketplace/${product.data.marketplaceProduct.marketplace_id}`
      );

      const mktAvaliableConfig = JSON.parse(MarketPlaceAvaliable.data.config);

      if(product.data.price_points === null){
        const priceOfPoints = await this.convertToPoints(
          product.data.marketplaceProduct.price_of,
          params.campaign_id
        );

        const pricePoints = await this.convertToPoints(
          product.data.marketplaceProduct.price,
          params.campaign_id
        );

        product.data.marketplaceProduct.price_of = null;

        if (priceOfPoints.points > pricePoints.points) {
          product.data.marketplaceProduct.price_of = priceOfPoints.points;
        }

        product.data.marketplaceProduct.price = pricePoints.points;
      }

      product.data.marketplaceProduct.marketplaceAlias = MarketPlaceAvaliable.data.alias;

      const partnerData = JSON.parse(product.data.marketplaceProduct.partner_data);

      if (partnerData.data && partnerData.data.DESCRICAO_COMPLETA) {
        product.data.marketplaceProduct.fullDescription = partnerData.data.DESCRICAO_COMPLETA ? partnerData.data.DESCRICAO_COMPLETA : null;
      }

      if (!Array.isArray(partnerData.features)) {
        partnerData.features = [partnerData.features];
      }

      const features = [];
      let ct = 0;
      for (const item of partnerData.features) {
        features[ct] = {};
        if (item.model && item.model !== '.') {
          features[ct].description = 'Modelo';
          features[ct].value = item.model;
          product.data.marketplaceProduct.name = `${product.data.marketplaceProduct.name} ${item.model ? item.model : ''}`;
        }
        if (item.value) {
          features[ct].description = item.description;
          features[ct].value = replaceAll(item.value, '@DominioImagem@', mktAvaliableConfig.url_html_images);
        }
        ct += 1;
      }

      product.data.marketplaceProduct.features = features;

      const { images } = partnerData;
      delete product.data.marketplaceProduct.partner_data;

      product.data.marketplaceProduct.imgProduct = await this.getProductImages(
        images,
        mktAvaliableConfig.url_file_images
      );

      function replaceAll(str, find, replace) {
        return str.replace(new RegExp(find, 'g'), replace);
      }

      if (product.data.marketplaceProduct.attributes) {
        const { attributes } = product.data.marketplaceProduct;
        const attributesData = [];
        const attributesTypesReaded = [];
        for (const attributeType of attributes) {
          if (attributesTypesReaded.indexOf(attributeType.type.value) === -1) {
            attributesData.push({ type: attributeType.type.value, values: [] });
            attributesTypesReaded.push(attributeType.type.value);
          }
        }

        for (const attribute of attributes) {
          let ct = 0;
          for (const attributeData of attributesData) {
            if (attributeData.type === attribute.type.value) {
              attributesData[ct].values.push({
                id: attribute.id,
                value: attribute.value
              });
            }
          }
          ct++;
        }

        product.data.marketplaceProduct.attributes = attributesData;
      }

      const participantPoints = await RobinService.get(
        `point/get?campaign_id=${params.campaign_id}&participant_id=${params.participant_id}`
      );

      product.data.fitce_balance = participantPoints.data.cash_card_points;

      const validate = {
        participant_id: params.participant_id,
        new_save: DateTime.now().toFormat('yyyy-MM-dd,HH:mm'),
        product: params.product_id
      };

      const isRepeat = await HomerService.get(
        `participant-product-viewed-isrepeated/get?${querystring.stringify(validate)}`
      );

      if (!isRepeat.status === 200) {
        Log.send(
          `Env: ${Env.get('NODE_ENV')} - isRepeat - getProduct Endpoint - ${e.message
          } - params: ${JSON.stringify(validate)}`
        );
        return response.status(400).json(e.message);
      }

      const participant_has_campaign = await HomerService.get(
        `participant-campaign/get?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}`
      );

      if (!isRepeat.data) {
        const viewed = {
          participant_has_campaign_id: participant_has_campaign.data[0].id,
          product_id: params.product_id,
          marketplace_product_id: product.data.marketplaceProduct.id
        };

        const ParticipantProductViewed = await HomerService.put('participant-product-viewed/put', viewed);

        if (!ParticipantProductViewed) {
          Log.send(
            `Env: ${Env.get('NODE_ENV')} - ParticipantProductViewed - getProduct Endpoint - ${e.message
            } - params: ${querystring.stringify(viewed)}`
          );
          return response.status(400).json(e.message);
        }
      }

      if(product.data.marketplaceProduct.avaliable != 1 || product.data.marketplaceProduct.enabled != 1) {
        const participantHasProductAlert = await HomerService.get(
          `participant-has-product-alert/get?product_id=${params.product_id}&marketplace_product_id=${product.data.marketplaceProduct.id}&participant_id=${params.participant_id}&campaign_id=${params.campaign_id}`
        );
  
        product.data.hasProductAlert = participantHasProductAlert.data.enabled ? participantHasProductAlert.data.enabled : 0;
      }

      return response.status(200).json(product);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController - getProduct Endpoint - ${e.message} - params: ${new URLSearchParams(
        request.only([
          'product_id',
          'campaign_id',
          'participant_id'
        ]))}`);
      return response.status(400).json(e.message);
    }
  }

  async getZipCode({ request, response }) {
    try {
      const params = request.only(['zipcode']);
      const axios = use('axios');
      const url = `http://cep.republicavirtual.com.br/web_cep.php?cep=${params.zipcode.replace(
        '-',
        ''
      )}&formato=json`;
      const ApiInterceptor = axios.create({ baseURL: url });
      const zipcode = await ApiInterceptor.get();

      const res = {
        cep: params.zipcode,
        logradouro: zipcode.data.logradouro,
        bairro: zipcode.data.bairro,
        localidade: zipcode.data.cidade,
        uf: zipcode.data.uf
      };

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController - getAddress Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async freight({ request, response }) {
    try {
      const self = this;
      const params = request.only([
        'zipcode',
        'product_id',
        'marketplace_id',
        'campaign_id',
        'participant_id'
      ]);
      const cartObj = request.only(['product_id', 'cart_id']);

      const freight = await PabloService.get(
        `freight?zipcode=${params.zipcode.replace('-', '')}&product_id=${params.product_id}&marketplace_id=${params.marketplace_id
        }&campaign_id=${params.campaign_id}&participant_id=${params.participant_id}`
      );

      if(freight.status !== 200) {
        return response.status(freight.status).json(freight.data);
      }

      if(freight.data[0].free_freight){
        freight.data[0].freight = 0;
      }

      async function freightConvert(item, params) {
        const convert = await self.convertToPoints(item.freight, params.campaign_id);
        return convert.points;
      }
      let ct = 0;
      if (Array.isArray(freight.data)) {
        for (const item of freight.data) {
          cartObj.freight = item.freight;
          cartObj.campaign_id = params.campaign_id;

          if (item.error) {
            cartObj.cart_status_name = 'NO_DELIVERY';
          }

          if (item.distributor) {
            freight.data.data[ct].message = 'ATENÇÃO. Este resgate será enviado para a matriz do seu broker';
          }

          if (cartObj.cart_id) {
            const update = await PabloService.put('cart-has-product/put', cartObj);
          }

          freight.data[ct].freight = await freightConvert(item, params);

          ct += 1;
        }
      } else {
        cartObj.freight = freight.data.freight;
        cartObj.campaign_id = params.campaign_id;

        if (freight.data.error) {
          cartObj.cart_status_name = 'NO_DELIVERY';
        }

        if (freight.data.distributor) {
          freight.data[ct].message = 'ATENÇÃO. Este resgate será enviado para a matriz do seu broker';
        }

        if (cartObj.cart_id) {
          const update = await PabloService.put('cart-has-product/put', cartObj);
        }

      }

      return response.status(200).json(freight.data);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController - freight Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async cartAdd({ request, response }) {
    try {
      const params = request.only([
        'id',
        'marketplace_id',
        'participant_uid',
        'product_id',
        'amount',
        'price',
        'address',
        'campaign_id',
        'price_points'
      ]);

      const uid = request.only('participant_uid');

      const participantHasCampaign = await HomerService.get(
        `participant-campaign/get?participant_uid=${uid.participant_uid}&campaign_id=${params.campaign_id}`
      );

      if (!participantHasCampaign.data.length) {
        return response.status(400).json({ message: 'Esse participante não pertence a campanha especificada.' });
      }

      params.participant_id = participantHasCampaign.data[0].participant_id;

      params.amount = Number(params.amount)

      if (isNaN(params.amount)) {
        return response.status(400).json({ message: 'Parametro amount deve ser um número.' });
      }

      let addCart = await PabloService.post('cart/add', params);
      if(addCart.status != 200){
        return response.status(addCart.status).json(addCart.data);
      }

      if(addCart.data){
        delete addCart.data.participant_id;
        addCart.data.participant_uid = uid.participant_uid;
      }

      return response.status(200).json(addCart);
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - PabloEscobarController - getPaymentsExtract Endpoint -  ${e.message} - ${new URLSearchParams(
          request.only([ 'marketplace_id',
            'participant_id',
            'campaign_id'])
        )}`
      );
      return response.status(400).json(e.message);
    }
  }

  async cartUpdate({ request, response }) {
    try {
      const params = request.only(['address_id', 'cart_id', 'campaign_id']);
      params.participant_id = request.participant.participant_id;

      const cart = await PabloService.post('cart/update', params);

      if(cart.status === 400) {
        return response.status(cart.status).json(cart.data);
      }

      return response.status(200).json(cart);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController - cartUpdate Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async cartItemUpdate({ request, response }) {
    try {
      const params = request.only(['cart_id', 'product_id', 'amount', 'price', 'freight']);
      
      const update = await PabloService.put('cart-has-product/put', params);
      const MarketPlaceAvaliable = await PabloService.get(`marketplace/${update.data.marketplace_id}`);
      update.data.alias = MarketPlaceAvaliable.data.alias;

      return response.status(200).json(update);
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - PabloEscobarController - cartItemUpdate Endpoint - ${e.message}`
      );
      return response.status(400).json(e.message);
    }
  }

  async cartItemDelete({ request, response }) {
    try {
      const params = request.only(['cart_id', 'product_id']);
      const update = await PabloService.post('cart-has-product/delete', params);
      return response.status(200).json(update);
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - PabloEscobarController - cartItemDelete Endpoint - ${e.message}`
      );
      return response.status(400).json(e.message);
    }
  }

  async beforeReturn(product, params) {

    const productsFiltered = [];
    let productFiltered = {};
    let pricePoints;
    pricePoints = await this.convertToPoints(product.price, params.campaign_id);

    // Images
    const partnerData = JSON.parse(product.product.partner_data);
    const MarketPlaceAvaliable = await PabloService.get(`marketplace/${product.marketplace_id}`);

    const mktAvaliableConfig = JSON.parse(MarketPlaceAvaliable.data.config);

    const { images } = partnerData;
    delete product.product.partner_data;
    const image = await this.getProductImages(images, mktAvaliableConfig.url_file_images, 0);

    let descripition;

    if (!Array.isArray(partnerData.features)) {
      partnerData.features = [partnerData.features];
    }

    if (partnerData.features[0].model !== '.' && partnerData.features[0].model) {
      descripition = `${product.product.name} - ${partnerData.features[0].model}`;
    } else {
      descripition = product.product.name;
    }

    if(MarketPlaceAvaliable.data.alias == 'fitce'){
      const campaignHasFitceTax = await XavierService.get(`campaign-has-config/get?campaign_id=${params.campaign_id}&config_key=hasFitceTaxCustom`);
      const hasFitceTaxValue = await XavierService.get(`campaign-has-config/get?campaign_id=${params.campaign_id}&config_key=fitceTaxValue`);

      if(campaignHasFitceTax.status == 200 && hasFitceTaxValue.status == 200) {
        const { hasFitceTaxCustom } = JSON.parse(campaignHasFitceTax.data.value);

        if(hasFitceTaxCustom == true) {
          const { fitceTaxValue } = JSON.parse(hasFitceTaxValue.data.value);
          const commisionValue = product.price * (fitceTaxValue / 100);
          let cardValue = (product.price - commisionValue);
          cardValue = parseFloat(cardValue);
          cardValue = cardValue.toFixed(2)
          cardValue = cardValue.replace('.', ',');
          descripition = `${descripition} R$${cardValue}`;
        } else {
          if(mktAvaliableConfig.comission_incentivar) {
            const commisionValue = product.price * (mktAvaliableConfig.comission_incentivar / 100);
            let cardValue = (product.price - commisionValue);
            cardValue = parseFloat(cardValue);
            cardValue = cardValue.toFixed(2)
            cardValue = cardValue.replace('.', ',');
            descripition = `${descripition} R$${cardValue}`;
          } else {
            return response.status(400).json(`Missing fitce config comission_incentivar.`);
          }
        }
      } else {
        if(mktAvaliableConfig.comission_incentivar) {
          const commisionValue = product.price * (mktAvaliableConfig.comission_incentivar / 100);
          let cardValue = (product.price - commisionValue);
          cardValue = parseFloat(cardValue);
          cardValue = cardValue.toFixed(2)
          cardValue = cardValue.replace('.', ',');
          descripition = `${descripition} R$${cardValue}`;
        } else {
          return response.status(400).json(`Missing fitce config comission_incentivar.`);
        }
      }
    }

    productFiltered = {
      id: product.product_id,
      img: image ? image.image : null,
      marketplace_id: product.marketplace_id,
      descripition,
      producer: product.product.producer,
      amount: product.amount,
      price: product.price_points ? product.price_points:pricePoints.points,
      total: (product.price_points ? product.price_points:pricePoints.points)* product.amount,
      alias: MarketPlaceAvaliable.data.alias
    };

    return productFiltered;
  }


  async getCart({ request, response }) {
    try {

      const self = this;
      const params = request.only(['cart_id', 'campaign_id']);

      const cart = await PabloService.get(`cart/${params.cart_id}`);

      // if (cart.data.participant_id != request.authUserId) {
      //   return response.status(403).json('Forbidden');
      // }

      if (params.campaign_id != cart.data.campaign_id) {
        return response.status(404).json('Not found');
      }

      let productsFiltered = [];

      if (Array.isArray(cart.data.cartHasProduct)) {
        for (const product of cart.data.cartHasProduct) {
          const resp = await this.beforeReturn(product, params);
          resp.voltage = product.product.voltage;

          productsFiltered.push(resp);
        }
      } else {
        productsFiltered = await this.beforeReturn(cart.data.cartHasProduct, params);
      }
      cart.data.products = productsFiltered;
      if(cart.data){
        delete cart.data.participant_id;
      }

      return response.status(200).json(cart);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController - getCart Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async cartCheckout({ request, response }) {
    try {
      const params = request.only(['cart_id', 'campaign_id', 'participant_uid', 'participant_has_pdv_id']);
      if (!params.participant_uid || !params.campaign_id || !params.cart_id) {
        return response.status(401).json('Requisição faltando informações.');
      }

      const uid = request.only('participant_uid');

      const participantHasCampaign = await HomerService.get(
        `participant-campaign/get?participant_uid=${uid.participant_uid}&campaign_id=${params.campaign_id}`
      );

      if (!participantHasCampaign.data.length) {
        return response.status(400).json({ message: 'Esse participante não pertence a campanha especificada.' });
      }

      params.participant_id = participantHasCampaign.data[0].participant_id;

      const campaignHasPdvConfig = await XavierService.get(
        `campaign-has-config/get?campaign_id=${params.campaign_id}&config_key=hasParticipantPdv`
      );
      if(campaignHasPdvConfig.status === 200) {
        const { hasParticipantPdv } = JSON.parse(campaignHasPdvConfig.data.value);
        if(hasParticipantPdv === true) {
          if(!params.participant_has_pdv_id) {
            return response.status(400).json('participant_has_pdv_id is required');
          } else {
            const participantHasPdv = await HomerService.get(
              `participant-has-pdv/get-by-id?id=${params.participant_has_pdv_id}`
            );
            if(participantHasPdv.status !== 200) {
              return response.status(400).json('participant_has_pdv_id is invalid');
            }
          }
        }
      }

      const self = this;
      const findPoints = {};
      findPoints.campaign_id = params.campaign_id;
      findPoints.participant_id = params.participant_id;

      const Products = await PabloService.get(`cart/${params.cart_id}`);

      // if (Products.data.participant_id != request.authUserId || params.participant_id != request.authUserId) {
      //   return response.status(403).json('Forbidden');
      // }

      if (!Products) {
        return response.status(401).json('There are no products in the cart');
      }

      const magaluMarketplace = await PabloService.get(`marketplace/get?alias=magalu`);
      const participant = await HomerService.get(`participant/${params.participant_id}`);
      if (!participant.data.contact || !participant.data.contact.number || isNaN(participant.data.contact.number)) {
        return response.status(400).json('Participant does not have a valid contact.');
      }

      if (participant.data.campaign) {
        for (const campaign of participant.data.campaign) {
          if (/\s/g.test(campaign.email)) {
            return response.status(400).json('The participant does not have a valid email address.');
          }
        }
      }

      if (participant.data.email) {
        if (/\s/g.test(participant.data.email)) {
          return response.status(400).json('The participant does not have a valid email address.');
        }
      }

      const distributor = await HomerService.get(`participant-distributor/get?participant_id=${params.participant_id}`);
      if (distributor.data.distributor) {
        if (/\s/g.test(distributor.data.distributor.email)) {
          return response.status(400).json('The participant does not have a valid email address.');
        }
        if (/\s/g.test(distributor.data.distributor.responsible_email)) {
          return response.status(400).json('The participant does not have a valid email address.');
        }
      }

      let sumValue = 0;
      let pricePoints = 0;

      if (Array.isArray(Products.data.cartHasProduct)) {
        for (const values of Products.data.cartHasProduct) {
          if (magaluMarketplace.data[0].id == values.marketplace_id) {
            if (participant.data.email.length > 200) {
              return response.status(400).json('Participant does not have a valid email for magulu');
            }
          }
          if (values.price_points > 0.0) {
            if(values.free_freight){
              sumValue += values.price_points * values.amount;
            }else{
              sumValue += (values.price_points + values.freight_points) * values.amount;
            }
          } else {
            pricePoints = await self.convertToPoints(values.price, params.campaign_id);
            if(values.free_freight){
              sumValue += price_points * values.amount;
            }else{
              sumValue += (pricePoints + values.freight_points) * values.amount;
            }
          }
        }
      } else if (Products.data.cartHasProduct.price_points > 0.0) {
        if(Products.data.cartHasProduct.free_freight){
          sumValue += Products.data.cartHasProduct.price_points * Products.data.cartHasProduct.amount;
        }else{
          sumValue += (Products.data.cartHasProduct.price_points + Products.data.cartHasProduct.freight_points) * Products.data.cartHasProduct.amount;
        }

      } else {
        pricePoints = await self.convertToPoints(Products.data.cartHasProduct.price, params.campaign_id);
        if(Products.data.cartHasProduct.free_freight){
          sumValue += price_points * Products.data.cartHasProduct.amount;
        }else{
          sumValue += (price_points + Products.data.cartHasProduct.freight_points) * Products.data.cartHasProduct.amount;
        }

      }
      const participantPoints = await RobinService.get(
        `point/get?campaign_id=${params.campaign_id}&participant_id=${params.participant_id}`
      );

      if (sumValue > participantPoints.data.points) {
        return response.status(402).json('you do not have enough points'); // Não ALTERAR status 402.
      }

      findPoints.cart_id = params.cart_id;
      findPoints.points = sumValue;
      findPoints.flag_credit = 0;
      let checkout = await PabloService.post('cart/checkout', params);


      if (checkout.status == 401) {
        return response.status(402).json(checkout.data); // Não ALTERAR status 402.
      }

      if (checkout.status !== 200) {
        Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController - cartCheckout Endpoint  - ${checkout.data}`);
        return response.status(checkout.status).json(checkout.data);
      }

      findPoints.order_id = checkout.data.order.id;

      if(checkout.data.order){
        delete checkout.data.order.participant_id;
        checkout.data.order.participant_uid = uid.participant_uid;
      }

      if (checkout) {
        const reward = await RobinService.post('point/reward', findPoints);
      } else {
        return response.status(401).json(checkout);
      }
      return response.status(200).json(checkout);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController - cartCheckout Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async convertToPoints(money = 0, campaign_id) {
    try {
      if (!campaign_id) {
        return false;
      }

      const campaign = await XavierService.get(`campaign/${campaign_id}`);
      campaignConfig = JSON.parse(campaign.data.config);

      const { pointValue } = campaignConfig;
      const markup = campaignConfig.markup ? campaignConfig.markup : 0;

      const consult = await RobinService.get(
        `point-conversion/money-point?money=${money}&pointvalue=${pointValue}&markup=${markup}`
      );

      return consult.data;
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - PabloEscobarController - convertToPoints Endpoint - ${e.message}`
      );
      return e.message;
    }
  }

  async getProductImages(images, url_images, key = false) {
    try {
      const imgProduct = [];
      let tmpImages = images;
      if (!Array.isArray(tmpImages)) {
        tmpImages = [images];
      }

      let c = 0;
      for (const image of tmpImages) {
        let imageMedium = image.medium;
        if(imageMedium.toString().length <= 10){
          imgProduct.push({
            id: image.order || c,
            image: url_images + imageMedium
          });
        }else{
          imgProduct.push({
            id: image.order || c,
            image: imageMedium
          });
        }
        c++;
      }

      if (key === false) {
        return imgProduct;
      }

      return imgProduct[key];
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - PabloEscobarController - getProductImages Endpoint - ${e.message}`
      );
      return e.message;
    }
  }

  async getAddress({ request, response }) {
    try {
      const params = request.only(['zipcode']);
      const axios = use('axios');
      const url = `http://cep.republicavirtual.com.br/web_cep.php?cep=${params.zipcode.replace(
        '-',
        ''
      )}&formato=json`;
      const ApiInterceptor = axios.create({ baseURL: url });
      const zipcode = await ApiInterceptor.get();

      const res = {
        cep: params.zipcode,
        logradouro: zipcode.data.logradouro,
        bairro: zipcode.data.bairro,
        localidade: zipcode.data.cidade,
        uf: zipcode.data.uf
      };

      return response.status(200).json(res);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController - getAddress Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getOrder({ request, response }) {
    try {
      const params = request.only(['order_id', 'campaign_id']);
      const order = await PabloService.get(`order/${params.order_id}?campaign_id=${params.campaign_id}`);

      if (!order.data) {
        return response.status(404).json('Order not found.');
      }

      // if (orders.data.participant_id != request.authUserId) {
      //   return response.status(403).json('Forbidden');
      // }

      const myOrder = await helper.GetOrderTreatment(order.data);

      return response.status(200).json(myOrder);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController - getOrder Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getOrders({ request, response }) {
    try {
      const params = request.only(['participant_id', 'campaign_id', 'limit', 'page']);
      let query = `order/get?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}`;

      if (params.limit) {
        query += `limit=${params.limit}&`;
      }
      if (params.page) {
        query += `page=${params.page}&`;
      }

      const myOrders = {};
      let ct = 0;
      if (!params.participant_id || !params.campaign_id) {
        return response.status(500).json('You need inform participant_id and campaign_id');
      }

      const orders = await PabloService.get(query);

      // if ((orders.data.participant_id != request.authUserId) || (params.participant_id != request.authUserId)) {
      //   return response.status(403).json('Forbidden');
      // }

      myOrders.paginate = orders.data;
      myOrders.data = [];

      for (const order of myOrders.paginate.data) {
        if (order.cart) {
          const address = await HomerService.get(`address/${order.cart.address_id}`);
          let ctt = 0;
          let totalfreight = 0;
          let total = 0;
          let totalProducts = 0;

          myOrders.data[ct] = {};

          myOrders.data[ct].orderId = order.id;
          myOrders.data[ct].tracking = order.tracking;
          myOrders.data[ct].createdAt = order.created_at;
          myOrders.data[ct].updatedAt = order.updated_at;
          myOrders.data[ct].status = order.orderStatus.status;

          myOrders.data[ct].street = address.data.street;
          myOrders.data[ct].number = address.data.number;
          myOrders.data[ct].neighborhood = address.data.neighborhood;
          myOrders.data[ct].city = address.data.city;
          myOrders.data[ct].state = address.data.state;
          myOrders.data[ct].zipcode = address.data.zipcode;
          myOrders.data[ct].complement = address.data.complement;
          myOrders.data[ct].product = [];
          for (const product of order.cart.cartHasProduct) {
            if(product.product){
              myOrders.data[ct].product[ctt] = {};
              myOrders.data[ct].product[ctt].amount = product.amount;
              myOrders.data[ct].product[ctt].pricePoints = product.price_points;
              myOrders.data[ct].product[ctt].freightPoints = product.freight_points;
              myOrders.data[ct].product[ctt].productName = product.product.name;

              if(product.free_freight){
                totalfreight += 0;
              }else{
                totalfreight += product.freight_points * product.amount;
              }

              totalProducts += product.price_points * product.amount;
              total = totalfreight + totalProducts;
              ctt += 1;
            }
          }
          myOrders.data[ct].totalfreight = totalfreight;
          myOrders.data[ct].totalProducts = totalProducts;
          myOrders.data[ct].total = total;

          if(myOrders.data[ct].product.length == 0){
            continue;
          }
          ct += 1;
        }
      }
      delete myOrders.paginate.data;
      return response.status(200).json(myOrders);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController - getOrders Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getTracking({ request, response }) {
    try {
      let startTime;
      if(ExtraLogs){
        startTime = process.hrtime();
      }
      const tracking = request.only('Message');
      const trackingObject = await JSON.parse(tracking.Message.Content);

      this.getTrackingLogic(trackingObject);

      if(ExtraLogs){
        let elapsedMiliSeconds = await this.parseHrtimeToSeconds(startTime);
        Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController Via getTracking - ${elapsedMiliSeconds} ms`);
      }
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController - getTracking Endpoint - ${e.message}`);
    } finally {
      const correlationId = request.only('CorrelationId');
      const ret = {
        IsValid: true,
        StatusCode: 200,
        Messages: [],
        CorrelationId: correlationId.CorrelationId
      };
      return response.status(200).json(ret);
    }
  }

  // Esse endpoint faz o envio para a fila da AWS dos trackings de envios de produtos de Via Varejo
  // Foi separado sua entrada no método getTracking e sua execução em si nesse endpoint para reduzir o tempo de resposta para Via
  async getTrackingLogic(trackingObject) {
    try {
      for (const track of trackingObject.Trackings) {
        await PabloService.post('cart-has-product/tracking', track);
      }
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController - getTracking Endpoint - ${e.message}`);
    }
  }

  async allMarketplace({ request, response }) {
    try {
      const marketplaces = await PabloService.get('marketplace/all');

      return response.status(200).json(marketplaces);
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - PabloEscobarController - allMarketplace Endpoint - ${e.message}`
      );
      return response.status(500).json(e.message);
    }
  }

  async getMarketplace({ request, response }) {
    try {
      const params = request.only(['page']);

      if (!params.page) {
        params.page = 1;
      }

      const marketplace = await PabloService.get('marketplace/get', params);

      return response.status(200).json(marketplace);
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - PabloEscobarController - getMarketplace Endpoint - ${e.message}`
      );
      return response.status(500).json(e.message);
    }
  }

  async getMarketplaceById({ params, response }) {
    try {
      const marketplace = await PabloService.get(`marketplace/${params.id}`);

      if (!marketplace) {
        return response.status(404).json('Not found.');
      }

      return response.status(200).json(marketplace);
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - PabloEscobarController - getMarketplaceById Endpoint - ${e.message}`
      );
      return response.status(500).json(e.message);
    }
  }

  async putMarketplace({ request, response }) {
    try {
      let params = request.only(['id', 'name', 'alias', 'env_type', 'config', 'enabled']);

      if (!params.name) {
        return response.status(400).json({message: 'Necessário informar o nome do marketplace'});
      }
      if (!params.alias) {
        return response.status(400).json({message: 'Necessário informar o apelido do marketplace.'});
      }
      if (!params.config) {
        return response.status(400).json({message: 'Necessário informar a configuração do marketplace.'});
      }
      if (!params.enabled) {
        return response.status(400).json({message: 'Necessário informar o status do marketplace.'});
      }
 
      if(!params.id){
        const marketplaceName = await PabloService.get(`marketplace/get?name=${params.name}`);

        if (marketplaceName.data.length > 0) {
          return response.status(400).json({message: 'Este nome de marketplace já existe.'});
        }
      }else{
        const marketplace = await PabloService.get(`marketplace/${params.id}`);

        if (marketplace.status != 200) {
          return response.status(400).json({message: 'Este marketplace não existe'});
        }
        const marketplaceName = await PabloService.get(`marketplace/get?name=${params.name}`);
        if (marketplaceName.data.length > 0) {
          for(const item of marketplaceName.data){
            if(item.name === params.name && item.id != params.id){
              return response.status(400).json({message: 'Este nome de marketplace já existe.'});
            }
          }
       }
      }
      
      const config = JSON.stringify(params.config)
      delete params.config;
      params.config = config;
    
      const marketplace = await PabloService.put('marketplace/put', params);

      return response.status(200).json({data: marketplace.data});
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - PabloEscobarController - putMarketplace Endpoint - ${e.message}`
      );
      return response.status(500).json(e.message);
    }
  }

  async putMarketplaceProduct({ request, response }) {
    try {
      let params = request.only(['id','marketplace_id','partner_category_id','name','description','producer','code','group_code','price_of','price','keywords','partner_data','avaliable','enabled',]);
      
      if (!params) {
        return response.status(400).json({message: 'Requisição inválida.'});
      }
      if (!params.marketplace_id) {
        return response.status(400).json({message: 'Necessário informar o id do marketplace'});
      }
      if (!params.partner_category_id) {
        return response.status(400).json({message: 'Necessário informar o id do categoria do marketplace'});
      }
      if (!params.name) {
        return response.status(400).json({message: 'Necessário informar o nome do produto.'});
      }
      if (!params.description) {
        return response.status(400).json({message: 'Necessário informar o descrição do produto.'});
      }
      if (!params.code) {
        return response.status(400).json({message: 'Necessário informar o sku do produto.'});
      }
      if (!params.producer) {
        return response.status(400).json({message: 'Necessário informar a marca do produto.'});
      }
      if (!params.price) {
        return response.status(400).json({message: 'Necessário informar o preço do produto.'});
      }
      if (!params.partner_data) {
        return response.status(400).json({message: 'Necessário informar a configuração do produto.'});
      }
      if (!params.avaliable) {
        return response.status(400).json({message: 'Necessário informar a disponibilidade do produto.'});
      }
      if (!params.enabled) {
        return response.status(400).json({message: 'Necessário informar o status do produto.'});
      }

      if (params.id) {
        const marketplaceProduct = await PabloService.get(`marketplace-product/${params.id}`);
        
        if(marketplaceProduct.data.length == 0){
          return response.status(400).json({message: 'Este produto não existe.'});
        }
      }
      const marketplace = await PabloService.get(`marketplace/${params.marketplace_id}`);

      if (marketplace.status != 200) {
        return response.status(400).json({message: 'Este marketplace não existe'});
      }
      
      const partner_data = JSON.stringify(params.partner_data)
      delete params.partner_data;
      params.partner_data = partner_data;
      
      const marketplaceproduct = await PabloService.put('marketplace-product/put', params);

      return response.status(200).json({data: marketplaceproduct.data});
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - PabloEscobarController - putMarketplaceProduct Endpoint - ${e.message}`
      );
      return response.status(500).json(e.message);
    }
  }

  async createCategory({ request, response }) {
    try {

      const params = request.only(['name', 'campaign_id', 'parent_category_id', 'order', 'products']);

      if (!params.name || !params.campaign_id) {
        return response.status(400).json('Bad Request.');
      }

      const createCategory = await PabloService.post(`category`, params);

      return response.status(200).json(createCategory.data);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - createCategory Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async createMarketplaceCategory({ request, response }) {
    try {

      const params = request.only(['id', 'marketplace_id', 'category_id', 'category_partner_id', 'category_partner_parent_id', 'order', 'name', 'partner_campaign_id']);

      if (!params.name) {
        return response.status(400).json({message: 'Necessário informar o nome da categoria.'});
      }
      
      if (!params.marketplace_id) {
        return response.status(400).json({message: 'Necessário informar o marketplace.'});
      }
      
      if (!params.category_partner_id) {
        return response.status(400).json({message: 'Necessario informar o ID da categoria vindo do parceiro.'});
      }
      
      if (params.id) {
        const category = await PabloService.get(`marketplace-category/${params.id}`);
        if(category.status != 200){
          return response.status(400).json({message:'Categoria inexistente.'});
        }
      }else{
        const category = await PabloService.get(`marketplace-category/get?category_partner_id=${params.category_partner_id}`);
        if(category.data.length > 0){
          return response.status(400).json({message: 'Categoria ja existe.'});
        }
      }
      
      const marketplace = await PabloService.get(`marketplace/${params.marketplace_id}`);

      if (marketplace.status != 200) {
        return response.status(400).json({message: 'Este marketplace não existe'});
      }

      const createCategory = await PabloService.put(`marketplace-category/put`, params);

      return response.status(200).json({data: createCategory.data});
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - createMarketplaceCategory Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async updateCategory({ request, response }) {
    try {

      const params = request.only(['id', 'name', 'campaign_id', 'parent_category_id', 'order', 'products']);

      if (!params.id || !params.campaign_id) {
        return response.status(400).json('Bad Request.');
      }

      const updateCategory = await PabloService.put(`category`, params);

      return response.status(200).json(updateCategory.data);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - updateCategory Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async deleteCategory({ params, response }) {
    try {

      if (!params.id) {
        return response.status(400).json('Bad Request.');
      }

      const deleteCategory = await PabloService.delete(
        `category/${params.id}`
      );

      return response.status(200).json(deleteCategory.data);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - deleteCategory Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async searchCategories({ request, response }) {
    try {
      const params = request.only(['search', 'campaign_id']);

      if (!params.search || !params.campaign_id) {
        return response.status(400).json('Bad Request.');
      }

      const categories = await PabloService.get(
        `category/search?search=${params.search}&campaign_id=${params.campaign_id}`
      );

      return response.status(200).json(categories);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - searchCategories - search Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async getCategoryById({ params, response }) {
    try {
      const category = await PabloService.get(`category/${params.id}`);
      return response.status(200).json(category);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - getCategoryById - search Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async marketplaceProductPaginate({ request, response }) {
    try {
      const params = request.only(['marketplace_id', 'partner_category_id', 'campaign_id', 'search', 'page', 'per_page']);

      if (!params.marketplace_id || !params.campaign_id) {
        return response.status(400).json('Bad Request.');
      }

      let url = 'marketplace-product-paginate';

      if (Object.keys(params).length) {
        url += `?${querystring.stringify(params)}`;
      }

      const categories = await PabloService.get(url);

      return response.status(200).json(categories.data);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - marketplaceProductPaginate Endpoint - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getRewards({ request, response }) {
    try {
      const params = request.only(['campaign_id', 'page']);

      if (!params.page) {
        params.page = 1;
      }

      const rewards = await PabloService.get(
        `rewards/get?campaign_id=${params.campaign_id}&page=${params.page}`
      );

      return response.status(200).json(rewards);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - getRewards - search Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async marketplaceCategoryPaginate({ request, response }) {
    try {
      const params = request.only(['category_partner_id', 'campaign_id', 'marketplace_id', 'page', 'per_page']);

      if (!params.marketplace_id) {
        return response.status(400).json('Bad Request.');
      }

      let url = 'marketplace-category-paginate';

      if (Object.keys(params).length) {
        url += `?${querystring.stringify(params)}`;
      }

      const categories = await PabloService.get(url);

      return response.status(200).json(categories.data);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - marketplaceCategoryPaginate Endpoint - ${e.message}`);
      return response.status(400).json(e.message);
    }
  }

  async categoryPaginate({ request, response }) {
    try {
      const querystring = require('querystring');
      const params = request.only(['campaign_id', 'parent_category_id', 'page', 'per_page']);

      if (!params.campaign_id) {
        return response.status(400).json('Bad Request.');
      }

      let url = 'category-paginate';

      if (Object.keys(params).length) {
        url += `?${querystring.stringify(params)}`;
      }

      const categories = await PabloService.get(url);

      return response.status(200).json(categories.data);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController categoryPaginate - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }

  async getPaymentsExtract({ request, response }) {

    try {
      const params = request.only(['participant_id', 'campaign_id', 'bill_id']);
      if (!params.participant_id) {
        return response.status(400).json('Missing participant_id.');
      }

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id.');
      }

      const { status: bills_status, data: [{ participant_id, bar_code, bill_assignor, due_date, value, created_at }] } = await PabloService.get(`bill/get?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}&id=${params.bill_id}`);

      const { data: { name, surname } } = await HomerService.get(`participant/${participant_id}`);

      if (bills_status != 200) {
        return response.status(bills.status).json(bills);
      }

      const extract = {
        codigoDeBarras: bar_code,
        Banco: bill_assignor,
        DataVencimento: DateTime.fromISO(due_date).toFormat('dd/MM/yyyy'),
        DataPagamento: DateTime.fromSQL(created_at).toFormat('dd/MM/yyyy HH:mm:ss'),
        ValorPago: value,
        NomePagador: name
      };

      return response.status(200).json({ bill_extract: extract });
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - PabloEscobarController - getPaymentsExtract Endpoint -  ${e.message} - ${new URLSearchParams(
          request.only(['participant_id', 'campaign_id', 'kill_id'])
        )}`
      );
      return response.status(500).json(e.message);
    }
  }

  async getPayments({ request, response }) {
    try {
      const params = request.only(['participant_id', 'campaign_id']);

      if (!params.participant_id) {
        return response.status(400).json('Missing participant_id.');
      }

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id.');
      }

      const bills = await PabloService.get(`bill/get?participant_id=${params.participant_id}&campaign_id=${params.campaign_id}`);

      if (bills.status != 200){
        return response.status(bills.status).json(bills);
      }

      // O bloco abaixo busca os status de todas as contas do participante, se a conta ja possuir status em nosso banco.
      // A conta recebe seu primeiro status quando passa da fase de billpayment, antes disso ela não foi enviada para celcoin e não é contabilizada aqui.
      // Caso possua um status pendente, é feita uma nova verificação junto a celcoin pra ver se há mudança de status.
      // Esse bloco também prepara a mensagem para ser exibida no front.
      let finalResponse = [];
      let count = 0;
      for(let bill of bills.data){
        if(!bill.bill_status){
          continue;
        }
        if(bill.bill_status == 'SUCESSO'){
          finalResponse.push({});
          finalResponse[count].bill_id = bill.id;
          finalResponse[count].message = 'Pedido Aprovado';
          finalResponse[count].points = bill.value_point;
          finalResponse[count].descripition = bill.description;
          finalResponse[count].assignor = bill.bill_assignor;
          finalResponse[count].created_at = DateTime.fromSQL(bill.created_at).toFormat('dd/MM/yyyy');
          count ++;
          continue;
        }else{
          finalResponse.push({});
          finalResponse[count].bill_id = bill.id;
          finalResponse[count].message = 'Pedido Cancelado';
          finalResponse[count].points = bill.value_point;
          finalResponse[count].descripition = bill.description;
          finalResponse[count].assignor = bill.bill_assignor;
          finalResponse[count].created_at = DateTime.fromSQL(bill.created_at).toFormat('dd/MM/yyyy');
          count ++;
        }
      }

      return response.status(200).json(finalResponse);
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - PabloEscobarController - getPayments Endpoint -  ${e.message} - ${new URLSearchParams(
          request.only(['participant_id', 'campaign_id'])
        )}`
      );
      return response.status(500).json(e.message);
    }
  }

  async readPayment({ request, response }) {
    try {
      const params = request.only(['participant_id','campaign_id','barCode','barCodeDigitable']);

      if (!params.participant_id) {
        return response.status(400).json('Missing participant_id.');
      }

      if (!params.campaign_id) {
        return response.status(400).json('Missing campaign_id.');
      }

      if (!params.barCode && !params.barCodeDigitable) {
        return response.status(400).json('Missing barCode or barCodeDigitable.');
      }

      const executionTime = validationHelper.checkDateTime();

      if(executionTime.status != 200){
        return response.status(executionTime.status).json(executionTime.message);
      }

      const campaign = await XavierService.get(`campaign/${params.campaign_id}`);
      let config = JSON.parse(campaign.data.config);
      if(!config.hasPayment){
        return response.status(403).json('Campaign does not have bill payment configuration.');
      }

      let paymentParams = {
        campaignConfig: config,
        externalTerminal: params.participant_id,
        participant_id: params.participant_id,
        campaign_id: params.campaign_id,
        barCode: {}
      };

      if(params.barCodeDigitable){
        paymentParams.barCode.digitable = params.barCodeDigitable;
      }else{
        paymentParams.barCode.barCode = params.barCode;
      }

      const res = await PabloService.post(`bill-payment/authorize`, paymentParams);

      if (res.status != 200){
        return response.status(res.status).json(res);
      }

      const reward = {
        campaign_id: params.campaign_id,
        participant_id: params.participant_id,
        bill_id: res.data.bill_id
      };

      await HomerService.put('participant-reward/put', reward);

      const finalResponse = {
        bill_id: res.data.bill_id,
        value: res.data.finalValue,
        points: res.data.points,
        tax_value: Number(res.data.tax_value)
      };

      return response.status(res.status).json(finalResponse);
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - PabloEscobarController - readPayment Endpoint -  ${e.message} - ${new URLSearchParams(
          request.only(['participant_id','campaign_id'])
        )}`
      );
      return response.status(500).json(e.message);
    }
  }

  async sendPayment({ request, response }) {
    try {
      const params = request.only(['bill_id','description']);

      if (!params.bill_id) {
        return response.status(400).json('Missing bill_id.');
      }

      const executionTime = validationHelper.checkDateTime();

      if(executionTime.status != 200){
        return response.status(executionTime.status).json(executionTime.message);
      }

      const res = await PabloService.post(`bill-payment`, params);

      if (res.status != 200){
        return response.status(res.status).json(res);
      }

      const finalResponse = {
        bill_id: res.data.bill_id,
        value_points: res.data.value_point,
        assignor: res.data.assignor,
        receipt: res.data.receipt.receiptformatted
      };

      return response.status(res.status).json(finalResponse);
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - PabloEscobarController - sendPayment Endpoint -  ${e.message} - ${new URLSearchParams(
          request.only(['bill_id'])
        )}`
      );
      return response.status(500).json(e.message);
    }
  }

  async confirmPayment({ request, response }) {
    try {
      const params = request.only(['bill_id']);

      if (!params.bill_id) {
        return response.status(400).json('Missing bill_id.');
      }

      const executionTime = validationHelper.checkDateTime();

      if(executionTime.status != 200){
        return response.status(executionTime.status).json(executionTime.message);
      }

      const res = await PabloService.put(`bill-payment/confirm`, params);

      if (res.status != 200){
        return response.status(res.status).json(res);
      }

      const finalResponse = { message: res.data.message };

      return response.status(res.status).json(finalResponse);
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - PabloEscobarController - confirmPayment Endpoint -  ${e.message} - ${new URLSearchParams(
          request.only(['bill_id'])
        )}`
      );
      return response.status(500).json(e.message);
    }
  }

  async cancelPayment({ request, response }) {
    try {
      const params = request.only(['bill_id']);

      if (!params.bill_id) {
        return response.status(400).json('Missing bill_id.');
      }

      const res = await PabloService.put(`bill-payment/cancel`, params);

      if (res.status != 200){
        return response.status(res.status).json(res);
      }

      const finalResponse = { message: res.data.message };

      return response.status(res.status).json(finalResponse);
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - PabloEscobarController - cancelPayment Endpoint -  ${e.message} - ${new URLSearchParams(
          request.only(['bill_id'])
        )}`
      );
      return response.status(500).json(e.message);
    }
  }

  async checkPendency({ request, response }) {
    try {
      const res = await PabloService.get(`bill-payment/pendency-check`);

      if (res.status != 200){
        return response.status(res.status).json(res);
      }

      return response.status(res.status).json(res);
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - PabloEscobarController - checkPendency Endpoint -  ${e.message} - ${new URLSearchParams(
          request.only(['bill_id'])
        )}`
      );
      return response.status(500).json(e.message);
    }
  }

  async checkPayment({ request, response }) {
    try {
      let params = await request.only(['transactionId']);

      if (!params.transactionId) {
        return response.status(400).json('Missing transactionId parameter');
      }

      const res = await PabloService.get(`bill-payment/check?transactionId=${params.transactionId}`);

      if (res.status != 200){
        return response.status(res.status).json(res);
      }

      return response.status(res.status).json(res);
    } catch (e) {
      Log.send(
        `Env: ${Env.get('NODE_ENV')} - PabloEscobarController - checkPayment Endpoint -  ${e.message} - ${new URLSearchParams(
          request.only(['transactionId'])
        )}`
      );
      return response.status(500).json(e.message);
    }
  }

  async viaWebHookAvaliable({ request, response }) {
    try {
      let startTime;
      if(ExtraLogs){
        startTime = process.hrtime();
      }

      const params = request.only(['Message', 'Bandeira', 'CorrelationId']);

      if(!params.Message) {
        return response.status(400).json({ Erro: 'Message not sent field' });
      }

      if(!params.Message.Content) {
        return response.status(400).json({ Erro: 'Content not sent field' });
      }

      if(!params.Bandeira) {
        return response.status(400).json({ Erro: 'Bandeira not sent field' });
      }

      if(ExtraLogs){
        //Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController Via Avaliable - ${JSON.stringify(params.Message.Content)}`);
        //Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController Via Avaliable - ${params.Bandeira}`);
        //Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController Via Avaliable - ${params.CorrelationId}`);
      }

      this.viaWebHookAvaliableLogic(params);

      const responseVia = {
        'IsValid': true,
        'StatusCode': 200,
        'Messages': [
          {
            'Code': '0',
            'Content': '',
            'Type': 'No Error'
          }
        ]
      };
      if(ExtraLogs){
        let elapsedMiliSeconds = await this.parseHrtimeToSeconds(startTime);
        Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController Via Avaliable - ${elapsedMiliSeconds} ms`);
      }

      return response.status(200).json(responseVia);
    } catch (e) {
      Log.sendVia(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController Via Avaliable - ${e.message}`, 'SLACK_AVALIABLE_VIA');
      return response.status(500).json(e.message);
    }
  }

  // Esse endpoint faz o envio para a fila da AWS de atualização de disponibilidade de Via Varejo
  // Foi separado sua entrada no método viaWebHookAvaliable e sua execução em si nesse endpoint para reduzir o tempo de resposta para Via
  async viaWebHookAvaliableLogic(params) {
    try {
      const mktplaceNotFound = await this.checkMkt(params.Bandeira);

      if(mktplaceNotFound) {
        return response.status(400).json({ Erro: 'Bandeira not found' });
      }

      let campaignIdByVia = [6320,6420,3556,5499,5510,2697,6263,6360,3499,2934,5725,5784,5817,5880, 3030, 5804, 5867, 3015, 6178, 6263, 3401, 6363, 6464, 3617, 5979, 6042, 3182, 6232, 6323, 3461, 5942, 5986, 3142, 5749, 5810, 2960, 6183, 6268, 3406, 6199, 6289, 3427, 6184, 6269, 3407, 6280, 6379, 3516, 6310, 6410, 3546, 6300, 6398, 3535, 5756, 5818, 2967, 5963, 6011, 3165, 6225, 6315, 3453, 6141, 6222, 3361, 6129, 6205, 3338, 6304, 6403, 3539, 5964, 6012, 3166, 5755, 5817, 2966, 5980, 6043, 3183, 5498,5509, 2696];

      if(environment === 'staging' || environment === 'development') {
        campaignIdByVia = await this.mktCampanhaid();
      }

      let { Content } = params.Message;
      let { Skus } = JSON.parse(Content);

      delete params.Message.Content;

      Skus = Skus.reduce((prods, prod) => {
        if(campaignIdByVia.includes(prod.IdCampanha)) {
          prods.push(prod);
        }

        return prods;
      }, []);

      params.Message = { Content: JSON.stringify({ Skus }) };

      const products = {
        CorrelationId: params.CorrelationId,
        Message: params.Message,
        Bandeira: params.Bandeira
      };

      if(Skus.length >= 1) {
        Log.sendVia(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController Via Avaliable - Marketplace: ${params.Bandeira} - Total de produtos: ${Skus.length} - Entrada: ${new Date().getHours()}hs${new Date().getMinutes()}s`, 'SLACK_AVALIABLE_VIA');
        await PabloService.post('marketplace-product-avaliable/insert-queue', products);
      }
    } catch (e) {
      Log.sendVia(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController Via Avaliable - ${e.message}`, 'SLACK_AVALIABLE_VIA');
    }
  }

  async viaWebHookPartialProduct({ request, response }) {
    try {
      let startTime;
      if(ExtraLogs){
        startTime = process.hrtime();
      }
      const params = request.only(['Message', 'Bandeira']);

      if(!params.Message) {
        return response.status(400).json({ Erro: 'Message not sent field' });
      }

      if(!params.Message.Content) {
        return response.status(400).json({ Erro: 'Content not sent field' });
      }

      if(!params.Bandeira) {
        return response.status(400).json({ Erro: 'Bandeira not sent field' });
      }

      this.viaWebHookPartialProductLogic(params);

      const responseVia = {
        'IsValid': true,
        'StatusCode': 200,
        'Messages': [
          {
            'Code': '0',
            'Content': '',
            'Type': 'No Error'
          }
        ]
      };
      if(ExtraLogs){
        let elapsedMiliSeconds = await this.parseHrtimeToSeconds(startTime);
        Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController Via Partial Product - ${elapsedMiliSeconds} ms`);
      }
      return response.status(200).json(responseVia);
    } catch (e) {
      Log.sendVia(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController Via Partial Product - ${e.message}`, 'SLACK_PRODUCT_VIA');
      return response.status(500).json(e.message);
    }
  }

  // Esse endpoint faz o envio para a fila da AWS de atualização de parcial de produtos de Via Varejo
  // Foi separado sua entrada no método viaWebHookPartialProduct e sua execução em si nesse endpoint para reduzir o tempo de resposta para Via
  async viaWebHookPartialProductLogic(params) {
    try {
      const products = {
        Message: params.Message,
        Bandeira: params.Bandeira
      };

      const avaliable = await PabloService.post('marketplace-product-partial/insert-queue', products);

      if(!avaliable) {
        Log.sendVia(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController Via Partial Product`, 'SLACK_PRODUCT_VIA');
      }

    } catch (e) {
      Log.sendVia(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController Via Partial Product - ${e.message}`, 'SLACK_PRODUCT_VIA');
    }
  }

  async viaWebHookCategories({ request, response }) {
    try {
      const params = request.only(['Message', 'Bandeira']);

      if(!params.Message) {
        return response.status(400).json({ Erro: 'Message not sent field' });
      }

      if(!params.Message.Content) {
        return response.status(400).json({ Erro: 'Content not sent field' });
      }

      if(!params.Bandeira) {
        return response.status(400).json({ Erro: 'Bandeira not sent field' });
      }

      const categories = {
        Message: params.Message,
        Bandeira: params.Bandeira
      };

      const avaliable = await PabloService.post('marketplace-categories/insert-queue', categories);

      if(!avaliable) {
        Log.sendVia(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController Via Categories`, 'SLACK_CATEGORY_VIA');
        return response.status(400).json(responseVia);
      }

      const responseVia = {
        'IsValid': true,
        'StatusCode': 200,
        'Messages': [
          {
            'Code': '0',
            'Content': '',
            'Type': 'No Error'
          }
        ]
      };
      return response.status(200).json(responseVia);
    } catch (e) {
      Log.send(`Env: ${Env.get('NODE_ENV')} - PabloEscobarController Via Categories - ${e.message}`);
      return response.status(500).json(e.message);
    }
  }



  async checkMkt(bandeira){
    const { data } = await PabloService.get('marketplace/all');
    const mktplace = data.find((mkt) => mkt.name === bandeira);

    if(mktplace) {
      return false;
    }

    return true;
  }

  async mktCampanhaid() {
    const { data } = await XavierService.get(`campaign/all`);
    const configJson = data.reduce((configs, config) => {
      const a = JSON.parse(config.config);
      if(a.marketplaceavaliable) {
        configs.push([...a.marketplaceavaliable, { campaign_id: config.id, name: config.name }]);
      }
      return configs;
    }, []);
    const unify = configJson.reduce((itens, item) => {

      if(item[0]) {
        itens.push(...item);
      }
      return itens;
    });

    const idsCampaignsVia = unify.reduce((itens, item) => {
      if(item.id) {
        if((item.id === 1 || item.id === 2 || item.id === 3) & item.campanhaId > 1){
          itens.push(Number(item.campanhaId));
        }
      }

      return itens;
    }, []);

    return idsCampaignsVia;
  }

  async parseHrtimeToSeconds(hrtime) {
    let end = process.hrtime(hrtime); // end[0] está em segundos, end[1] está em nanosegundos
    const timeInMs = ((end[0]* 1e9 + end[1]) / 1e5).toFixed(3);
    return timeInMs;
  }

  

}

module.exports = PabloEscobarController;