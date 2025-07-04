import { IDBModel } from './types';
export const ownerInfo: IDBModel = {
    name: 'ownerInfo',
    fields:
        [
            { field: 'userID', desc: 'Owner', foreignKey: { table: 'userInfo', field: 'userID' }, required: true, },
            { field: 'ownerID', desc: 'Owner Id', required: true, isId: true, },
            { field: 'ownerName',desc: 'Owner Name', required: true,},
            { field: 'taxName', desc: 'Tax Name' },
            { field: 'taxID', desc: 'SSN', },
            { field: 'address', desc: 'Address' },
            { field: 'city', desc: 'City' },
            { field: 'state', desc: 'State' },
            { field: 'zip', desc: 'Zip' },
            { field: 'email',desc: 'Email',},
            { field: 'phone', desc: 'Phone', },
            { field: 'smtpEmailUser', desc: 'Smtp Email User', },
            { field: 'smtpEmailPass', desc: 'Smtp Email Password', },
        ]
};