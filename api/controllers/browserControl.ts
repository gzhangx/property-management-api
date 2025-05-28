import { Request, Response } from 'restify'
import { getUserAuth } from '../util/pauth';

import * as browserControl from '../lib/browser';
import { delay } from '@gzhangx/googleapi/lib/msGraph/msauth';
export async function startBrowserControl(req: Request, res: Response) {    
    const auth = getUserAuth(req);  
    const userID = auth!.userID;
    try {
        const action = req.query['action'];
        switch (action) {
            case 'stop':
                await browserControl.stopUserBrowser(userID);
                break;
            case 'pict':
                const pict = await takePicture(userID);

                return res.sendRaw(200, pict, {
                    contentType: 'image/png'
                })
            case 'citi':
                const prms = {
                    url: req.body['url'],
                    password: req.body['password'],
                };
                if (!prms.url || !prms.password) {
                    return res.send(400, 'falsed no url pwd');
                }
                const csv = await doCiti(userID, prms);
                return res.sendRaw(200, csv, {
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
                await doAction(userID, action, options)
                break;              
        }
    //joins:{ table:{col:als}}
    
      return res.json({
        message: 'ok'
    });
  } catch (err: any) {
        console.log('startBrowserControlError', err);
        try { await browserControl.stopUserBrowser(userID) } catch { }
    res.send(500, {
      message: err.message,
      errors: err.errors
    });
  }
  
}



async function takePicture(userId: string): Promise<Uint8Array> {
    const cache = await browserControl.getOrCreateUserBrowser(userId);
    return await cache.page.screenshot();
}

async function doAction(userId: string, action: 'type' | 'click' | 'goto', options: {
    x: number;
    y: number;
    text: string;
}) {
    const cache = await browserControl.getOrCreateUserBrowser(userId);

    switch (action) {
        case 'goto':
            await cache.page.goto(options.text as string);
            break;
        case 'type':
            await cache.page.keyboard.type(options.text, {
                delay: 10,
            });
            break;
        case 'click':
            await cache.page.mouse.move(options.x, options.y);
            await cache.page.mouse.click(options.x as number, options.y as number);
            break;
    }
}


async function doCiti(userId: string, sec: {
    url: string;
    password: string;
}): Promise<Buffer> {

    //await loginOnly();
    const { page, browser } = await browserControl.getOrCreateUserBrowser(userId);
    await page.goto(sec.url);
    console.log('got to page');
    const pwd = await page.waitForSelector('input[id="password"]');
    pwd?.type(sec.password); // Replace with actual password
    //const exportBtn = await page.waitForSelector('div[aria-label="Export transactions"]');
    console.log('got selector name');
    await page.click('button[id="signInBtn"]');
    //exportBtn?.click();
    console.log('wait for export transactions');
    const exportBtn = await page.waitForSelector('div[aria-label="Export transactions"]');
    console.log('got export transactions, clicking', exportBtn);
    exportBtn?.click();
    console.log('cl8cked, wait for 1s');

    await delay(1000);

    console.log('set request intereception');

    const client = await browser.target().createCDPSession();
    await client.send('Browser.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: '../secs/downloads'
    })
    const downloadPromise = new Promise<Buffer>(async (resolve) => {
        page.on('response', async (res) => {
            if (res.url().includes('transactions/download')) {
                console.log('Response URL:', res.url());
                resolve(await res.buffer()); // Get binary data (for CSV, PDF, etc.)
            }
        });
        page.on('download', async (res) => {
            console.log('Download URL:', res);
        });

        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find((btn) => btn.textContent?.trim() === 'Export');
            if (btn) {
                console.log('Found Export button, clicking');
                btn.click();
            } else {
                console.log('Export button not found');
            }
        });
    });


    const buf = await downloadPromise;
    await page.close();
    //await browser.close();
    await browserControl.stopUserBrowser(userId)
    return buf;
}
