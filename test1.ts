//import { doCiti } from './api/controllers/browserControl';
import * as db from './api/lib/db'
import { createGeckoDriverAndProcess, ExampleResult, testExampleCCItt } from './api/lib/geckodirect';

async function test() {
    const res = await db.doQueryOneRow('select * from userOptions where id=?', ['testingpwd']);
    const pass = res.data;
    const res1 = await db.doQueryOneRow('select * from userOptions where id=?', ['testurl']);
    const url = res1.data;
    db.end();

    //await doCiti('u1', {
    //    url: 'https://www.citi.com',
    //    password: res.data
    //})
    const data: ExampleResult[] = (await createGeckoDriverAndProcess(async driver => {
        return await testExampleCCItt(driver, url, pass);
    })) as ExampleResult[];
    
    console.log(data[0].response)
    
}

test();