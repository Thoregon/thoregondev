/**
 * Mapping for URL's to thoregon components
 *
 * todo [OPEN]: watch filesystem an propagate changes
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import process from "process";
import fs      from 'fs/promises';
import path    from "path";

import { forEach }                                         from './bootutils.mjs';
import { exploreModule, isFile, rootMapping } from "./fsutils.mjs";

const thoregonRoot = async () => (process.env.THOREGON_ROOT ? process.env.THOREGON_ROOT : await isFile('./.thoregonroot')) ? (await fs.readFile('./.thoregonroot')).toString().trim() : process.cwd();

// todo: make evolux, thoregon and terra, abishadia modulepath definable

const THOREGONPREFIX    = '/thoregon.';
const EVOLUXPREFIX      = '/evolux.';
const TERRAPREFIX       = '/terra.';

const THOREGONBASE      = `${THOREGONPREFIX}modules`;
const EVOLUXBASE        = `${EVOLUXPREFIX}modules`;
const TERRABASE         = `${TERRAPREFIX}modules`;

const THOREGONMODULE    = THOREGONBASE.substr(1);
const EVOLUXMODULE      = EVOLUXBASE.substr(1);
const TERRAMODULE       = TERRABASE.substr(1);

const t͛ = async () => {
// const THOREGON_PREFIXES = ['/tr/', '/T/', '/t͛/', '/T͛/', '/thoregon/'];
    let  ROOTPATH           = await thoregonRoot();
    if (!ROOTPATH.startsWith('/')) ROOTPATH = path.join(process.cwd(), ROOTPATH);
    const EVOLUXPATH        = path.join(ROOTPATH, EVOLUXBASE);
    const THOREGONPATH      = path.join(ROOTPATH, THOREGONBASE);
    const TERRAPATH         = path.join(ROOTPATH, TERRABASE);

    let c = {};
    //const root = await thoregonRoot();

    let evolux = await exploreModule(EVOLUXPATH, 'evolux.');
    if (evolux) Object.assign(c, rootMapping(evolux, EVOLUXPATH));

    let thoregon = await exploreModule(THOREGONPATH, 'thoregon.');
    if (thoregon) Object.assign(c, rootMapping(thoregon, THOREGONPATH));

    let terra = await exploreModule(TERRAPATH, 'terra.');
    if (terra) Object.assign(c, rootMapping(terra, TERRAPATH));

    return c;
};

export default t͛;
