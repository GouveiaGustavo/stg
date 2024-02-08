const { IncomingWebhook } = require('@slack/client');
const Env = use('Env');
const logParticipantData = new IncomingWebhook(Env.get('LOG_PARTICIPANT_PUT_DATA'));
const webhook = new IncomingWebhook(Env.get('SLACK_WEBHOOK_URL'));
const webhookViaAvaliable  = new IncomingWebhook(Env.get('SLACK_AVALIABLE_VIA'))
const webhookViaCategory  = new IncomingWebhook(Env.get('SLACK_CATEGORY_VIA'))
const webhookViaProduct  = new IncomingWebhook(Env.get('SLACK_PRODUCT_VIA'))

class LogHelper {
  async send(message) {
    // Send simple text to the webhook channel
    webhook.send(message, function(err, res) {
      if (err) {
        return err;
      } else {
        return res;
      }
    });
  }

  async sendVia(message, logVia) {
    const viaTypeSend = {
      SLACK_AVALIABLE_VIA: webhookViaAvaliable,
      SLACK_CATEGORY_VIA: webhookViaCategory,
      SLACK_PRODUCT_VIA: webhookViaProduct
    }

    viaTypeSend[logVia].send(message, function(err, res) {
      if (err) {
        return err;
      } else {
        return res;
      }
    });
  }

  async sendPutParticipantData(message){
    logParticipantData.send(message, function(err, res) {
          if (err) {
            return err;
          } else {
            return res;
          }
        });
  }

  async sendPointsRelease(message) {
    // Send simple text to the webhook channel
    webhookPointsRelease.send(message, function(err, res) {
      if (err) {
        return err;
      } else {
        return res;
      }
    });
  }
}

module.exports = LogHelper;
