const moment = require('moment');
const Promise = require('bluebird');
const { sleep, waitElement,
    freeForm,
} = require('../lib/util');

const { genProcess } = require('./genProc');
async function process(creds, opts) {
    return await genProcess(creds, doJob, opts);
}

async function doJob(pupp, creds, opts) {
    const { log, getCode } = opts;
    const saveScreenshoot = () => pupp.screenshot('outputData/test.png');
    const url = 'https://cash.app/login?return_to=account.index';
    //const url = 'http://localhost:3001';
    await pupp.goto(url);
    log(`going to ${url}`);
    await pupp.loadCookies();

    let setEmail = false;
    await waitElement({
        message: 'Waiting page startup',
        //const readyState = await driver.executeScript("return document.readyState");        
        action: async () => {
            await saveScreenshoot();
            
            await pupp.setTextById('alias', creds.userName);
            
            
            const next = await pupp.findByCSS('#ember386 button');
            await next.click();
            await sleep(1000);                    
        }
    });


    const codeRes = await waitElement({
        message: 'Code',
        waitSeconds: 60,
        action: async () => {
            await sleep(500);
            await saveScreenshoot();
            await pupp.findById('code')
            let code = '';
            try {
                code = await getCode();
            } catch (err) {
                log(`Code Error ${err.message}`);
                console.log('code');
                console.log(err);
                throw err;
            }
            
            //recaptcha-checkbox-border
            await pupp.setTextById('code', code);
            log(`set code ${code}`);
            const btn = await pupp.findByCSS('#ember542 button');
            btn.click();
            log('clicking code submit button');
            await sleep(500);
            
        }
    });
    

    await waitElement({
        message: 'Confirm Selection',
        waitSeconds: 60,
        action: async () => {
            await sleep(500);
            let err1 = null;
            try {
                const btns = await pupp.findAllByCss('.selection-option-list a.button.theme-button');
                log(`confirmation btn cnt ${btns ? btns.length : 'null'}`)
                btns[1].click();
            } catch (err) {
                err1 = err;
            }

            let err2 = null;
            if (err1) {
                //<div contenteditable="" tabindex="1" id="ember610" class="passcode-inputs-bubble flex-container flex-h ember-view">
                const bubbles = await pupp.findByCSS('.passcode-inputs-bubble');
                if (bubbles) {
                    pupp.setTextById('ember610', creds.pin);
                    log(`pin set, sleeping ${creds.pin}`);
                    await sleep(2000);
                } else {
                    err2 = new Error('pin not found');
                }
            }

            if (err1 || err2) {
                throw err1 || err2;
            }
        }
    });

    log('Saving cookies');
    await pupp.saveCookies();
    log('cookies saved');

    await sleep(1000);
    log('freeForming');
    await freeForm(pupp);
    //.activity-list .activity-list-item .activity-list-content
    return null;
}

module.exports = {
    process,
}
