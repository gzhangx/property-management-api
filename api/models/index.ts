//const tenantInfo = require('./tenantInfo');
import {readdirSync}  from 'fs';
import { keyBy } from 'lodash'

const files = readdirSync(__dirname).filter((n:string) => n !== 'index.js' && n !== 'types.js' && (n.endsWith('.js'))) as string[];

import { PossibleDbTypes, IDBFieldDef, IDBViewFieldDef, IDBModel } from './types'

export { PossibleDbTypes, IDBFieldDef, IDBViewFieldDef, IDBModel };

function createFieldMap(model: IDBModel) {
    if(!model.fieldMap) {    
      model.fieldMap = keyBy(model.fields, 'field');
    }
  }

/*  
export const data = files.reduce((acc, fname) => {
  const modName = fname.split('.')[0];
  const model = require(`./${modName}`) as IDBModel;
  if (!model.fields) {
    const modelNames = Object.keys(model);
    modelNames.forEach(name => {
      const act = (model as any)[name] as IDBModel;
      createFieldMap(act);
      acc[name] = act;  
    })
  } else {
    createFieldMap(model);
    acc[modName] = model;
  }
  return acc;
}, {} as { [key: string]: IDBModel});

//module.exports = data;

export default data;
*/

import { expenseCategories } from './expenseCategories';
import { googleApiCreds } from './googleApiCreds';
import { houseInfo } from './houseInfo';
import { leaseInfo } from './leaseInfo';
import { leaseTenantInfo } from './leaseTenantInfo';
import { maintenanceRecords } from './maintenanceRecords';
import { ownerInfo } from './ownerInfo';
import { paymentType } from './paymentType';
import { rentPaymentInfo } from './rentPaymentInfo';
import { tenantInfo } from './tenantInfo';
import { userInfo } from './userInfo';
import { userOptions } from './userOptions';
import { workerComp } from './workerComp';
import { workerInfo } from './workerInfo';
//import { workerRelatedPayments } from './workerRelatedPayments';

const allModels: IDBModel[] = [
  expenseCategories,
  googleApiCreds,
  houseInfo,
  leaseInfo,
  leaseTenantInfo,
  maintenanceRecords,
  ownerInfo,
  paymentType,
  rentPaymentInfo,
  tenantInfo,
  userInfo,
  userOptions,
  workerComp,
  workerInfo,
];

export const data = allModels.reduce((acc, model) => {  
  if (!model.fields) {
    const modelNames = Object.keys(model);
    modelNames.forEach(name => {
      const act = (model as any)[name] as IDBModel;
      createFieldMap(act);
      acc[name] = act;
    })
  } else {
    createFieldMap(model);
    acc[model.name] = model;
  }
  return acc;
}, {} as { [key: string]: IDBModel });