const db = require('../lib/db');
const models = require('../models/index');
const keyBy = require('lodash/keyBy');
const get = require('lodash/get');
const uuid = require('uuid');
const {formatterYYYYMMDD, extensionFields}=require('../util/util');

async function doQuery(req, res) {
    try {
        const rows = await db.doQuery(req.query.sql);
  
      return res.json(rows);
    } catch (err) {
      console.log(err);
      res.send(500, {
        sql: req.query.sql,
        message: err.message,
       errors: err.errors
      });
    }
}


function createFieldMap(model) {
  if(!model.fieldMap) {    
    model.fieldMap = keyBy(model.fields, 'field');
  }
}

const goodOps = Object.freeze({
  '>': true,
  '>=': true,
  '=': true,
  '<': true,
  '<=': true,
  '!=': true,
  '<>': true,
});

async function doGet(req, res) {
  try {
    //joins:{ table:{col:als}}
    const { table, fields, joins, order,
      whereArray, offset = 0, rowCount = 2147483647
    } = req.body;
    const model = models[table];
    if (!model) {
      const message = `No model ${table}`;
      throw {
        message
      }
    }
    const tableOrView = get(model,['view','name'], table);
    const viewFields = get(model,['view','fields'],[]);

    if (parseInt(offset) !== offset)
      throw {
        message: 'Bad offset ' + offset
      }
    if (parseInt(rowCount) !== rowCount) {
      throw {
        message: 'Bad rowCount ' + rowCount
      }
    }
    createFieldMap(model);

    const extFields=extensionFields.concat(viewFields)
    const fieldMap=Object.assign({},model.fieldMap, keyBy(extFields,'field'));
    const modelFields=model.fields.concat(extFields);
    const selectNames=fields? fields.filter(f => fieldMap[f]).map(`${tableOrView}.${f}`):modelFields.map(f => `${tableOrView}.${f.field}`);

    let orderby = '';
    if (order && order.length) {
      const orders = order.filter(o => fieldMap[o.name] && o.op).map(o => ` ${o.name} ${o.op === 'asc' ? 'ASC' : 'DESC'}`);
      if (orders.length) {
        orderby = ` order by ${orders.join(', ')}`;
      }
    }

    let joinSels = [];
    let joinTbls = [];
    if (joins) {
      const joinRes = model.fields.reduce((acc, f) => {
        const fk = f.foreignKey;
        if (fk) {
          const joinFields = joins[fk.table];
          if (joinFields) {
            const fkModel = models[fk.table];
            acc.innerJoins.push(` left outer join ${fk.table} on ${table}.${f.field}=${fk.table}.${fk.field} `);
            acc.selects = acc.selects.concat(fkModel.fields.filter(f=>joinFields[f.field]).map(f=>`${fk.table}.${f.field} '${joinFields[f.field]}'`));
          }
        }
        return acc;
      }, {
        selects:[],
        innerJoins:[],
      });
      joinSels = joinRes.selects;
      joinTbls = joinRes.innerJoins;
    }

    let whereStr = '';
    let wherePrm = [];
    if (whereArray) {      
      const whereRed = whereArray.reduce((acc,w) => {
        const pushNop = ()=>{
          acc.whr.push('1=?');
          acc.prms.push('1');
        };        
        if (fieldMap[w.field]) {
          if (goodOps[w.op]) {
            acc.whr.push(`${w.field} ${w.op} ?`);
            acc.prms.push(w.val);
          }else {
            console.log(`Warning bad op ${w.field} ${w.op}`);
            pushNop();
          }
        } else {
          console.log(`Warning field not mapped ${w.field}`);
          pushNop();
        }
        return acc;
      }, {
        whr: [],
        prms:[],
      });
      if (whereRed.whr.length) {
        whereStr = ` where ${whereRed.whr.join(' and ')}`;
      }
      wherePrm = whereRed.prms;
    }

    const fromAndWhere = ` from ${[tableOrView].concat(joinTbls).join(' ')} ${whereStr} `;
    const sqlStr = `select ${selectNames.concat(joinSels).join(',')} ${fromAndWhere} ${orderby}
    limit ${offset}, ${rowCount}`;
    console.log(sqlStr);
    const countRes = await db.doQueryOneRow(`select count(1) cnt ${fromAndWhere}`,wherePrm);
    const rows = await db.doQuery(sqlStr,wherePrm);

    return res.json({
      offset,
      rowCount,
      total: get(countRes, 'cnt'),
      rows,
    });
  } catch (err) {
    console.log(err);
    res.send(500, {
      message: err.message,
      errors: err.errors
    });
  }
}

