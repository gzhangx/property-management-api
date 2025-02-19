'use strict';
import * as  nodemailer from 'nodemailer';
//import * as fs from 'fs';
//import SMTPPool from 'nodemailer/lib/smtp-pool';
//import SMTPConnection from 'nodemailer/lib/smtp-connection';

export type IMailOptions = {
    from?: string;
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
};

export type ISmtpConfig = {
        user: string;
        pass: string;
}

export async function sendGmail(smtp: ISmtpConfig, mailOptions: IMailOptions) {
    const transporter = nodemailer.createTransport({
        service: "Gmail",
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: smtp.user,
            pass: smtp.pass,
        },
    });
    const message = {
        from: smtp.user,
        // Comma separated list of recipients        
        to: mailOptions.to,
        subject: mailOptions.subject,
        text: mailOptions.text,
        html: mailOptions.html,
        //attachments: [
        //{
        //filename: 'image1.jpeg',
        //path: __dirname + '/image1.jpeg'
        //}
        //]
    };
    return transporter.sendMail(message).then(res => {
        console.log(res);
        return res;
    }).catch(error => {
        console.log(error);
        return {
            error
        }
    });
}

// export function sendHotmail(mailOptions: IMailOptions) {
//     const auth = JSON.parse(fs.readFileSync('./credentials.json').toString()).emailInfo as SMTPConnection.AuthenticationType;
//     const smtpOpts: SMTPPool.Options = {
//         host: 'smtp-mail.outlook.com', // Gmail Host
//         port: 587, // Port
//         //secureConnection: false,
//         pool: true,
//         auth,
//         tls: {
//             ciphers: 'SSLv3'
//         },
//     };
//     return new Promise((resolve, reject) => {
//         //nodemailer.createTestAccount((err, account) => {
//             const transporter = nodemailer.createTransport(smtpOpts);
//             mailOptions.from = auth.user;
//             transporter.sendMail(mailOptions, (error, info) => {
//                 if (error) {
//                     console.log(error);
//                     return reject(error);
//                 }
//                 console.log('Message sent: %s', info.messageId);
//                 resolve(info);
//             });
//         //});
//     });
// }


// function sendGmailGoogle(mailOptions) {
//     const auth = JSON.parse(fs.readFileSync('./credentials.json').toString()).emailInfo;
//     return new Promise((resolve, reject) => {
//         nodemailer.createTestAccount((err, account) => {
//             const transporter = nodemailer.createTransport({
//                 host: 'smtp.googlemail.com', // Gmail Host
//                 port: 465, // Port
//                 secure: true, // this is true as port is 465
//                 auth,
//             });

//             transporter.sendMail(mailOptions, (error, info) => {
//                 if (error) {
//                     console.log(error);
//                     return reject(error);
//                 }
//                 console.log('Message sent: %s', info.messageId);
//                 resolve(info);
//             });
//         });
//     });
// }

// module.exports = {
//     sendHotmail,
// };