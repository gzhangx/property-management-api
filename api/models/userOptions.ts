import { IDBModel } from './types';
export const userOptions = {
    name: 'userOptions',
    fields:
        [
            { field: 'id', desc: 'Key Id', required: true, isId: true},
            { field: 'data', desc: 'Data',  type: 'text'},            
            { field: 'userID', desc: 'Owner ID', isId: true, required: true, isOwnerSecurityField: true, foreignKey: { table: 'userInfo', field: 'userID' } },
        ],    
} as IDBModel;