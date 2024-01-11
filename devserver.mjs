/**
 * a simple dev server for thoregon apps
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import express          from 'express';
import cors             from 'cors';
import { createServer } from 'http';
import WebSocket        from 'ws';
import FsMapper         from "./lib/fsmapper.mjs";

let port = 7777;

const debuglog = (...args) => {}; // console.log("DevServer ::", Date.now, ...args);

class DevServer {

    start(www) {
        (async () => {
            this._fs = new FsMapper(process.cwd());
            this._fs.onReady = () => this.establishWebsocketServer();
            await this._fs.explore(www);
        })();
    }

    establishWebsocketServer() {
        const wwroot = this._fs.wwwroot;
        const app = express();
        app.use(cors({ origin: '*' }));
        app.use(express.static(wwroot || './'));
        const server = createServer(app);

        let options = {
            // port: port,
            clientTracking: true,
            perMessageDeflate: {
                zlibDeflateOptions: {
                    // See zlib defaults.
                    chunkSize: 1024,
                    memLevel: 7,
                    level: 3
                },
                zlibInflateOptions: {
                    chunkSize: 10 * 1024
                },
                // Other options settable:
                clientNoContextTakeover: true, // Defaults to negotiated value.
                serverNoContextTakeover: true, // Defaults to negotiated value.
                serverMaxWindowBits: 10, // Defaults to negotiated value.
                // Below options specified as default values.
                concurrencyLimit: 10, // Limits zlib concurrency for perf.
                threshold: 1024 // Size (in bytes) below which messages
                // should not be compressed.
            },
        };

        let wss  = new WebSocket.Server({ server, ...options });
        this.wss = wss;

        wss.on('connection', (ws, req)               => this.connect(ws, req));
        wss.on('close',      ()                      => this.close());
        wss.on('error',      (err)                   => this.error(err));
        wss.on('headers',    (headers, req)          => this.headers(headers, req));
        wss.on('upgrade',    (request, socket, head) => this.upgrade(request, socket, head));
        wss.on('listening',  ()                      => this.listening());

        server.listen(port, () => {
            console.log(`Thore͛gon Dev Server started: http://localhost:${port}/`);
        });
    }

    stop() {
        if (this.wss) {
            this.wss.close(() => {
                console.log(`Thore͛gon Dev Server stopped`);
            });
            delete this.wss;
        }
    }

    connect(ws, req) {
        ws.on('message', async (message) => this.message(message, ws));
        ws.on('close', () => this.close());
    }
    listening() {

    }
    quit() {
        debuglog("QUIT");
    }
    error(err) {
        debuglog("ERROR", err);
    }
    headers(headers, req) {}
    upgrade(request, socket, head) {
        debuglog("UPGRADE");
    }

    async message(message, ws) {
        try {
            debuglog("> handle message", message);
            let req = JSON.parse(message);
            let res = await this.fs.process(req);
            res.id  = req.id;
            debuglog("< handle message", message);
            ws.send(JSON.stringify(res));
        } catch (e) {
            debuglog("ERR handle message", e.stack ? e.stack : e.message);
        }
    }
    close() {}

    /*
     * file mappings
     */

    get fs() {
        // if (!this._fs) this._fs = new FsMapper(process.cwd());           // todo: config with directory mappings
        return this._fs;
    }
}

let www;
const argv = process.argv;
let i = argv.length-1;

if (argv[2] === '-p') {
    port = parseInt(argv[3]) ?? 7777;
    www = argv[i];
} else if (argv.length > 2) {
    www = argv[i];
}
const server = new DevServer();
global.devserver = server;      // make it available for debugging
server.start(www);
