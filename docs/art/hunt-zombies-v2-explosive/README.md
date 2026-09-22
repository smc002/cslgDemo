# 爆炸僵尸手套一致性修正版

2026-09-22。内置 image_gen 精确编辑 v1 爆炸类 source，将 8 帧全部 16 只手统一为深炭灰手套。绿色前臂、8 个动作姿势、红盔、红罐、服装与整体轮廓保持原设计。原交付目录未改，项目 checkout 未改。

## 可复制文件

- `explosive.png`：1280×640 透明 atlas，4×2 布局，cell=320。
- `manifest.json`：保留另三类及 0–11 kind 映射，仅 explosive 元数据依据新 source 重建。
- `explosive-source.png`、`explosive-slicing.json`、`explosive-fixed-lower-mask.png`、`edit-prompt.txt`、`build-zombie-animations.mjs` 为生产追溯文件。
- `qa-contact.png`、`qa-hit-overlay.png`、`qa-game-size.png`、`validation.json` 为 QA 资料。

消费约定不变：walk 0–3，hit 4–6，备用恢复 7；foot=[160,296]；visibleHeight=displayHeight=236；hit时长=[0.06,0.10,0.12]。新受击 pelvis=[160,226]（比v1偏1px），所有动作仍共用同一缩放0.5673076923076923。

重新从准备帧4烘焙固定下肢。固定区域差异字节=0；四边4px透明边界alpha总和=0；三个相邻walk下肢差异分别16192、16094、13829。自动检查不能替代动作观察：已目视确认8帧双手颜色一致且存在真实迈腿、后仰、恢复。原v1说明中关于爆炸类单侧手套镜像交换的限制可以删除。

实际游戏暂停、加速、移动到受击的切换、死亡打断与功能识别仍由主代理接入测试。
