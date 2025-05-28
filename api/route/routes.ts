import {Request, Response} from 'restify'
const about = require('../controllers/about');
const model = require('../controllers/model');
import * as sql from '../controllers/sql';
const calc = require('../controllers/calc');
import * as  email from '../controllers/email';
import * as statement from '../controllers/statements';
import * as sheet from '../controllers/sheet';

import * as steps from '../controllers/step';
import * as browserControl from '../controllers/browserControl';
//import * as googleApi from '../controllers/google.ts.old';

export const routes = {
    '/doQuery': {
        method: 'get',
        func: sql.doQuery
    },
    '/getModel': {
        method: 'get',
        func: model.getModel,
    },
    '/sql/get': {
        method: 'post',
        func: sql.doGet,
    },
    '/sql/create': {
        method: 'post',
        func: sql.createOrUpdate,
    },
    '/sql/del': {
        method: 'post',
        func: sql.del,
    },
    '/sql/getDatabases': {
        method: 'get',
        func: sql.getDatabases,
    },
    '/sql/getTables': {
        method: 'get',
        func: sql.getTables,
    },
    '/sql/getTableInfo': {
        method: 'get',
        func: sql.getTableInfo,
    },
    '/sql/freeFormSql': {
        method: 'post',
        func: sql.freeFormSql,
    },
    '/sql/importPayment': {
        method: 'post',
        func: sql.importPayment,
    },
    '/calc/calc': {
        method: 'get',
        func: calc.calcMonthly,
    },
    '/calc/settle': {
        method: 'get',
        func: calc.settleMonthly,
    },
    '/util/sendMail': {
        method: 'post',
        func: email.sendEmail,
    },
    '/misc/statement/1099': {
         method: 'get',
         func: statement.fetch1099,
    },
    // '/misc/getStatementProcessingMsg': {
    //     method: 'get',
    //     func: statement.getStatementProcessingMsg,
    // },
    // '/misc/gsimport': {
    //     method: 'get',
    //     func: statement.doGsImport,
    // },
    // '/misc/matchPayments': {
    //     method: 'post',
    //     func: statement.matchPayments,
    // },
    // '/misc/sendPaymentNotification': {
    //     method: 'get',
    //     func: statement.sendPaymentNotification,
    // },
    '/misc/rsheet1/:op/:id/:range': {
        method: 'get',
        func: sheet.doGet,
    },
    '/misc/sheetorig/:op/:id/:range': {
        method: 'post',
        func: sheet.doGet,
    },
    '/misc/sheet/:op/:id/:range': {
        method: 'post',
        func: sheet.doGet,
    },
    '/misc/sheet/deleteRow/:id/:sheetName/:row': {
        method: 'post',
        func: sheet.deleteRow,
    },

    '/misc/sheet/saveSheetAuthData': {
        method: 'post',
        func: sheet.saveSheetAuthData,
    },
    '/misc/browser/startBrowserControl': {
        method: 'post',
        func: browserControl.startBrowserControl,
    },
    '/auth/login': {
        auth: false,
        method: 'post',
        func: steps.login,
    },
    // '/google/clientId': {
    //     method: 'get',
    //     func: googleApi.getGoogleClientId,
    // },
    // '/google/token': {
    //     method: 'post',
    //     func: googleApi.getToken,
    // },
    '/version': {
        auth: false,
        method: 'get',
        func: about.version,
    },
} as {
    [key: string]: {
        auth?: boolean;
        method: 'get' | 'post';
        func: (req: Request, res: Response) => any;
    }
};
