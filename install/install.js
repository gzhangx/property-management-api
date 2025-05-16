const Client = require('ssh2').Client;

const conn = new Client();
conn.on('ready', async function() {
    console.log('Client :: ready');
    const exec = cmd => new Promise((resolve, reject) => conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let stdout = '';
        let stderr = '';
        stream.on('close', function (code, signal) {
            console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
            resolve({ stdout, stderr, code, signal, cmd });
        }).on('data', data => {
            stdout += data;
            console.log('data ' + data);
        }).stderr.on('data', function (data) {
            console.log('stderr ' + data);
            stderr += data;
        });
    }));

    const npm = 'npm';
    let res = await exec(`export PATH=$PATH:/home/pi/.nvm/versions/node/v19.9.0/:/home/pi/.nvm/versions/node/v19.9.0/bin;cd property-management-api;cp /home/pi/creds/pienv.txt install;git pull;${npm} install;${npm} run build;sudo systemctl restart propertyManagement.service;`);
    console.log(res);
    conn.end();

}).connect({
  host: '192.168.0.40',
  port: 22,
  username: 'pi',
  privateKey: require('fs').readFileSync('../id_rsa')
});