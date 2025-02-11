import * as  mysql from 'mysql';

export function createConn(config: mysql.PoolConfig) {
    const conn = mysql.createPool({
        connectionLimit: 3,        
        host: process.env.DBHOST || 'localhost',        
        database: "PM",
        charset: "utf8mb4_unicode_ci",
        ...config,
    });

    function doQuery(sql: string, param:any[] = []): Promise<any[]> {
        return new Promise((resolve,reject) => {
                conn.query(sql, param, (err,result) => {
                    if(err) return reject(err);
                    resolve(result);
                });
        });
    }

    async function doQueryOneRow(sql: string, parm: any[]) {
        const rows = await doQuery(sql, parm);
        return rows[0];
    }

    return {
        end: ()=>conn.end(),
        conn,
        doQuery,
        doQueryOneRow,
    }
}
