const { isUndefined } = require('lodash');
const socketio = require('socket.io');
const consts = require('./consts');
function setupSocket(server, setupFuncs) {
    const io = require('socket.io')(server, {
        transports: ['websocket'],
        path: `${consts.apiRoot}/socket.io`,
    });
    //const io = baseIo.of(consts.apiRoot);
    io.on('connection', function (socket) {
        console.log('connection');
        setupFuncs.forEach(ssetup=>{
            if (typeof ssetup === 'function')
                ssetup(socket, io);
        })
        //socket.on('chat message', function (msg) {
        //    console.log('got chat msg ' + msg);
        //    io.emit('chat message srv', msg + (new Date()).toISOString());
        //});
    });
}

module.exports = {
    setupSocket,
}