import * as fs from 'fs'
import { ErrorCode } from './errno'

type ReaderOptions = {
  flags?: string;
  encoding?: string;
  fd?: number;
  mode?: number;
  autoClose?: boolean;
  start?: number;
  end?: number;
  highWaterMark?: number;
}

type WriterOptions = {
  flags?: string;
  encoding?: string;
  fd?: number;
  mode?: number;
  autoClose?: boolean;
  start?: number;
}

declare const saxon: {
  stat(name: string): Promise<fs.Stats>
  read(name: string, enc?: 'utf8'): Promise<string>
  read(name: string, enc: null): Promise<Buffer>
  read(name: string, enc: string): Promise<any>
  reader(name: string, opts?: ReaderOptions): fs.ReadStream
  follow(name: string, recursive?: boolean): Promise<string>
  isFile(name: string): Promise<boolean>
  isDir(name: string): Promise<boolean>
  mkdir(name: string): Promise<void>
  write(name: string, content: string|Buffer): Promise<void>
  writer(name: string, opts?: WriterOptions): fs.WriteStream
} & ErrorCode
export = saxon
