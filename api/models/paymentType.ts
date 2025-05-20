import { IDBModel } from './types';
export const paymentType: IDBModel = {
    name: 'paymentType',
    fields:
        [            
            { field: 'paymentTypeName', desc: 'date', isId: true, },
            { field: 'includeInCommission', desc: 'includeInCommission' },
            { field: 'displayOrder', type:'int', desc: 'Order' }, 
        ]
};