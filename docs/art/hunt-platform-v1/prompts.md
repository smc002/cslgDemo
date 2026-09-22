# A platform generation record

Mode: built-in image_gen. Date: 2026-09-22. No project files modified.

## Initial platform

Use case: stylized-concept
Asset type: single production game environment sprite, a raised vehicle firing platform with transparent background.
Create ONE freestanding reinforced-concrete raised platform, seen from a centered elevated rear 3/4 overhead camera. Landscape 1536x1024 canvas, generous transparent margins. Platform is empty, NO vehicle or turret. Its flat rectangular top is a safe parking surface. Far edge at top faces zombies, near edge at bottom faces viewer. The visible width is about 920 px, projected top-surface depth about 640 px (a slightly tapered rectangle due to elevated perspective, nearly orthographic). The top plane is large and empty. A clearly visible substantial VERTICAL front fascia at the bottom faces the viewer, about 140 px tall, plus thick left and right side faces where visible. The platform itself is HIGHER than surrounding ground, isolated freestanding slab, not a pit or recessed box. There is no surrounding ground in the sprite.
Styling reference image is the selected A platform in left panel, use bright hand-painted cartoon mobile game, chunky dark outlines, warm light sandstone-colored reinforced concrete, subtle surface wear and sparse tiny cracks, dark metal reinforcement plates with a few rivets, short yellow-and-black hazard markings at the four corners only. Keep the central top area plain and unobstructed for a separately rendered armored vehicle. All top edges have a modest beveled concrete lip, not tall walls. Strong solid vertical face below the top surface emphasizes platform height. Side faces have sturdy inset metal bracing, clean readable silhouette. Sunlight from upper left.
Geometry requirements: near-edge top surface at about y760 and vertical bottom edge at about y900 on the 1024 canvas, far-edge top surface about y130, x roughly310..1230. Keep all of the platform within canvas. Upright screen orientation, no diagonal isometric yaw. Symmetric left and right. Nothing can connect from ground to top: no stairs, ramps, paths, ladders, bridge, entrance or gate. NO zombies, people, car, weapon, text, symbols, UI, labels, floating magic, grass, props, ground plane or cast shadow.
Background must be actual transparent RGBA alpha, no baked checkerboard or colored background. Only the platform sprite.

## Proportion iteration

Use case: precise-object-edit
Edit the single platform sprite. Preserve the bright cartoon reinforced-concrete design, corner hazard plates, empty top, dark riveted braces, true transparent background.
Change ONLY geometry and camera proportions: the platform must be a LONG RECTANGULAR vehicle parking deck pointing UP, not a wide short deck. Increase its projected front-to-back depth substantially relative to its width, using a steeper elevated overhead view. The top flat usable surface must be at least 75% as tall as the full platform is wide in screen pixels, enough to park a long car. Use a portrait 1024x1536 canvas: platform full visible width about800px, usable top runs from y230 to y1050 (820px tall), top width roughly680px; outside far edge at y140; near edge y1120; bottom vertical concrete fascia ends at y1260. Narrow only slightly toward far edge. Full silhouette x110..914. Keep front fascia about120px tall with dark diagonal reinforcement. Thick side faces about45px wide, low beveled perimeter lip. Do not add tall parapet walls. Leave generous transparent padding all around. No car, turret, zombies, staircase, ramp, ground plane, shadow, labels or text. Genuine RGBA transparency.

## Selected platform

Use case: precise-object-edit
Edit the geometry of this empty raised platform sprite only. Keep exact cartoon concrete / corner hazard / metal reinforcement design and true alpha transparency. This deck is too long. SHORTEN its longitudinal TOP SURFACE LENGTH to roughly TWO THIRDS of the existing length, without changing platform width or the thickness/height of the bottom vertical fascia. The resulting platform sprite should fit a SQUARE 1024x1024 image, generous margins of ~65 pixels.
Precise desired appearance: full platform visible width about850px and full silhouette height about890px; far/top edge y65; near edge of parking TOP plane y795; bottom of vertical front fascia y955. Empty usable flat deck extends from y125 to y760, height635px, width around650px at far side to750px at near side. The main long rectangle is moderately longer front-to-back than wide in physical world, with steep overhead camera. Do NOT return a tall portrait. Do NOT return a wide shallow landscape platform. The overall sprite bounding box should be approximately square, while the visible TOP PLANE is wider than its own projected height.
Single upright raised freestanding platform, no ground, no cast shadow, no car or gun, no stairs/ramps/doorways, no characters, no text or UI. RGBA transparent background, not checkerboard.

## Scene generation

