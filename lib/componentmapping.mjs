/**
 * get the file mapping defined in /components.mjs
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import process                        from "process";
import path                           from "path";
import { exploreModule, rootMapping } from "./fsutils.mjs";
import { forEach }                    from "./bootutils.mjs";

export default async (pwww) => {
    let c = {};
    try {
        let cd  = (await import('../components.mjs')).default;
        let cwd = process.cwd();

        if (pwww) {
            const root = pwww.startsWith('/') ? pwww : path.normalize(path.join(cwd, pwww));
            let entries = await exploreModule(root);
            // module = module === 'www' ? module : `/${module}`;
            if (entries) Object.assign(c, { 'www': { fs: root, entries } });
        }

        await forEach(Object.entries(cd), async ([module, root]) => {
            if (module === 'www' && !!pwww) return;
            root = root.trim();
            if (!root.startsWith('/')) root = path.normalize(path.join(cwd, root));     // resolve relative directories
            let entries = await exploreModule(root);
            // module = module === 'www' ? module : `/${module}`;
            if (entries) Object.assign(c, { [module]: { fs: root, entries } });
        });
        if (!c.www) {
            let entries = await exploreModule(cwd);
            Object.assign(c, { 'www': { fs: cwd, entries } });
        }
    } catch (ignore) {
        console.log(ignore);
    }
    return c;
}
