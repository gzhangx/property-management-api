import { Request, Response } from 'restify'
import * as db from '../lib/db';
import * as  models from '../models/index';
import { keyBy, get } from 'lodash';
import * as uuid from 'uuid';
import { extensionFields, NOT_AUTHORIZED_MESSAGE } from '../util/util';
import moment from 'moment';
import momentTimezone from 'moment-timezone';
import {getUserAuth } from '../util/pauth'

import { IUserAuth, ModelTableNames } from '../models/types';

function removeBadChars(str: string) {
  return str.replace(/[^A-Za-z0-9]/g, '');
}

export async function doQuery(req: Request, res: Response) {
  ///TODO: limit with security
  try {
    const rows = await db.doQuery(req.query.sql);
    return res.json(rows);
  } catch (err: any) {
    console.log(err);
    res.send(500, {
      sql: req.query.sql,
      message: err.message,
      errors: err.errors
    });
  }
}


//function createFieldMap(model) {
//  if(!model.fieldMap) {    
//    model.fieldMap = keyBy(model.fields, 'field');
//  }
//}

const goodOps = Object.freeze({
  '>': true,
  '>=': true,
  '=': true,
  '<': true,
  '<=': true,
  '!=': true,
  '<>': true,
  'in': true,
  'isNULL': true,
}) as { [key: string]: boolean; };

const goodGroupOps = Object.freeze({
  'sum': true
}) as { [key: string]: boolean; };

interface ISqlRequestFieldDef {
  field: string;
  op: 'sum' | 'count';
  name: string;
}
interface ISqlOrderDef {
  name: string;
  op: 'asc' | 'desc';
}

interface ISqlRequestWhereItem {
  field: string;
  op: '>' | '>=' | '=' | '<' | '<=' | '!=' | '<>' | 'in' | 'isNULL';
  val: string | number | (string|number)[];
}


interface ISqlRequest {
  table: ModelTableNames;
  fields?: (ISqlRequestFieldDef | string)[];
  joins?: {
    [table: string]: {
      [fieldName: string]: string;  //fieldName to fieldAlias
    }
  };
  order?: ISqlOrderDef[];
  whereArray?: ISqlRequestWhereItem[];
  groupByArray?: {
    field: string;
  }[];
  offset?: number | string;
  rowCount?: number | string;
}

type IPrmType = models.PossibleDbTypes ;
interface IInternalWherePrm 
{
  whr: string[];
  prms: IPrmType[];
}

export function cleanId(id: string): string {
  return id.replace(/[^a-zA-Z0-9-_+@\.]/g, '');
}

