/* eslint-disable */
/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URL's and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.1/routing
|
*/

const Route = use('Route');

Route.group(() => {
  Route.post('auth', 'AuthController.auth');
  Route.post('campaign/check', 'XavierController.getCampaign');
  Route.post('participant/validate', 'HomerSimpsonController.getParticipantValidate');
  Route.post('login', 'HomerSimpsonController.login');
  Route.post('recovery', 'HomerSimpsonController.recovery').validator('HomerSimpsonController/validateRecovery');
  Route.get('participant/find-recovery-token/get', 'HomerSimpsonController.findRecoveryToken').validator('HomerSimpsonController/findRecoveryToken');
  Route.post('register', 'HomerSimpsonController.register');
  Route.post('send-website', 'JaiminhoController.sendWebsiteContact');
  Route.put('distributor-massive-put', 'HomerSimpsonController.distributorMassiveInsert');
  Route.get('participant-pre-register/validate', 'HomerSimpsonController.preRegisterValidate');
  Route.put('participant-pre-register/put', 'HomerSimpsonController.preRegisterPut').validator('HomerSimpsonController/validatePreRegisterPut');
  Route.get('participant-pre-register/status/all', 'HomerSimpsonController.preRegisterPreStatusGetAll');
  Route.get('segmentation-parent', 'XavierController.getSegmentationByParentId');
  Route.put('distributor-massive-put', 'HomerSimpsonController.distributorMassiveInsert');
  Route.get('zipcode/get', 'PabloEscobarController.getZipCode');
  Route.post('website-register', 'MaryKayController.websiteRegister');
  Route.get('campaign/page', 'XavierController.getCampaignPage');
  Route.post('participant/accept-terms', 'HomerSimpsonController.acceptTerms');
  Route.post('participant/resend-invite', 'XavierController.sendInvite');
  Route.post('customer/participant-goal/post', 'HomerSimpsonController.postParticipantGoal');
  Route.post('tickets/post', 'OracleController.ticketsPost');
  Route.put('external/mechanic-update', 'JarvisController.externalMechanicUpdate');
  Route.get('external/mechanic-config', 'JarvisController.externalMechanicConfig');
  Route.post('external/positivation-mechanic-create', 'JarvisController.externalPositivationMechanicCreate');
  Route.put('external/positivation-mechanic-update', 'JarvisController.externalPositivationMechanicUpdate');
  Route.put('external/positivation-goal-update', 'HomerSimpsonController.externalPositivationGoalUpdate');

  //fluxo de cadastro varejo
  Route.get('getParentCampaignConfig', 'XavierController.getCampaignConfig');
  Route.get('getEligibleParticipants', 'HomerSimpsonController.getEligibleParticipants');

  // Autenticação de multifatores
  Route.post('multifactor-authentication/post', 'HomerSimpsonController.multifactorAuthentication');
  Route.post('multifactor-authentication-send-code/post', 'HomerSimpsonController.multifactorAuthenticationSendCode');

  // Login multi-campanha
  Route.get('unified-campaigns/get', 'XavierController.getUnifiedCampaigns');
  Route.get('get-campaigns-by-participants', 'HomerSimpsonController.getCampaignsByParticipants');

  //Google Tag Manager
  Route.get('campaign/gtm-id/:campaignId', 'XavierController.getGtmId');

   //MoviDesk
   Route.get('campaign/movidesk-key/:campaignId', 'XavierController.getMoviDesk');

}).prefix('api/v1/');

Route.group(() => {
  Route.post('tracking', 'PabloEscobarController.getTracking');
  Route.post('incentivar-avaliable', 'PabloEscobarController.viaWebHookAvaliable')
  Route.post('incentivar-partial-product', 'PabloEscobarController.viaWebHookPartialProduct')
  Route.post('incentivar-categories', 'PabloEscobarController.viaWebHookCategories')
})
  .prefix('webhook/v1/')
  .middleware('webhook');

  Route.group(() => {
    Route.get('melhor-foto', 'UatuController.getMelhorFotoByDateRange');
    Route.get('ranking-merchan', 'UatuController.getRankingMerchanByDateRange');
  })
    .prefix('api/reports/')
    .middleware('uatuwebhook');

