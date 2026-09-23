# 场景生成提示与制作记录

内置 image_gen 模式。2026-09-23。最终运行文件由主代理复制进项目。

## gate-damaged

Use case: stylized-concept.
Asset type: production-ready mobile game battle background, single portrait PNG EXACTLY 768 by 1280 pixels, opaque RGB.
Primary request: A bright cartoon post-apocalypse camp entrance seen from outside, for the game prologue 'Retake the camp'. The gate is damaged and all its lamps are OFF.
References: match the attached game reference images only for art style, teal industrial buildings, chunky defined dark outlines, warm sand road and bright green foliage. Do NOT copy their user interface or their camera layout.
Composition: fixed slightly top-down camera looking straight up the road toward a small compound. NOT a diagonal isometric street. The compound gate lies horizontally across the upper part, center of gate at pixel (384,250). It has two squat square stone guard towers with teal metal roofs, amber warning lamps which are not emitting light, battered grey-green double metal doors with cracked panels and a leaning right leaf, yellow-black corner safety markings. Some open sky is unnecessary: the image is all terrain and architecture from above. Behind the gate, only a narrow suggestion of teal roofs and green trees at top. Edge dressing has bushes, patched stone wall, small empty rusty barrel and broken fence confined to x<90 and x>678. Central x=100..668 and y=450..1120 MUST remain open, very low contrast and low texture warm beige roadway to fit THREE combat lanes side by side. Keep the lower center open through the bottom edge for player troops. No lane dividers or rectangular tile boxes. Perspective is gentle, near orthographic so all three lanes remain usable. No obstacles or shadows across the central battlefield. Gate and scenery detail concentrated upper 30% and thin side strips.
Style: polished 2D mobile strategy game painted illustration, cheerful adventurous crisis, saturated teal details and leafy greens, clean dark silhouettes, soft chunky volumes, sparse surface detail, readable at 384x640.
Lighting: bright late-afternoon sunlight, neutral warm road, not dark.
Constraints: no people, no heroes, no enemies, no weapons or collectible ammunition, no resource chests, no interface, no text, no numbers, no icons, no labels, no border, no watermark. This is a pure environmental layer for actual gameplay, not a poster. Full bleed 3:5 portrait composition.

生成来源：C:/Users/hy/.codex/generated_images/01a0cc9d-8064-7ad0-98b2-da2178c0084a/exec-91d036c4-0631-4bbe-9d26-4a9c8144d1da.png

原图1122×1402；中心区域(140.4,0,841.2,1402)等比缩放为768×1280。

## gate-restored

Use case: precise-object-edit.
Asset type: second state of an actual mobile game background, opaque portrait PNG 768x1280, exactly the same 3:5 canvas and camera as the edit target.
Input image 1 is the EDIT TARGET, damaged camp gate. Make the camp gate REPAIRED and powered on. Keep camera, framing, perspective, all architecture locations, tower silhouette, tower roofs, gate shape and size, all road pixels and side foliage unchanged. Retain the large empty low-detail beige battlefield in the lower 75% with no additions.
Change only upper gate area: fix the hole and cracks in the two gate panels, straighten the right door to align both leaves into a closed secure door, patch with a few tidy teal metal reinforcement plates without any text or symbols. Repair cracked wall stones immediately around the gate. Turn the amber lamps already on top of both towers ON with small warm golden glows, while remaining in clear sunny daytime. Add two small celebratory teal pennant flags on the outer sides of the towers, with simple orange trim and absolutely no emblems/text. A few warm lights along gate header are allowed. Ground directly in front of gate stays unobstructed.
Style and materials: preserve identical polished cheerful cartoon game illustration, strong outlines, vibrant teal and green, warm sunlight.
Critical invariants: Same exact scene and framing, no camera zoom, no widening, no shortening, no changing aspect ratio. Gate remains within y=0..300 of 768x1280 frame. Do not regenerate or decorate the road; keep low-contrast free combat space x=100..668,y=450..1120 and empty lower center. No people, heroes, enemies, vehicles, resource pickups, weapons, user interface, letters, numbers, watermark, border. Do not turn the scene to night or dim the whole image. Only repair and warm lamps signal restored camp.

编辑目标：已交付gate-damaged.png。生成来源：C:/Users/hy/.codex/generated_images/01a0cc9d-8064-7ad0-98b2-da2178c0084a/exec-a6d23033-76d2-4993-92b4-0556fc0426a3.png

原图971×1619；中心区域(0,0.333333,971,1618.333333)等比缩放为768×1280。

## 验证

已查看原图、正式图和384×640并排预览。两张图均真实RGB全不透明，无人物、敌人、UI文字。中央三路保持开阔低纹理。修复态有暖灯、旗帜、门板修补。两图机位与建筑主体一致，生成编辑仍有细微纹理变化；切换建议使用短渐变，不适合快速逐帧交替。未生成可选透明灯层。

