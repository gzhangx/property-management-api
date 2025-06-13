import { doCiti } from './api/controllers/browserControl';
import * as db from './api/lib/db'

async function test() {
    const res = await db.doQueryOneRow('select * from userOptions where id=?', ['testingpwd']);
    console.log(res.data);    
    db.end();

    await doCiti('u1', {
        url: 'https://www.citi.com',
        password: res.data
    })
}

test();