Route.group(() => {
  Route.get('participant/get/participants', 'HomerSimpsonController.getParticipants');
  Route.post('participant/voting/files', 'HomerSimpsonController.votingFiles'); // teste deploy
  Route.post('participant/save/data', 'HomerSimpsonController.saveData');
  Route.post('participant/update', 'HomerSimpsonController.participantUpdate');
  Route.post('participant/update-birth-date', 'HomerSimpsonController.participantUpdateBirthDate');
  Route.put('participant/address/update', 'HomerSimpsonController.updateAddress');
  Route.get('participant/address/all', 'HomerSimpsonController.getAddresses');
  Route.get('participant/mechanic/all', 'HomerSimpsonController.getMechanics');
  Route.get('participant/mechanic/history', 'HomerSimpsonController.getMechanicHistory')
  Route.get('participant-possible-points/get', 'HomerSimpsonController.getPossiblePoints');
  Route.get('participant/token/get', 'HomerSimpsonController.getParticipantByToken');
  Route.get('participant/get-participant-children', 'HomerSimpsonController.getParticipantChildren');
  Route.put('participant/create-edit-child', 'HomerSimpsonController.createOrEditParticipantChild');
  Route.get('participant-status/get', 'HomerSimpsonController.getParticipantStatus');
  Route.get('participant/individual/get', 'HomerSimpsonController.getParticipantIndividualGoal');
  Route.get('zipcode', 'PabloEscobarController.getAddress');
  Route.post('signup', 'HomerSimpsonController.signup');
  Route.post('check-user', 'HomerSimpsonController.checkUser');
  Route.get('keyvalue', 'HomerSimpsonController.getKeyValue');
  Route.get('participant/get', 'HomerSimpsonController.getParticipants');
  Route.get('participant/get/files/:id', 'HomerSimpsonController.getParticipantFiles');
  Route.get('participant/files/tovoting/:id', 'HomerSimpsonController.getParticipantFilesToVoting');
  Route.get('participant/mechanics/tovoting/:id', 'HomerSimpsonController.getParticipantMechanicsToVoting');
  Route.get('participant/address/:id', 'HomerSimpsonController.getAddress');
  Route.get('participant/distributor/address/:id', 'HomerSimpsonController.getDistributorAddress');
  Route.get('participant/hierarchy/:id', 'HomerSimpsonController.getHierarchy');
  Route.get('participant/:id', 'HomerSimpsonController.getParticipant');
  Route.delete('participant/:id/file/:fileid', 'HomerSimpsonController.deleteParticipantFile');
  Route.get(
    'participant/accept/point/pendent/get',
    'HomerSimpsonController.getPendentParticipantAcceptPoint',
  );
  Route.put('participant/accept/point/put', 'HomerSimpsonController.putParticipantAcceptPoint');
  Route.post('participant/accept/point/approval', 'HomerSimpsonController.participantAcceptPointApproval');

  // Participants Blue Jacket
  Route.put('participant-pre-register/update-by-participant', 'HomerSimpsonController.updateByParticipant');
  Route.get('participant/all/get-by-segmentation', 'HomerSimpsonController.getParticipantsBySegmentation');

  //Pre-register Segmentation Participants  
  Route.get('participant/pre-register/segmentation', 'HomerSimpsonController.getParticipantsPreRegisterBySegmentation')
  Route.get('participant-pre-register-segmentation/:id', 'HomerSimpsonController.getPreRegisterById');

  // Participant Has Product Alert
  Route.post('participant-has-product-alert/create', 'HomerSimpsonController.postParticipantHasProductAlert');
  Route.get('participant-has-product-alert/get', 'HomerSimpsonController.getParticipantHasProductAlert')

  //DATAKEY
  Route.get('data-key/get', 'HomerSimpsonController.getDataKey');

  // XAVIER
  Route.get('faq', 'XavierController.getFaq');
  Route.get('banner/get', 'XavierController.getBanner');
  Route.get('campaign-mechanic/get', 'XavierController.getCampaignHasMechanic');
  Route.get('segmentation/:id', 'XavierController.getSegmentationById');

  // PABLO ESCOBAR
  Route.get('category', 'PabloEscobarController.getCategory');
  Route.get('categories', 'PabloEscobarController.getCategories');
  Route.get('products', 'PabloEscobarController.getProducts');
  Route.get('product', 'PabloEscobarController.getProduct');
  Route.get('cart', 'PabloEscobarController.getCart');
  Route.get('orders', 'PabloEscobarController.getOrders');
  Route.get('order', 'PabloEscobarController.getOrder');
  Route.get('freight', 'PabloEscobarController.freight').validator('PabloEscobarController/Freight');
  Route.post('cart/add', 'PabloEscobarController.cartAdd');
  Route.post('cart/update', 'PabloEscobarController.cartUpdate');
  Route.post('cart/item-update', 'PabloEscobarController.cartItemUpdate');
  Route.post('cart/item-delete', 'PabloEscobarController.cartItemDelete');
  Route.post('cart/delete', 'PabloEscobarController.cartDelete');
  Route.post('cart/checkout', 'PabloEscobarController.cartCheckout');

  // JARVIS
  Route.get('mechanic/gde-participant', 'JarvisController.gdeByParticipant');
  Route.get('mechanic/kof-participant', 'JarvisController.kofByParticipant');
  Route.get('mechanics', 'JarvisController.getMechanics');
  Route.get('mechanic/:id', 'JarvisController.getMechanic');

  // ROBIN HOOD
  Route.get('points', 'RobinHoodController.getPoints');
  Route.get('extract', 'RobinHoodController.getExtract');
  Route.get('expiration-info', 'RobinHoodController.getExpirationInfo');

  // CONSTANTINE
  Route.post('upload', 'ConstantineController.upload');

  // ORACLE
  Route.get('tickets', 'OracleController.allTickets');
  Route.get('tickets/get', 'OracleController.getTickets');
  Route.post('tickets/create', 'OracleController.createTicket');
  Route.get('tickets/subjects', 'OracleController.getSubjects');
  Route.put('tickets/historic', 'OracleController.putHistoric');

  // News Board
  Route.get('news-board/get', 'XavierController.getNewsBoard');
  Route.get('news-board/:id', 'XavierController.getNewsBoardById');
  Route.get('participant-news-board/get', 'HomerSimpsonController.getParticipantNewsBoard');

  //Menu Page Campaign
  Route.get("menu-page-campaign/get", "XavierController.menuPageCampaignGet").validator('XavierController/validationGetMenuIncentivar');

  //GDE Ranking
  Route.get('participant/gde/gdeRanking', 'HomerSimpsonController.getGDERanking');

  //Survey
  Route.get("survey/all", "JarvisController.surveyAll");
  Route.get("survey/get", "JarvisController.surveyGet");

  //SurveyAnswer
  Route.get("survey-answer/all", "JarvisController.surveyAnswerAll");
  Route.get("survey-answer/get", "JarvisController.surveyAnswerGet");

  //ParticipantSurveyAnswer
  Route.delete("participant-survey-answer/:id", "HomerSimpsonController.participantSurveyAnswerDelete");
  Route.get("participant-survey-answer/all", "HomerSimpsonController.participantSurveyAnswerAll");
  Route.get("participant-survey-answer/get", "HomerSimpsonController.participantSurveyAnswerGet");
  Route.post("participant-survey-answer/post", "HomerSimpsonController.participantSurveyAnswerPost");
  Route.put("participant-survey-answer/put", "HomerSimpsonController.participantSurveyAnswerPut");
  Route.get("participant-survey-answer/:id", "HomerSimpsonController.participantSurveyAnswerFind");

  //ScheduledSurvey
  Route.get("scheduled-survey/get", "JarvisController.scheduledSurvey");

  //QUIZ
  Route.get('participant-quiz/questions/get', 'JarvisController.ParticipantQuizQuestionsGet');
  Route.get('participant-quiz/results/get', 'HomerSimpsonController.ParticipantQuizResultsGet');
  Route.post('participant-quiz/answers/post', 'HomerSimpsonController.ParticipantQuizAnswersPost');

  //QRCodeTokens
  Route.post("qrcode-token-process/post", "HomerSimpsonController.qrcodeTokenProcess");
  Route.delete("qrcode-token/:id", "HomerSimpsonController.qrcodeTokenDelete");
  Route.get("qrcode-token-status/get", "HomerSimpsonController.qrcodeTokenStatus");

  //CopaKOF
  Route.get("copa-kof-ranking/get", "HomerSimpsonController.getCopaKOFRanking");
  Route.get("rules/get", "JarvisController.getRule");
  Route.get("prizes/get", "JarvisController.getPrize");
  Route.get("challenges/get", "JarvisController.getChallenges");
  Route.get('copa-kof-channel/get', 'JarvisController.getCopaKOFChannel');
  Route.get('perfect-plays/get', 'JarvisController.getPerfectPlays');

  //ParticipantPageViewed
  Route.get("participant-page-viewed/get", "HomerSimpsonController.getParticipantPageViewed");

  //OnePage
  Route.get("onepage-team/get", "JarvisController.getOnePageTeam");
  Route.get("onepage-focus/get", "JarvisController.getOnePageFocus");

  //Pagamento de Contas
  Route.get("payments/get", "PabloEscobarController.getPayments");
  Route.get("payments/get-extract", "PabloEscobarController.getPaymentsExtract");
  Route.post("payments/read", "PabloEscobarController.readPayment");
  Route.post("payments/send", "PabloEscobarController.sendPayment");
  Route.put("payments/confirm", "PabloEscobarController.confirmPayment");
  Route.put("payments/cancel", "PabloEscobarController.cancelPayment");
  Route.get('payments/check', 'PabloEscobarController.checkPayment');
  Route.get('payments/pendency-check', 'PabloEscobarController.checkPendency');

  // Participant Wishlist
  Route.post('participant-wishlists/create-update', 'HomerSimpsonController.createOrUpdateWishlist');
  Route.get('participant-wishlists/wishlist', 'HomerSimpsonController.wishlist');
  Route.get('participant-wishlists/single-item', 'HomerSimpsonController.getSingleItem');  

  //Coach
  Route.get('coach/get', 'CoachController.getAll')
  Route.get('coach/pos-participant/', 'CoachController.getCnpj')
  Route.get('coach/participant-id/:id', 'CoachController.getParticipantId')

  // Participant Has PDV
  Route.get('participant-has-pdv/get', 'HomerSimpsonController.getListParticipantHasPdv');

  // Participant PDV Grouped
  Route.post('participant-has-pdv/create-group', 'HomerSimpsonController.createParticipandPdvGrouped');

  // Participant Has Embedded
  Route.post('participant-generate-token/post', 'HomerSimpsonController.getEmbedded');

  // Participant special_rule accepted_terms_at
  Route.post('special-rule/post', 'HomerSimpsonController.postSpecialRule').validator('HomerSimpsonController/PostSpecialRule');

  // InpayService
  Route.get('inpay-service/verification/points', 'InpayServiceController.verifyPoints')
  Route.get('inpay-service/fitce-order/calculate-taxes', 'InpayServiceController.calculateTaxes')
  Route.get('inpay-service/fitce-order/get-comission-value', 'InpayServiceController.getComissionValue')
  Route.get('inpay-service/fitce-order/get-all', 'InpayServiceController.getAll')
  Route.post('inpay-service/fitce-order/reedem', 'InpayServiceController.reedem')

  //Regulation
  Route.get('regulation/get-one/:id', 'XavierController.getOneRegulation')
  Route.get('regulation/get', 'XavierController.getRegulation')
  
  // Participant Accepted Regulation
  Route.get('participant-accepted-regulation/get', 'HomerSimpsonController.getParticipantAcceptedRegulation');
  Route.post('participant-accepted-regulation/post', 'HomerSimpsonController.postParticipantAcceptedRegulation');
})
  .prefix('api/v1/')
  .middleware('homersimpson');

