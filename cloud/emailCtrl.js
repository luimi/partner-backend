require('dotenv').config()
const nodemailer = require("nodemailer")
const { Resend } = require("resend");
const FormData = require("form-data");
const Mailgun = require("mailgun.js");
const ejs = require('ejs');

const { EMAIL_HOST, EMAIL_PORT, EMAIL_EMAIL, EMAIL_PASSWORD } = process.env
const { MAILGUN_KEY, MAILGUN_EMAIL, MAILGUN_DOMAIN } = process.env
const { RESEND_EMAIL, RESEND_KEY } = process.env
const { PHPMAILER_URL, PHPMAILER_PASSWORD } = process.env
const { PARTNER_ADDRESS } = process.env


const providers = []

if (EMAIL_HOST && EMAIL_PORT && EMAIL_EMAIL && EMAIL_PASSWORD) {
    const from = `"Partner" <${EMAIL_EMAIL}>`
    const transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: true,
        auth: {
            user: EMAIL_EMAIL,
            pass: EMAIL_PASSWORD
        }
    });
    providers.push({ instance: transporter, name: "smtp", from })
}

if (RESEND_EMAIL && RESEND_KEY) {
    const from = `"Partner" <${RESEND_EMAIL}>`
    const resend = new Resend(RESEND_KEY);
    providers.push({ instance: resend, name: 'resend', from })
}

if (MAILGUN_KEY && MAILGUN_DOMAIN && MAILGUN_EMAIL) {
    const from = `"Partner" <${MAILGUN_EMAIL}>`
    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({
        username: "api",
        key: MAILGUN_KEY,
    });
    providers.push({ instance: mg, name: 'mailgun', from })
}

if (PHPMAILER_URL && PHPMAILER_PASSWORD) {
    providers.push({
        instance: {
            send: async (email) => {
                const myHeaders = new Headers();
                myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

                const urlencoded = new URLSearchParams();
                urlencoded.append("destinatary", email.to);
                urlencoded.append("subject", email.subject);
                urlencoded.append("body", email.html);
                urlencoded.append("password", PHPMAILER_PASSWORD);

                const requestOptions = {
                    method: "POST",
                    headers: myHeaders,
                    body: urlencoded,
                    redirect: "follow"
                };

                let result = await fetch(PHPMAILER_URL, requestOptions);
                result = await result.json();
                return result;
            }
        }, name: 'phpmailer', from: ""
    })
}

const getTemplate = (file, info) => {
    return new Promise((res, rej) => {
        ejs.renderFile(__dirname + `/templates/${file}.ejs`, info, async (err, data) => {
            if (err) console.log(err)
            res(data)
        })
    })
}

const send = (to, subject, html) => {
    return new Promise(async (res, rej) => {
        if (providers.length === 0) res(false);
        let sent = false;
        for (let i = 0; i < providers.length; i++) {
            const provider = providers[i];
            const email = {
                from: provider.from,
                to: to,
                subject: subject,
                html: html,
            }
            try {
                switch (provider.name) {
                    case 'smtp': await provider.instance.sendMail(email);
                        break;
                    case 'resend': await provider.instance.emails.send(email);
                        break;
                    case 'mailgun': await provider.instance.messages.create(MAILGUN_DOMAIN, email)
                        break;
                    case 'phpmailer': await provider.instance.send(email)
                        break;
                }
                sent = true;
                break;
            } catch (e) {
                console.log("catch", e)
            }

        }
        res(sent)
    })
}

exports.sendReceipt = async ({ date, pack, price, to, subject }) => {
    const receipt = await getTemplate('receipt', {
        date: date,
        address: PARTNER_ADDRESS,
        pack: pack,
        price: price
    })
    const main = await getTemplate('main', { content: receipt })
    return await send(to, subject, main)
}

exports.sendCampaign = async ({ to, subject, status, title, assets }) => {
    const campaign = await getTemplate('campaign', {
        status: status,
        title: title,
        assets: assets
    })
    const main = await getTemplate('main', { content: campaign })
    return await send(to, subject, main)
}

exports.sendTokens = async ({ to, subject, user, tokens }) => {
    const _tokens = await getTemplate('tokens', {
        user: user,
        tokens: tokens,
    })
    const main = await getTemplate('main', { content: _tokens })
    return await send(to, subject, main)
}
exports.sendCampaigns = async ({ to, subject, username, campaigns }) => {
    const content = await getTemplate('campaigns', {
        username: username,
        campaigns: campaigns,
    })
    const main = await getTemplate('main', { content: content })
    return await send(to, subject, main)
}