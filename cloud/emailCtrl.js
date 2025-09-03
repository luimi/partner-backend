require('dotenv').config()
const nodemailer = require("nodemailer")
const ejs = require('ejs');

const {EMAIL_HOST, EMAIL_PORT, EMAIL_EMAIL, EMAIL_PASSWORD} = process.env

const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: true,
    auth: {
        user: EMAIL_EMAIL,
        pass: EMAIL_PASSWORD
    }
});

const getTemplate = (file, info) => {
    return new Promise((res,rej) => {
        ejs.renderFile(__dirname + `/templates/${file}.ejs`, info, async (err, data) => {
            if (err) console.log(err)
            res(data)
        })
    })
}

const send = (email) => {
    return new Promise((res, rej) => {
        transporter.sendMail(email, (error, info) => {
            if (error) {
                res(false)
            } else {
                res(true)
            }
        });
    })
}

exports.sendReceipt = async ({date, pack, price, to, subject}) => {
  const receipt = await getTemplate('receipt', {
    date: date, 
    address: "calle falsa 123", 
    pack: pack, 
    price: price
  })
  const main = await getTemplate('main', {content: receipt})
  const email = {
      from: EMAIL_EMAIL,
      to: to,
      subject: subject,
      html: main,
  }
  return await send(email)
}

exports.sendCampaign = async ({to, subject, status, title, image}) => {
  const campaign = await getTemplate('campaign', {
    status: status, 
    title: title, 
    image: image
  })
  const main = await getTemplate('main', {content: campaign})
  const email = {
      from: EMAIL_EMAIL,
      to: to,
      subject: subject,
      html: main,
  }
  return await send(email)
}

exports.sendTokens = async ({to, subject, user, tokens}) => {
  const _tokens = await getTemplate('tokens', {
    user: user, 
    tokens: tokens,
  })
  const main = await getTemplate('main', {content: _tokens})
  const email = {
      from: EMAIL_EMAIL,
      to: to,
      subject: subject,
      html: main,
  }
  return await send(email)
}
exports.sendCampaigns = async ({to, subject, username, campaigns}) => {
  const content = await getTemplate('campaigns', {
    username: username, 
    campaigns: campaigns,
  })
  const main = await getTemplate('main', {content: content})
  const email = {
      from: EMAIL_EMAIL,
      to: to,
      subject: subject,
      html: main,
  }
  return await send(email)
}