export function isOwnerSecurityField(field: models.IDBFieldDef) {
  return field.foreignKey && field.foreignKey.table === 'userInfo';
}
function getSecAuthWhereCond(fields: models.IDBFieldDef[], auth: IUserAuth, whereCondition: string[], whereValues: models.PossibleDbTypes[]) {  
  const res = fields.forEach((f) => {
    if (isOwnerSecurityField(f)) {      
      whereCondition.push(` ${f.field} =?`);
      whereValues.push(auth.userID);
    }    
  });  
  return;
}
export async function doSqlGetInternal(auth: IUserAuth, sqlReq: ISqlRequest) {
  //joins:{ table:{col:als}}
  const { table, fields, joins, order,
    whereArray,    //field, op, val
    groupByArray,  //field [{"field":"workerID"}, {"op":"sum", "field":"amount"}]
    offset = 0, rowCount = 2147483647
  } = sqlReq;
  const model = models.data[table];
  if (!model) {
    const message = `No model ${table}`;
    throw {
      message
    }
  }
  const tableOrView = get(model, ['view', 'name'], table);
  const viewFields = (get(model, ['view', 'fields'], []) as models.IDBFieldDef[]).map(f => ({ ...f, field: f.name || f.field }));

  if (parseInt(offset as string) !== offset)
    throw {
      message: 'Bad offset ' + offset
    }
  if (parseInt(rowCount as string) !== rowCount) {
    throw {
      message: 'Bad rowCount ' + rowCount
    }
  }
  //createFieldMap(model);

  const extFields = extensionFields.concat(viewFields)
  const fieldMap = Object.assign({}, model.fieldMap, keyBy(extFields, 'field')) as { [key: string]: models.IDBFieldDef };
  const modelFields = model.fields.concat(extFields);
  const selectNames = fields ? fields.filter(f => fieldMap[f as string] || fieldMap[(f as ISqlRequestFieldDef).field]).map(ff => {
    const f = ff as ISqlRequestFieldDef;
    if (!f.op) return `${tableOrView}.${f}`;
    if (goodGroupOps[f.op]) {
      if (fieldMap[f.field]) {
        return `${f.op}(${tableOrView}.${f.field}) ${removeBadChars(f.name || '')}`;
      }
    }
    if (f.op === 'count') {
      return `count(1) ${removeBadChars(f.name || '')}`;
    }
  }) : modelFields.map(f => `${tableOrView}.${f.field}`);

  let orderby = '';
  if (order && order.length) {
    const orders = order.filter(o => fieldMap[o.name] && o.op).map(o => ` ${o.name} ${o.op === 'asc' ? 'ASC' : 'DESC'}`);
    if (orders.length) {
      orderby = ` order by ${orders.join(', ')}`;
    }
  }

  let joinSels: string[] = [];
  let joinTbls: string[] = [];
  if (joins) {
    const joinRes = model.fields.reduce((acc, f) => {
      const fk = f.foreignKey;
      if (fk) {
        const joinFields = joins[fk.table];
        if (joinFields) {
          const fkModel = models.data[fk.table];
          acc.innerJoins.push(` left outer join ${fk.table} on ${table}.${f.field}=${fk.table}.${fk.field} `);
          acc.selects = acc.selects.concat(fkModel.fields.filter(f => joinFields[f.field]).map(f => `${fk.table}.${f.field} '${joinFields[f.field]}'`));
        }
      }
      return acc;
    }, {
      selects: [] as string[],
      innerJoins: [] as string[],
    });
    joinSels = joinRes.selects;
    joinTbls = joinRes.innerJoins;
  }

  let whereStr = '';  
  let wherePrm = [] as IPrmType[];
  //if (whereArray)
  {
    const whereRed = (whereArray || []).reduce((acc, w) => {
      const pushNop = () => {
        acc.whr.push('1=?');
        acc.prms.push('1');
      };
      if (fieldMap[w.field]) {
        if (goodOps[w.op]) {
          if (w.op === 'in') {
            if (Array.isArray(w.val)) {
              acc.whr.push(`${w.field} in(${Array(w.val.length).fill('?').join(',')})`);
              w.val.forEach(v => acc.prms.push(v));
            } else {
              acc.whr.push(`${w.field} in(?)`);
              acc.prms.push(w.val);
            }
          } else if (w.op === 'isNULL') { 
            acc.whr.push(`${w.field} is null`)
          } else {
            acc.whr.push(`${w.field} ${w.op} ?`);
            if (!Array.isArray(w.val)) {
              acc.prms.push(w.val);
            } else {
              const error = `File can't be array ${table}.${w.field}`;
              throw {
                error,
                message: error,
              }
            }
          }
        } else {
          console.log(`Warning bad op ${w.field} ${w.op}`);
          //pushNop();
        }
      } else {
        console.log(`Warning field not mapped ${w.field}`);
        //pushNop();
      }
      return acc;
    }, {
      whr: [],
      prms: [],
    } as IInternalWherePrm);
    
    getSecAuthWhereCond(model.fields, auth, whereRed.whr, whereRed.prms);    
    if (whereRed.whr.length) {
      whereStr = ` where ${whereRed.whr.join(' and ')}`;
    }
    wherePrm = whereRed.prms;
  }

  let groupByStr = '';
  if (groupByArray) {
    const groupBys = groupByArray.map(g => g.field).filter(f => fieldMap[f]) as string[];
    if (groupBys.length) {
      groupByStr = ' group by ' + groupBys.join(',');
    }
  }

  const fromAndWhere = ` from ${[tableOrView].concat(joinTbls).join(' ')} ${whereStr} `;
  const sqlStr = `select ${selectNames.concat(joinSels).join(',')} ${fromAndWhere} ${orderby} ${groupByStr}
    limit ${offset}, ${rowCount}`;
  console.log('doGET(sqlStr):',[sqlStr]);
  if (wherePrm && wherePrm.length) console.log('doGET(wherePrm):', wherePrm);
  const countRes = await db.doQueryOneRow(`select count(1) cnt ${fromAndWhere}  ${groupByStr}`, wherePrm);
  const rows = await db.doQuery(sqlStr, wherePrm);

  
  fixRowTime(rows, model.fields);

  return ({
    offset,
    rowCount,
    total: get(countRes, 'cnt'),
    rows,
  });
}

