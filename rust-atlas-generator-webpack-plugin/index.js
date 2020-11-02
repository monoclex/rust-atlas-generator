const { pack } = require("rust-atlas-generator-wasm");
const PrebuildWebpackPlugin = require("prebuild-webpack-plugin");
const { promises: fs } = require("fs");
const path = require("path");

/** @type {(args: { sourceDir: string, targetDir: string, width: number, height: number }) => PrebuildWebpackPlugin} */
const plugin = ({ sourceDir, targetDir, width, height }) => {
  /** @type {string[]} */
  let files = [];

  /** @param {string[]} files */
  async function rebuild(files, out) {
    /** @type {[string, Buffer][]} */
    let buffers = [];

    /** @type {[string, Promise<Buffer>][]} */
    const promises = files.map((file) => [file, fs.readFile(file)]);
    for (const [file, promise] of promises) {
      buffers.push([path.basename(file, path.extname(file)), await promise]);
    }

    /** @type {{ json: string, png: number[] }} */
    const { json, png } = pack({
      width,
      height,
      tiles: buffers.map(([name, buffer]) => ({ name, image: [...buffer] })),
    });

    const jsonPromise = fs.writeFile(out + "/atlas_atlas.json", json);
    const pngPromise = fs.writeFile(out + "/atlas.png", new Uint8Array(png));
    await Promise.all([jsonPromise, pngPromise]);
  }

  return new PrebuildWebpackPlugin({
    /** @type {(compiler: import("webpack").Compiler, compilation: import("webpack").compilation.Compilation, matchedFiles: string[]) => Promise<void>} */
    build: async (compiler, compilation, matchedFiles) => {
      files = matchedFiles;
      await rebuild(files, targetDir);
    },
    /** @type {(compiler: import("webpack").Compiler, compilation: import("webpack").compilation.Compilation, changedFiles: string[]) => Promise<void>} */
    //@ts-ignore
    watch: async (compiler, compilation, changedFiles) => {
      // sanity checking this callback because i don't nkow what type it is, there's no ts defs
      if (!Array.isArray(changedFiles)) {
        if (typeof changedFiles !== "string") throw new Error("don't know what to do");
        changedFiles = [changedFiles];
      }

      for (const file of changedFiles) {
        if (files.indexOf(file) >= 0) continue;
        files.push(file);
      }

      await rebuild(files, targetDir);
    },
    files: { pattern: sourceDir + "/*.png", options: {}, addFilesAsDependencies: false },
    compilationNameFilter: undefined,
  });
};

module.exports = plugin;
