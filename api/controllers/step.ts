import {Request, Response} from 'restify'
import { doQuery } from '../lib/db';
import { createUserToken } from '../util/pauth'
import { TimeZoneType } from '../models/types';
interface ILoginParms {
    username: string;
    password: string;
}


interface IuserInfo {
    userID: string;
    username: string;    
    password: string;
    Name: string; //not used
    timezone: TimeZoneType;
}


export async function login(req: Request, res:Response) : Promise<void> {
    const {username, password} = (req.body || {}) as ILoginParms;
    const users = await doQuery(`select * from userInfo where username=?`, [username]) as IuserInfo[];
    if (users && users.length) {
        const user = users[0];
        const id = user.userID;
        if (users[0].password === password) {            
            const token = createUserToken({
                userID: id,
                timezone: user.timezone || 'America/New_York',
            });
            return res.send({
                id: id,
                exp: 1,
                token,
                name: user.Name,
                timezone: user.timezone,
            });
        }
        return res.send({ error: 'bad password' });
    } else {
        res.send({error:'no such user'});
    }
}