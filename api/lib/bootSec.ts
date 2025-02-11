
import * as fs from 'fs';
import { createConn } from './mysql';
export function getSqlConn() {
    const secs: {
        mysql: {
            host: string;
            user: string;
            password: string;
            database: string;
        };
    } = JSON.parse(fs.readFileSync('../secs/pmapi.json').toString());

    return createConn(secs.mysql);
}