import { getSqlConn } from './bootSec';
const {
    conn,
    doQuery,
    doQueryOneRow,
} = getSqlConn();

export async function findUser(qryPrms: {[key:string]:string}) {
    let query='';
    let prm: any[]=[];
    const prmNames=['id','email','username'];
    const add=(op: string, name: string,val:string) => {
        if(val===undefined) {
            return;
        };
        if(query) query=`${query} ${op}`;
        prm.push(val);
        query=`${query} ${name}=?`;
    };
    prmNames.forEach(n => add('or',n,qryPrms[n]));
    return await doQuery(`select * from user where ${query}`, prm).then(res => {
        return res && res[0];
    })
}

export async function getAllDatabases() {    
    const dbs = await doQuery('show databases');
    const mapped = dbs.map(d => d.Database);
    return mapped;
}

export async function getAllTables() {
    const tables = await doQuery('show tables');
    if (!tables.length) return [];
    const first = tables[0];
    const key = Object.keys(first)[0];
    const mapped = tables.map(d => d[key]);    
    return mapped;
}

export async function getTableFields(table: string) {
    const fields = await doQuery(`desc ${table}`);      
    const mapped = fields.map(f => ({
        fieldName: f.Field,
        fieldType: f.Type,
        allowNull: f.Null === 'YES',
        defVal: f.Default,
    }));
    console.log(mapped);
    return mapped;
}

export async function getTableIndexes(table: string) {
    const sqlStr = `SHOW INDEXES FROM ${table};`
    const idxes = await doQuery(sqlStr);
    const mapped = idxes.map(idx => ({
        table: idx.Table,
        unique: !idx.Non_unique,
        indexName: idx.Key_name,
        columnName: idx.Column_name,
        allowNull: idx.Null,
    }));
    console.log(mapped);
    return mapped;
}
export async function getTableConstraints(table: string) {
    const constraints = await doQuery(`select COLUMN_NAME columnName, CONSTRAINT_NAME constraintName,
     REFERENCED_COLUMN_NAME refColumn, REFERENCED_TABLE_NAME refTable
    from information_schema.KEY_COLUMN_USAGE
    where TABLE_NAME ='${table}';`);
    console.log(constraints);
    return constraints;
}

export const end = () => conn.end();

export {
    conn,
    doQuery,
    doQueryOneRow,
};