// COCKPIT
Route.group(() => {
  Route.get('campaign/get-by-email', 'XavierController.getCampaignsByEmail');
  Route.post('login', 'XavierController.login');
  Route.post('user/recovery-password', 'XavierController.recoveryPassword');
  Route.post('user/change-password', 'XavierController.changePassword');
  Route.put('talk-with-us/update-ticket', 'OracleController.updateTicket');
  Route.get('adjustment-preset/enabled/all', 'RobinHoodController.getAllEnabledPresets');
  Route.get('participant/custom-search', 'HomerSimpsonController.customSearchParticipants');
  Route.get('adjustment-point/get', 'RobinHoodController.getAdjustmentPoint');
  Route.get('adjustment-preset/enabled/all', 'RobinHoodController.getAllPresets');
  Route.get('participant-goals/mechanic/export', 'HomerSimpsonController.getParticipantGoalsExportFile');
  Route.get('participant-pre-register-cnpj/get', 'HomerSimpsonController.getPreRegistersCnpj');
  Route.get('participant-pre-register-cnpj/:id', 'HomerSimpsonController.getPreRegisterCnpjById');
  Route.get('participant-pre-register-cpf/get', 'HomerSimpsonController.getPreRegistersCpf');
  Route.get('participant/validate', 'HomerSimpsonController.participantValidate');
}).prefix('cockpit/v1/');

