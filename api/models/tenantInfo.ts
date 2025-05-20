import { IDBModel } from './types';
export const tenantInfo: IDBModel = {
    name: 'tenantInfo',
    fields:
        [
            { field: 'userID', type: 'uuid', desc: 'Owner', foreignKey: { table: 'userInfo', field: 'userID' }, required: true, isId: true, },
            { field: 'tenantID', desc: 'Id', type: 'uuid', required: true, isId: true },
            { field: 'firstName', desc: 'First Name', required: true },
            { field: 'lastName', desc: 'Last Name', required: true },
            { field: 'fullName', desc: 'Full Name', required: true, def: '' },
            { field: 'email', desc: 'Email', },
            { field: 'phone', desc: 'Phone', },            
            { field: 'comment', desc: 'Comments', },            
        ]
};