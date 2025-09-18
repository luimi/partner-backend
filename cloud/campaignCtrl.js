require('dotenv').config()
const cloudinary = require("cloudinary");
const emailCtrl = require("./emailCtrl");

const {CLOUDINARY_NAME, CLOUDINARY_APIKEY, CLOUDINARY_APISECRET} = process.env;

cloudinary.config({
  cloud_name: CLOUDINARY_NAME,
  api_key: CLOUDINARY_APIKEY,
  api_secret: CLOUDINARY_APISECRET
});

exports.uploadImage = async (request) => {
  return new Promise((res, rej) => {
    cloudinary.v2.uploader.upload(
      request.params.image, {}, async (error, result) => {
        if (result) {
          res({ success: true, url: result.secure_url });
        } else {
          res({ success: false, message: "Error al intentar guardar la imagen", error: error });
        }
      }
    );
  });
}

exports.getCampaign = async (request) => {
  const { code, id } = request.params;

  const app = await new Parse.Query('Application').equalTo('code', code).first({useMasterKey: true})
  const accounts = new Parse.Query("Account").greaterThan("balance", 0)
  const users = new Parse.Query(Parse.User).matchesQuery("account", accounts) 
  const campnaigns = await new Parse.Query('Campaign')
    .equalTo("apps", app)
    .equalTo("status", "Active")
    .equalTo("active", true)
    .matchesQuery("user", users)
    .find({useMasterKey: true})
  
  if(campnaigns.length === 0) {
    return {success: false, message: "No campaign found"}
  }
  
  const random = Math.floor(Math.random() * campnaigns.length);
  const campaign = campnaigns[random];
  
  campaign.increment('views')
  campaign.save(null, {useMasterKey: true})
  
  const account = await new Parse.Query('Account').equalTo('user', campaign.get('user')).first({useMasterKey: true})
  account.decrement('balance');
  account.save(null, {useMasterKey: true})

  const config = await Parse.Config.get();
  const user = campaign.get('user');
  await user.fetch({useMasterKey: true});
  if(user.get("emailLowBalance") && config.get("amounts").includes(account.get("balance"))) {
   emailCtrl.sendTokens({
     to: user.get("email"),
     subject: "Low Balance Alert!",
     user: user.get("name"), 
     tokens: account.get("balance")
   })
  }
  
  const view = new Parse.Object('View')
  view.set('app', app)
  view.set('campaign', campaign)
  view.set('user', id)
  const acl = new Parse.ACL();
  acl.setReadAccess(campaign.get('user'), true)
  acl.setWriteAccess(campaign.get('user'), false)
  view.setACL(acl)
  view.save(null, {useMasterKey: true})
  
  return {
    success: true, 
    image: campaign.get('image'), 
    url: campaign.get('url'),
    campaign: campaign.id
  }

}

exports.clickCampaign = async (request) => {
  const { id } = request.params;
  const campaign = await new Parse.Query("Campaign").get(id, {useMasterKey: true})

    if(!campaign) {
      return {success: false, message: 'Campaign does not exists'}
    }
    
    campaign.increment('clicks')
    campaign.save(null, {useMasterKey: true})
    
    const click = new Parse.Object('Click')
    click.set('campaign', campaign)
    const acl = new Parse.ACL();
    acl.setReadAccess(campaign.get('user'), true)
    acl.setWriteAccess(campaign.get('user'), false)
    click.setACL(acl)
    click.save(null, {useMasterKey: true})
    
    return {success: true}

}

exports.notifyCampaign = async (request) => {
  const { id } = request.params;
  const campaign = await new Parse.Query("Campaign").include('user').get(id, {useMasterKey: true})
  await emailCtrl.sendCampaign({
    to: campaign.get('user').get("email"),
    subject: "Campaign status",
    status: campaign.get('status') === "Active" ? "accepted" : "rejected",
    title: campaign.get('name'),
    image: campaign.get('image')
  })
}

exports.generateMonthlyReport = async (request) => {

  const { params, headers, log, message } = request;
  
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const startOfMonth = lastMonth;
  const endOfMonth = new Date(today.getFullYear(), today.getMonth(), 0);

  // 1. Consultar todos los Views del mes anterior
  const viewQuery = new Parse.Query("View");
  viewQuery.greaterThanOrEqualTo("createdAt", startOfMonth);
  viewQuery.lessThanOrEqualTo("createdAt", endOfMonth);
  viewQuery.include("campaign.user"); // Incluye los datos del usuario de la campaña
  const views = await viewQuery.find({useMasterKey: true});

  // 2. Consultar todos los Clicks del mes anterior
  const clickQuery = new Parse.Query("Click");
  clickQuery.greaterThanOrEqualTo("createdAt", startOfMonth);
  clickQuery.lessThanOrEqualTo("createdAt", endOfMonth);
  const clicks = await clickQuery.find({useMasterKey: true});

  // 3. Procesar los datos
  const userMap = new Map();

  // Procesar Views
  message("Procesando Views")
  views.forEach(view => {
    const campaignId = view.get("campaign").id;
    const userId = view.get("campaign").get("user").id;
    const userName = view.get("campaign").get("user").get("name");
    const userEmail = view.get("campaign").get("user").get("email");
    const campaignName = view.get("campaign").get("name");
    
    if (!userMap.has(userId)) {
      userMap.set(userId, {
        username: userName,
        email: userEmail,
        campaigns: new Map()
      });
    }

    const userEntry = userMap.get(userId);
    if (!userEntry.campaigns.has(campaignId)) {
      userEntry.campaigns.set(campaignId, {
        name: campaignName,
        views: 0,
        clicks: 0,
        uniqueUsers: new Set()
      });
    }

    const campaignEntry = userEntry.campaigns.get(campaignId);
    campaignEntry.views++;
    campaignEntry.uniqueUsers.add(view.get("user"));
  });

  // Procesar Clicks
  message("Procesando Clicks")
  clicks.forEach(click => {
    const campaignId = click.get("campaign").id;
    
    // Busca la campaña en el mapa de usuarios
    for (const user of userMap.values()) {
      if (user.campaigns.has(campaignId)) {
        user.campaigns.get(campaignId).clicks++;
      }
    }
  });

  // 4. Formatear la salida y calcular el CTR
  message("Organizando datos")
  const result = [];
  for (const userEntry of userMap.values()) {
    const campaignsArray = [];
    for (const campaignEntry of userEntry.campaigns.values()) {
      const ctr = campaignEntry.views > 0 ? (campaignEntry.clicks / campaignEntry.views) * 100 : 0;
      campaignsArray.push({
        name: campaignEntry.name,
        views: campaignEntry.views,
        clicks: campaignEntry.clicks,
        ctr: parseFloat(ctr.toFixed(2)),
        users: campaignEntry.uniqueUsers.size
      });
    }
    result.push({
      username: userEntry.username,
      email: userEntry.email,
      campaigns: campaignsArray
    });
  }
  message("Enviando Correos")
  for (let info of result) {
    await emailCtrl.sendCampaigns({
       to: info.email,
       subject: "Monthly Performance Report",
       username: info.username,
       campaigns: info.campaigns
     })
  }
  message("Eliminando Objetos")
  Parse.Object.destroyAll(views, {useMasterKey: true}).then((_views) => {
    Parse.Object.destroyAll(clicks, {useMasterKey: true}).then((_clicks) => {}, (error) => {})
  }, (error) => { })
  message(`${result.length} correos enviados`)
  return
}