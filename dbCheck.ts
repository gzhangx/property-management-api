import * as sec from './api/lib/bootSec';

//import * as modelsAll from './api/models/index';
import mod, { IDBFieldDef }  from './api/models/index'
//const mod = modelsAll.data;
import { extensionFields } from './api/util/util';

import bluebird from 'bluebird';

const IDENT_ID = 'auto_increment';
const {
    conn,
    doQuery,
} = sec.getSqlConn();

const tables = Object.keys(mod);

function throwErr(message: string) {
    console.log(message);
    throw { message };
}


function getTypeFromDef(f: IDBFieldDef) {
    if (f.type === 'int') {
        if (f.ident) return `int ${IDENT_ID} `
        return 'int';
    }
    if (f.type === 'uuid') return 'varchar(100)';
    if (f.type === 'date') return 'date';
    if (f.type === 'datetime') return 'datetime';
    if (f.type === 'decimal') return 'DECIMAL(12,2)';
    if (f.type === 'text') return 'text';
    if (f.size) return `varchar(${f.size})`;
    return 'varchar(100)';
}
const typeToType = (f: IDBFieldDef) => {
    let v1 = getTypeFromDef(f);    
    if (f.ident) {        
        v1 = `${v1}`.trim();
    }
    
    return `${v1}${(f.unique) ? ' UNIQUE' : ''}${f.required?' NOT NULL':''}`;
}

interface ITblColumnRet {
    Field: string;
    Type: string; //'varchar(100)'

    Default: string | null;
    Extra: string;
    Key: 'PRI' | 'UNI' | null;
    Null: 'YES' | 'NO'
}

