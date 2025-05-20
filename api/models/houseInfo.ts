import { IDBModel } from './types';
export const houseInfo: IDBModel = {
    name: 'houseInfo',
    fields:
        [
            { field: 'userID', type: 'uuid', desc: 'User ID', required: true, foreignKey: { table: 'userInfo', field: 'userID' }, isId: true, },
            { field: 'houseID', desc: 'Id', type: 'uuid', required: true, isId: true },
            { field: 'address', desc: 'Address', required: true },
            { field: 'city', desc: 'City', },
            { field: 'state', desc: 'State',  },
            { field: 'zip', desc: 'Zip', },
            { field: 'ownerName', desc: 'Owner Name', },
            { field: 'disabled', desc: 'manually set to Y to prevent from showing', size: 1 },
            { field: 'cost', desc: 'Cost for IRS tax calculation',  type: 'decimal', def: 0},
        ],
    view:{
        name:'view_house',
        fields:[
            {name:'userName', field:'userName', desc:'User Name', table:'userInfo'}
        ],
        content:'select houseID, address, city, state, zip, h.userID userID, userName, h.created, h.modified from houseInfo h left outer join userInfo o on h.userID=o.userID'
    }
};