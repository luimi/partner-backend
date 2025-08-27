require('dotenv').config()
const cloudinary = require("cloudinary");

const {CLOUDINARY_NAME, CLOUDINARY_APIKEY, CLOUDINARY_APISECRET, GOOGLE_CLIENTID} = process.env;


cloudinary.config({
  cloud_name: CLOUDINARY_NAME,
  api_key: CLOUDINARY_APIKEY,
  api_secret: CLOUDINARY_APISECRET
});

Parse.Cloud.define("redeemCoupon", async (request) => {
  const {code} = request.params;
  const coupon = await new Parse.Query("Coupon").equalTo("redeemed", false).get(code, {useMasterKey: true})
  const user = await new Parse.Query(Parse.User).get(request.user.id, {useMasterKey: true})
  if(!coupon) {
    return {success: false}
  }
  const account = await new Parse.Query("Account").equalTo("user", user).first({useMasterKey: true});
  account.set("balance", account.get("balance") + coupon.get("tokens"))
  await account.save(null, {useMasterKey: true});
  coupon.set('redeemed', true);
  coupon.set('user', user);
  let acl = coupon.getACL();
  acl.setReadAccess(user.id, true)
  coupon.setACL(acl);
  await coupon.save(null, {useMasterKey: true});
  return {success: true}
},{
  fields : ['code'],
  requireUser: true
})
Parse.Cloud.define("googleSignin", async (request) => {
  const { id_token } = request.params;
  if (!id_token) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, "El parámetro id_token no fue proporcionado.");
  }

  try {
    // 1. Validar el token de Google y obtener la información del usuario
    const tokenInfoUrl = `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${id_token}`;
    const response = await fetch(tokenInfoUrl)
    const userData = await response.json();

    // Verificar el ID del cliente para evitar ataques de suplantación
    if (userData.aud !== GOOGLE_CLIENTID) {
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, "ID de cliente no válido.");
    }

    // 2. Buscar si el usuario ya existe en Parse
    const query = new Parse.Query(Parse.User);
    query.equalTo("authData.google.id", userData.sub);

    let user = await query.first({useMasterKey: true});
    // 3. Si el usuario no existe, crearlo
    const authData = {
      id: userData.sub,
      id_token: id_token
    };
    if (!user) {
      user = new Parse.User();
      user.set("username", userData.email);
      user.set("email", userData.email);
      user.set("name", userData.name);
      user.set("authData", {
        google: authData,
      });
      await user.save(null, {useMasterKey: true});

      if(user) {
        const acl = new Parse.ACL();
        acl.setPublicReadAccess(false);
        acl.setPublicWriteAccess(false);
        acl.setRoleReadAccess('Admin', true);
        acl.setRoleWriteAccess('Admin', true);
        acl.setReadAccess(user.id, true);
        acl.setWriteAccess(user.id, false);
        let account = new Parse.Object('Account');
        account.set('user', user);
        account.set('balance', 0);
        account.setACL(acl);
        await account.save(null, {useMasterKey: true});
        user.set("account", account);
        await user.save(null, {useMasterKey: true})
      }
    }

    // 4. devolver el token de sesión
    return authData
  } catch (error) {
    console.error("Error en el inicio de sesión de Google:", error);
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, "Error en el inicio de sesión. Detalles: " + error.message);
  }
},{
  fields : ['id_token'],
  requireUser: false
});
Parse.Cloud.define("uploadImage", async (request) => {
  return new Promise((res, rej) => {
    cloudinary.v2.uploader.upload(
      request.params.image, {}, async (error, result) => {
        if (result) {
          res({ success: true, url: result.url });
        } else {
          res({ success: false, message: "Error al intentar guardar la imagen", error: error });
        }
      }
    );
  });
},{
  fields : ['image'],
  requireUser: true
});
Parse.Cloud.define("getCampaign", async (request) => {
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

},{
  fields : ['code', 'id'],
  requireUser: false
});
Parse.Cloud.define("clickCampaign", async (request) => {
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

},{
  fields : ['id'],
  requireUser: false
});