export async function check() {
    
    const allErrors: string[] = [];
    await bluebird.Promise.map( tables, async tabName => {
        const columnQry = (() => doQuery(`SHOW COLUMNS FROM ${tabName}`)) as () => Promise<ITblColumnRet[]>;
        const curMod=mod[ tabName ];
        if ( !curMod ) {
            throwErr( `Table ${tabName} not in DB` );
        }
        const pkStr = (f: IDBFieldDef) => (f.isId ? 'PRIMARY KEY' : '');
        try {
            await columnQry()
        } catch (exc: any) {
            console.log(`error query table ${tabName}, creating`)
            console.log( exc.message );
            const createSql=`create table ${tabName} (${curMod.fields.map( f => {
                return `${f.field} ${typeToType(f)} ${pkStr(f)}`
            } ).join( ',' )})`;
            console.log( createSql );
            await doQuery( createSql );
        }
        const res=await columnQry();

        const dbIds = res.reduce((acc, dbf) => {
            acc[dbf.Field] = dbf;
            return acc;
        }, {} as { [key: string]: ITblColumnRet; });
        curMod.fields.forEach(myf => {
            if (!dbIds[myf.field]) {
                console.log( `Table ${tabName} field ${myf.field} not in DB` );
            }
        });
        console.log(`${tabName} good`);
        

        if (tabName === 'userInfo') {
            console.log('userInfo');
        }
        const mustExistDateCols=([
            { field: 'created', type: 'datetime', def: 'NOW()', size: undefined, desc: 'created', }
            , { field: 'modified', type: 'datetime', def: 'NOW()', size: undefined, desc:'modified' }
        ] as IDBFieldDef[]).concat( curMod.fields ) ;
        await bluebird.Promise.map(mustExistDateCols, async col => {
            const dbField = dbIds[col.field];
            if (!dbField) {
                const alterTblSql = `alter table ${tabName} add column ${col.field} ${typeToType(col)} ${pkStr(col)} ${col.def ? ' default ' + col.def : ''};`;
                try {
                    await doQuery(alterTblSql);
                    console.log(`alter ${tabName} added ${col.field} ${pkStr(col)}`);
                } catch (err) {    
                    const errorMsg = `alter table failed ${alterTblSql} ${(err as any)?.message}`;
                    console.log(errorMsg);
                    allErrors.push(errorMsg);
                    throw err;
                }
            } else {
                const dbType = corrDbType(dbField, false).toLowerCase();                
                const simpleMyType = getTypeFromDef(col).toLowerCase();
                const myType = typeToType(col).toLowerCase().trim();                
                if (dbType !== simpleMyType || (dbField.Key ==='UNI' && col.unique)) {                    
                    const alterTblSql = `alter table ${tabName} modify column ${col.field} ${myType} ${col.def ? ' default ' + col.def : ''};`;
                    console.log(`type diff ${dbType} mytype=${myType}: ${alterTblSql}`);
                    await doQuery(alterTblSql);
                }                
            }            
        }, { concurrency: 1 });
        const requiredPrimaryKeyFields = curMod.fields.filter(f => f.isId);
        const foundPrimaryKeyInDb = requiredPrimaryKeyFields.reduce((acc, pf) => {
            if (dbIds[pf.field]?.Key === 'PRI') {
                acc++;
            }
            return acc;
        }, 0);
        if (foundPrimaryKeyInDb < requiredPrimaryKeyFields.length) {
            if (foundPrimaryKeyInDb === 0) {
                const alterTblSql = `alter table ${tabName} add primary key(${requiredPrimaryKeyFields.map(f=>f.field).join(',')});`;
                console.log(`Need add all primary key: ${alterTblSql}`);
                await doQuery(alterTblSql);
            } else {
                const alterTblSql = `alter table ${tabName} drop primary key, add primary key(${requiredPrimaryKeyFields.map(f => f.field).join(',')});`;
                console.log(`Need add all primary key: ${alterTblSql}`);
                await doQuery(alterTblSql);
            }
        }
        
        await bluebird.Promise.map(res, async dbf => {
            const found = mustExistDateCols.filter(c => c.field == dbf.Field);
            if (!found.length) {                
                const alterTblSql = `alter table ${tabName} drop column ${dbf.Field}`;
                console.log(`Warning, going to drop db col ${dbf.Field} ${alterTblSql}`);
                await doQuery(alterTblSql);
            }
        }, { concurrency: 1 });

        const curView = curMod.view
        if (curView) {
            const select = 'select ' + curMod.fields.concat(extensionFields).map(f => `${tabName}.${f.field}`)
                .concat(curView.fields.map(f=>`${f.table}.${f.field || f.name} ${f.name || ''}`))
                .join(',');
            const innerJoin = curMod.fields.map(f => {
                const fk = f.foreignKey;
                if (fk) {
                    return (` left outer join ${fk.table} on ${tabName}.${f.field}=${fk.table}.${fk.field} `);
                }
            }).join(' ');
            const createViewSql = `create or replace view ${curView.name} as ${select} from ${tabName} ${innerJoin} ${curMod.view?.extraViewJoins||''}`;
            console.log(createViewSql);
            try {
                await doQuery(createViewSql);
            } catch (err: any) {
                const errorMsg = `${createViewSql} ${err.message}`;
                allErrors.push(errorMsg);
                console.log(errorMsg);
                //throw err.message
            }
        }

    }, { concurrency: 1 });
    
    
    conn.end();

    const multiIdTables: string[] = [];
    tables.forEach(tabName => {
        const curMod = mod[tabName];
        const allIdFields = curMod.fields.filter(f => f.isId);
        if (allIdFields.length > 1) {
            multiIdTables.push(`${tabName}: (${allIdFields.map(f => f.field).join(',')})`);
        }
    });
    console.log(`All multi id tabs`, multiIdTables);
    if (allErrors.length) {
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!! has errors', allErrors);
    }
}


function corrDbType(dbField: ITblColumnRet, addUniqueNotNull: boolean = true) {
    let type = dbField.Type.toLowerCase();
    if (type.startsWith('int(')) type = 'int';
    if (!addUniqueNotNull) return type;

    if (dbField.Key === 'UNI') {
        type = `${type} UNIQUE`;
    }
    
    if (dbField.Null === 'NO') {
        type = `${type} NOT NULL`;
    }    
    //if (dbField.Key === 'PRI') {
    //    type = `${type} primary key`;
    //} 
    return type;
}
