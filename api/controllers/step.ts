import {Request, Response} from 'restify'
import { doQuery } from '../lib/db';
import { createUserToken } from '../util/pauth'
import {uniq} from 'lodash'
interface ILoginParms {
    username: string;
    password: string;
}

interface IuserInfo {
    userID: string;
    userName: string;    
    password: string;

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
            });
            return res.send({
                id: id,
                exp: 1,
                token,
            });
        }
        return res.send({ error: 'bad password' });
    } else {
        res.send({error:'no such user'});
    }
}