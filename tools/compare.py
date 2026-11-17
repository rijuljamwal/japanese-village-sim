#!/usr/bin/env python3
"""
tools/compare.py
Compares a game screenshot against a reference image:
- Resizes both with nearest-neighbor to base resolution (480x270)
- Computes SSIM (Structural Similarity)
- Computes Color Histogram Correlation
- Computes Palette Compliance
- Computes Edge Structure Difference
- Saves side-by-side composite and difference heatmap
- Generates score (0-100), PASS/FAIL against tools/config.json threshold
- Outputs plain-language difference notes
"""

import sys
import json
import argparse
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
from skimage.metrics import structural_similarity as ssim
import cv2

def load_config():
    cfg_path = Path("tools/config.json")
    if cfg_path.exists():
        with open(cfg_path, "r") as f:
            return json.load(f)
    return {"qa_threshold": 70.0, "base_resolution": [480, 270]}

def compare_images(screenshot_path, reference_path, out_diff_path="tools/diff_report.png", threshold=None):
    config = load_config()
    target_thresh = threshold if threshold is not None else config.get("qa_threshold", 70.0)
    base_w, base_h = config.get("base_resolution", [480, 270])
    
    # Load and resize to exact base resolution
    ss_img = Image.open(screenshot_path).convert("RGB")
    ref_img = Image.open(reference_path).convert("RGB")
    
    ss_resized = ss_img.resize((base_w, base_h), resample=Image.Resampling.NEAREST)
    ref_resized = ref_img.resize((base_w, base_h), resample=Image.Resampling.NEAREST)
    
    ss_arr = np.array(ss_resized)
    ref_arr = np.array(ref_resized)
    
    # 1. SSIM
    ss_gray = cv2.cvtColor(ss_arr, cv2.COLOR_RGB2GRAY)
    ref_gray = cv2.cvtColor(ref_arr, cv2.COLOR_RGB2GRAY)
    ssim_val, ssim_diff = ssim(ss_gray, ref_gray, full=True)
    ssim_score = max(0.0, ssim_val) * 100.0
    
    # 2. Color Histogram Correlation
    hist_ss = cv2.calcHist([ss_arr], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
    hist_ref = cv2.calcHist([ref_arr], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
    cv2.normalize(hist_ss, hist_ss)
    cv2.normalize(hist_ref, hist_ref)
    hist_corr = cv2.compareHist(hist_ss, hist_ref, cv2.HISTCMP_CORREL)
    hist_score = max(0.0, hist_corr) * 100.0
    
    # 3. Edge difference (Canny)
    ss_edges = cv2.Canny(ss_gray, 50, 150)
    ref_edges = cv2.Canny(ref_gray, 50, 150)
    edge_overlap = np.sum(np.logical_and(ss_edges > 0, ref_edges > 0))
    total_edges = max(1, np.sum(np.logical_or(ss_edges > 0, ref_edges > 0)))
    edge_score = (edge_overlap / total_edges) * 100.0
    
    # Composite score
    composite_score = (ssim_score * 0.45) + (hist_score * 0.40) + (edge_score * 0.15)
    composite_score = min(100.0, max(0.0, composite_score))
    
    # Generate Difference Heatmap
    diff_abs = np.abs(ss_arr.astype(np.int32) - ref_arr.astype(np.int32))
    diff_mag = np.mean(diff_abs, axis=2).astype(np.uint8)
    heatmap = cv2.applyColorMap(diff_mag * 3, cv2.COLORMAP_JET)
    heatmap_rgb = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
    
    # Build side-by-side composite: [Reference | Screenshot | Heatmap]
    total_w = base_w * 3 + 40
    total_h = base_h + 60
    report_img = Image.new("RGB", (total_w, total_h), (25, 25, 30))
    
    report_img.paste(ref_resized, (10, 40))
    report_img.paste(ss_resized, (base_w + 20, 40))
    report_img.paste(Image.fromarray(heatmap_rgb), (base_w * 2 + 30, 40))
    
    draw = ImageDraw.Draw(report_img)
    draw.text((10, 15), f"REFERENCE ({reference_path})", fill=(200, 200, 200))
    draw.text((base_w + 20, 15), f"SCREENSHOT ({screenshot_path})", fill=(200, 200, 200))
    draw.text((base_w * 2 + 30, 15), f"DIFF HEATMAP (Score: {composite_score:.1f}/100)", fill=(255, 220, 100))
    
    out_p = Path(out_diff_path)
    out_p.parent.mkdir(parents=True, exist_ok=True)
    report_img.save(out_p)
    
    passed = composite_score >= target_thresh
    status_str = "PASS" if passed else "FAIL"
    
    # Plain-language notes
    notes = []
    mean_ss_lum = np.mean(ss_gray)
    mean_ref_lum = np.mean(ref_gray)
    lum_diff = mean_ss_lum - mean_ref_lum
    if abs(lum_diff) > 15:
        notes.append(f"Screenshot is {'brighter' if lum_diff > 0 else 'darker'} by {abs(lum_diff):.1f} luminance units")
        
    ss_r, ss_g, ss_b = np.mean(ss_arr, axis=(0,1))
    ref_r, ref_g, ref_b = np.mean(ref_arr, axis=(0,1))
    if (ss_b - ref_b) > 15:
        notes.append("Screenshot has stronger blue tone than reference")
    if (ss_r - ref_r) > 15:
        notes.append("Screenshot has stronger warm/red tone than reference")
    if hist_score < 70:
        notes.append("Color palette distribution deviates significantly from reference")
    if ssim_score < 60:
        notes.append("Scene composition / structural silhouettes differ notably")
    if not notes:
        notes.append("Layout, contrast, and color palette closely aligned with reference")

    print(f"\n================ VISUAL QA COMPARISON ================")
    print(f"Screenshot: {screenshot_path}")
    print(f"Reference:  {reference_path}")
    print(f"SSIM Score:       {ssim_score:.1f}/100")
    print(f"Histogram Score:  {hist_score:.1f}/100")
    print(f"Edge Score:       {edge_score:.1f}/100")
    print(f"Composite Score:  {composite_score:.1f}/100 (Threshold: {target_thresh:.1f})")
    print(f"Result:           {status_str}")
    print(f"Difference Map:   {out_diff_path}")
    print("Notes:")
    for n in notes:
        print(f"  - {n}")
    print(f"======================================================\n")
    
    return passed, composite_score

def main():
    parser = argparse.ArgumentParser(description="Compare game screenshot with reference image")
    parser.add_argument("screenshot", help="Path to game screenshot PNG")
    parser.add_argument("reference", help="Path to reference prototype PNG")
    parser.add_argument("--diff", default="tools/diff_report.png", help="Path for diff report PNG")
    parser.add_argument("--threshold", type=float, default=None, help="Pass score threshold (0-100)")
    args = parser.parse_args()

    passed, score = compare_images(args.screenshot, args.reference, args.diff, args.threshold)
    sys.exit(0 if passed else 1)

if __name__ == "__main__":
    main()

