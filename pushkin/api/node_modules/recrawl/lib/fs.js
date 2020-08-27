Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
exports.localFs = {
    readdir: async (name) => fs.readdirSync(name),
    readlink: async (name) => fs.readlinkSync(name),
    lstat: async (name) => fs.lstatSync(name),
    stat: async (name) => fs.statSync(name),
};
