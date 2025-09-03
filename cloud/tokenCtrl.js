require('dotenv').config()
const emailCtrl = require("./emailCtrl")

const {PAYMENT_METHOD, PAYMENT_APPID, PAYMENT_URL} = process.env;

exports.getPaymentLink = async (request) => {
  const { index } = request.params;

  const config = await Parse.Config.get();
  const packs = config.get("packs");
  if(!packs[index]) return {success: false, message: "Wrong pack"}
  const pack = packs[index];
  const account = await new Parse.Query("Account").equalTo("user", request.user).first({useMasterKey: true})
  const receipt = new Parse.Object("Receipt");
  const acl = new Parse.ACL();
  acl.setPublicReadAccess(false);
  acl.setPublicWriteAccess(false);
  acl.setReadAccess(request.user, true)
  receipt.setACL(acl)
  receipt.set("title", pack.name);
  receipt.set("price", pack.price);
  receipt.set("tokens", pack.tokens);
  receipt.set("account", account);
  receipt.set("status", "Pending")
  await receipt.save(null, {useMasterKey: true})
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  const raw = JSON.stringify({
    "title": pack.name,
    "description": `Compra de ${pack.tokens} tokens, para Partner`,
    "id": receipt.id,
    "price": pack.price,
    "method": PAYMENT_METHOD,
    "application": PAYMENT_APPID
  });
  
  const requestOptions = {
    method: "POST",
    body: raw,
    headers: myHeaders,
    redirect: "follow"
  };
  
  const result = await fetch(`${PAYMENT_URL}/getLink`, requestOptions)
  const link = await result.json()

  if(link.success) {
    receipt.set("code", link.data.id)
    receipt.save(null, {useMasterKey: true})
  }

  return link

}

exports.setPaymentUpdate = async (request) => {
  const { code, transaction, status } = request.params;
  const receipt = await new Parse.Query("Receipt").equalTo("code", code).include("account").first({useMasterKey: true})
  const paymentUpdate = new Parse.Object("PaymentUpdate")
  const acl = new Parse.ACL();
  acl.setPublicReadAccess(false);
  acl.setPublicWriteAccess(false);
  paymentUpdate.setACL(acl)
  paymentUpdate.set("data", transaction)
  await paymentUpdate.save(null, {useMasterKey: true})
  if(status === "Approved") {
    const account = receipt.get("account");
    account.increment("balance", receipt.get("tokens"))
    await account.save(null, {useMasterKey: true})
    const ids = Object.keys(receipt.getACL().permissionsById);
    const user = await new Parse.Query(Parse.User).get(ids[0], {useMasterKey: true})
    const result = emailCtrl.sendReceipt({
      date: paymentUpdate.get('createdAt').toLocaleDateString(),
      pack: receipt.get("title"),
      price: receipt.get("price"),
      to: user.get("email"),
      subject: `Receipt for your ${receipt.get('title')}`
    })
    console.log("email", result)
    //sendReceipt{date, pack, price, to, subject}
  }
  receipt.set("status", status)
  const receiptRelation = receipt.relation("updates")
  receiptRelation.add(paymentUpdate)
  receipt.save(null, {useMasterKey: true})
  
  return
}

exports.resendReceipt = async (request) => {
  const { code } = request.params;
  const receipt = await new Parse.Query("Receipt").get(code, {useMasterKey: true})
  const ids = Object.keys(receipt.getACL().permissionsById);
  const user = await new Parse.Query(Parse.User).get(ids[0], {useMasterKey: true})
  return await emailCtrl.sendReceipt({
    date: receipt.get('createdAt').toLocaleDateString(),
    pack: receipt.get("title"),
    price: receipt.get("price"),
    to: user.get("email"),
    subject: `Receipt for your ${receipt.get('title')}`
  })
}