import moment from 'moment';
import { IDBModel } from './types';
export const rentPaymentInfo: IDBModel = {
    name: 'rentPaymentInfo',
    fields:
        [            
            { field: 'paymentID', desc: 'Id', type: 'uuid', required: true, unique: true, isId: true },
            { field: 'userID', desc: 'Owner', foreignKey: { table: 'userInfo', field: 'userID' }, required: true, },
            { field: 'receivedDate', desc: 'Received Date', type: 'datetime' },
            { field: 'receivedAmount', desc: 'Received Amount', type: 'decimal' },
            { field: 'paidBy', desc: 'Paid By', },
            { field: 'notes', desc: 'Notes', size: 1024}, //alter table rentPaymentInfo modify column notes varchar(1024);
            { field: 'month', desc: 'Month', autoYYYYMMFromDateField:'receivedDate' }, //autoValueFunc: row => moment(row['date']).format('YYYY-MM')
            { field: 'paymentTypeName', desc: 'PaymentType', foreignKey: { table: 'paymentType', field: 'paymentTypeName' } },
            //{ field: 'leaseID', desc: 'Lease ID', foreignKey: {table: 'leaseInfo', field:'leaseID'}},
            { field: 'houseID', desc: 'House', foreignKey: { table: 'houseInfo', field: 'houseID', resolvedToField: 'addressObj' } },            
            { field: 'leaseID', desc: 'Lease', foreignKey: { table: 'leaseInfo', field: 'leaseID' } },            
            { field: 'paymentProcessor', desc: 'Processor', },
        ],
        view:{
            name: 'view_rentPaymentInfo',
            fields:[
                //{ name: 'address', field: 'address', desc: 'House', table: 'houseInfo' },
                //{ name: 'addressId', field: 'houseID', desc: 'HouseID', table: 'houseInfo' },
                //{ field: 'source', desc: 'Source', table: 'ip' },
            ], 
            //extraViewJoins: ' left join importPayments ip  on ip.paymentID  = rentPaymentInfo.paymentID',
        }
};