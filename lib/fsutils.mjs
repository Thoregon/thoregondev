/**
 *  filesystem utils
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import fs          from 'fs/promises';
import path        from "path";
import { forEach } from "./bootutils.mjs";

let fsstat = async (path) => { try { return await fs.stat(path) } catch (e) {} };
export const isDirectory = async (path) => {
    let stat = await fsstat(path);
    return stat ? stat.isDirectory() : false
};
export const isFile = async (path) => {
    let stat = await fsstat(path);
    return stat ? stat.isFile() : false
};
export const fsinclude = async (path) => {
    let stat = await fsstat(path);
    return stat ? stat.isFile() || stat.isDirectory() : false
};

const exclude = ['.git', 'node_modules', '.DS_Store'];

const include = (entry, prefix) => !exclude.includes(entry) && (!prefix || entry.startsWith(prefix));

export const exploreModule = async (dir, prefix) => {
    if (!await isDirectory(dir)) return;
    let modules = {};
    let entries = await fs.readdir(dir);
    await forEach(entries, async (entry) => {
        const entrypath = path.join(dir, entry);
        if (include(entry, prefix) && fsinclude(entrypath)) modules[entry] = await exploreModule(entrypath);
    });

    return modules;
}

export const rootMapping = (roots, fsroot) => {
    let mapping = {};
    Object.entries(roots).forEach(([name, entries]) => {
        mapping[name] = { fs: fsroot/* path.join(fsroot, name) */, entries };
    })
    return mapping;
}