function fixRowTime(rows: any, defs: models.IDBFieldDef[]) {
  const dateFields = defs.filter(f => f.type === 'date' || f.type === 'datetime');
  
  for (const row of rows) {
    for (const df of dateFields) {
      const rv = row[df.field];
      if (rv && rv instanceof Date) {
        //only way to return utc date stored in mysql
        row[df.field] = toYYYYMMDDHHmmss(rv);
      }
    }
  }
}

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}
function toYYYYMMDDHHmmss(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

export async function doGet(req: Request, res: Response) {
  const auth = getUserAuth(req);
  if (!auth) {
    const message = NOT_AUTHORIZED_MESSAGE;
    return res.json({
      message,
      error: message,
    })
  }
  try {
    const rspRes = await doSqlGetInternal(auth, req.body as ISqlRequest);
    //joins:{ table:{col:als}}
    
    return res.json(rspRes);
  } catch (err: any) {
    console.log('doGetError',err);
    res.send(500, {
      message: err.message,
      errors: err.errors
    });
  }
}

function dateStrFormatter(str: (string|number|null|Date)) :Date {
  return moment(str).toDate();
}
const vmap = (v: any, formatter?: (f: any) => string): string | number => {
  if (v === null) return 'null';
  if (v === 0) return 0;
  if (v === '') return "''";
  if (v === undefined) v = '';
  if (formatter) return formatter(v);
  return `'${v}'`
}

const vmap2 = (v: (models.PossibleDbTypes|undefined), f: models.IDBFieldDef) => {
  if (v === null || v === 0) return v;
  if (v === undefined) v = null;  
  if (f.type === 'datetime' || f.type === 'date') {
    return moment.utc(v).toDate();
  }
  return v;
}


interface ICreateUpdateParms {
  table: ModelTableNames;
  fields: { [key: string]: string };
  doCreate?: boolean;
  doUpdate?: boolean;
}

function checkUserSecurityField(auth: IUserAuth, f: models.IDBFieldDef, val: models.PossibleDbTypes) {
  if (isOwnerSecurityField(f)) {
    if (val && val !== auth.userID) {
      const error = `Code (${val} from fiel ${f.field} isId=${f.isId}) is not authorized`;
      console.log(error);
      throw {
        message: error,
        error,
      }
    }
    val = auth.userID;
  }
  return val;
}
export async function createOrUpdateInternal(body: ICreateUpdateParms, auth: IUserAuth) {
  const { table, doCreate, doUpdate } = body;
  const fields = body.fields;
  const model = models.data[table];
  if (!model) {
    const message = `No model ${table}`;
    throw {
      message
    }
  }

  //createFieldMap(model);

  let sqlStr = '';

  let idVal:any = '' as models.PossibleDbTypes;
  let sqlArgs = [] as models.PossibleDbTypes[];
  
  function getAutoYYMM(f: models.IDBFieldDef) {
    return momentTimezone.tz(moment.utc(fields[f.autoYYYYMMFromDateField!]), auth.timezone).format('YYYY-MM');
  }
  if (doCreate) {

    sqlStr = `insert into ${table} (${model.fields.filter(f => !f.ident).map(f => f.field).join(',')},created,modified)
       values (${model.fields.filter(f => !f.ident).map((f) => {
      let val = fields[f.field] as models.PossibleDbTypes;
         if (f.isId && !isOwnerSecurityField(f)) {
          //default for id, but not if it is userID 
           idVal = val || uuid.v1();
           val = idVal;
         }      
         
         val = checkUserSecurityField(auth, f, val);
         
      //if (f.field === OWNER_SEC_FIELD) {
      //  sqlArgs.push(auth.code);
      //  return '?';
      //}
      if (f.autoYYYYMMFromDateField) {           
        sqlArgs.push(getAutoYYMM(f))        
      }
      else {
        //let formatter = ((x: models.PossibleDbTypes) => x);
        //if (f.type === 'datetime' || f.type === 'date') {
        //  formatter = dateStrFormatter;
        //}
        //sqlArgs.push(formatter(vmap2(val, f)));
        sqlArgs.push((vmap2(val, f)));
      }
      return '?';
      //return vmap(val);
    }).join(',')},NOW(),NOW())`;
  }
  
  if (doUpdate){
    //update
    interface INameVal {
      name: string;
      value: models.PossibleDbTypes;
    }
    const { idFields, values } = model.fields.reduce((acc, mf) => {
      if (mf.isId) {
        const v = checkUserSecurityField(auth, mf, fields[mf.field]);
        acc.idFields.push({ name: mf.field, value: v });
      } else if (!isOwnerSecurityField(mf)){
        {
          let v = fields[mf.field];
          if (v !== undefined) {            
            if (mf.autoYYYYMMFromDateField) {
              v = getAutoYYMM(mf);
            }
            acc.values.push({
              name: mf.field,
              value: vmap2(v, mf),
            })
          }
        }
      }      
      return acc;
    }, {
      idFields: [] as INameVal[],
      values: [] as INameVal[],
    });
    if (!idFields.length) {
      throw 'Id field not specified';
    }
    idVal = idFields;
    //const setValMap = v => `${v.name}=${v.value}`;
    const setValMap = (v: INameVal) => `${v.name}=?`;
    const whereValues: models.PossibleDbTypes[] = [];
    const whereCond = idFields.map(idField => {
      whereValues.push(idField.value);
      return `${idField.name}=?`;
    });
    getSecAuthWhereCond(model.fields, auth, whereCond, whereValues);    

    const valueUpdatePairs = `${values.map(v => setValMap(v)).join(',')},modified=NOW()`;
    if (doCreate) {
      sqlStr += ' on duplicate key update ' + valueUpdatePairs;
      sqlArgs = sqlArgs.concat(values.map(v => v.value));
    } else {
      sqlStr = `update ${table} set ${valueUpdatePairs} where ${whereCond.join(' and ')}`;      
      sqlArgs = values.map(v => v.value).concat(whereValues);
    }    
  }

  console.log('createOrUpdateInternal sqlStr', sqlStr);
  if (sqlArgs && sqlArgs.length ) console.log('createOrUpdateInternal sqlArg', sqlArgs);
  const rows = await db.doQuery(sqlStr, sqlArgs) as any;

  rows.id = idVal;
  return rows;
}

export async function createOrUpdate(req: Request, res: Response) {
  try {
    const auth = getUserAuth(req);
    if (!auth) {
      const message = NOT_AUTHORIZED_MESSAGE;
      return res.json({
        message,
        error: message,
      })
    }
    const rows = await createOrUpdateInternal(req.body, auth);    
    return res.json(rows);
  } catch (err:any) {
    console.log('createOrUpdateError',err);
    res.send(500, {
      message: err.message,
      errors: err.errors
    });
  }
}


export async function del(req: Request, res: Response) {
  try {
    const auth = getUserAuth(req);
    if (!auth) {
      const message = NOT_AUTHORIZED_MESSAGE;
      return res.json({
        message,
        error: message,
      })
    }
    const { table, ids } = req.body;
    const model = models.data[table];
    if (!model) {
      const message = `No model ${table}`;
      throw {
        message
      }
    }

    //createFieldMap(model);

    const idFields = model.fields.filter(f => f.isId);
    const sqlStr = `delete from ${table} where ${idFields.map(f=>`${f.field}=?`).join(' and ')}`;

    idFields.forEach((f, ind) => {
      ids[ind] = checkUserSecurityField(auth, f, ids[ind]);
    })
    console.log(`SQK DEKEKTE sqkStr=${sqlStr}`, ids);
    const rows = await db.doQuery(sqlStr, ids);
    return res.json(rows);
  } catch (err: any) {
    console.log(err);
    res.send(500, {
      message: err.message,
      errors: err.errors
    });
  }
}

export async function getDatabases(req: Request, res: Response) {
  const dbs = await db.getAllDatabases();
  return res.json(dbs);
}

export async function getTables(req: Request, res: Response) {
  const dbs = await db.getAllTables();
  return res.json(dbs);
}

export async function importPayment(req: Request, res: Response) {
  const { date, amount, name, notes, source } = req.body;
  if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return res.json({
      error: `Date mismatch ${date}`,
    })
  }

  const parms = [date, amount, name, notes || '', source || ''];
  const existing = await db.doQuery(`select 1 from importPayments where date=? and amount=? and name=? and notes=? and source=?`,
    parms);
  if (existing.length) {
    return res.json({
      imported: 0,
    });
  } else {

    await db.doQuery(`insert into importPayments (id,date, amount, name,notes, source) values(?,?,?,?,?,?)`,
      [uuid.v1()].concat(parms))
    return res.json({
      imported: 1,
    })
  }
}

export async function getTableInfo(req: Request, res: Response) {
  const table = req.query.table;
  const fields = await db.getTableFields(table);
  const indexes = await db.getTableIndexes(table);
  const constraints = await db.getTableConstraints(table);
  res.json({
    fields,
    indexes,
    constraints,
  })
}

export async function freeFormSql(req: Request, res: Response) {
  try {
    const sqlStr = req.body.sql;
    const parms = req.body.parms;
    console.log(sqlStr);
    const rows = await db.doQuery(sqlStr, parms);
    return res.json(rows);
  } catch (err: any) {
    console.log(err);
    res.send(500, {
      message: err.message,
      errors: err.errors
    });
  }
}
