/**
 * Mapps defined directories to a
 * websocket webservice for read/write
 *
 * Provides only files and directories, no block devices or other other file objects
 *
 * Handles following commands:
 *  - get       ... get information about the file object for the given path
 *  - read      ... get file content
 *  - readDir   ... get file entries

 *  Not implemented:
 *  - observe   ... get information about changes
 *  - write     ... write a file
 *  - mkdir     ... create a directory
 *  - rmdir     ... remove a directory
 *
 * todo [OPEN]:
 *  - add 'mime type' to head/get response
 *  - use ReadStream instead of sending chunks manually
 *  - propagate fs changes
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import process from 'process';
import fs      from 'fs/promises';
import path    from 'path';

import t͛       from './thoregonmapping.mjs';
import c       from './componentmapping.mjs';

export default class FsMapper {

    constructor(root) {
        this.root    = root;
        this.onReady = () => {};        // set this handler to handle ready file mapping
        this.wwwroot = process.cwd();   // default: use current working diectory
    }

    async getThoregonMapping() {
        if (!this.t͛) this.t͛ = await t͛();
        return this.t͛;
    }

    async getComponentMapping() {
        if (!this.c) this.c = await c();
        return this.c;
    }

    /*
     * build the root structure
     *  name : { dir: '', entries*: [] }
     */
    async explore() {
        if (this.mapping) return;
        let t͛ = await this.getThoregonMapping();
        let { www, ...c } = await this.getComponentMapping();

        if (www) {     // get another root for static files
            this.wwwroot = www.fs;
            this.root = www;
        }
        // build a mapping with 1) static file objects, 2) thoregon modules, 3) dev modules
        this.mapping = { ...t͛, ...c };     // yes, for testing thoregon modules can be overridden

        try {
            this.onReady();
        } catch (e) {
            console.log("Error in 'onReady' handler: ", e);
        }
    }

    async process(req) {
        if (!req) return { error: 400, message: `no request. use: 'head', 'get'` };
        if (!req.cmd) return { error: 400, message: `no command. use: 'head', 'get'` };
        try {
            switch (req.cmd) {
                case 'head':    // get state info only
                    return await this.head(req);
                case 'get':     // get fileobject with content (dir entries in case of an directory)
                    return await this.get(req);
                case 'subscribe':     // get fileobject with content (dir entries in case of an directory)
                    return await this.subscribe(req);
                default :
                    return { error: 400, message: `unknown command '$req.command'. use: 'head', 'get'` };
            }
        } catch (e) {
            return { error: 404, message: `path '${req.path}' - error: ${e.message}`};
        }
    }

    crawl(cwd, parts) {
        if (parts.length === 0) throw 'not found';
        let first = parts.shift();
        let cur = cwd[parts[0]];
        return (parts.length === 0) ? cur : this.crawl(cur, parts);
    }

    find(p) {
        let parts = p.split(path.sep);
        if (p.startsWith('/')) parts.shift();   // remove the empty part
        if (parts.length === 0) throw 'not found';
        let first = parts.shift();
        let fs;
        let entry = this.mapping[first];
        if (!entry) {
            entry = this.root.entries[first];
            if (!entry) throw 'not found';
            fs = this.root.fs;
        } else {
            fs = rootentry.fs;
        }
        if (parts.length > 0) entry = this.crawl(entry, parts);
        return { fs, path: p, entry };
    }

    async subscribe(req) {
        // todo: listen to modifications
        return this.get(req);
    }

    async get(req) {
        let entry    = this.find(req.path);
        const fspath = path.join(entry.fs, req.path);
        let stat     = await fs.stat(fspath);
        let res      = this.buildResStat(stat, entry);
        if (stat.isDirectory()) res.entries = Object.keys(entry.entry);
        if (stat.isFile()) {
            if (Number.isInteger(req.start) && Number.isInteger(req.length)) {
                let { done, content, bytesRead } = await this.getFileChunk(fspath, req.start, req.length)
                if (bytesRead < req.length) content = content.slice(0, bytesRead);
                res.content           = content.toString('base64');   // get content BASE64 when binary
                res.done              = done;
            } else {
                let content = await fs.readFile(fspath);    // todo: send chunks [start, length]
                res.content = content.toString('base64');   // get content BASE64 when binary
                res.done    = true;
            }
        }
        return res;
    }

    // todo [OPEN]: enable read streams (streaming)
    //  - service:
    //       - send chunks [start, length]
    //  - client:
    //      - see js-ipfs/examples/browser-service-worker/util.js -> toReadableStream
    //      - use async generator function
    //
    // todo [OPEN]: enable directory content as stream
    //  - send entries [from, count]
    async getFileChunk(fspath, start, length) {
        // implement stateless
        // req.start - req.length -> chunk begin and and chunk size, controlled by the client
        // if omitted, the entire content is sent
        // console.log('chunk', start, length, fspath);
        // todo: reuse filehandles and buffers for performance
        let buf           = Buffer.alloc(length);
        let filehandle    = await fs.open(fspath, 'r');
        let { bytesRead } = await filehandle.read(buf, 0, length, start);
        filehandle.close();
        return { done: bytesRead < length, content: buf, bytesRead };
    }


    async head(req) {
        let entry    = this.find(req.path);
        const fspath = path.join(entry.fs, req.path);
        let stat     = await fs.stat(fspath);
        let res      = this.buildResStat(stat, entry);
        return res;
    }

    buildResStat(stat, entry) {
        let d   = new Date();
        let res = {
            path     : entry.path,
            name     : entry.name,
            type     : stat.isDirectory() ? 'dir' : 'file',
            birthtime: stat.birthtime,
            ctime    : stat.ctime,
            mtime    : stat.mtime,
            atime    : stat.atime
        }
        return res;
    }
}
