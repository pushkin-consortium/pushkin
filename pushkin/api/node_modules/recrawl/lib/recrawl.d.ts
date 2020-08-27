import { Crawler, RecrawlOptions } from './types';
/** Create a crawl function, and crawl the given root immediately */
export declare const crawl: (root: string, opts?: {
    only?: string[] | undefined;
    skip?: string[] | undefined;
    deep?: boolean | undefined;
    depth?: number | undefined;
    enter?: import("./types").DirFilter | undefined;
    filter?: import("./types").FileFilter | undefined;
    follow?: number | boolean | import("./types").LinkFilter | undefined;
    adapter?: import("./fs").FileAdapter | undefined;
}) => Promise<string[]>;
/** Create a crawl function */
export declare function recrawl<T extends RecrawlOptions>(opts?: T): Crawler<T>;
/** Provide the `name` argument to avoid unnecessary `path.basename` calls */
export declare type GlobMatcher = (file: string, name?: string) => boolean;
/**
 * Compile a single Recrawl glob string into its "RegExp pattern" equivalent.
 *
 * Note: This is only useful for globs with "/" or "**" in them.
 */
export declare function compileGlob(glob: string, mapGlob?: (glob: string) => string): string;
/**
 * Create a function that tests against an array of Recrawl glob strings by
 * compiling them into RegExp objects.
 */
export declare function createMatcher(globs: string[] | undefined, mapGlob?: (glob: string) => string): GlobMatcher | null;
