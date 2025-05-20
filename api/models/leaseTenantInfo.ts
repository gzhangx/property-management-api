import { IDBModel } from './types';
export const leaseTenantInfo: IDBModel = {
    name: 'leaseTenantInfo',
    fields:
        [
            { field: 'userID', type: 'uuid', desc: 'Owner', foreignKey: { table: 'userInfo', field: 'userID' }, required: true, isId: true, },
            { field: 'id', desc: 'Id', type: 'uuid', isId: true, },
            { field: 'tenantID', desc: 'Tenant Id', type: 'uuid', required: true, foreignKey: { table: 'tenantInfo', field: 'tenantID' } },            
            { field: 'leaseID', desc: 'Lease ID', required: true, foreignKey: { table: 'leaseInfo', field: 'leaseID' } },            
        ],
        view:{
            name: 'view_leaseTenantInfo',
            fields:[
                { name: 'comment', field: 'comment', desc: 'Lease Comment', table: 'l' },
                { name: 'address', field: 'address', desc: 'House', table: 'h' },

                { field: 'firstName', desc: 'First Name', table:'tenantInfo' },
                { field: 'lastName', desc: 'Last Name', table:'tenantInfo' },
                { field: 'email', desc: 'Email', table:'tenantInfo' },
                { field: 'phone', desc: 'Phone', table:'tenantInfo' },
            ], 
            extraViewJoins: ' left join tenantInfo t on t.tenantID=leaseTenantInfo.tenantID inner join leaseInfo l on l.leaseID=leaseTenantInfo.leaseID left join houseInfo h on h.houseID=l.houseID',
        }
};