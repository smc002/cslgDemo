# 阿栓与道具提示词及来源

2026-09-23，全部使用内置 `image_gen`，没有使用 API / CLI。查看了项目 `public/assets/recruit/shield.png` 与 `medic.png` 作为风格参考。以下为实际完整提示词。所有生成文件原始来源目录：`C:/Users/hy/.codex/generated_images/01a0cc9d-213f-7cc0-a533-fb066c449c3c/`。

## 1. 阿栓身份首图

来源 `exec-6aa68696-c6d0-4837-93eb-e414b988b21e.png`，保存 `ashuan-worried-original-v1.png`。

Use case: stylized-concept. Create a production-ready transparent PNG dialogue portrait for a bright, humorous post-apocalyptic mobile game, exact portrait canvas 1024x1536 (will be reduced to 512x768). This is one character, Ashuan, an adult male repair technician age about 35, clever but slightly anxious, short messy dark brown hair, friendly angular expressive face, light stubble, orange-yellow safety helmet with teal-tinted goggles resting on helmet, teal mechanic overalls/work jacket over pale cream undershirt, orange work gloves, tool belt with compact wrench at waist. Clean anime-comic painted illustration, confident dark outlines, simple readable cel shaded volumes, bright teal and warm orange palette, high polish; compatible with stylish game hero recruitment illustrations, not photorealistic, not chibi. Pose: half-body from helmet to belt/hips, body almost frontal slight three-quarter, both arms comfortably close to body, one gloved hand lightly gripping wrench at belt. Expression: worried, eyebrows raised inward, mouth slightly tense but humorous rather than terrified. Anatomy natural. Composition constraints: genuinely transparent background with alpha, no scenery, no floor shadow, no checkerboard, no text, letters, logo, UI, frame. Keep all hat and both elbows inside canvas, empty transparent margin at least 48 px around silhouette. Character width about 80 percent of canvas. Belt/waist ends at y=1472, face center approximately x=512 y=440. Clear isolated cutout, soft edge antialiasing. Deliver one character only.

## 2. 透明与构图调整（担心最终原图）

输入首图；来源 `exec-e07a1375-69fd-409d-8600-099a4151b24f.png`，保存 `ashuan-worried-original.png`。

Use case: background-extraction. Edit the supplied Ashuan repair technician. Remove the entire dark glowing background. Must output real PNG alpha transparency, not black, gray, white or checkerboard background. Also zoom out uniformly just enough that entire isolated half-body portrait including bottom belt/hip silhouette fits within 1024x1536 canvas with at least 60 pixels transparent empty space on ALL four sides. Keep the man's exact face, worried expression, helmet, goggles, hands, wrench, outfit, anatomy, colors and illustration style unchanged. No scenery, no glow, no cast shadow. Transparent cutout game dialogue sprite. Character must be about 80% canvas width. Final background absolutely fully transparent.

## 3. 嘴硬得意

输入担心最终原图；来源 `exec-208a871a-3f7e-4c21-9d16-f30a6412d79f.png`，保存 `ashuan-confident-original.png`。

Use case: identity-preserve. Edit ONLY this repair technician's facial expression, from worried to confidently smug and humorously stubborn: one eyebrow lightly raised, self-assured small closed-mouth half grin, relaxed eyes looking toward viewer. This is the SAME Ashuan character, preserve exact facial identity, age, hairstyle, stubble, safety helmet and goggles, outfit, hands, wrench, pose, canvas size 1024x1536, character size, position, silhouette and framing. No other changes. Output true PNG alpha transparency exactly as input. Do not add background, glow, shadows, checkerboard, text or UI. Keep all transparent margins and the bottom edge unchanged.

## 4. 安心微笑初版（弃用）

输入担心最终原图；来源 `exec-932ae000-0052-47bb-ae29-12c6aacb1f29.png`，保存 `ashuan-happy-original-v1.png`。缩小后与嘴硬过近，因此追加第7次生成。

Use case: identity-preserve. Edit ONLY this repair technician's facial expression, from worried to warmly relieved and genuinely happy: eyebrows relaxed, soft smiling eyes, broad friendly closed-mouth smile, a sense that the camp is finally safe. This is the SAME Ashuan character, preserve exact facial identity, age, hairstyle, stubble, safety helmet and goggles, outfit, hands, wrench, pose, canvas size 1024x1536, character size, position, silhouette and framing. No other changes. Output true PNG alpha transparency exactly as input. Do not add background, glow, shadows, checkerboard, text or UI. Keep all transparent margins and bottom edge unchanged.

