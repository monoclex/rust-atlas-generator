use image::{ImageBuffer, ImageEncoder, RgbaImage};
use serde::{Deserialize, Serialize};
use std::io::Cursor;
use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

// parameter type (js object)
#[derive(Serialize, Deserialize)]
pub struct PackArgs {
    width: u32,
    height: u32,
    tiles: Vec<TileEntry>,
}

#[derive(Serialize, Deserialize)]
pub struct TileEntry {
    name: String,
    image: Vec<u8>,
}

// return type (js object)
#[derive(Serialize, Deserialize)]
pub struct PhaserAtlas {
    json: String,
    png: Vec<u8>,
}

/// @param {{ width: number, height: number, tiles: { name: string, image: number[] }[] }} args
/// @returns {{ json: string, png: number[] }}
/// */ /*
#[wasm_bindgen]
pub fn pack(args: &JsValue) -> JsValue {
    // == todo: clean this up ==

    let pack_args: PackArgs = JsValue::into_serde(args).expect("valid pack args");
    let (tile_width, tile_height, tiles) = (pack_args.width, pack_args.height, pack_args.tiles);

    // we're going to get the atlas as close to a square as possible
    // width and tiles represent how many tiles we should have
    let width = (tiles.len() as f64).sqrt().ceil() as u32;
    let height = (tiles.len() as f64 / width as f64).ceil() as u32;

    // for the image we generate, we do the same thing horizontally and vertically
    // [|   | . | x | . |]   | . | x | . |   |
    //    ^   ^   ^   ^   ^
    //    |   | tile  |   |
    //    |   extruded    |
    //  spacing       spacing
    //
    // the part surrounded in brackets is what repeats,
    // so we calculate that and multiply that by how many tiles we have
    //
    // then we add one to the end so that there's even spacing all around
    let img_width = (1 + 1 + tile_width + 1) * width + 1;
    let img_height = (1 + 1 + tile_height + 1) * height + 1;

    let mut img: RgbaImage = ImageBuffer::new(img_width, img_height);

    // now construct every tile by placing it into the image and building up the atlas json
    let mut atlas = AtlasJson { frames: Vec::new() };

    let mut x = 2;
    let mut y = 2;
    for entry in tiles {
        let (name, image) = (entry.name, entry.image);

        atlas.frames.push(Tile {
            filename: name,
            frame: Frame {
                w: tile_width,
                h: tile_height,
                x,
                y,
            },
            anchor: Anchor { x: 0.5, y: 0.5 },
        });

        // now copy the image to our destination
        let image = image::load(Cursor::new(image), image::ImageFormat::Png)
            .expect("image supplied to be a valid image")
            .to_rgba();
        image::imageops::overlay(&mut img, &image, x, y);

        let x_edge = tile_width - 1;
        let y_edge = tile_height - 1;

        // extrude out the image one in all directions

        // i want rust-analyzer to put these all on one line so help me god
        let t_w = tile_width;
        let t_h = tile_height;
        cropverlay(&mut img, &image, x, y - 1, 0, 0, tile_width, 1);
        cropverlay(&mut img, &image, x, y + t_h, 0, y_edge, tile_width, 1);
        cropverlay(&mut img, &image, x - 1, y, 0, 0, 1, tile_height);
        cropverlay(&mut img, &image, x + t_w, y, x_edge, 0, 1, tile_height);
        cropverlay(&mut img, &image, x - 1, y - 1, 0, 0, 1, 1);
        cropverlay(&mut img, &image, x + t_w, y - 1, x_edge, 0, 1, 1);
        cropverlay(&mut img, &image, x - 1, y + t_h, 0, y_edge, 1, 1);
        cropverlay(&mut img, &image, x + t_w, y + t_h, x_edge, y_edge, 1, 1);

        /// Crops and overlays
        fn cropverlay(
            bottom: &mut RgbaImage,
            top: &RgbaImage,
            bottom_x: u32,
            bottom_y: u32,
            crop_x: u32,
            crop_y: u32,
            crop_width: u32,
            crop_height: u32,
        ) {
            image::imageops::overlay(
                bottom,
                &image::imageops::crop_imm(top, crop_x, crop_y, crop_width, crop_height),
                bottom_x,
                bottom_y,
            );
        }

        image::imageops::overlay(
            &mut img,
            &image::imageops::crop_imm(&image, 0, 0, tile_width, 1),
            x,
            y - 1,
        );

        // [|   | . | x | . |]   | . | x | . |   |
        //          ^ -------------->^
        x += tile_width + 1 + 1 + 1;

        if x >= img_width {
            x = 2;
            y += tile_height + 1 + 1 + 1;
        }
    }

    let mut atlas_png = Vec::new();
    let img_buf = img.into_vec();

    image::png::PngEncoder::new(&mut atlas_png)
        .write_image(&img_buf, img_width, img_height, image::ColorType::Rgba8)
        .expect("to serialize the image");

    JsValue::from_serde(&PhaserAtlas {
        json: serde_json::to_string(&atlas).expect("serialize json"),
        png: atlas_png,
    })
    .expect("to serialize into a JsValue")
}

/// Describes a Phaser atlas.json file
///
/// All fields were synthesized from taking a generated asset from [this atlas packer](https://gammafp.com/tool/atlas-packer/)
#[derive(Serialize, Deserialize)]
struct AtlasJson {
    frames: Vec<Tile>,
}

#[derive(Serialize, Deserialize)]
struct Tile {
    filename: String,
    frame: Frame,
    anchor: Anchor,
}

#[derive(Serialize, Deserialize)]
struct Frame {
    w: u32,
    h: u32,
    x: u32,
    y: u32,
}

#[derive(Serialize, Deserialize)]
struct Anchor {
    x: f64,
    y: f64,
}
