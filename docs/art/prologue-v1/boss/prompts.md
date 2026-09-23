# 破门王 — 生成记录

内置 image_gen 生成，未使用 CLI/API 回退。

## Portrait

Use case: stylized-concept. Create one production game character asset on a genuinely transparent RGBA background (no checkerboard, no shadows on a background), square 768x768. This is the full-body identity portrait of "Gatecrasher", a humorous hulking green-skinned infected boss in a bright cartoon post-apocalypse mobile game. Reference image is a STYLE ONLY reference of existing enemies, use its clean bold outlines, bright colors, polished simple cel-shaded volume and slightly top-down camera looking at a character facing screen-down/front; do not copy its characters.
Design: huge muscular green torso, small short sturdy legs with brown chunky work boots, blue-gray patched work vest and trousers, orange-white traffic cone worn askew on head, an orange-and-white road barrier held as his shield/club with both thick hands. A silly stubborn toothy expression, intimidating bulk but playful rather than horror, no blood, no text or symbols or UI. Road barrier is a short horizontal rounded rectangular industrial panel, no legs, sized to fit whole character silhouette.
Composition: entire body including cone and boots centered, at least 32px transparent margin on every edge. Feet ground anchor near (384,704), 3/4 top-down FRONT camera with visible tops of boots and shoulders. Both feet planted wide, pelvis centered, weapon held at waist-chest height leaving legs visible. The boss faces downward toward the viewer, never profile. Crisp production-ready edges with true alpha transparency.

原图：portrait-source.png，1254×1254 RGBA。统一缩放到704×704，放入768×768画布(32,34)。真实透明通道，无抠图/伪透明。

## Eight-pose source atlas

Use case: identity-preserve. Edit supplied character identity into a production sprite action sheet. Preserve EXACT SAME boss design, colors, costume, cone, boots, proportions, top-down FRONT facing screen-down camera, light and rendering.
OUTPUT: one 2048x1024 RGBA genuinely transparent sheet, 4 columns by 2 rows of 512x512 equal cells, no grid lines, no text. Eight FULL BODY poses in reading order: (1) idle, (2) walk with left foot forward, (3) walk with right foot forward, (4) raise road barrier to chest/face, (5) hold road barrier HIGH OVERHEAD wind-up, (6) SLAM barrier forward/down to ground in front but keep shoes visible, (7) recovery, (8) defeated falling seated on butt dazed. This is a funny big green hulking zombie with tilted orange-white cone, blue-gray patchwork clothes and brown shoes. Road barrier is SHORT, rectangular orange-white same one as reference, stays entirely inside each cell.
CRITICAL: each complete pose fits inside x=48..464 and y=30..456 relative to cell; preserve 32px margins and clear transparent space between all sprites. Each pose body scale identical; do not enlarge idle to fill cell. Ground contact anchor (256,456), pelvis near (256,342), feet about (212,438),(300,438). Idle/raise/hold/slam/recover are planted: feet, knees, pelvis remain identical and stationary, no crouch or moving legs; only arms and shoulder and the weapon change. Both feet wide and down. Walk frames may move legs. Attack read clearly through raised arms and overhead barrier then forward-down force. No flames, no impact dust, no ground shadows, no floating fragments. Fixed camera no rotation. Clean bold lines, simple volume, brighter friendly cartoon postapocalypse, non-gory. Do not add shadows outside character. No checkerboard or colored backdrop; true transparent alpha.

原图 boss-actions-source.png 为1774×887，规则4×2源格，每格443.5方形；全部格同一映射到432×432并补透明边放置(40,32)。

## Standing slam correction

Use case: identity-preserve. Produce ONLY a single full-body action sprite of exact same green cone-wearing hulking zombie from reference, same scale and costume. Transparent RGBA, square canvas, no background shadow. Boss in STANDING PLANTED attack impact pose, NOT crouching or kneeling. BOTH feet, knees, pelvis are exactly in original positions; keep original lower body proportions and wide boot stance. Animate just shoulders and arms: lean upper chest slightly forward, arms thrust road barrier down and forward, but barrier's bottom MUST STOP at belt height, never cover thighs, knees or boots. Barrier is strongly foreshortened to show top surface and aim toward screen bottom, conveys downward thrust. Hands grip barrier ends at waist. Fixed legs completely unchanged from reference. Same FRONT slightly top-down camera. Huge green arms, traffic cone leaning sideways, angry determined funny expression. Fit complete character inside square with 48 px transparent margins. Crisp dark outlines, bright clean cel shading, no effects or lettering. This is ground-slam upper-body motion with fixed legs; ground impact will be rendered separately by engine. IMPORTANT exact head/body/boot scale from reference, no resizing lower body.

原图 slam-standing-source.png 为1254×1254，整图统一缩放448×448放置(32,29)，替换原图集中蹲姿砸击。未旋转单张冒充动作。

## Deterministic packing

见package_art.py。raise和hold上身整体下移30px对齐腰带遮挡线；待机下肢蒙版复用于idle/raise/hold/slam/recover，确保脚、膝、骨盆像素相同。共享下肢蒙版从y=338开始沿衣摆/腿侧，保留两侧手臂；清除旧靴残影。所有动作统一整格缩放，没有逐帧包围盒拉伸。

