const { pack } = require("rust-atlas-generator-wasm");
const { promises: fs } = require("fs");
const path = require("path");

/** @type {(args: { sourceDir: string, targetDir: string, width: number, height: number }) => { apply: (compiler: import("webpack").Compiler) => void }} */
const plugin = ({ sourceDir, targetDir, width, height }) => {
  /** @type {string[]} */
  let files = [];

  /** @param {string[]} files */
  async function rebuild(files) {
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

    const jsonPromise = fs.writeFile(targetDir + "/atlas_atlas.json", json);
    const pngPromise = fs.writeFile(targetDir + "/atlas.png", new Uint8Array(png));
    await Promise.all([jsonPromise, pngPromise]);
  }

  return {
    /** @type {(compiler: import("webpack").Compiler) => void} */
    apply: (compiler) => {
      const PLUGIN_NAME = "RustAtlasGeneratorWebpackPlugin";

      const listFiles = async () =>
        (await fs.readdir(sourceDir)).map((file) => path.resolve(path.join(sourceDir, file)));

      compiler.hooks.beforeRun.tapPromise(PLUGIN_NAME, async (compilation) => {
        const files = await listFiles();
        await rebuild(files);
      });

      let firstRun = true;
      let lastFiles = [];
      compiler.hooks.watchRun.tapPromise(PLUGIN_NAME, async (compilation) => {
        const files = await listFiles();

        if (firstRun) {
          firstRun = false;
          lastFiles = files;
          await rebuild(files);
        }
        // yes i know these two branches could be merged
        // no i'm not because the code is easier to read
        else if (!arrContentEq(files, lastFiles)) {
          lastFiles = files;
          await rebuild(files);
        }
      });
    },
  };
};

/** @template T @param {T[]} a @param {T[]} b */
function arrContentEq(a, b) {
  for (const x of a) {
    if (b.indexOf(x) < 0) return false;
  }
  return true;
}

module.exports = plugin;
