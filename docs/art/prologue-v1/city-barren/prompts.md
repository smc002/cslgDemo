# 初始荒凉内城地形

工具：内置 image_gen 编辑模式，单版单次生成。输入为现有项目 terrain.png，不改项目源文件。

## 完整提示词

Use case: precise-object-edit.
Asset type: runtime terrain layer for a mobile game city-building screen. Opaque RGB image, EXACT requested final canvas 938x1677 pixels, same tall portrait aspect ratio as the attached edit target.
Input image 1 is the EDIT TARGET. This image is the existing EMPTY camp map. Create its initial abandoned, barren state before the player constructs their buildings.
ABSOLUTE INVARIANTS: Keep the original image's composition, exact framing, isometric camera, paving perspective, every empty rectangular building plot's size, position and yellow boundary, path network, and foreground compound entrance gate at the LOWER RIGHT in exactly the same locations. Preserve the existing boundary ruins, fences, gate towers, edge car wrecks and roadside objects in place; do not relocate them. The repeated construction plots must remain clearly readable and EMPTY, with unobstructed flat surfaces to receive buildings rendered separately by the game.
CHANGE ONLY ENVIRONMENTAL CONDITION: remove roughly 85-90% of the vivid lush green vegetation, revealing weathered light beige masonry, dusty bare earth and existing concrete paving. Replace most remaining vegetation with sparse small straw-colored tufts or dry muted olive weeds. No lush canopy. The empty camp should immediately feel deserted, dusty and unmaintained, but not crowded or destroyed beyond reuse. Add restrained surface cracks and worn concrete patches, a few tiny pebbles near edges only. Make the existing perimeter wall and metal entrance gate look more weathered, chipped and rusted, while preserving their silhouettes and positions. Turn ALL gate warning lights and floodlights OFF: unlit amber glass and grey lamp lens, no glow. Gate tower teal roofs may be sun-faded muted teal.
STYLE: maintain the identical clean chunky cartoon game rendering, defined dark outlines, gentle 3D volumes, warm daylight. Bright readable post-apocalyptic adventure, not horror or bleak darkness. Muted tan/sand/light grey terrain with small remaining teal structural accents, an intentionally barren starting base.
DO NOT ADD buildings, roofs, factories, tents, scaffolds, construction equipment, people, enemies, characters, UI, lettering, labels, numbers, symbols, watermark, dark vignette, dramatic smoke, fire, or piles of rubble. Do not block, distort, move, recolor over, or erase the yellow building plot layout. No decorative new items. Keep every buildable tile free. Preserve the overall exposure and sunlight direction. Deliver a single edited full-scene image.

## 尺寸与验证

输入、生成结果和正式图均938×1677；原尺寸恒等映射，无裁切、无拉伸。正式图输出RGB 24位不透明PNG。预览469×839。

已实际查看输入原图、生成整图和小尺寸预览。鲜绿色植被明显减少，改为干草、裸露旧水泥和少量碎石；地块继续留空，道路透视、边界围墙、右下门口和地块位置保持。没有新增建筑、角色或文字UI。门灯为熄灭玻璃，主照明灯无发光。仍保持暖日光卡通可读性。

生成来源：C:/Users/hy/.codex/generated_images/01a0cc9d-8064-7ad0-98b2-da2178c0084a/exec-20622fb6-f8cd-46e4-bfa6-3b37bb0ac4fb.png

