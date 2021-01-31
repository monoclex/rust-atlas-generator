// TODO: documentation

const { pack } = require("rust-atlas-generator-wasm");
const fs = require("fs/promises");
const path = require("path");

/**
 * @typedef RollupRustAtlasGeneratorOptions
 * @property {string} sourceDir
 * @property {string} targetDir
 * @property {number} width
 * @property {number} height
 * @property {string} [atlasJsonName]
 * @property {string} [atlasPngName]
 */

/**
 * @param {RollupRustAtlasGeneratorOptions} options
 * @returns {import("rollup").Plugin}
 */
module.exports = function rustAtlasGenerator(options) {
	if (!options.sourceDir) throw new Error("options.sourceDir not specified (falsy)");
	if (!options.targetDir) throw new Error("options.targetDir not specified (falsy)");
	if (!options.width) throw new Error("options.width not specified (falsy)");
	if (!options.height) throw new Error("options.height not specified (falsy)");
	if (!options.atlasJsonName) options.atlasJsonName = "atlas_atlas.json";
	if (!options.atlasPngName) options.atlasPngName = "atlas.png";

	const { sourceDir, targetDir, width, height, atlasJsonName, atlasPngName } = options;

	return {
		name: "rustAtlasGenerator",
		async buildStart() {
			const fileNames = await fs.readdir(sourceDir);
			const filePaths = fileNames.map((relativeFilePath) => path.resolve(sourceDir, relativeFilePath));
			const fileContents = await Promise.all(filePaths.map((filePath) => fs.readFile(filePath)));
			const files = fileNames.map((name, idx) => ({ name, contents: fileContents[idx] }));

			const { json, png } = pack({
				width,
				height,
				tiles: files.map(({ name, contents }) => ({
					name,
					image: [...contents],
				})),
			});

			const jsonPath = path.resolve(targetDir, atlasJsonName);
			const pngPath = path.resolve(targetDir, atlasPngName);

			const writeJsonPromise = fs.writeFile(jsonPath, json);
			const writePngPromise = fs.writeFile(pngPath, new Uint8Array(png));

			await Promise.all(writeJsonPromise, writePngPromise);
		}
	};
};
