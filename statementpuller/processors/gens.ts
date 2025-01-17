/*
import moment from 'moment';
//const csvParse = require('csv-parse/sync');
//const axios = require('axios');
import { sleep, } from '../lib/util';
import axios from 'axios';

import vm from 'vm';
import { IPuppOpts, ILog } from './genProc';
import { IPuppWrapper } from '../lib/chromPupp';
import { ElementHandle } from 'puppeteer';
import fs from 'fs';

export interface IGenDownloadFileRet {
    date: string;
    reference: string;
    payee: string;
    amount: number;
    category: string;
    processor: string;
}


export async function loopDebug(pupp: IPuppWrapper, opts: IPuppOpts, otherData = {}) {
    const context = {
        pupp,
        opts,
        moment,
        axios,
        sleep,
        opers: {
            sleep,
            axios,
        },
        prepareFileClickInterception,
        ...otherData,
    }
    vm.createContext(context);    
    const TEMP_FILE_NAME = './temp/test.js';
    let lastFileDate = 0;
    while (true) {
        await sleep(1000);
        try {
            if (fs.existsSync(TEMP_FILE_NAME)) {
                const fstate = fs.statSync(TEMP_FILE_NAME);
                const ftime = fstate.mtime.getTime();
                if (ftime == lastFileDate) continue;
                lastFileDate = ftime;
                const runStr = fs.readFileSync('./temp/test.js').toString();
                if (runStr) {
                    opts.log('running');
                    vm.runInContext(runStr, context);
                    opts.log('done running');
                }
            }
        } catch (err) {
            console.log('error happened', err);
        }
    }
}

export async function prepareFileClickInterception(pupp: IPuppWrapper, urlToMatch: string, opts: IPuppOpts) {
    await pupp.page.setRequestInterception(true);
    const fileResults = {

        wait: null,
        resolve: () => { throw 'should not happen' },
        reject: () => { },
        csvStr: '',
    } as {
        wait: Promise<string> | null;
        resolve: ((data: any) => string);
        reject: ((reason?: any) => void);
        csvStr: string;
        };
    
    const intHandler = async (interceptedRequest: any) => {
        if (interceptedRequest.isInterceptResolutionHandled()) return;
        //opts.log('got request', interceptedRequest.url());
        if (interceptedRequest.url().match(new RegExp(urlToMatch))) {
            const method = interceptedRequest.method();
            if (method !== 'GET' && method !== 'POST') {
                opts.log('got request and matched but wrong method ' + method);
                return interceptedRequest.continue();
            }
            opts.log('got request AND MATCHED!!!!!!!!!!!!!!!');
            const cookies = await pupp.page.cookies();

            //await pupp.page.setRequestInterception(false); //don't do it here, async issues

            opts.log('headers', interceptedRequest.headers())
            opts.log('postData', interceptedRequest.postData())
            //opts.log(cookies);
            //console.log('cookies', cookies);
            //console.log('cookies', interceptedRequest.method());
            const headers = { ...interceptedRequest.headers() }
            headers.cookie = cookies.map((ck) => ck.name + '=' + ck.value).join(';');
            const postCfg = {
                method,
                headers,
                data: interceptedRequest.postData(),
                url: interceptedRequest.url()
            }
            const rsp = await axios(postCfg).catch(err => {
                opts.log('ERROR!!!!!!! do request url=' + interceptedRequest.url() + ' ' + interceptedRequest.method());
                const errData = {
                    message: err.message,
                };
                const errRsp = err.response;
                if (errRsp) {
                    const data = errRsp.data;
                    const text = errRsp.text;
                    if (data) {
                        errRsp.data = data;
                    }
                    if (text) {
                        errRsp.text = text;
                    }
                    if (!data && !text) {
                        opts.log(Object.keys(err));
                    }
                } else {
                    opts.log(err);
                }

                opts.log(errData);
                fileResults.reject(errData);
                return null;
            })
            if (rsp) {
                opts.log('rsp len '+ rsp.data?.length)
                fileResults.csvStr = rsp.data;
                fileResults.resolve(rsp.data);
            }
            //return interceptedRequest.abort();
        }
        //opts.log('got request AND continue');
        try {
            interceptedRequest.continue();
        } catch (err: any) {
            opts.log('continue ERROR ' + err.message);
        }
        //interceptedRequest.abort();     //stop intercepting requests
        //resolve(interceptedRequest);
    };
    if (!pupp.requestInterceptors.length)
        pupp.requestInterceptors.push(intHandler);
    else
        pupp.requestInterceptors[0] = intHandler;

    fileResults.wait = new Promise<string>((resolve, reject) => {
        fileResults.resolve = resolve as ((d: any) => string);
        fileResults.reject = reject;
    });
    return fileResults;
}
*/