Use case: stylized-concept
Asset type: final portrait mobile zombie-game environment concept showing selected raised-platform safety design at CORRECT SMALL vehicle scale.
Reference image 1: approved armored vehicle design and its materials. Reference image 2: the final raised concrete platform sprite, use this design as the parking terrace, no changes to its structure. Reference image 3: game visual style only.
Portrait canvas 1024x1536. Elevated near-top-down 3/4 camera looking forward. Bright warm sandy cracked concrete zombie hunting arena fills whole frame, sparse damaged props confined to left/right edges. NO HUD, buttons, icons, numbers, text, diagrams.
Critical exact screen-scale constraint: the armored car's BODY is ONLY about205 pixels wide, exactly20% of the1024px frame. It must look SMALL in the scene. The freestanding concrete platform is ONLY389 pixels wide,38% of frame. Do NOT enlarge the car or crop closer. Keep the whole platform visible. Use the supplied platform source proportions: outer height about355 pixels. Its bottom-center is at approximately(512,1420), bounding box roughly x317..707,y1065..1420. Park the car centered on it facing straight upward, car body width205px, body height240px, its rear tire within the terrace. Long black rotary gun and ivory turret extend forward/up freely, muzzle at roughly y1090, car rear around y1335. Car takes about HALF the width of the platform, with clearly visible empty parking surface beside it.
Vehicle: deep olive chunky six-wheel armored vehicle, rear spare tire facing bottom, broad yellow center stripe, cyan window, warm ivory turret, long black rotary barrel with orange rings, exactly matching reference. No extra turret or duplicate gun.
Safety: the terrace stands markedly ABOVE zombie ground. Clearly show solid concrete vertical face facing viewer at bottom, thick side faces with riveted steel reinforcement, height about55px in this illustration. Four short yellow-black corner hazard plates. No ramp, stairs, ladder, roadway or bridge connecting terrace to zombie field. No pit, not a walled ground-level garage. Monsters must be on the lower ground, never on the terrace. Keep a little empty lower-ground space around all platform edges so it reads as separate raised structure. Platform top remains flat beneath vehicle.
MOST of the image, the upper approximately70%, is a broad open battlefield with ~16 scattered varied cartoon zombies: small green standard zombies, a few steel-armored ones, red explosive ones, two orange large brutes. Keep enough negative space and depth, don't cram monsters. Their individual normal scale smaller than the car. Horde approaches from top toward car but stays well away from platform. Bright cheerful premium outlined2.5D mobile game handpainting. Clean readable small shapes, no horror photorealism, no magic shields. Strong emphasis on large battlefield and small defended vehicle at bottom.

## Selected scene scale correction

Use case: precise-object-edit
The foreground vehicle and platform are STILL TOO LARGE. Edit ONLY their scale and surrounding ground fill. Keep the entire upper zombie scene unchanged, same portrait canvas and same camera.
SHRINK THE ENTIRE RAISED PLATFORM AND CAR GROUP to TWO THIRDS (0.667x) OF ITS CURRENT SIZE, anchored at bottom-center position (512,1390). The platform current visible width is about580px; final must be about390px. Platform should span ONLY x317 to707, no wider. Its height shrinks proportionally from500px to335px, so far edge abouty1055, near bottom1390. Fill newly exposed area with matching cracked sandy battlefield ground.
Then adjust just the car inside the small platform to be approximately205px wide (20% of full canvas width1024), centered on platform. The car must not be larger than205px wide including wheels. Preserve long upward-pointing gun, same vehicle design, true proportions; do not stretch anything. There should still be clear margin on the platform to each side of car. Bottom of rear tire about1330. The car turret muzzle should point up above platform edge. The lower foreground should now contain a visibly SMALL defended car and SMALL raised platform in a broad arena, leaving more empty ground around both. Retain vertical concrete fascia and side shadow so platform reads raised. No UI/text. Keep zombies, background props, lighting, art style unchanged. This is a strict size correction, do not zoom or crop.

## Alternate larger vehicle preview (not selected)

Use case: precise-object-edit
Keep this entire portrait scene absolutely unchanged EXCEPT the armored vehicle. Platform size and placement are now correct and MUST NOT change. The car now measures about175px wide. Enlarge ONLY the car and attached turret/barrel together uniformly by1.17x around the car center, so car body including wheels is about205px wide, exactly20% of1024px canvas. Keep the car centered on platform, rear tire aroundy1285, muzzle aroundy1000. Preserve natural proportions and all design details. Do not enlarge platform, do not zoom, do not crop, do not change any zombies/background. The platform remains about389px wide. No other edits or additions.

## Review

Selected scene is a concept image. Its platform reads at approximately38% canvas width and car approximately17%; runtime geometry should use the requested exact20% car width. Alternate slightly larger concept car is approximately23%; use the code-integrated game screenshot as exact-scale authority. Standalone platform sprite retains native aspect ratio.

