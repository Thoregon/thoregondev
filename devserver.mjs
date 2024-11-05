/**
 * a simple dev server for thoregon apps
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import express          from 'express';
import cors             from 'cors';
import path             from "path";
import { createServer } from 'http';
import FsMapper         from "./lib/fsmapper.mjs";
import { program }      from 'commander';

// @see: https://github.com/tj/commander.js
program.version('0.1.0');

const debuglog = (...args) => {}; // console.log("DevServer ::", Date.now, ...args);

const envlocation = path.join(process.cwd(), '../env/etcui');

class DevServer {

    start(www, port, etc) {
        (async () => {
            this._port       = port ?? 7777;
            this._etc        = etc;
            this._fs         = new FsMapper(process.cwd());
            this._fs.onReady = () => this.establishServer();
            await this._fs.explore(www);
        })();
    }

    establishServer() {
        const port   = this._port;
        const etc    = this._etc;
        const wwroot = this._fs.wwwroot;
        const app    = express();
        app.use(cors({ origin: '*' }));

        app.use(express.static(wwroot || './', { index: 'thoregon.html' }));
        const dirs = this._fs.getRootDirs();
        dirs.forEach((entry) => app.use('/' + entry.name, express.static(entry.path, { index: ['index.reliant.mjs', 'index.mjs'] })));
        app.use((req, res, next) => {
            const url = req.url;
            if (url?.endsWith("!") || url?.endsWith(".ls")) return this._fs.crawlReq(req, res);
            this._fs.sendIndex(url, res, next);
        });
        if (etc) {
            // rewrite config if specified
            const etclocation = path.join(envlocation, etc.startsWith('/') ? etc.substring(1) : etc);
            // const etcstatic = express.static(etclocation)
            app.get('/etc/*', (req, res, next) => {
                let url = req.url.substring(5);
                if (url.endsWith('/')) url = url.slice(0, -1);
                //url = path.join(etclocation, url);
                var options = {
                    root: etclocation,
                    dotfiles: 'deny',
                    headers: {
                        'x-timestamp': Date.now(),
                        'x-sent': true
                    }
                }
                res.sendFile(url, options, (err) => {
                    if (err) {
                        console.error(err);
                        next();
                    }
                });
                // next();
            });
        }
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

program
    // .command('thoregon [file]')
    .argument('[www]', 'www (static) directory')
    .description("run devserver")
    .option("-p, --port <port>", "port to use", 7777)      // "kind of package, one of ['browser', 'node', 'electron']"
    .option("-e, --etc <etc>", "config dir to use", )
    .action(async (www, options) => {
        const { port, etc } = options;
        const server = new DevServer();
        global.devserver = server;      // make it available for debugging
        server.start(www, port, etc);
    });

program.parse(process.argv);