Route.group(() => {
  Route.put('distributor-participants','HomerSimpsonController.participantHasDistributor')

  //adjustment-Point
  Route.post('adjustment-point/post', 'RobinHoodController.AdjusmentPointPost');
  Route.get('adjustment-point/get', 'RobinHoodController.getAdjustmentPoint');

  //Points
  Route.get('points', 'RobinHoodController.getPoints');

  //Adjustment Presets
  Route.get('adjustment-preset/all', 'RobinHoodController.getAllPresets');
  Route.get('adjustment-preset/enabled/all', 'RobinHoodController.getAllEnabledPresets');
  Route.get('adjustment-preset/get', 'RobinHoodController.getPresets');
  Route.put('adjustment-preset/put', 'RobinHoodController.putPresets');

  // TalkWithUs
  Route.get('talk-with-us/all', 'OracleController.allTickets');
  Route.get('talk-with-us/subjects/get', 'OracleController.getSubjects');
  Route.get('talk-with-us/resume', 'OracleController.getTicketsResume');
  Route.get('talk-with-us/data-board', 'OracleController.twuDataBoard');
  Route.get('talk-with-us/situation/all', 'OracleController.getAllSituations');
  Route.get('talk-with-us/get', 'OracleController.getTickets');
  Route.get('talk-with-us/historic/get', 'OracleController.getHistoric');
  Route.put('talk-with-us/update-ticket', 'OracleController.updateTicket');
  Route.put('talk-with-us/historic/put', 'OracleController.putHistoric');
  Route.put('talk-with-us/put', 'OracleController.put');
  Route.get('talk-with-us/:id', 'OracleController.getTicketsById');

  // Modules
  Route.get('module-group/all', 'XavierController.getModuleGroups');

  // Modules
  Route.get('module/all', 'XavierController.allModules');
  Route.get('module/get', 'XavierController.getModules');
  Route.get('module/search', 'XavierController.searchModule');
  Route.get('module/:id', 'XavierController.getModuleById');

  // ModulesRoles
  // Route.get('module-roles/get', 'XavierController.getModuleRoles');
  Route.put('module-roles/put', 'XavierController.putModuleRoles');
  Route.get('module-roles/delete/:id', 'XavierController.deleteModuleRoles');

  //Customer
  Route.get('customer/get', 'XavierController.getCustomers');
  Route.get('customer/search', 'XavierController.searchCustomer');
  Route.put('customer/put', 'XavierController.customerPut');
  Route.get('customer/:id', 'XavierController.getCustomerById');

  // Segmentation
  Route.get('segmentation/all', 'XavierController.getAllSegmentation');
  Route.get('segmentation/get', 'XavierController.getSegmentation');
  Route.get('segmentation/search', 'XavierController.searchSegmentation');
  Route.get('segmentation/:id', 'XavierController.getSegmentationById');
  Route.put('segmentation/put', 'XavierController.putSegmentation');

  //Segmentation Group
  Route.get('segmentation-group/get', 'XavierController.getSegmentationGroup');
  Route.post('segmentation-group/create', 'XavierController.createSegmentationGroup');
  Route.put('segmentation-group/update', 'XavierController.updateSegmentationGroup');
  Route.delete('segmentation-has-group/delete', 'XavierController.deleteSegmentationHasGroup');
  Route.delete('segmentation-group/delete', 'XavierController.deleteSegmentationGroup');

  // Hierarquia
  Route.get('hierarchy/get', 'HomerSimpsonController.getHierarchy');
  Route.get('hierarchy/all', 'HomerSimpsonController.getAllHierarchy');
  Route.get('hierarchy/search', 'HomerSimpsonController.searchHierarchy');
  Route.put('hierarchy/put', 'HomerSimpsonController.putHierarchy');

  // Campaign
  Route.get('campaign/get-tmp', 'XavierController.getCampaigns');
  Route.put('campaign/put', 'XavierController.putCampaign');
  Route.put('campaign/config/put', 'XavierController.putCampaignConfig');
  Route.get('campaign/validate-domain', 'XavierController.validateDomain');
  Route.get('campaign/search', 'XavierController.searchCampaign');
  Route.get('campaign/:id', 'XavierController.getCampaignById');
  Route.get('campaign-by-customer/get', 'XavierController.getCampaignByCustomerId');

  // CampaignPage
  Route.get('campaign-page/get', 'XavierController.getCampaignPage');
  Route.get('campaign-page/all', 'XavierController.getCampaignPageAll');
  Route.put('campaign-page/put', 'XavierController.campaignPagePut');

  // Marketplace
  Route.get('marketplace/all', 'PabloEscobarController.allMarketplace');
  Route.get('marketplace/get', 'PabloEscobarController.getMarketplace');
  Route.put('marketplace/put', 'PabloEscobarController.putMarketplace');
  Route.get('marketplace/categories/search', 'PabloEscobarController.searchCategories');
  Route.get('marketplace/categories/:id', 'PabloEscobarController.getCategoryById');
  Route.get('marketplace/:id', 'PabloEscobarController.getMarketplaceById');
  Route.get('marketplace-product-paginate', 'PabloEscobarController.marketplaceProductPaginate');
  Route.get('marketplace-category-paginate', 'PabloEscobarController.marketplaceCategoryPaginate');
  Route.put('marketplace-category/put', 'PabloEscobarController.createMarketplaceCategory');
  Route.put('marketplace-product/put', 'PabloEscobarController.putMarketplaceProduct');

  // FAQ
  Route.put('faq/put', 'XavierController.putFaq');
  Route.put('faq/mass-put', 'XavierController.putFaqMass');
  Route.get('faq/get', 'XavierController.getFaq');
  Route.get('faq/:id', 'XavierController.getFaqById');

  //Products
  Route.get('products-paginate', 'PabloEscobarController.getPaginateByCategoryId');

  // USER
  Route.put('user/update', 'XavierController.userUpdate');
  Route.get('user/manager/get', 'XavierController.getManager');
  Route.get('campaign/get-tmp', 'XavierController.getCampaigns');
  Route.get('user/:id', 'XavierController.getUserById');

  // USER-CAMPAIGN
  Route.get('user-campaign/get', 'XavierController.getManagerByCampaign');

  // MANAGER
  Route.put('manager/put', 'XavierController.userUpdate');
  Route.get('manager/get', 'XavierController.getManager');
  Route.get('manager/:id', 'XavierController.getUserById');

  // Banner
  Route.get('banner/get', 'XavierController.getBannerList');
  Route.put('banner/put', 'XavierController.putBanner');
  Route.get('banner/:id', 'XavierController.getBannerById');

  // Banner Type
  Route.get('banner-type/search', 'XavierController.searchBannerType');
  Route.get('banner-type/all', 'XavierController.getAllBannerType');
  Route.get('banner-type/:id', 'XavierController.getBannerTypeById');

  // News Board
  Route.get('news-board/get', 'XavierController.getNewsBoard');
  Route.put('news-board/put', 'XavierController.putNewsBoard');
  Route.get('news-board/:id', 'XavierController.getNewsBoardById');

  // Participant
  Route.get('participant/get', 'HomerSimpsonController.getParticipants');
  Route.put('participant/put', 'HomerSimpsonController.putParticipants');
  Route.get('participant/search', 'HomerSimpsonController.searchParticipants');
  Route.get('participant/custom-search', 'HomerSimpsonController.customSearchParticipants');
  Route.get('participant/resend-invite', 'XavierController.sendInvite');
  Route.get('participant/:id', 'HomerSimpsonController.getParticipant');

  // Participant Status
  Route.get('participant-status/get', 'HomerSimpsonController.getParticipantStatus');
  Route.get('customer/:id', 'XavierController.getCustomerById');

  // Participant Goals
  Route.get('participant-goals/mechanic/get', 'HomerSimpsonController.getParticipantGoals');
  Route.get('participant-goals/mechanic-value', 'HomerSimpsonController.getMechanicValue');
  Route.put('participant-goals/save-goals', 'HomerSimpsonController.saveGoals');
  Route.post('participant-goals/send-queue', 'HomerSimpsonController.insertGoalsQueue');
  Route.put('participant-goals/calculate-points', 'HomerSimpsonController.calculatePoints');

  // Pre Register
  Route.get('participant-pre-register/get', 'HomerSimpsonController.getPreRegisters');
  Route.put('participant-pre-register/put', 'HomerSimpsonController.preRegisterUpdate');
  Route.get('participant-pre-register/:id', 'HomerSimpsonController.getPreRegisterById');
  Route.put('participant-pre-register-cnpj/put', 'HomerSimpsonController.preRegisterUpdateCnpj');
  Route.get('participant-pre-register-cnpj/get', 'HomerSimpsonController.getPreRegistersCnpj');
  Route.get('participant-pre-register-cnpj/:id', 'HomerSimpsonController.getPreRegisterCnpjById');
  Route.get('participant-pre-register-cpf/get', 'HomerSimpsonController.getPreRegistersCpf');
  Route.get('participant-pre-approved-pdv', 'HomerSimpsonController.getPreApprovedPdv');
  // Pre Register Situation
  Route.get('pre-register-situation/search', 'HomerSimpsonController.searchPreRegisterSituation');
  Route.get('pre-register-situation/all', 'HomerSimpsonController.preRegisterPreStatusGetAll');
  Route.get('pre-register-situation/:id', 'HomerSimpsonController.getPreRegisterSituationById');

  // Mechanic-Type
  Route.get('mechanic-type/all', 'JarvisController.allMechanicTypes');
  Route.get('mechanic-type/get', 'JarvisController.getMechanicType');
  Route.put('mechanic-type/put', 'JarvisController.put');

  //Mechanic
  Route.get('participant-goals/mechanic/get', 'HomerSimpsonController.getParticipantGoals');
  Route.get('participant-goals/mechanic/export', 'HomerSimpsonController.getParticipantGoalsExportFile');
  Route.get('mechanic/get', 'JarvisController.getMechanics');
  Route.get('mechanic/count', 'JarvisController.countMechanics');
  Route.delete('mechanic/delete', 'JarvisController.deleteMechanic');
  Route.put('mechanic/put', 'JarvisController.putMechanic').validator('JarvisController/validatePutMechanic');
  Route.put('submechanic/simple-update', 'JarvisController.putSubmechanic');
  Route.get('mechanic/:id', 'JarvisController.getMechanic');

  //DefaultRoles
  Route.get('default-roles/all', 'XavierController.getAllDefaultRoles');

  //CampaignCredit
  Route.get('campaign-credit/sum-total-transactional', 'XavierController.getSumTotalTransactional');
  Route.get('campaign-credit/sum-goals', 'XavierController.getSumGoals');
  Route.get('campaign-credit/get', 'XavierController.getCampaignCredit');
  Route.get('campaign-credit-transactional/extract', 'XavierController.getExtractList');

  //Validity
  Route.get('validity/all', 'XavierController.validityAll');

  //Category
  Route.put('category', 'PabloEscobarController.updateCategory');
  Route.post('category', 'PabloEscobarController.createCategory');
  Route.delete('category/:id', 'PabloEscobarController.deleteCategory');
  Route.get('category/search', 'PabloEscobarController.searchCategories');
  Route.get('category-paginate', 'PabloEscobarController.categoryPaginate');

  //AudienceType
  Route.get('audience-type/all', 'JarvisController.getAllAudienceTypes');

  //UnityTypes
  Route.get('unity-type/all', 'JarvisController.getAllUnityTypes');

  //Brokers
  Route.get('brokers/get', 'HomerSimpsonController.getBrokers');
  Route.put('brokers/put', 'HomerSimpsonController.putBrokers');
  Route.get('brokers/:id', 'HomerSimpsonController.getBrokerById');
  Route.get('distributors', 'HomerSimpsonController.distributors');

  //Reward
  Route.get('rewards/get', 'PabloEscobarController.getRewards');

  //PURCHASE
  Route.get('purchase-order/get', 'XavierController.getPurchaseOrder').validator('XavierController/validateGetPurchaseOrder');;
  Route.put('purchase-order/put', 'XavierController.purchaseOrder').validator('XavierController/validationPurchaseOrder');
  Route.post('purchase-order/queue', 'XavierController.QueuePurchaseOrder');
  Route.get('purchase-order/:id', 'XavierController.getPurchaseOrderById');

  // GALACTUS 2.0
  Route.get('file-type/enabled/get', 'GalactusController.getFileTypeEnabled');
  Route.get('file-status/enabled/get', 'GalactusController.getFileStatusEnabled');
  Route.get('file/params/get', 'GalactusController.getParamsPagination');
  //Pontos pendentes
  Route.post('run-points-release/:file_id', 'GalactusController.runPointsRelease');
  Route.put('file/enabled/put', 'GalactusController.updateFileEnabled').validator('GalactusController/updateFileEnabled');

  //MARY KAY
  Route.get('email-negative/get', 'MaryKayController.getEmailNegative');
  Route.get('word-negative/get', 'MaryKayController.getWordNegative');
  Route.put('word-negative-put', 'MaryKayController.putWordNegative');
  Route.put('email-negative-put', 'MaryKayController.putEmailNegative');
  Route.delete('word-negative-delete', 'MaryKayController.deleteWordNegative');
  Route.delete('email-negative-delete', 'MaryKayController.deleteEmailNegative');

  //Menu Page
  Route.delete("menu-page/:id", "XavierController.menuPageDelete");
  Route.get("menu-page/all", "XavierController.menuPageAll");
  Route.get("menu-page/get", "XavierController.menuPageGet");
  Route.put("menu-page/put", "XavierController.menuPagePut");
  Route.get("menu-page/:id", "XavierController.menuPageFind");

  //Menu Page Campaign
  Route.delete("menu-page-campaign/:id", "XavierController.menuPageCampaignDelete");
  Route.get("menu-page-campaign/all", "XavierController.menuPageCampaignAll");
  Route.get("menu-page-campaign/get", "XavierController.menuPageCampaignGet").validator('XavierController/validationGetMenuCockpit');
  Route.put("menu-page-campaign/put", "XavierController.menuPageCampaignPut").validator('XavierController/validationGetMenuCockpit');
  Route.get("menu-page-campaign/:id", "XavierController.menuPageCampaignFind");

  //Validate-CPF
  Route.get("validate-document/get", "HomerSimpsonController.validateCPFOrCNPJ");

  //Survey
  Route.delete("survey/:id", "JarvisController.surveyDelete");
  Route.get("survey/all", "JarvisController.surveyAll");
  Route.get("survey/get", "JarvisController.surveyGet");
  Route.post("survey/post", "JarvisController.surveyPost");
  Route.put("survey/put", "JarvisController.surveyPut");
  Route.get("survey/:id", "JarvisController.surveyFind");

  //SurveyHasCampaign
  Route.delete("survey-has-campaign/:id", "JarvisController.surveyHasCampaignDelete");
  Route.get("survey-has-campaign/all", "JarvisController.surveyHasCampaignAll");
  Route.get("survey-has-campaign/get", "JarvisController.surveyHasCampaignGet");
  Route.post("survey-has-campaign/post", "JarvisController.surveyHasCampaignPost");
  Route.put("survey-has-campaign/put", "JarvisController.surveyHasCampaignPut");
  Route.get("survey-has-campaign/:id", "JarvisController.surveyHasCampaignFind");

  //SurveyType
  Route.delete("survey-type/:id", "JarvisController.surveyTypeDelete");
  Route.get("survey-type/all", "JarvisController.surveyTypeAll");
  Route.get("survey-type/get", "JarvisController.surveyTypeGet");
  Route.post("survey-type/post", "JarvisController.surveyTypePost");
  Route.put("survey-type/put", "JarvisController.surveyTypePut");
  Route.get("survey-type/:id", "JarvisController.surveyTypeFind");

  //SurveyAnswer
  Route.delete("survey-answer/:id", "JarvisController.surveyAnswerDelete");
  Route.get("survey-answer/all", "JarvisController.surveyAnswerAll");
  Route.get("survey-answer/get", "JarvisController.surveyAnswerGet");
  Route.post("survey-answer/post", "JarvisController.surveyAnswerPost");
  Route.put("survey-answer/put", "JarvisController.surveyAnswerPut");
  Route.get("survey-answer/:id", "JarvisController.surveyAnswerFind");

  //MechanicQuizType
  Route.delete('mechanic-quiz-type/:id', 'JarvisController.MechanicQuizTypeDelete');
  Route.get('mechanic-quiz-type/get', 'JarvisController.MechanicQuizTypeGet');
  Route.get('mechanic-quiz-type/all', 'JarvisController.MechanicQuizTypeAll');
  Route.put('mechanic-quiz-type/put', 'JarvisController.MechanicQuizTypePut');
  Route.get('mechanic-quiz-type/:id', 'JarvisController.MechanicQuizTypeFind');

  //MechanicQuiz
  Route.get('mechanic-quiz/get', 'JarvisController.MechanicQuizGet');
  Route.get('mechanic-quiz/all', 'JarvisController.MechanicQuizAll');
  Route.put('mechanic-quiz/put', 'JarvisController.MechanicQuizPut');
  Route.get('mechanic-quiz/:id', 'JarvisController.MechanicQuizFind');

  //MechanicQuizAnswer
  Route.get('mechanic-quiz-answer/get', 'JarvisController.MechanicQuizAnswerGet');
  Route.get('mechanic-quiz-answer/all', 'JarvisController.MechanicQuizAnswerAll');
  Route.put('mechanic-quiz-answer/put', 'JarvisController.MechanicQuizAnswerPut');
  Route.get('mechanic-quiz-answer/:id', 'JarvisController.MechanicQuizAnswerFind');

  //ParticipantFiles
  Route.get('participant/get/files/:id', 'HomerSimpsonController.getParticipantFiles');
  Route.put('media/put', 'HomerSimpsonController.putParticipantFiles');

  //SINTEGRA Integration
  Route.post('update-cnpj', 'HomerSimpsonController.updateCnpj');

  //CopaKOFInfo
  Route.get('copa-kof-info/get', 'JarvisController.getCopaKOFInfo');
  Route.get('copa-kof-segmentation/get', 'JarvisController.getCopaKOFSegmentation');
  Route.put('copa-kof-info/put', 'JarvisController.putCopaKOFInfo');
  Route.delete('copa-kof-prize/delete/:id', 'JarvisController.deleteCopaKOFPrize');
  Route.delete('copa-kof-challenge/delete/:id', 'JarvisController.deleteCopaKOFChallenge');
  Route.delete('copa-kof-channel-kpi/delete/:id', 'JarvisController.deleteCopaKOFPerfectPlay');
  Route.get('copa-kof-channel/get', 'JarvisController.getCopaKOFChannel');
  Route.get('copa-kof-kpi/get', 'JarvisController.getCopaKOFKpi');

  //Campaign Has Mechanic, Modulador de Mecânicas
  Route.get('campaign-mechanic/get', 'XavierController.getCampaignHasMechanic');

  //Labels de IA
  Route.get('rekognition-label/get', 'JarvisController.getRekognitionLabel');

  //Mecânicas Automatizadas
  Route.post('mechanic-config', 'JarvisController.postExternalMechanicConfig');
  Route.put('mechanic-config', 'JarvisController.putExternalMechanicConfig');
  Route.get('mechanic-product-list','JarvisController.getHyperaProducts');
  Route.get('client-mechanic-type','JarvisController.getHyperaMechanicTypes');
  Route.get('mechanic-invoice-type','JarvisController.getHyperaInvoiceTypes');
  Route.get('mechanic-config/all','JarvisController.getAllExternalMechanicConfig');
  Route.get('single-mechanic-config/:id','JarvisController.getSingleMechanicConfig');
  Route.put('mechanic-config-release/:id','JarvisController.externalMechanicConfigRelease');
  Route.put('mechanic-config-disable/:id','JarvisController.externalMechanicConfigDisable');

  //support key
  Route.post('suppot-key/post', 'HomerSimpsonController.getSupportKey');

  //jobs
  Route.post('jobs/post', 'HomerSimpsonController.createJob');
  Route.put('jobs/put', 'HomerSimpsonController.updateJob');
  Route.delete('jobs/delete', 'HomerSimpsonController.deleteJob');
  Route.get('jobs/get', 'HomerSimpsonController.getJob');
  
  Route.post('createHistoricJob/post', 'HomerSimpsonController.createHistoricParticipantHistoric');
  Route.get('getHistoricJob/get', 'HomerSimpsonController.getHistoricParticipantHistoric');
  Route.put('updateHistoricJob/put', 'HomerSimpsonController.putHistoricParticipantHistoric');

    //Historico do participante
  Route.post('createHistoricLog', 'LogsController.createLog');
  Route.get('getLogs', 'LogsController.getLogs');
  Route.get('getlogbyfilter', 'LogsController.getLogByFilter');
  Route.get('getLogsCount', 'LogsController.getLogsCount');

  //Regulation
  Route.get('regulation/get', 'XavierController.getRegulation')
  Route.get('regulation/get-one/:id', 'XavierController.getOneRegulation')

  // Participant Accepted Regulation
  Route.get('participant-accepted-regulation/get', 'HomerSimpsonController.getParticipantAcceptedRegulation');
})
  .prefix('cockpit/v1/')  
  .middleware('xavier');

Route.on('/').render('welcome');
