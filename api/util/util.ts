const get = require('lodash/get');
const pick = require('lodash/pick');

import { IDBFieldDef } from '../models/index'
export function pickUserFields(user: any) {
    const ru = pick(user, ['_id','username','uuid','email','idOnProvider','provider']);
    if (ru._id) ru.id = ru._id.toString();
    return ru;
}

export function getUser(req: any) {
    return pickUserFields(get(req,'user'));
}

export const formatterYYYYMMDD=(str:string) => `STR_TO_DATE('${str}','%Y-%m-%d')`;

export const extensionFields = Object.freeze([{ field: 'created' }, { field: 'modified' }]) as IDBFieldDef[];


export const NOT_AUTHORIZED_MESSAGE = 'not authorized';