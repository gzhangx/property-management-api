
import * as email from '../lib/nodemailer';
import { Request, Response } from 'restify'
import { doSqlGetInternal } from './sql';
import { getUserAuth } from '../util/pauth';

export async function sendEmail(req: Request, res: Response) {
    if (!req.body) {
        return res.send({ err: "no body" });
    }
    const { subject, to, html, cc } = req.body;
    if (!subject || !html) {
        return res.send({ err: "no subject or text" });
    }

    const userAuth = getUserAuth(req);
    if (!userAuth) {
        return res.send({ err: 'not authorized' });
    }

    const columns = ['googleSmtpUser', 'googleSmtpPass'];
    const userCfg = await doSqlGetInternal(userAuth, {
        table: 'userOptions',
        whereArray: [{
            field: 'id',
            op: 'in',
            val: columns,
        }]
    })

    const emailCfgAry = columns.reduce((acc, cname) => {
        const r = userCfg.rows.find(r => r['id'] === cname);
        if (r) {
            acc.push(r['data']);
        }
        return acc;
    }, [] as string[]);
    if (emailCfgAry.length !== 2) {
        return res.send({ err: 'Please config '+ columns.join(',') });
    }
    const smtpOpts: email.ISmtpConfig = {
        user: emailCfgAry[0],
        pass: emailCfgAry[1],
    }
    //const to = ['a@a.com'];
    //from '"GGBot" <gzhangx@gmail.com>',
    return email.sendGmail(
        smtpOpts, {
            to,
            cc: cc,
        subject,
        html,
    }).then(inf => {
        return res.send(inf);
    });
}
