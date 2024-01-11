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
import FsMapper         from "./lib/fsmapper.mjs";

let port = 7777;

const debuglog = (...args) => {}; // console.log("DevServer ::", Date.now, ...args);

class DevServer {

    start(www) {
        (async () => {
            this._fs = new FsMapper(process.cwd());
            this._fs.onReady = () => this.establishServer();
            await this._fs.explore(www);
        })();
    }

    establishServer() {
        const wwroot = this._fs.wwwroot;
        const app = express();
        app.use(cors({ origin: '*' }));
        app.use(express.static(wwroot || './', {index: 'thoregon.html'}));
        const dirs = this._fs.getRootDirs();
        dirs.forEach((entry) => app.use('/'+entry.name, express.static(entry.path, { index: ['index.reliant.mjs', 'index.mjs'] })));
        app.use((req, res, next) => {
            const url = req.url;
            if (url?.endsWith("!")) return this._fs.crawlReq(req, res);
            this._fs.sendIndex(url, res, next);
        });

        app.listen(port, () => {
            console.log(`>> Dev Server listening on port ${port}`)
        })
    }
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
