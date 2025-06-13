
import * as fs from 'fs';
import { createConn } from './mysql';
export function getSqlConn() {
    const secs = getBootSec();

    return createConn(secs.mysql);
}

type PuppConfig = {
    PuppBrowserExecPath: string;
    PuppBrowserUserDataDir: string;
    PuppBrowserDownloadDir: string;
}
type BootSec = {
    mysql: {
        host: string;
        user: string;
        password: string;
        database: string;
    };
    azureMail: {  //not used
        connectionString: string;
        from: string;
    },
    PuppConfig: {
        pi: PuppConfig;
        notPI: PuppConfig;
    }

}

export function getBootSec(): BootSec {
    const secs: BootSec = JSON.parse(fs.readFileSync('../secs/pmapi.json').toString());
    return secs;
}