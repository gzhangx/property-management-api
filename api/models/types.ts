export type TimeZoneType = 'America/New_York' | 'America/Chicago' | 'America/Denver' | 'America/Los_Angeles' | 'America/Phoenix' | 'America/Anchorage' | 'Pacific/Honolulu';
export interface IUserAuth {
    userID: string;
    timezone: TimeZoneType;
}

export type ModelTableNames = 'userInfo' | 'houseInfo' | 'tenantInfo' | 'workerInfo' | 'workerComp' | 'maintenanceRecords' | 'googleApiCreds' | 'rentPaymentInfo' | 'leaseInfo' | 'expenseCategories' | 'userOptions'
    | 'paymentType';

export type PossibleDbTypes = (string | number | null | Date);
export interface IDBFieldDef {
    field: string; //actual field
    name?: string; //name
    desc: string;
    type?: '' | undefined | 'int' | 'string' | 'date' | 'datetime'| 'decimal' | 'uuid' | 'text';
    size?: string | number;
    required?: boolean;
    isId?: boolean;
    def?: string|number;
    unique?: boolean;
    ident?: boolean;    
    //isOwnerSecurityParentField?: boolean;
    //key?: 'UNI' | 'PRI' | null;
    //autoValueFunc?: (row: { [key: string]: (string | number) }, field: IDBFieldDef, val: PossibleDbTypes) => (string);
    autoYYYYMMFromDateField?: string;
    foreignKey?: {
        table: ModelTableNames;
        field: string;
        //the following is ui only
        resolvedToField?: string; //for foreign key fields, the field name to which this foreign object is resolved to on the current object (i.e. rentPaymentInfo will have a field addressObj which is the houseInfo object)
    };
    allowBadForeignKey?: boolean;
}

export interface IDBViewFieldDef extends IDBFieldDef {
    table: string; //for views only  
}

export interface IDBModel {
    fields: IDBFieldDef[];
    fieldMap?: {
        [key: string]: IDBFieldDef;
    };
    view?: {
        name: string;
        fields: IDBViewFieldDef[];
        extraViewJoins?: string;
    }
}