#!/usr/bin/env python3
"""
Art Processing Script for 三国字阵
Processes JPG art assets with chroma keying, despill, edge feathering,
trimming, and resizing to output transparent PNG/WebP files.
"""

import os
import numpy as np
from PIL import Image
from pathlib import Path

INPUT_DIR = Path(__file__).parent.parent / "artpack" / "artpack"
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "assets"

MAGENTA_KEY = np.array([255, 0, 255])
GREEN_KEY = np.array([0, 255, 0])
BLACK_KEY = np.array([0, 0, 0])
WHITE_KEY = np.array([255, 255, 255])

ART_MAPPING = {
    "art_01.jpg": {"name": "river", "bg": "scene", "size": (390, 40)},
    "art_02.jpg": {"name": "parchment", "bg": "scene", "size": (390, 844)},
    "art_03.jpg": {"name": "adou", "bg": "magenta", "size": (80, 100)},
    
    "art_04.jpg": {"name": "enemy_cavalry", "bg": "magenta", "size": (48, 48)},
    "art_05.jpg": {"name": "enemy_soldier", "bg": "magenta", "size": (40, 48)},
    "art_06.jpg": {"name": "enemy_shield", "bg": "magenta", "size": (40, 48)},
    "art_07.jpg": {"name": "enemy_mage", "bg": "magenta", "size": (40, 48)},
    "art_08.jpg": {"name": "enemy_elite", "bg": "magenta", "size": (44, 52)},
    "art_09.jpg": {"name": "enemy_boss", "bg": "magenta", "size": (64, 72)},
    
    "art_10.jpg": {"name": "tile_white", "bg": "magenta", "size": (48, 48)},
    "art_11.jpg": {"name": "tile_green", "bg": "magenta", "size": (48, 48)},
    "art_12.jpg": {"name": "tile_purple", "bg": "green", "size": (48, 48)},
    "art_14.jpg": {"name": "tile_gold", "bg": "magenta", "size": (48, 48)},
    "art_15.jpg": {"name": "tile_general_frame", "bg": "magenta", "size": (52, 52)},
    "art_16.jpg": {"name": "tile_blue", "bg": "magenta", "size": (48, 48)},
    
    "art_17.jpg": {"name": "general_zhaoyun", "bg": "magenta", "size": (96, 96)},
    "art_18.jpg": {"name": "general_zhangfei", "bg": "magenta", "size": (96, 96)},
    "art_19.jpg": {"name": "general_guanyu", "bg": "magenta", "size": (96, 96)},
    "art_20.jpg": {"name": "general_huangzhong", "bg": "magenta", "size": (96, 96)},
    "art_22.jpg": {"name": "general_zhugeliang", "bg": "magenta", "size": (96, 96)},
    "art_23.jpg": {"name": "general_liubei", "bg": "magenta", "size": (96, 96)},
    "art_24.jpg": {"name": "general_caocao", "bg": "magenta", "size": (96, 96)},
    "art_25.jpg": {"name": "general_dianwei", "bg": "magenta", "size": (96, 96)},
    "art_26.jpg": {"name": "general_xiahoudun", "bg": "magenta", "size": (96, 96)},
    "art_27.jpg": {"name": "general_zhouyu", "bg": "green", "size": (96, 96)},
    "art_28.jpg": {"name": "general_sunshangxiang", "bg": "green", "size": (96, 96)},
    "art_29.jpg": {"name": "general_lvbu", "bg": "green", "size": (96, 96)},
    
    "art_30.jpg": {"name": "vfx_flame_burst", "bg": "black", "size": (128, 128)},
    "art_31.jpg": {"name": "vfx_fire_dragon", "bg": "black", "size": (256, 96)},
    "art_32.jpg": {"name": "vfx_ink_splash", "bg": "white", "size": (96, 96)},
    "art_33.jpg": {"name": "vfx_lightning", "bg": "black", "size": (64, 128)},
    "art_34.jpg": {"name": "vfx_slash", "bg": "black", "size": (128, 64)},
    
    "art_35.jpg": {"name": "ui_button", "bg": "green", "size": (160, 50)},
    "art_36.jpg": {"name": "ui_mantou", "bg": "magenta", "size": (32, 32)},
    "art_37.jpg": {"name": "ui_heart", "bg": "green", "size": (24, 24)},
}

def soft_chroma_key(img_array: np.ndarray, key_color: np.ndarray, 
                    tolerance: float = 40, edge_softness: float = 15) -> np.ndarray:
    """
    Perform soft chroma keying with despill and edge feathering.
    """
    rgb = img_array[:, :, :3].astype(np.float32)
    
    diff = np.sqrt(np.sum((rgb - key_color.astype(np.float32)) ** 2, axis=2))
    
    alpha = np.clip((diff - tolerance) / edge_softness, 0, 1)
    
    return alpha

def despill(img_array: np.ndarray, key_color: np.ndarray, 
            alpha: np.ndarray, strength: float = 0.8) -> np.ndarray:
    """
    Remove color spill from the key color onto the subject.
    """
    rgb = img_array[:, :, :3].astype(np.float32)
    
    if np.allclose(key_color, MAGENTA_KEY):
        spill_channel = (rgb[:, :, 0] + rgb[:, :, 2]) / 2 - rgb[:, :, 1]
        spill_mask = np.maximum(0, spill_channel) * (1 - alpha)
        rgb[:, :, 0] = np.clip(rgb[:, :, 0] - spill_mask * strength * 0.5, 0, 255)
        rgb[:, :, 2] = np.clip(rgb[:, :, 2] - spill_mask * strength * 0.5, 0, 255)
    elif np.allclose(key_color, GREEN_KEY):
        spill = rgb[:, :, 1] - np.maximum(rgb[:, :, 0], rgb[:, :, 2])
        spill_mask = np.maximum(0, spill) * (1 - alpha)
        rgb[:, :, 1] = np.clip(rgb[:, :, 1] - spill_mask * strength, 0, 255)
    
    return rgb.astype(np.uint8)

