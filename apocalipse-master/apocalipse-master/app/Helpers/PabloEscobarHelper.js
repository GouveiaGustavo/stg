"use strict";

const Env = use('Env');
const Log = new (use('LogHelper'))();
const HomerService = new (use('ApiInterceptorService'))(Env.get('HOMER_URL'));
const PabloService = new (use('ApiInterceptorService'))(Env.get('PABLO_URL'));
const moment = use('moment');
const messageError = `Env: ${Env.get('NODE_ENV')} - PabloEscobarHelper - `;


class PabloEscobarHelper {
  async GetOrderTreatment(orderObject) {
    try {
      const myOrder = {};
      const address = await HomerService.get(`address/${orderObject.cart.address_id}`);
      myOrder.orderId = orderObject.id;
      myOrder.tracking = orderObject.tracking;
      myOrder.createdAt = orderObject.created_at;
      myOrder.updatedAt = orderObject.updated_at;
      myOrder.status = orderObject.orderStatus.status;
      myOrder.street = address.data.street;
      myOrder.number = address.data.number;
      myOrder.neighborhood = address.data.neighborhood;
      myOrder.city = address.data.city;
      myOrder.state = address.data.state;
      myOrder.zipcode = address.data.zipcode;
      myOrder.complement = address.data.complement;
      myOrder.product = await this.GetOrderProductLoopTreatment(orderObject.cart.cartHasProduct);
      myOrder.totalFreight = 0;
      myOrder.totalPrice = 0;
      myOrder.total = 0;

      const validatedValues = await this.validateFreight(myOrder.product);

      myOrder.totalFreight = validatedValues.myOrder.totalFreight;
      myOrder.totalPrice = validatedValues.myOrder.totalPrice;

      myOrder.product = validatedValues.resultingProducts;

      myOrder.total = await this.CalculateValues(myOrder.totalFreight, myOrder.totalPrice, '+');

      return myOrder;
    } catch (e) {
      Log.send(`${messageError} GetOrderTreatment Endpoint - ${e.message}`);
      return e.message;
    }
  }

  async validateFreight(products) {
    try {
      let myOrder = {
        totalFreight : 0,
        totalPrice : 0
      };

      let resultingProducts = [];
      for (const item of products) {
        if(item.free_freight){
          myOrder.totalFreight += 0;
          myOrder.totalPrice += await this.CalculateValues(item.pricePoints, item.amount, '*');
          item.freightPoints = 0;
        }else{
          myOrder.totalFreight += await this.CalculateValues(item.freightPoints, item.amount, '*');
          myOrder.totalPrice += await this.CalculateValues(item.pricePoints, item.amount, '*');
        }
        resultingProducts.push(item);
      }


      return {myOrder,resultingProducts};
    } catch (e) {
      Log.send(`${messageError} validateFreight Endpoint - ${e.message}`);
      return e.message;
    }
  }

  async CalculateValues(value1, value2, operator) {
    try {
      let result = 0;

      switch (operator) {
        case '+':
          result = value1 + value2;
          break;
        case '*':
          result = value1 * value2;
          break;
        case '-':
          result = value1 - value2;
          break;
        case '/':
          result = value1 / value2;
          break;
        default:
          result = 0;
          break;
      }
      return result;
    } catch (e) {
      Log.send(`${messageError} CalculateValues Endpoint - ${e.message}`);
      return e.message;
    }
  }

  async GetOrderTrackingLoopTreatment(tracking) {
    try {
      const trackingtList = [];
      for (const item of tracking) {
        trackingtList.push(item);
      }
      return trackingtList;
    } catch (e) {
      Log.send(`${messageError} GetOrderTrackingLoopTreatment Endpoint - ${e.message}`);
      return e.message;
    }
  }

  async GetOrderProductLoopTreatment(cartHasProduct) {
    try {
      const productList = [];
      for (const product of cartHasProduct) {
        const myOrder = {};
        let deliveryForecast;
        const gifttyMarketplace = await PabloService.get(`marketplace/get?alias=giftty`);
        myOrder.amount = product.amount;
        myOrder.pricePoints = product.price_points;
        myOrder.freightPoints = product.freight_points;
        myOrder.productName = product.product.name;
        myOrder.tracking = product.tracking;
        myOrder.virtual = [];
        myOrder.virtualQuantity = 0;
        myOrder.free_freight = product.free_freight;
        if (product.partner_response) {
          const partnerResponse = JSON.parse(product.partner_response);
          if(partnerResponse.deliveryForecast){
            deliveryForecast = partnerResponse.deliveryForecast;
            if (!deliveryForecast || typeof deliveryForecast == 'object') {
              deliveryForecast = 'Até 45 dias úteis';
            }
          }else{
            deliveryForecast = 'Até 45 dias úteis';
          }
          myOrder.deliveryForecast = deliveryForecast;
          if (partnerResponse.tracking) {
            if (partnerResponse.tracking.link) {
              if (Array.isArray(partnerResponse.tracking.link)) {
                myOrder.virtual = await this.GetOrderTrackingLoopTreatment(partnerResponse.tracking.link);
                myOrder.virtualQuantity = myOrder.virtual.length;
              } else {
                myOrder.virtual.push(partnerResponse.tracking.link);
                myOrder.virtualQuantity = 1;
              }
              myOrder.deliveryForecast = partnerResponse.deliveryForecast
                ? partnerResponse.deliveryForecast
                : 'Até 4 dias úteis';
            }
            if (partnerResponse.tracking.DataPrevisao) {
              myOrder.deliveryForecastDate = moment(partnerResponse.tracking.DataPrevisao).format(
                'DD/MM/YYYY',
              );
            }
            if (partnerResponse.tracking.update_at) {
              myOrder.update_at = moment(partnerResponse.tracking.update_at).format('DD/MM/YYYY HH:mm');
            }
            if (partnerResponse.process_at) {
              myOrder.process_at = moment(partnerResponse.process_at).format('DD/MM/YYYY HH:mm');
            }
          }
        } else {
          myOrder.deliveryForecast = 'Até 45 dias úteis';
        }
        if(product.product.marketplace_id === gifttyMarketplace.data[0].id){
          deliveryForecast = 'Até 10 dias úteis'
          myOrder.deliveryForecast = deliveryForecast;
        }
        myOrder.stepper = await this.GetOrderhistoricTrackLoopTreatment(product);
        productList.push(myOrder);
      }
      return productList;
    } catch (e) {
      Log.send(`${messageError} GetOrderProductLoopTreatment Endpoint - ${e.message}`);
      return e.message;
    }
  }

  async GetOrderhistoricTrackLoopTreatment(cartHasProduct) {
    try {
      const historic = [];
      let count = 0;
      for (const item of cartHasProduct.historic) {
        const statusConfig = JSON.parse(item.cartStatus.config);
        const stepperType = step => {
          if (step.canceled) {
            return 'canceled';
          }
          if (step.lastStatus) {
            return 'lastStep';
          }
          if (step.firstStatus) {
            return 'firstStep';
          }
          return 'step';
        };

        historic.push({
          id: item.id,
          name: item.cartStatus.status,
          date: item.created_at,
          ordering: count,
          stepperType: stepperType(statusConfig),
          icon: statusConfig.icon ? statusConfig.icon : '',
        });
        count += 1;
      }
      return historic;
    } catch (e) {
      Log.send(`${messageError} GetOrderhistoricTrackLoopTreatment Endpoint - ${e.message}`);
      return e.message;
    }
  }
}

module.exports = PabloEscobarHelper;
