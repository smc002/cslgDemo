# Armored undead directional animation

Built with the built-in image_gen tool. Original sources and complete prompts are retained alongside the production script.

- Identity: steel bucket helmet, cyan eyes, rounded blue-gray rusted scrap armor, brown trousers and low heavy boots.
- Views: S frontal; SE front-right quarter; E right-facing side with one eye; NE rear-right quarter with back plate dominant; N full back without eyes. These are painted body turns, not rotated sprites. Runtime may mirror SE/E/NE for SW/W/NW.
- Walk: four separate full-body source poses per direction. Low uneven boot drag, weight transfer, slouched neck and restrained shoulder motion. Durations 0.24 / 0.13 / 0.27 / 0.16 seconds. Legs intentionally remain free across walk poses. World displacement belongs to runtime.
- Hit: grounded prepared / upper-body impact / recovery. Impact index 1. Durations 0.05 / 0.10 / 0.13 seconds. No root motion. Direction-specific pelvis/legs are baked from the prepared image using an anatomical polygon under armor hem; hanging hands remain free outside the mask. Full-width replacement below hands removes alternate generated boot remnants.
- Idle is exactly the prepared hit frame for that direction.
- Canvas 320 x 320, sole anchor [160,296], 4px transparent boundary, 8 columns x 5 rows. Row order S / SE / E / NE / N. Column order walk0..3 / prepared / impact / recovery / idle.
- Source sheets have different generated pixel resolutions. Both are first normalized globally to a 384px conceptual source cell, then share one uniform output scale. There is no per-pose bounding-box stretch. S prepared reference visible height is 236px; source camera/pose geometry is preserved for the other directions.

Visual QA: all five views inspected on source sheets and atlas contact sheet; the E and N rows have actual side/back anatomy. No high-knee running or symmetrical fist pumping. The red/cyan hit overlay shows shared grounded boots and moving upper bodies. A two-pixel mask gap found during inspection was closed before final output. QA contact is half-resolution; the overlay is native 320px cells.

Automated QA: 20 contiguous walk bodies + 15 contiguous hit bodies; 40 final frames; all 5 fixed-lower masks have zero differing bytes across three hit poses plus idle; four-pixel atlas boundaries fully transparent; every adjacent walk lower-body pair changes more than 24,000 channel bytes. See checks.json and slicing.json for exact values, masks and source-to-frame mapping. These checks cover asset pixels; runtime transition/death/interrupt acceptance remains with the integrating agent.

Run: node build.mjs. Requires sharp from the existing E:/cslgDemo/node_modules installation. The script writes only this output directory.
