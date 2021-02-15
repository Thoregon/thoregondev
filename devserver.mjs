/**
 * a simple dev server for thoregon apps
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import express          from 'express';
import { createServer } from 'http';
import WebSocket        from 'ws';
import FsMapper         from "./lib/fsmapper.mjs";

const port = 7777;

class DevServer {

    start() {
        (async () => {
            this._fs = new FsMapper(process.cwd());
            this._fs.onReady = () => this.establishWebsocketServer();
            await this._fs.explore();
        })();
    }

    establishWebsocketServer() {
        const wwroot = this._fs.wwwroot;
        const app = express();
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
    listening() {}
    quit() {}
    error(err) {}
    headers(headers, req) {}
    upgrade(request, socket, head) {}

    async message(message, ws) {
        let req = JSON.parse(message);
        let res = await this.fs.process(req);
        res.id = req.id;
        ws.send(JSON.stringify(res));
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

new DevServer().start();
