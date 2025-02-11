
import * as fs from 'fs';
import { createConn } from './mysql';
export function getSqlConn() {
    const secs = getBootSec();

    return createConn(secs.mysql);
}

type BootSec = {
    mysql: {
        host: string;
        user: string;
        password: string;
        database: string;
    };
    azureMail: {
        connectionString: string;
        from: string;
    }
}

export function getBootSec(): BootSec {
    const secs: BootSec = JSON.parse(fs.readFileSync('../secs/pmapi.json').toString());
    return secs;
}