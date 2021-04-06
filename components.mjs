/**
 * Just map components or parts to local directories/files
 * for development.
 *
 * Map URL path to local files or directories
 *
 * the entry 'www' maps to the static file content (docroot)
 *
 * other entries works like symlinks in the root directory: <link> -> <target>
 *
 * the default mapping for thoregon components @see ./lib/thoregoncomponents.mjs
 */

const thoregonroot = '/private/var/dev/Projects/ThoregonUniverse';
const thatsmeroot  = '/private/var/dev/Projects/b-coop/thatsme/thoregon/thatsme.modules';

export default {
    'www'         : `${thoregonroot}/Puls`,
    // 'ipfs.js'     : `${thoregonroot}/terra.modules/terra.ipfs/dist/ipfs.min.js`,
    // App Mappings
    'thatsme.app' : `${thatsmeroot}/thatsme.app`,
    'thatsme.chat': `${thatsmeroot}/thatsme.chat`,
}