## 5. 道具首版（弃用）

来源 `exec-097452f1-ce46-4d55-a68c-821d139d9f8c.png`，保存 `props-original-v1.png`。右侧贴边，因此追加布局修复。

Use case: stylized-concept. Production mobile game prop sprite atlas, exact canvas 2048x1024 pixels, transparent PNG with real alpha. Four equal columns in ONE horizontal row, each column 512x1024. Absolutely no visible grid or borders. Exactly four isolated props left to right: (1) closed squat military ammunition crate painted teal-green, yellow metal rim and dark latch; (2) the EXACT SAME ammunition crate open with lid upright and neat visible large gold cartridges; (3) closed orange-yellow portable mechanic toolbox with charcoal-gray handle and teal clasps; (4) the EXACT SAME toolbox open with its lid upright, wrench and screwdriver inside. Each prop center aligned in its own column at x=256,768,1280,1792. All four crates stand with bottom edge at y=896. Keep each silhouette entirely within its own column with at least 50px empty transparent lateral margin; prop width about 380px maximum. Open lids extend upwards only inside own column. No prop crosses column boundaries. Objects in a consistent slightly top-down three-quarter camera view, clean stylized comic game illustration, firm dark outlines, bright teal industrial and warm yellow-orange palette, simple clearly readable cel-shaded volumes, no tiny decorative detail, no gradients in empty background. Background fully transparent, absolutely no floor, cast shadow, characters, words, letters, numbers, badges, UI or checkerboard. These are game sprites, not a rendered presentation sheet.

## 6. 道具安全间距修正（最终原图）

输入道具首版；来源 `exec-344418b0-c094-4d86-bac8-49615514cf96.png`，保存 `props-original.png`。

Use case: precise-object-edit. Keep the exact four prop identities, paint style, colors and order in this transparent sprite atlas. Fix layout only: all four props must become 75 percent of current size, each centered horizontally in its OWN equal quarter of the canvas, all four prop bottoms aligned at 87.5 percent canvas height. Canvas aspect ratio stays 2:1 (2048x1024 requested). Leave large empty transparent spaces between all four props AND left/right edges. Each prop must be completely visible: repair any tiny truncation of far-right open toolbox, fully include right corner. Four equal invisible columns, each prop under 75 percent column width. Nothing may touch or cross the column boundaries. Keep actual PNG alpha transparency, no checkerboard, no background, no shadow, no text, no grid. This is production atlas packing with generous safety margins.

## 7. 安心开心清晰版（最终原图）

输入担心最终原图；来源 `exec-e9990d42-d7ff-4822-b911-3c238e7be92b.png`，保存 `ashuan-happy-original.png`。

Use case: identity-preserve. Change ONLY the face expression of this SAME Ashuan repairman to an OBVIOUS BIG HAPPY RELIEVED SMILE readable at tiny mobile-game size: eyebrows fully relaxed, eyes joyfully narrowed into smiling curves, mouth wide open in a warm toothy laugh. Keep his exact face identity, hair, helmet, goggles, stubble, body, teal clothes, orange gloves, wrench, pose and framing unchanged. Do not change canvas size, position or scale. True transparent PNG alpha background. No new props or effects, no text, no background, no glow. Expression must be clearly different from worried or a slight smirk; show unmistakable joyful relief.

## 交付规范化

- 三张1024×1536角色统一等比缩为460×690，放进512×768透明画布，左上偏移(26,56)。不分别按人物包围盒缩放。底部可见像素y=736。
- 道具实际返回1774×887，统一等比缩为1024×512并下移40px，按固定四格追加平移(-12,3)、(-12,1)、(3,6)、(0,0)，使道具中心/底边统一；没有分别拉伸图形。
- 所有最终PNG保留生成alpha。浅灰合成检查干净。角色256×384、道具每格128×256预览可辨识；最后开心表情已加强。
- 道具为四个静态状态；角色为三个剧情立绘状态，没有宣称为连续动画。
`n- 最后对道具每格按固定矩形[16,16,224,480]保留，确保16px透明安全边界；只清除一个alpha极低的边缘散点，不改变主体。