const vmap = (v, formatter) => {
  if (v === null) return 'null';
  if (v === 0) return 0;
  if (v === '') return "''";
  if (v === undefined) v = '';
  if (formatter) return formatter(v);
  return `'${v}'`
}

async function createOrUpdate(req, res) {
  try {
    const { table, fields, create} = req.body;
    const model = models[table];
    if (!model) {
      const message = `No model ${table}`;
      throw {
        message
      }
    }

    createFieldMap(model);

    let sqlStr = '';
    
    let idVal = '';
    if (create) {

      sqlStr = `insert into ${table} (${model.fields.map(f => f.field).join(',')},created,modified)
       values (${model.fields.map(f => {
         let val = fields[f.field];
         if (f.isId) {
           idVal = uuid.v1();
           val= idVal;
         }
         if (f.formatter) return f.formatter(val);
         return vmap(val);
       }).join(',')},NOW(),NOW())`;
    } else {
      const { idField, values } = model.fields.reduce((acc, mf) => {
        if (mf.isId) {
          acc.idField = { name: mf.field, value: fields[mf.field] };
        } else {
          const v = fields[mf.field];
          if (v !== undefined) {
            acc.values.push({
              name: mf.field,
              value: (mf.formatter|| vmap)(v),
            })
          }
        }
        return acc;
      }, {
        values:[]
      }); 
      if (!idField) {
        throw 'Id field not specified';
      }
      idVal = idField.value;
      const setValMap = v=>`${v.name}=${v.value}`;
      sqlStr = `update ${table} set ${values.map(v=>setValMap(v)).join(',')},modified=NOW() where ${idField.name}=${vmap(idField.value)}`;
    }

    console.log(sqlStr);
    const rows = await db.doQuery(sqlStr);

    rows.id = idVal;
    return res.json(rows);
  } catch (err) {
    console.log(err);
    res.send(500, {
      message: err.message,
      errors: err.errors
    });
  }
}


async function del(req, res) {
  try {
    const { table, id} = req.body;
    const model = models[table];
    if (!model) {
      const message = `No model ${table}`;
      throw {
        message
      }
    }

    createFieldMap(model);

    const idField = model.fields.filter(f => f.isId)[0];
    const sqlStr = `delete from ${table} where ${idField.field}=${vmap(id)}`;
    
    console.log(sqlStr);
    const rows = await db.doQuery(sqlStr);
    return res.json(rows);
  } catch (err) {
    console.log(err);
    res.send(500, {
      message: err.message,
      errors: err.errors
    });
  }
}

async function getDatabases(req, res) {
  const dbs = await db.getAllDatabases();
  return res.json(dbs);
}

async function getTables(req, res) {
  const dbs = await db.getAllTables();
  return res.json(dbs);
}

async function importPayment(req, res) {
  const { transactions } = req.body;
  if (!transactions || !transactions.length) {
    return res.json({
      message: 'no transactions'
    });
  }
  const result = await Promise.map(transactions, async t => {
    if (!t.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return {
        data: t,
        error: `Date mismatch ${t.date}`,
      }
    }
    const parms = [t.date, t.amount, t.name, t.notes || '', t.source || ''];
    const existing = await db.doQuery(`select 1 * from importPayments where date=? and amount=? and name=? and notes=? and source=?`,
      parms);
    if (existing.length) {
      return {
        data: t,
        imported: 0,
      }
    } else {
      await db.doQuery(`insert into importPayments (date, amount, name,notes, source) values(?,?,?,?,?)`,
        parms)
      return {
        data: t,
        imported: 1,
      }
    }
  });
  return res.json(result);
}

async function getTableInfo(req, res) {
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

async function freeFormSql(req, res) {
  try {
    const sqlStr = req.body.sql;
    const parms = req.body.parms;
    console.log(sqlStr);
    const rows = await db.doQuery(sqlStr, parms);
    return res.json(rows);
  } catch (err) {
    console.log(err);
    res.send(500, {
      message: err.message,
      errors: err.errors
    });
  }
}
  
module.exports = {
  doQuery,
  doGet,
  createOrUpdate,
  del,

  getDatabases,
  getTables,
  getTableInfo,
  freeFormSql,

  importPayment,
}