运钞僵尸两帧死亡动画（2026-10-09）

制作：内置 image_gen，依据正式 zombie-courier.png 保持角色身份与材质。
原图：death-source.png；完整提示词：prompt.json。
正式资源：public/assets/hunt/courier-death-v1/death-0.png、death-1.png。
重建：node scripts/build-courier-death-assets.mjs。

第一帧 0–0.28 秒：屈膝撑地，低头、背箱下坠。
第二帧 0.28–1.1 秒：身体伏地、背箱打开、装甲散落。
1.1–1.5 秒：倒地姿势淡出，不循环。
两个关键帧共用脚底锚点与物理缩放；根据原角色朝向镜像。
运钞奖励总时长、票券金额和到账逻辑保持原行为。

验收页 /art-review/fire 的“03 运钞大奖”新增两帧定位按钮。
测试：node scripts/test-courier-death-vfx.mjs（透明图、时序、缩放、朝向、降级）
奖励回归：node scripts/test-courier-tickets.mjs。
