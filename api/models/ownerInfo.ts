import { IDBModel } from './types';
export const ownerInfo: IDBModel = {
    fields:
        [
            { field: 'userID', desc: 'Owner', foreignKey: { table: 'userInfo', field: 'userID' }, required: true, isId: true, },
            { field: 'ownerId', desc: 'Owner Id', required: true, isId: true, },
            { field: 'ownerName',desc: 'Owner Name', required: true,},
            { field: 'taxName', desc: 'Tax Name' },
            { field: 'taxID', desc: 'SSN', },
            { field: 'address', desc: 'Address' },
            { field: 'city', desc: 'City' },
            { field: 'state', desc: 'State' },
            { field: 'zip', desc: 'Zip' },
            { field: 'email',desc: 'Email',},
            { field: 'phone',desc: 'Phone',},
        ]
};