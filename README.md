# rust-atlas-generator

This is a tool written in Rust, compiled to Wasm, and that will take a bunch of tiles and compile them into the designated
file format. My use case was _specifically_ for [Smiley Face Game](https://github.com/SirJosh3917/smiley-face-game), and
as such, it's highly tailored to my needs. However, I'm open to suggestions for any feature that you may need.

## How it works

There are two packages:

- `rust-atlas-generator-wasm`

  This is the result from `wasm-pack`. This can be wrapped around in with other packages to suite your needs.

- `rust-atlas-generator-webpack-plugin`

  This is a webpack plugin, which will automatically run the atlas generator according to the configuration.
  This is used in [Smiley Face Game](https://github.com/SirJosh3917/smiley-face-game) to compile individual block assets
  into an atlas.
