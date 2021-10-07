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

import t͛          from './thoregonmapping.mjs';
import c           from './componentmapping.mjs';

let fsstat      = async (path) => { try { return await fs.stat(path) } catch (e) {} };
let isDirectory = async (path) => { let stat = await fsstat(path); return stat ? stat.isDirectory() : false };
let isFile      = async (path) => { let stat = await fsstat(path); return stat ? stat.isFile() : false };
let fsExists    = async (path) => !!(await fsstat(path));

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
            if (req.path === '/') req.path = '/thoregon.html';
            switch (req.cmd) {
                case 'head':    // get state info only
                    return await this.head(req);
                case 'get':     // get fileobject with content (dir entries in case of an directory)
                    return await this.get(req);
                case 'subscribe':     // get fileobject with content (dir entries in case of an directory)
                    return await this.subscribe(req);
                case 'unsubscribe':     // get fileobject with content (dir entries in case of an directory)
                    return await this.unsubscribe(req);
                default :
                    return { error: 400, message: `unknown command '$req.command'. use: 'head', 'get'` };
            }
        } catch (e) {
            console.log("$$ fsmapper error", e.message);
            return { error: 404, message: `path '${req.path}' - error: ${e.message}`};
        }
    }

    crawl(cwd, parts) {
        if (parts.length === 0) throw Error(`not found: crawl`);
        let first = parts.shift();
        let cur = cwd[first];
        return (parts.length === 0) ? cur : this.crawl(cur, parts);
    }

    findFS(p) {
        let parts = p.split(path.sep);
        if (p.startsWith('/')) parts.shift();   // remove the empty part
        if (parts.length === 0) throw Error(`no file reference`);
        let first = parts.shift();
        let fs;
        let entry = this.mapping[first];
        if (!entry) {
            entry = this.root.entries.hasOwnProperty(first);
            if (!entry) throw Error(`not found: '${p}'`);
            fs = this.root.fs;
        } else {
            fs = entry.fs;
            entry = entry.entries;
        }
        // if (parts.length > 0) entry = this.crawl(entry, parts);
        return { fs, path: p, entry };
    }

    find(p) {
        let parts = p.split(path.sep);
        if (p.startsWith('/')) parts.shift();   // remove the empty part
        if (parts.length === 0) throw Error(`not found: '${p}'`);
        let first = parts.shift();
        let fs;
        let entry = this.mapping[first];
        if (!entry) {
            entry = this.root.entries[first];
            if (!entry) throw Error(`not found: '${p}'`);
            fs = this.root.fs;
        } else {
            fs = entry.fs;
            entry = entry.entries;
        }
        if (parts.length > 0) entry = this.crawl(entry, parts);
        return { fs, path: p, entry };
    }

    async subscribe(req) {
        // todo: listen to modifications
        return this.get(req);
    }

    async unsubscribe(req) {
    }

    async get(req) {
        let entry   = this.findFS(req.path);
        let reqpath = req.path;
        let fspath  = path.join(entry.fs, reqpath);
        // todo [REFACTOR]: extract exception in own method
        if (fspath.endsWith('index.mjs')) {
            let test = fspath.substring(0, fspath.length-9)+'index.reliant.mjs';
            // let teststat = await fsstat(test);
            if (await fsExists(test)) {
                fspath  = test;
                reqpath = reqpath.substring(0, reqpath.length-9)+'index.reliant.mjs';
            }
        }
        let stat = await fs.stat(fspath);
        let res  = this.buildResStatFS(stat, reqpath);
        if (stat.isDirectory()) res.entries = Object.keys(entry.entry);
        if (stat.isFile()) {
/*
            res.size = stat.size;
            if (Number.isInteger(req.start) && Number.isInteger(req.length)) {
                let { done, content, bytesRead } = await this.getFileChunk(fspath, req.start, req.length)
                if (bytesRead < req.length) content = content.slice(0, bytesRead);
                res.content           = content.toJSON();   // get content BASE64 when binary
                res.done              = done;
            } else {
*/
                let content = await fs.readFile(fspath);    // todo: send chunks [start, length]
                res.content = content.toJSON();   // get content BASE64 when binary
                res.done    = true;
            //}
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
        let buf           = Buffer.alloc(length+1);
        let filehandle    = await fs.open(fspath, 'r');
        let { bytesRead } = await filehandle.read(buf, 0, length, start);
        filehandle.close();
        return { done: bytesRead <= length, content: buf, bytesRead };
    }

    async head(req, crawl = false) {
        let rpath = req.path;
        if (rpath.endsWith('!')) {
            rpath = rpath.slice(0,-1);
            crawl = true;
        }
        let entry    = this.findFS(rpath);
        const fspath = path.join(entry.fs, rpath);
        let stat     = await fs.stat(fspath);
        let res      = this.buildResStatFS(stat, rpath);
        if (res.type === 'dir') {
            // check if there is an index.mjs or an index.reliant.mjs
            let dir = path.dirname(rpath);
            if (dir === '/' || dir === '.') res.hasindex = isFile(path.join(fspath, 'index.mjs')) || isFile(path.join(fspath, 'index.reliant.mjs'));
            const entries = res.entries = await this.dirEntries(fspath);
            if (crawl) await this.crawl(res);
        }
        return res;
    }

    async crawl(res) {
        const rpath = res.path;
        const dirs = {};
        const entries = res.entries;
        for await (let entry of entries) {
            const eres = await this.head({ path: rpath + '/' + entry }, true);
            if (eres.type === 'dir') {
                dirs[entry] = eres;
            }
        }
        for (let i in entries) {
            let entry = entries[i];
            if (dirs[entry]) entries[i] = dirs[entry];
        }
    }

    buildResStatFS(stat, reqpath) {
        let d     = new Date();
        let parts = reqpath.split('/');
        let isDir = stat.isDirectory() ? 'dir' : 'file';
        let res   = {
            path     : reqpath,
            name     : parts[parts.length-1],
            type     : isDir,
            birthtime: stat.birthtime,
            ctime    : stat.ctime,
            mtime    : stat.mtime,
            atime    : stat.atime,
            size     : stat.size,
        }
        return res;
    }

    async dirEntries(fspath) {
        return await fs.readdir(fspath);
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
