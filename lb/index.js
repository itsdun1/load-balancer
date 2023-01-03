const express = require('express');
// import { createClient } from 'redis';
bodyParser = require('body-parser');
const winston = require('winston');
const redis = require('redis');
const app = express();
const port = 80;
const axios = require('axios');
var httpProxy = require('http-proxy');
const { info } = require('winston');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: 'logs.log' })
    ]
  });

// var proxy = httpProxy.createProxyServer({});

app.use(async (req, res, next) => {
    console.log(req.url.includes('addServerOnLB'));
    if(req.url.includes('addServerOnLB')) {
        next();
    } else {
        const client = redis.createClient();
        client.on('error', (err) => console.log('Redis Client Error', err));
        await client.connect();
        let hosts = await client.get('hosts');
        hosts = JSON.parse(hosts);
        if(!hosts || Array.isArray(hosts) && hosts.length == 0) {
            return res.status(404).send({success: false, message: 'No Proxy Servers Found'});
        }
        hosts = arrayRotate(hosts);
        await client.set('hosts', JSON.stringify(hosts));
        await client.disconnect();
        console.log( hosts[0]);
        try {
            const response = await axios({
                url: `${hosts[0]}${req.url}`,
                method: req.method,
                headers: req.headers,
                data: req.body
            });

            logger.log({
                level: 'info',
                url: `${hosts[0]}${req.url}`,
                method: req.method,
                headers: req.headers
            })

            res.send(response.data)
        } catch(err){
            logger.log({
                level: 'error',
                url: `${hosts[0]}${req.url}`,
                method: req.method,
                headers: req.headers,
                status: err.response.status
            })

            console.error(err.stack);
            console.log(err.response.status)
            res.status(err.response.status).send(err.message + err.stack)    
        }
        // return proxy.web(req, res, { forward: 'http://' + hosts[0] }, function(e) {
        //     console.log(e, 'inside error catch')
        //     res.writeHead(500, {
        //         'Content-Type': 'text/plain'
        //       });
            
        //     return res.end('Something went wrong. And we are reporting a custom error message.');
        // });
    }
})

// app.use(async (req, res, next) => {
    
//     var options = {
//         hostname: 'localhost',
//         port: 3001,
//         path: req.url,
//         method: req.method,
//         headers: req.headers,
//         proxy: {
//             port: 3001
//         }
//       };

//     const response = await axios(options);

//     response.data.pipe(fs.createWriteStream('ada_lovelace.jpg'))
     
      
//     console.log("req received from client");
//     // next(); // this will invoke next middleware function
//     return res.status(200).send({success: true, data: {version : 1, port: 80, value: 1}})
// });




// app.get('/', async (req, res) => {
//     const client = redis.createClient();
//     client.on('error', (err) => console.log('Redis Client Error', err));
//     await client.connect();
//     await client.set('key', 'value1');
//     const value = await client.get('key');
//     await client.disconnect();
//     return res.status(200).send({success: true, data: {version : 1, port: 80, value: value}})

// })

app.post('/addServerOnLB', async (req, res) => {
    console.log('Inside addServerOnLB')
    let serverIp = req.body.serverIp;
    const client = redis.createClient();
    client.on('error', (err) => console.log('Redis Client Error', err));
    await client.connect();
    let hosts = await client.get('hosts');
    let masterHosts = await client.get('masterHosts');
    // let duplicateHosts = false;
    hosts = JSON.parse(hosts);
    masterHosts = JSON.parse(masterHosts);
    if(!hosts) {
        hosts = [];
    }
    if(!masterHosts) {
        masterHosts = [];
    }
    if(hosts.indexOf(serverIp) < 0 ) {
        hosts.push(serverIp);
    } 
    if(masterHosts.indexOf(serverIp) < 0 ) {
        masterHosts.push(serverIp)
    } 
    

    await client.set('hosts', JSON.stringify(hosts));
    await client.set('masterHosts', JSON.stringify(masterHosts));
    await client.disconnect();
    return res.status(200).send({success: true, data: hosts})

})

app.post('/removeServerFromLB', async (req, res) => {
    // console.log('Inside addServerOnLB')
    let serverIp = req.body.serverIp;
    const client = redis.createClient();
    client.on('error', (err) => console.log('Redis Client Error', err));
    await client.connect();
    let hosts = await client.get('hosts');
    let masterHosts = await client.get('masterHosts');
    // let duplicateHosts = false;
    hosts = JSON.parse(hosts);
    masterHosts = JSON.parse(masterHosts);
    if(!hosts) {
        hosts = [];
    }
    if(!masterHosts) {
        masterHosts = [];
    }
    if(hosts.indexOf(serverIp) >= 0 ) {
        removeItemFromArray(hosts, serverIp);
    } 
    if(masterHosts.indexOf(serverIp) >= 0 ) {
        removeItemFromArray(masterHosts, serverIp);
    } 
    

    await client.set('hosts', JSON.stringify(hosts));
    await client.set('masterHosts', JSON.stringify(masterHosts));
    await client.disconnect();
    return res.status(200).send({success: true, data: hosts})

})

async function monitorApplicationServers() {
    // console.log('Inside monitorApplicationServers')
    const client = redis.createClient();
    client.on('error', (err) => console.log('Redis Client Error', err));
    await client.connect();
    let hosts = await client.get('hosts');
    let masterHosts = await client.get('masterHosts');
    hosts = JSON.parse(hosts);
    masterHosts = JSON.parse(masterHosts);
    if(!hosts) {
        hosts = [];
    }
    if(!masterHosts) {
        masterHosts = []
    }
    // console.log(masterHosts, 'masterHosts')
    for await (const host of masterHosts) {
        // console.log(host);
        try {
            // console.log(`${host}/info`);
            const x = await axios.get(`${host}/info`)
            console.log(x.data);
            if(hosts.indexOf(host) < 0) {
                hosts.push(host)
                console.log('Server Added in hosts');
            }
        } catch (err) {
            console.error(err.message);
            removeItemFromArray(hosts, host);
        }
      }
      await client.set('hosts', JSON.stringify(hosts));
      await client.set('masterHosts', JSON.stringify(masterHosts));
}

app.listen(port, () => {
    console.log('Server Listening on ', port);
    setInterval(monitorApplicationServers, 3000)
})

function arrayRotate(arr) {
    arr.push(arr.shift());
    return arr;
}

function removeItemFromArray(arr, value) {
    var index = arr.indexOf(value);
    if (index > -1) {
      arr.splice(index, 1);
    }
    return arr;
  }