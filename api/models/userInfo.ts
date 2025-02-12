import { IDBModel } from './types';
export const userInfo: IDBModel =  {
    fields:
        [            
            { field: 'userID', desc: 'Email', isId: true, },
            { field: 'username', desc: 'username' },
            { field: 'password', desc: 'Password' },
            { field: 'Name', desc: 'Name' },
            { field: 'timezone', desc: 'Timezone', type: 'int'}
        ]
};