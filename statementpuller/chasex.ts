import * as gen from './processors/procAndCompGeneric';
import creds from '../creds.json';
import { ILog, IActualPuppConfig } from './processors/genProc'
import { doJob } from './processors/chase';
export async function processChaseX(log: ILog, puppConfig: IActualPuppConfig) {
    await gen.getGenDataAndCompareUpdateSheet({
        creds: creds.chase_xie, log, doJob, puppConfig,
    });
}