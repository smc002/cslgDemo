# Five-direction heavy zombies

Built with builtin image_gen and authorized Sharp sprite assembly. No checkout edits.

Deliverables: giant.png / giant-part.json and explosive.png / explosive-part.json. Each atlas is 2560 x 1600, 8 columns x 5 rows, 320px cells. Rows S, SE, E, NE, N; columns walk0..3, hit prepare/recoil/recovery, idle copied from hit prepare. Foot anchor [160,296], reference visibleHeight 236. Runtime mirrors SE/E/NE for southwest/west/northwest without rotating the body. The durations in metadata carry the intended slow uneven cadence.

Source walk keyposes were reviewed before hit generation: low near-ground shuffle, drooping arms, true profile and back views. Giant has orange bulky body and studded straps; explosive has two dark gloves and rear-centered red tank. Tank dominates rear silhouettes.

The first explosive SE flinch moved arms and boots too far and produced visible compositing artifacts. A targeted editor attempt did not correct it. Only SE was independently regenerated as a small authored head/facial flinch. The final SE support mask also retains prepared dangling forearms and hands. Other directions remain from the original five-direction sources.

build.mjs records segmentation, one normalized scale per identity, source resolution normalization, fixed anatomical masks, and RGBA checks. Supplemental SE strip has one shared 0.91 framing compensation for all three poses; no individual frame bounding-box stretching. Mapping JSON records exact crop bounds, source file identifiers, scale and placement. All five directions of both identities report 0 fixed-mask mismatch bytes and 0 alpha on 4px cell edges.

QA contact sheets show all 40 frames per archetype over checkerboard with groundline; hit overlays show prepare/recoil at half alpha. The SE detailed review is retained. Visual checks corrected duplicate fingers in the giant front mask and removed explosive SE cut-glove/boot artifacts. Original-size and contact reviews passed for continuous hands/boots and direction identity. Runtime movement-to-hit transition and eight-way game evaluation remain the integration owner's responsibility.

Regenerate locally: node build.mjs giant explosive (Sharp imported from E:/cslgDemo/node_modules/sharp).
