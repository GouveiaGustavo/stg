'use strict';
const Env = use('Env');
const Log = new (use('LogHelper'))();
const logError = `Env: ${Env.get('NODE_ENV')} - XavierController`;
const xavierServiceApi = new (use('ApiInterceptorService'))(Env.get('XAVIER_URL'));

class XavierService {
  async getCampaignsByIdsArray(ids) {
    try {
      const promises = [];

      for (let campaignId of ids) {
        const promise = xavierServiceApi.get(`campaign/${campaignId}`);
        promises.push(promise);
      }

      const result = await Promise.all(promises);
      const campaigns = result.map(({ data }) => data);

      return campaigns;
    } catch (e) {
      Log.send(`${logError} - getUnifiedCampaigns Endpoint - ${e.message}`);
      return { message: e.message, status: 500 };
    }
  }

  async addConfigToCampaignsArray(campaigns, configKeys) {
    try {
      const campaignsWithConfig = JSON.parse(JSON.stringify(campaigns));
      for (let campaign of campaignsWithConfig) {
        for (let configKey of configKeys) {
          const { data: config } = await xavierServiceApi.get(`campaign-config/get?key=${configKey}`);
          if (config) {
            const { data } = await xavierServiceApi.get(`campaign-has-config/get?campaign_id=${campaign.id}&config_id=${config.id}`);
            if (data.value){
              campaign[configKey] = (JSON.parse(data.value)[configKey]);
            }else{
              campaign[configKey] = false;
            }
          }
        }
      }
      return campaignsWithConfig;
    } catch (e) {
      Log.send(`${logError} - getUnifiedCampaigns Endpoint - ${e.message}`);
      return { message: e.message, status: 500 };
    }
  }

  getLatestCampaignPage(campaignPages){
    return campaignPages.reduce((acc, campaignPage) => campaignPage.data.begin_at > acc.data.begin_at ? campaignPage : acc, campaignPages[0]);
  }

  addSegmentationIdsToGroups(groups, groupSegs) {
    const groupsWithSegmentations = groups.data.map((group) => {
      const segmentationGroupId = group.id;
      const groupSeg = groupSegs.find((seg) => {
        if (seg.data[0] && seg.data[0].hasOwnProperty('segmentation_group_id')) {
          return seg.data[0].segmentation_group_id === segmentationGroupId;
        }
        return false;
      });

      return {
        ...group,
        segmentations: groupSeg ? groupSeg.data.map((item) => item.segmentation_id) : []
      };
    });

    return groupsWithSegmentations;
  }

  async addSegmentationFamilyToGroups(groupsWithSegmentation) {
    const promises = [];

    groupsWithSegmentation.forEach((group) => {
      group.segmentations.forEach((id) => {
        const promise = xavierServiceApi.get(`segmentation-tree/get?segmentation_id=${id}`);
        promises.push(promise);
      });
    });

    const promiseResults = await Promise.all(promises);

    let familyTreeNames = [];
    let promiseResultsIndex = 0;

    groupsWithSegmentation.forEach((group) => {
      group.segmentations.forEach((id, idKey) => {
        const { status, data } = promiseResults[promiseResultsIndex];
        if (status === 200) {
          data.map((segmentation) => familyTreeNames.push(segmentation.name));
          group.segmentations[idKey] = {
            id: id,
            familyTreeNames: familyTreeNames.join(' - ')
          };
        }
        familyTreeNames = [];
        promiseResultsIndex++;
      });
    });

    return groupsWithSegmentation;
  }

  async getChildConfigs(params) {
    try{
      const campaignHasCampaign = await xavierServiceApi.get(`campaign-has-campaign/get?parent_campaign_id=${params.campaign_id}`);
  
      const retailCampaign = [];
      const isNotRetailCampaign = [];
  
      for (let ids of campaignHasCampaign.data) {
        const result = await xavierServiceApi.get(`campaign/${ids.sub_campaign_id}`);
        const config = JSON.parse(result.data.config);

        const campaignData = {
          campaignId: result.data.id,
          name: result.data.name,
          hasParticipantImg: config.hasParticipantImg,
          hasParticipantPdv: config.hasParticipantPdv,
          img180x80:  config.img180x80,
          description: result.data.description
        };

        if (config.isRetail) {
          retailCampaign.push(campaignData);
        } else {
          isNotRetailCampaign.push(campaignData);
        }
      }
      return {
        isRetail: retailCampaign,
        isNotRetail: isNotRetailCampaign
      };
    }catch(e){
      Log.send(`${logError} - getChildConfig Endpoint - ${e.message}`);
      return { message: e.message, status: 500 };
    }

  }

  async getParentCampaignConfig(params) {
    try {
      if (params.requestType === 'parent') {
        const parentCampaignConfigs = await xavierServiceApi.get(`campaign/${params.campaign_id}`);
        const { isRetailRegister } = JSON.parse(parentCampaignConfigs.data.config);
        if(isRetailRegister){
          return { isRetailRegister };
        }else{
          return { isRetailRegister: false };
        }

      } else if (params.requestType === 'child') {
        return await getChildConfigs(params);
      }
    } catch (e) {
      Log.send(`${logError} - getParentCampaignConfig Endpoint - ${e.message}`);
      return { message: e.message, status: 500 };
    }
  }

}

module.exports = XavierService;
