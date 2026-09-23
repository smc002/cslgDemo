# 连续步态与受击闪白

复用 v3 原图的五个站姿视角，左侧三向镜像。通过 hunt/zombie-gait.ts 分离两腿，以髋、膝、踝连续变形，脚掌保持刚性；60% 支撑、40% 抬脚回摆。全身只叠加轻微重心起伏。四种基础形象覆盖全部 12 种僵尸。

命中只改变颜色，0.13 秒内恢复，不切换 hit 图、不暂停步态、不锁朝向。冻结仍暂停时钟。

游戏与 public/animation-preview/hunt.html 共用 Canvas 渲染器。此目录的 PNG/GIF 使用同一几何函数经 SVG 离线渲染，用于检查肢体边缘和迈步姿势；不是浏览器实测截图。GIF 仅以 20 fps 展示一个循环，游戏按 requestAnimationFrame 连续采样。

重建：node scripts/build-hunt-animation-preview.mjs；node scripts/render-hunt-gait-review.mjs。
