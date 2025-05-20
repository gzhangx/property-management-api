import { IDBModel } from './types';
export const workerComp: IDBModel = {
    name: 'workerComp',
    fields:
        [
            {field: 'id', desc: 'Id', type: 'uuid', isId: true, },
            {field: 'workerID', desc: 'Id', type: 'uuid', required: true, foreignKey: {table: 'workerInfo', field: 'workerID'}},
            { field: 'dayOfMonth', desc: 'Day of Month to process' },
            {field: 'type', desc: 'Percent or amount'},
            {field: 'amount', desc: 'Percent', type: 'decimal'},
            {field: 'houseID', desc: 'House ID', foreignKey: {table: 'houseInfo', field: 'houseID'}},
        ],
        // view:{
        //     name:'view_workerComp',
        //     fields:[
        //         { name: 'firstName', field: 'firstName', desc: 'Worker Firstname', table: 'workerInfo' },
        //         { name: 'lastName', field: 'lastName', desc: 'Worker Lastname', table: 'workerInfo' },
        //         { name: 'address', field: 'address', desc: 'Address', table: 'houseInfo' },
        //     ],  
        //     //extraViewJoins: ' left join houseInfo h on h.houseID = leaseInfo.houseID ',
        // }
};