import { Request, Response } from 'restify'
import { getUserAuth } from '../util/pauth';

import * as browserControl from '../lib/browser';
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
        console.log('startBrowserControlError',err);
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