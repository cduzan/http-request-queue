// DEPENDENCIES
const https = require('https');

var lpQueue = [];
var hpQueue = [];
var requestRunning = false;
var requestQueueCount = 0;
var requestRanCount = 0;
const queueRequest = (options,callback,highPriority=false) => {
    requestQueueCount++;
    if (!requestRunning) {
        requestRunning = true;
        runRequest(options,callback);
    }
    else {
        if (highPriority) {
            hpQueue.push({
                options:options,
                callback:callback
            });
            console.log('High priority request queued: ' + JSON.stringify(options));
        }
        else {
            lpQueue.push({
                options:options,
                callback:callback
            });
            console.log('Request queued: ' + JSON.stringify(options));
        }
    }
};

const runRequest = (options,callback) => {
    requestRanCount++;
    console.log('Running request: ' + JSON.stringify(options));
    const req = https.request(options, res => {
        var dataChunks = [];
        res.on('data', chunk => {
            if (chunk) {
                console.log("request data received: " + chunk.toString());
                dataChunks.push(chunk);
            }
        });
        res.on('end', () => {            
            // Piece data together
            var data = JSON.parse(Buffer.concat(dataChunks).toString());
            callback({ok:true,data:data});
            getNextRequest();
        });
        res.on('error', (e) => {
            callback({ok:false,reason:"res.on('error') during request: " + JSON.stringify(options) + "\nError: " + JSON.stringify(e)});
            getNextRequest();
        });
    });

    req.on('error', e => {
        callback({ok:false,reason:"req.on('error') during request: " + JSON.stringify(options) + "\nError: " + JSON.stringify(e)});
        getNextRequest();
    });

    req.end();
};

const getNextRequest = () => {
    if (hpQueue.length > 0) {
        var req = hpQueue.shift();
        console.log('Retrieving next request: ' + JSON.stringify(req.options));
        runRequest(req.options, req.callback);
    }
    else if (lpQueue.length > 0) {
        var req = lpQueue.shift();
        console.log('Retrieving next request: ' + JSON.stringify(req.options));
        runRequest(req.options, req.callback);
    }
    else {
        console.log('Request queue completed', 'INFO');
        console.log('Request count: ' + requestRanCount + '/' + requestQueueCount);
        requestRunning = false;
    }
};

module.exports = queueRequest;