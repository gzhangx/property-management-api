import { keys } from 'lodash';

import consts from './consts';
//const restify = require('restify');
import * as restify from 'restify'
import { routes } from './routes';
import { getUserAuth, initAuth } from '../util/pauth'
import { NOT_AUTHORIZED_MESSAGE } from '../util/util';

function addCORS(req: restify.Request, res: restify.Response) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", req.header("Access-Control-Request-Method"));
    res.header("Access-Control-Allow-Headers", req.header("Access-Control-Request-Headers"));
}
module.exports = {
    route: (server: restify.Server)=>{
        server.opts("/*", function (req,res,next) {
            addCORS(req, res);
            res.send(200);
            return next();
        });

        initAuth(server);        
        
        const rts = keys(routes) as string[];
        rts.forEach(url=>{
            const op = routes[url];
            console.log(`debugremove adding ${url}`);
            server[op.method](`${consts.apiRoot}${url}`, op.func);
        });

        //patuh.initPassport(server);
        server.use((req, res, next)=>{
            if (req.method !== 'GET' && req.method !== 'POST') return next();
            addCORS(req, res);
            const controller = routes[`${req.url?.substring(consts.apiRoot.length)}`]; //${consts.apiRoot}
            if (controller && controller.auth !== false) {
                const auth = getUserAuth(req);
                if (!auth) {
                    const message = NOT_AUTHORIZED_MESSAGE;
                    res.send(401, {
                        message,
                        error: message,
                    })
                    return next(false);
                }
                //if (!req.user) {
                //    res.send(401, 'Unauthorized');
                //    return next(false);
               // }
                //if (req.user.username !== 'noAuthNoUser' && !req.user.password) {
                //    res.send(401, 'Unauthorized (2)');
                //    return next(false);
                //}
            }
            return next(); 
        }); 

        //server.get('/*', restify.plugins.serveStatic({
        //    directory: `${__dirname}/../../build`,
        //    default: 'index.html'
        //  }));        

        //require('./socket').setupSocket(server, [
        //    require('../../statementpuller/webhandler').socketEmiter,
        //])
    }
};