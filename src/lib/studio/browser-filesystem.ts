/** LangSmith's optional sandbox export imports Node FS even in its browser
 * entry. This studio never exposes sandbox/file tools; fail explicitly if a
 * future feature accidentally attempts one instead of emulating a filesystem. */
function unavailable(): never {
	throw new Error('Local filesystem access is unavailable in this static browser application.');
}
export const lstat = unavailable;
export const stat = unavailable;
export const readdir = unavailable;
export const readlink = unavailable;
export const readFile = unavailable;
