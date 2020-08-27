import { FileAdapter } from './fs';
export declare type DirFilter = (dir: string, depth: number) => boolean;
export declare type FileFilter = (file: string, name: string) => boolean;
export declare type LinkFilter = (link: string, depth: number) => boolean;
export declare type RecrawlOptions = Options;
declare type Options = {
    only?: string[];
    skip?: string[];
    deep?: boolean;
    depth?: number;
    enter?: DirFilter;
    filter?: FileFilter;
    follow?: boolean | number | LinkFilter;
    adapter?: FileAdapter;
};
export declare type EachArg = (file: string, link: string | null) => void;
export declare type FilesArg = FileMap | string[];
export declare type FileMap = {
    [name: string]: string | boolean;
};
export interface Crawler<T extends Options> {
    (root: string): Promise<T['follow'] extends true | LinkFilter ? FileMap : string[]>;
    (root: string, each: EachArg): Promise<void>;
    <T extends FilesArg>(root: string, files: T): Promise<T>;
}
export {};
