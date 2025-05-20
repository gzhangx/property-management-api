import { IDBModel } from './types';
export const userInfo: IDBModel = {
    name: 'userInfo',
    fields:
        [            
            { field: 'userID', desc: 'Email', isId: true, },
            { field: 'username', desc: 'username' },
            { field: 'password', desc: 'Password' },
            { field: 'Name', desc: 'Name' },
            //export type TimeZoneType = 'America/New_York' | 'America/Chicago' | 'America/Denver' | 'America/Los_Angeles' | 'America/Phoenix' | 'America/Anchorage' | 'Pacific/Honolulu';
            { field: 'timezone', desc: 'Timezone', type: 'string'}  
        ]
};