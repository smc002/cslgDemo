# 普通僵尸 v3：五朝向低幅拖步

本目录仅为美术产物，未改动项目 checkout。原创图片使用内置 image_gen 工具生成；Sharp 仅用于已有工作流的裁帧、透明边缘、固定下肢、图集装配与 QA。

## 交付与索引

- normal.png：2560×1600，8 列×5 行，320 单元。
- part.json：独立 archetype 数据，可合入总 manifest。
- 各行 S、SE、E、NE、N；每行 0–3 为 walk，4–6 为 hit，7 为 idle（本行 prepared 帧复制）。
- 全局脚锚点 [160,296]；visibleHeight 基准 236。不同朝向的透视缩短保留，未逐帧归一化。
- 左半空间朝向由运行时镜像 SE/E/NE，图集中是真实绘制的 5 个身体视角，没有旋转正面人物伪造方向。

## 动作定义

walk 用于移动、循环。slumped spine / dropped head / asymmetric shoulders / limp hands 为姿态基础。四拍依次为左脚短距接地右脚拖后、右脚低拖跟进、右脚短距接地左脚拖后、左脚低拖跟进；所有脚始终靠近地面。时长 0.20、0.11、0.22、0.15 秒。位移由游戏驱动，此工作没有改游戏速度。

hit 用于站定受击、非循环。准备为弯腰静止，发力为头肩后仰和一只手反射抬起，恢复回到弯腰。时长 0.05、0.10、0.13 秒。表现冲击在相对帧 1；不产生额外伤害时刻。每个方向的骨盆、下肢来自该方向 prepared，原地脚锚不变。idle 为相同 prepared。

## 追溯

- walk-source.png / hit-source.png：原始生成结果。
- walk-prompt.txt / hit-prompt.txt：完整提示词。
- crop-mapping.json：源边界、源脚底中心、统一缩放、目标位置。
- build.mjs / inspect.mjs：生产与验证脚本；运行 node build.mjs 重建。
- fixed-lower-S/SE/E/NE/N.png：逐方向实际固定下肢遮罩。
- validation.json：40 帧、透明、固定像素和运动差异数值。
- qa-contact.png：原尺寸最终全图。
- qa-game-size.png：50% 缩小检查。
- qa-hit-fixed.png：最终 hit 原尺寸三帧。
- qa-hit-overlay.png：准备和另外两帧半透明叠图，红线为脚底锚点。

固定下肢 seam 分别为 217/216/210/211/210。以准备帧为基底，替换 seam 以下的像素。横跨 seam 的前臂和手通过皮肤连通域识别，合并三个姿势的手部遮挡范围并向外扩 4px 保留描边，避免手被水平切断。因此像素一致性检验适用于下肢固定区域，手臂遮挡范围不是固定下肢区域。源图按 walk 整组 1.0260869565、hit 整组 0.8550724638 缩放，没有按每帧包围盒拉伸。

## 验收

已肉眼检查真正前/前右/右侧/后右/背面、低抬脚拖步、固定下肢接缝、半尺寸可读性。逐行 fixedLowerMismatchBytes=0，所有单元四周 4px edgeAlpha=0；walk 连续帧下肢不同，保留脚部接触变化。根任务负责游戏内移动→受击→移动切换、暂停/加速/死亡打断以及镜像方向测试，本美术任务不声称已完成这些运行时检查。
