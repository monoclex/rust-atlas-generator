import type { PrebuildWebpackPlugin } from "prebuild-webpack-plugin";
export type AtlasArgs = { sourceDir: string, targetDir: string, width: number, height: number };
export default function atlas(args: AtlasArgs): PrebuildWebpackPlugin;
