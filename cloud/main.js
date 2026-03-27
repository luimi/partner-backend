const couponCtrl = require("./couponCtrl")
const userCtrl = require("./userCtrl")
const campaignCtrl = require("./campaignCtrl")
const tokenCtrl = require("./tokenCtrl")

const { PAYMENT_WEBHOOK } = process.env;


Parse.Cloud.define("redeemCoupon", couponCtrl.redeemCoupon ,{
  fields : ['code'],
  requireUser: true
})
Parse.Cloud.define("googleSignin", userCtrl.googleSignin ,{
  fields : ['id_token'],
  requireUser: false
});

Parse.Cloud.define("upload", campaignCtrl.upload,{
  fields : ['file', 'type'],
  requireUser: true
});

Parse.Cloud.define("getRandomCampaign", campaignCtrl.getRandomCampaign,{
  fields : ['code', 'id'],
  requireUser: false
});

Parse.Cloud.define("clickCampaign", campaignCtrl.clickCampaign,{
  fields : ['id'],
  requireUser: false
});

Parse.Cloud.define("getPaymentLink", tokenCtrl.getPaymentLink,{
  fields : ['index'],
  requireUser: true
});

Parse.Cloud.define(PAYMENT_WEBHOOK || "setPaymentUpdate", tokenCtrl.setPaymentUpdate,{
  fields : ['code', 'transaction', 'status'],
  requireUser: false
});

Parse.Cloud.define("resendReceipt", tokenCtrl.resendReceipt,{
  fields : ['code'],
  requireUser: false
});

Parse.Cloud.define("notifyCampaign", campaignCtrl.notifyCampaign,{
  fields : ['id'],
  requireUser: true
});

Parse.Cloud.job("generateMonthlyReport", campaignCtrl.generateMonthlyReport)

//@deprecated
Parse.Cloud.define("uploadImage", campaignCtrl.uploadImage,{
  fields : ['image'],
  requireUser: true
});
//@deprecated
Parse.Cloud.define("getCampaign", campaignCtrl.getCampaign,{
  requireUser: false
});