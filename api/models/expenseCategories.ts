import { IDBModel } from './types';
export const expenseCategories: IDBModel = {
    name: 'expenseCategories',
    fields:
        [
            { field: 'expenseCategoryID', desc: 'Id' , required: true, isId: true},
            { field: 'expenseCategoryName', desc: 'Name' },
            { field: 'mappedToTaxExpenseCategoryName', desc: 'What actual tax expense category this maps to' },
            { field: 'doNotIncludeInTax', type: 'int', desc: 'Do not include this in tax calculation', required: true, def: 0 },
            { field: 'displayOrder', type:'int', desc:'Display Order' }, 
        ]
};