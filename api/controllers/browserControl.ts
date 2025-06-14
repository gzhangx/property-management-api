import { Request, Response } from 'restify'
import { getUserAuth } from '../util/pauth';

import * as browserControl from '../lib/geckodirect'
import * as db from '../lib/db'
let driver: browserControl.VGInteralGeckoDriver | null = null;

async function getDriver() {
    if (driver) return driver;
    driver = await browserControl.createGeckoDriverAndProcess(undefined, process.env.PI === 'true');
    return driver as browserControl.VGInteralGeckoDriver;
}

export async function startBrowserControl(req: Request, res: Response) {    
    const auth = getUserAuth(req);  
    const userID = auth!.userID;
    try {
        const action = req.query['action'];
        switch (action) {
            case 'stop':
                if (driver != null) {
                    driver.shutdown();
                    driver = null;
                }
                break;
            case 'pict':                
                const pict = await (await getDriver()).screenShoot()

                return res.sendRaw(200, pict, {
                    contentType: 'image/png'
                })
            case 'citi':
                const pwdRes = await db.doQueryOneRow('select * from userOptions where id=?', ['testingpwd']);
                    const pass = pwdRes.data;
                    const res1 = await db.doQueryOneRow('select * from userOptions where id=?', ['testurl']);
                    const url = res1.data;
                if (!url || !pass) {
                    return res.send(400, 'falsed no url pwd');
                }
                await getDriver();
                const csv = await browserControl.testExampleCCItt(driver as browserControl.VGInteralGeckoDriver, url, pass);
                return res.sendRaw(200, csv[0].response, {
                    contentType: 'text/csv'
                })
                break;
            default:
                const options = {
                    x: 0,
                    y: 0,
                    text: ''
                }
                switch (action) {
                    case 'click':
                        options.x = parseInt(req.query['x'])
                        options.y = parseInt(req.query['y'])
                        break;
                    case 'type':
                    case 'goto':
                        options.text = req.query['text'];
                        break;
                }
                await doAction(action, options)
                break;              
        }
    //joins:{ table:{col:als}}
    
      return res.json({
        message: 'ok'
    });
  } catch (err: any) {
        console.log('startBrowserControlError', err);
    res.send(500, {
      message: err.message,
      errors: err.errors
    });
  }
  
}



async function doAction(action: 'type' | 'click' | 'goto', options: {
    x: number;
    y: number;
    text: string;
}) {
    const driver = await getDriver();

    switch (action) {
        case 'goto':
            await driver.goto(options.text as string);
            break;
        case 'type':
            //await driver.type(options.text, {
            //    delay: 10,
            //});
            await driver.typeToActiveElement(options.text);
            break;
        case 'click':
            //await driver.move(options.x, options.y);
            //await cache.page.mouse.click(options.x as number, options.y as number);
            await driver.sendMouseActions(options.x, options.y)
            break;
    }
}
