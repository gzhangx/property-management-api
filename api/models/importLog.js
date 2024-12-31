module.exports = {
    fields:
        [
            { field: 'userID', type: 'uuid', desc: 'User ID', required: true, isOwnerSecurityField: true, foreignKey: { table: 'userInfo', field: 'userID' }, isId: true, },
            { field: 'id', desc: 'Id', isId: true, required: true, },
            { field: 'source', desc: 'Source'},
            { field: 'start', desc: 'End', type: 'datetime' },
            { field: 'end', desc: 'End', type:'datetime'},
            { field: 'msg', desc: 'Message', size: 4096},
            { field: 'vdPosControl', desc: 'PosControl' },
        ]
};