import { IDBModel } from './types';
import { formatterYYYYMMDD } from '../util/util';
/// internal table
export const workerRelatedPayments: IDBModel = {
    name: 'workerRelatedPayments',
    fields:
        [
            {field: 'paymentID', desc: 'Id', type: 'uuid', required: true, isId: true, foreignKey: {table: 'rentPaymentInfo', field: 'paymentID'}},
            {field: 'workerID', desc: 'Id', type: 'uuid', required: true, isId: true, foreignKey: {table: 'workerInfo', field: 'workerID'}},
            {field: 'receivedDate', desc: 'Received Date', type: 'date'},
            {field: 'receivedAmount', desc: 'Received Amount', type: 'decimal'},
            {field: 'paidBy', desc: 'Paid By', },
            { field: 'leaseID', desc: 'Lease ID', foreignKey: { table: 'leaseInfo', field: 'leaseID' } },
            { field: 'workerCompID', desc: 'Comp ID', foreignKey: { table: 'workerComp', field: 'id' } },
            { field: 'workerCompType', desc: 'Comp Type' }, //percent,amount,oneTime
            { field: 'workerCompDayOfMonth', desc: 'Comp Day of Month' },
            { field: 'workerCompAmount', desc: 'Rate or Amount', type: 'decimal' },
            { field: 'calculatedAmount', desc: 'Final Calculated Amount', type: 'decimal' },
            {field: 'settlementID', desc: 'Settlement ID'},
            {field: 'settlementDate', desc: 'Settlement Date', type: 'date'},
        ]
};