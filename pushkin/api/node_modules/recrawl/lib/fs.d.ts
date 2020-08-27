/// <reference types="node" />
import * as fs from 'fs';
export interface FileAdapter {
    readdir(name: string): Promise<string[]>;
    readlink(name: string): Promise<string>;
    lstat(name: string): Promise<fs.Stats>;
    stat(name: string): Promise<fs.Stats>;
}
export declare const localFs: FileAdapter;
