import * as fs from 'fs'
import { ErrorCode } from './errno'

declare const saxon: {
  /** Get the stats of a file */
  stat(name: string): fs.Stats
  /** Read an entire file into memory */
  read(name: string): string
  read(name: string, enc: null): Buffer
  read(name: string, enc: string): any
  /** Read and parse a .json file */
  readJson(name: string): any
  /** Get the array of filenames in a directory */
  list(name: string): string[]
  /** Resolve a symlink */
  follow(name: string, recursive?: boolean): string
  exists(name: string): boolean
  isFile(name: string): boolean
  isDir(name: string): boolean
  /** Return true if given name is a symlink */
  isLink(name: string): boolean
  /** Create a file or update its mtime */
  touch(name: string): void
  /** Change the permissions of a file */
  chmod(name: string, mode: number|string): void
  /** Create a symlink */
  link(name: string, target: string): void
  /** Create or update a file */
  write(name: string, content: string | Buffer): Promise<void>
  /** Create a directory */
  mkdir(name: string): void
  /** Rename a path */
  rename(src: string, dest: string): void
  /** Destroy a path */
  remove(name: string, recursive?: boolean): void
} & ErrorCode
export = saxon
