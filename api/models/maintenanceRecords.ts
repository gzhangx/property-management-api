import { IDBModel } from './types';
import moment from 'moment';
export const maintenanceRecords:IDBModel = {
    fields:
        [
            { field: 'houseID', desc: 'House ID', foreignKey: { table: 'houseInfo', field: 'houseID', resolvedToField: 'addressObj' } },
            { field: 'maintenanceID', desc: 'Id' , type: 'uuid', required: true, isId: true},
            { field: 'date', desc: 'datetime', type: 'datetime' },
            { field: 'month', desc: 'month', autoYYYYMMFromDateField: 'date', }, //dontShowOnEdit: true,  //autoValueFunc: row => moment(row['date']).format('YYYY-MM')
            { field: 'description', desc: 'description:', size: 4096},
            { field: 'amount', desc:'Amount', type: 'decimal', },
            { field: 'expenseCategoryId', desc: 'category', required: true, foreignKey: { table: 'expenseCategories', field: 'expenseCategoryID' }, allowBadForeignKey: true },
            { field: 'hours', desc:'Hours', type: 'decimal' },
            { field: 'workerID', desc: 'Worker Id', type: 'uuid', required: false, foreignKey: { table: 'workerInfo', field: 'workerID' }, allowBadForeignKey: true },
            { field: 'comment', desc: 'comment', size: 4096 },
        ],
    view: {
        name: 'view_maintenanceRecords',
        fields: [
            { name: 'workerName', field: 'workerName', desc: 'WorkerName', table: 'w' },            
            { name: 'workerEmail', field: 'email', desc: 'Worker Email', table: 'w' },
            { name: 'address', field:'address', desc: 'House', table: 'h' },
            { name: 'expenseCategoryName', field:'expenseCategoryName', desc: 'Expense', table: 'expc' },
            { name: 'expCatDisplayOrder', field: 'displayOrder', desc: 'Exp Order', table: 'expc' },
            { field: 'userID', desc: 'userID', table: 'o' },
            { field: 'userName', desc: 'userName', table: 'o' },
        ],
        extraViewJoins: ' left join workerInfo w on w.workerID=maintenanceRecords.workerID left join houseInfo h on h.houseID = maintenanceRecords.houseID left join expenseCategories expc on expc.expenseCategoryID = maintenanceRecords.expenseCategoryId left join  userInfo o on o.userID=h.userID ',
    }
};