def find_content_bounds(alpha: np.ndarray, threshold: float = 0.1) -> tuple:
    """
    Find the bounding box of non-transparent content.
    """
    rows = np.any(alpha > threshold, axis=1)
    cols = np.any(alpha > threshold, axis=0)
    
    if not np.any(rows) or not np.any(cols):
        return 0, 0, alpha.shape[1], alpha.shape[0]
    
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    
    padding = 2
    rmin = max(0, rmin - padding)
    rmax = min(alpha.shape[0] - 1, rmax + padding)
    cmin = max(0, cmin - padding)
    cmax = min(alpha.shape[1] - 1, cmax + padding)
    
    return cmin, rmin, cmax + 1, rmax + 1

def process_image(input_path: Path, config: dict) -> Image.Image:
    """
    Process a single image with chroma keying, despill, and trimming.
    """
    img = Image.open(input_path).convert("RGB")
    img_array = np.array(img)
    
    bg_type = config["bg"]
    target_size = config["size"]
    
    if bg_type == "scene":
        if config["name"] == "parchment":
            img = img.resize((target_size[0], int(target_size[0] * img.height / img.width)), Image.Resampling.LANCZOS)
            result = Image.new("RGBA", target_size, (0, 0, 0, 0))
            for y in range(0, target_size[1], img.height):
                result.paste(img.convert("RGBA"), (0, y))
            return result
        elif config["name"] == "river":
            h_ratio = img.height / img.width
            crop_h = int(img.width * 0.15)
            center_y = img.height // 2
            cropped = img.crop((0, center_y - crop_h, img.width, center_y + crop_h))
            return cropped.resize(target_size, Image.Resampling.LANCZOS).convert("RGBA")
        return img.resize(target_size, Image.Resampling.LANCZOS).convert("RGBA")
    
    if bg_type == "magenta":
        key_color = MAGENTA_KEY
    elif bg_type == "green":
        key_color = GREEN_KEY
    elif bg_type == "black":
        alpha = np.max(img_array, axis=2).astype(np.float32) / 255.0
        rgba = np.dstack([img_array, (alpha * 255).astype(np.uint8)])
        bounds = find_content_bounds(alpha, threshold=0.05)
        cropped = Image.fromarray(rgba).crop(bounds)
        return cropped.resize(target_size, Image.Resampling.LANCZOS)
    elif bg_type == "white":
        inverted = 255 - img_array
        alpha = np.max(inverted, axis=2).astype(np.float32) / 255.0
        gray = np.mean(img_array, axis=2).astype(np.uint8)
        rgba = np.dstack([gray, gray, gray, (alpha * 255).astype(np.uint8)])
        bounds = find_content_bounds(alpha, threshold=0.1)
        cropped = Image.fromarray(rgba).crop(bounds)
        return cropped.resize(target_size, Image.Resampling.LANCZOS)
    else:
        return img.resize(target_size, Image.Resampling.LANCZOS).convert("RGBA")
    
    alpha = soft_chroma_key(img_array, key_color, tolerance=50, edge_softness=20)
    
    rgb = despill(img_array, key_color, alpha)
    
    alpha_uint8 = (alpha * 255).astype(np.uint8)
    rgba = np.dstack([rgb, alpha_uint8])
    
    bounds = find_content_bounds(alpha)
    rgba_img = Image.fromarray(rgba)
    cropped = rgba_img.crop(bounds)
    
    return cropped.resize(target_size, Image.Resampling.LANCZOS)

def main():
    """Process all art assets."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    (OUTPUT_DIR / "tiles").mkdir(exist_ok=True)
    (OUTPUT_DIR / "enemies").mkdir(exist_ok=True)
    (OUTPUT_DIR / "generals").mkdir(exist_ok=True)
    (OUTPUT_DIR / "vfx").mkdir(exist_ok=True)
    (OUTPUT_DIR / "ui").mkdir(exist_ok=True)
    (OUTPUT_DIR / "backgrounds").mkdir(exist_ok=True)
    
    for filename, config in ART_MAPPING.items():
        input_path = INPUT_DIR / filename
        
        if not input_path.exists():
            print(f"Warning: {filename} not found, skipping")
            continue
        
        name = config["name"]
        
        if name.startswith("tile_"):
            subdir = "tiles"
        elif name.startswith("enemy_"):
            subdir = "enemies"
        elif name.startswith("general_"):
            subdir = "generals"
        elif name.startswith("vfx_"):
            subdir = "vfx"
        elif name.startswith("ui_"):
            subdir = "ui"
        else:
            subdir = "backgrounds"
        
        output_path = OUTPUT_DIR / subdir / f"{name}.png"
        
        print(f"Processing {filename} -> {output_path}")
        
        try:
            result = process_image(input_path, config)
            result.save(output_path, "PNG", optimize=True)
            
            webp_path = output_path.with_suffix(".webp")
            result.save(webp_path, "WebP", quality=90)
            
        except Exception as e:
            print(f"Error processing {filename}: {e}")
            raise
    
    print(f"\nProcessed {len(ART_MAPPING)} assets to {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
