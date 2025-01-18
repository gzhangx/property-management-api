import { gsAccount } from '@gzhangx/googleapi'
import { Request, Response } from 'restify'
const { get, omit,pick } = require('lodash');
import { getUserAuth } from '../util/pauth'
import * as sql from './sql';

import { doSqlGetInternal } from './sql';
async function getSheetClient(req: Request, sheetId: string) {
    const auth = getUserAuth(req);
    if (!auth) {
        const message = 'not authorized';        
        return {
            message,
        };
    }
    
    //const fname = process.env['google_gzperm_svc_account_file'] || 'nofile';
    //const key = JSON.parse(fs.readFileSync(fname).toString()) as gsAccount.IServiceAccountCreds;
    //const client = gsAccount.getClient(key);    

    //const { id } = req.params;   
    const apiCreds = await doSqlGetInternal(auth, {
        table: 'googleApiCreds',
        fields: ['private_key_id', 'private_key', 'client_email'],
        whereArray: [{
            field: 'sheetId',
            op: '=',
            val: sheetId,
        }]
    });
    const cred = apiCreds.rows[0];
    if (!cred) return {
        message: `Can't find google Creds`,
    }
    const client = gsAccount.getClient({
        client_email: cred.client_email,
        private_key: cred.private_key,
        private_key_id: cred.private_key_id,
    });
    return {
        messae: '',
        client,
    };
}

function cleanError(err: any) {
    const config = pick(err, 'config.headers', 'config.url', 'config.method');
    return Object.assign({}, omit(err, ['request', 'response.request', 'config']), config);
}

export async function doGet(req: Request, res: Response) {
    try {        
        const { op, id, range } = req.params;    
                
        const data = req.body;
                
        const { client, message } = await getSheetClient(req, id);
        if (message) {
            return res.json({
                message,
                error: message,
            });
        }
        if (!client) {
            const message = `clinet  not found`;
            console.log(message);
            return res.send(500, {
                message,
            });
        }
        const sheet = client.getSheetOps(id);
        let rsp = null;
        if (op === 'read') {
            rsp = await sheet.readData(range); //changed from read
        } else if (op === 'append') {            
            rsp = await sheet.append(range, data); //`'Sheet1'!A1:B2`, [['data']]
        } else if (op === 'batch') {
            rsp = await sheet.doBatchUpdate(data);
        } else if (op === 'update') {
            //rsp = await sheet.updateValues(range, data);
            const row = req.params.row;
            rsp = await sheet.autoUpdateValues(range, data, {
                row,
                col: 0,
            });
        } else {
            res.send(400, { message: `Not supported operation ${op}` });
        }
        return res.json(rsp);
    } catch (err: any) {
        const rspErr = get(err, 'response.text') || get(err, 'response.data.error');
        console.log('sheet.doGet error, params, rspErr, errors', req.params, rspErr, err.errors);
        console.log('sheet.doGet error', cleanError(err));
        res.send(422, {
            id: req.params.id,
            message: err.message,
            errors: err.errors,
            rspErr,
        });
    }
}

/////////////////////////
///
/// post body has
/// googleSheetId, private_key_id,private_key
///
/////////////////////////
type GoogleAuthAndSheetInfo = {
    googleSheetId: string;
    private_key_id: string;
    private_key: string;
    client_email: string;

    userID: string;
}
export async function saveSheetAuthData(req: Request, res: Response) {
    const auth = getUserAuth(req);
    if (!auth) {
        const message = 'not authorized';
        return res.json({
            message,
        });
    }
    const userID = auth.userID;
    const body = req.body as {
        authInfo: GoogleAuthAndSheetInfo;
    }
    const authInfo = body.authInfo;
    if (!authInfo.googleSheetId || !authInfo.client_email || !authInfo.private_key || !authInfo.private_key_id) {
        const message = 'missing data';
        return res.json({
            message,
        });
    }
    
    await sql.createOrUpdateInternal({
        table: 'googleApiCreds',
        doCreate: true,
        doUpdate: true,
        fields: {
            googleSheetId: authInfo.googleSheetId,
            private_key_id: authInfo.private_key_id,
            private_key: authInfo.private_key.replace(/\\n/g,'\n'),
            client_email: authInfo.client_email,
            userID,
        },
    }, auth);
    res.send({
        ok: true,
        message: 'Saved ' + auth.userID
    });
}


//module.exports = {
//    doGet,
//    readMaintenanceRecord,
//    getSheetNames,
//    saveSheetAuthData
//}