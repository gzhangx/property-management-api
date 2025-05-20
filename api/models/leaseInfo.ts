import { IDBModel } from './types';

export const leaseInfo: IDBModel = {
    name: 'leaseInfo',
    fields:
        [
            { field: 'userID', desc: 'Owner', foreignKey: { table: 'userInfo', field: 'userID' }, required: true, isId: true, },
            { field: 'leaseID', desc: 'Id', type: 'uuid', required: true, isId: true },
            { field: 'houseID', desc: 'House ID', foreignKey: { table: 'houseInfo', field: 'houseID', resolvedToField: 'addressObj' } },
            { field: 'startDate', desc: 'Start Date', type: 'date' },            
            { field: 'endDate', desc: 'End Date', type: 'date' },
            { field: 'rentDueDay', desc: 'Month of day rent is due', type: 'int' },
            { field: 'monthlyRent', desc: 'Monthly Rent', required: true, type: 'decimal', },            

            { field: 'firstMonthProratedRent', desc: 'Prorated Rent', required: false, type: 'decimal', },


            { field: 'deposit', desc: 'Deposit', type: 'decimal' },
            { field: 'petDeposit', desc: 'Pet Deposit', type: 'decimal', def: 0 },
            { field: 'otherDeposit', desc: 'Other Deposit',  type: 'decimal', def: 0 },
            
            { field: 'comment', desc: 'Comment', size: 1024 },

            { field: 'reasonOfTermination', desc: 'Reason Of Termination' },
            { field: 'terminationDate', desc: 'Termination Date', type: 'date' },
            { field: 'terminationComments', desc: 'Termination Comments', size: 1024 },
            
            { field: 'tenant1', desc: 'Tenant ID', foreignKey: { table: 'tenantInfo', field: 'tenantID' } },
            { field: 'tenant2', desc: 'Tenant ID', foreignKey: { table: 'tenantInfo', field: 'tenantID' } },
            { field: 'tenant3', desc: 'Tenant ID', foreignKey: { table: 'tenantInfo', field: 'tenantID' } },
            { field: 'tenant4', desc: 'Tenant ID', foreignKey: { table: 'tenantInfo', field: 'tenantID' } },
            { field: 'tenant5', desc: 'Tenant ID', foreignKey: { table: 'tenantInfo', field: 'tenantID' } },
            
            
        ],
};