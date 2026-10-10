# 新美术资源接入清单 · Toy V1

日期：2026-10-08。工程：E:/cslgDemo。

## 本次交付

采用现有 Canvas 2D 工程，使用有立体质感的透明 PNG 精灵（2.5D 观感）。不改成实时 3D，避免重做模型、骨骼、材质与渲染管线。

首轮共 42 张：9 名英雄、13 种僵尸、5 张场景、12 座建筑、3 个载具部件。全部落盘到 public/assets/toy-v1/。游戏入口 /#merged；美术总览 /art-review。

角色世界显示比例为 1.26（由 1.40 下调 10%）；普通英雄可见高度 65.52 逻辑像素，坦克槽位 76.86；搜刮普通僵尸 50.4、大型 71.82、Boss 131.04。猎场可见高度为旧物种 size × 1.12 × 1.26。头像按界面槽位适配。

## 英雄与存档映射

| 原存档 ID / 索引 | 新名字 | 资源 | 沿用定位 |
|---|---|---|---|
| shield / 0 | 胖雷 | hero-tank.png | 坦克 |
| medic / 1 | 仟手 | hero-medic.png | 治疗 |
| drone / 2 | 贾伟思 | hero-energy.png | 输出 |
| samurai / 3 | T-100 | hero-cyborg.png | 坦克 |
| guitar / 4 | 大白 | hero-robot.png | 治疗 |
| assassin / 5 | 梨 | hero-assassin.png | 输出 |
| minigun / 6 | 琴 | hero-fire.png | 坦克 |
| priest / 7 | 陆尼艾 | hero-priest.png | 治疗 |
| sniper / 8 | 霜华 | hero-frost.png | 输出 |

按用户选择保留旧数值和存档；定位沿用项目而非海报。因此琴仍继承原坦克槽位。血量、伤害系数、冷却、稀有度、奖励、招募概率和存档键未调整。发射点按新武器位置校准，会改变弹道的起始位置及飞行距离，未保证逐帧战斗轨迹与旧版完全一致。

僵尸 kind 0–12 依次为普通、奔跑者、装甲、巨型、奖励、爆炸、散射、电弧、冰冻、装甲运钞、棱镜工程、散弹工程、黑金。各自使用独立源图。搜刮场景按原有敌人类别映射普通、装甲、巨型；Boss 沿用放大的巨型造型。

## 已接入位置

- 搜刮：背景、九位英雄、三类基础敌人与 Boss、血条定位、武器发射点、刺客残影、治疗符号。
- 猎场：全部十三种僵尸，普通/冰冻/变电站背景，运钞僵尸与黑金僵尸倒地表现，底盘/炮塔/平台独立部件。
- 英雄界面：招募立绘、英雄头像、新名字；新手引导同步名字。
- 主城：地形与十二座建筑。六个规划建筑仅替换外观，没有开放功能。
- 主城地形第二版：运行时改用 `city-terrain-organic.png`，弯曲土路连接指挥部碎石前庭、工厂车辙作业区、仓库装卸空地和回收站堆料边缘；绿地与石块形成不规则分区。建筑仍独立叠加，原有建造顺序、位置与交互不变。旧 `city-terrain.png` 保留作历史参考。内置 image_gen 生成，完整提示词见 `city-terrain-organic-prompt.json`。

## 尺寸和交付要求

下表为实际生成尺寸，不把提示词里的目标尺寸当作最终尺寸。透明资产使用 RGBA PNG；场景为不透明 PNG。原始图保持不变，运行时根据 shared/toy-art-data.json 的可见边界裁取，统一脚底锚点。所有源图均附 SHA-256 于 manifest.json。

| 文件 | 实际尺寸 px | 透明 |
|---|---|---|
| city-armory.png | 1254 × 1254 | 是 |
| city-barracks.png | 1254 × 1254 | 是 |
| city-comms.png | 1254 × 1254 | 是 |
| city-drone.png | 1254 × 1254 | 是 |
| city-factory.png | 1254 × 1254 | 是 |
| city-garage.png | 1254 × 1254 | 是 |
| city-hq.png | 1254 × 1254 | 是 |
| city-medical.png | 1254 × 1254 | 是 |
| city-power.png | 1254 × 1254 | 是 |
| city-research.png | 1254 × 1254 | 是 |
| city-terrain.png | 948 × 1659 | 否 |
| city-terrain-organic.png | 948 × 1659 | 否 |
| city-warehouse.png | 1254 × 1254 | 是 |
| city-workshop.png | 1254 × 1254 | 是 |
| hero-assassin.png | 1254 × 1254 | 是 |
| hero-cyborg.png | 1254 × 1254 | 是 |
| hero-energy.png | 1254 × 1254 | 是 |
| hero-fire.png | 1254 × 1254 | 是 |
| hero-frost.png | 1254 × 1254 | 是 |
| hero-medic.png | 1254 × 1254 | 是 |
| hero-priest.png | 1254 × 1254 | 是 |
| hero-robot.png | 1254 × 1254 | 是 |
| hero-tank.png | 1254 × 1254 | 是 |
| hunt-frozen.png | 1024 × 1536 | 否 |
| hunt-ground.png | 1024 × 1536 | 否 |
| hunt-substation.png | 1024 × 1536 | 否 |
| street.png | 948 × 1659 | 否 |
| vehicle-chassis.png | 1164 × 1351 | 是 |
| vehicle-platform.png | 1308 × 1202 | 是 |
| vehicle-turret.png | 980 × 1605 | 是 |
| zombie-armored.png | 1254 × 1254 | 是 |
| zombie-courier.png | 1254 × 1254 | 是 |
| zombie-electric.png | 1254 × 1254 | 是 |
| zombie-explosive.png | 1254 × 1254 | 是 |
| zombie-giant.png | 1254 × 1254 | 是 |
| zombie-gold.png | 1254 × 1254 | 是 |
| zombie-ice.png | 1254 × 1254 | 是 |
| zombie-normal.png | 1254 × 1254 | 是 |
| zombie-prism.png | 1254 × 1254 | 是 |
| zombie-reward.png | 1254 × 1254 | 是 |
| zombie-runner.png | 1254 × 1254 | 是 |
| zombie-scatter.png | 1254 × 1254 | 是 |
| zombie-shotgun.png | 1254 × 1254 | 是 |

## 动作与制作边界

现有 46 张基础资源之外，新增 22 张动作图集，共 68 张运行资源。每角色 4 帧行走、4 帧攻击，总计 176 帧。图集 1024×512，单格 256×256，RGBA；源图和生成提示词均已保留。运行时直接采样独立绘制的肢体姿势，已删除单张立绘变形。

九位英雄战场统一背朝玩家、面向上方；头像和剧情立绘保持正面。怪物使用正面三分之四视角。当前为固定视角动作，不是八方向动画。攻击关键帧跟随现有前摇／命中时序，暂停与加速沿用战斗时钟；死亡只保留淡出，不新增死亡动作。

建筑仍每类一张基础外观。详见《战场布局与逐帧动画更新.md》。

## 代码与回退

资源映射、比例与运行时动作：shared/toy-art.ts。边界与发射点：shared/toy-art-data.json。载具炮口和转轴：hunt/vehicle-rig.ts，渲染、子弹和枪口闪光共享坐标。

新增目录与旧资源分开保存，未删除旧图。回退应只恢复本批代码与资源引用；不要整体 reset 仓库，仓库原有其他未提交修改。

各资产完整生成提示词保存在本目录 JSON；最早确认的五张样图提示词见 approved-samples-prompts.json。新增图均通过内置 image_gen 生成；没有用程序绘图替代角色原画。

## 验证记录

TypeScript、受改文件 lint、生产构建通过。战斗技能/伤害时序/死亡取消、旧存档与经济、基地升级、猎场射击频率、返弹奖励、转向炮口一致性回归通过。浏览器使用独立测试存档，不改用户现有存档。截图与浏览器检查记录位于本聊天 outputs/toy-v1/。

## 序章一致性修订

新增 4 张序章场景/道具图，当前共 46 张。原阿栓 NPC 退出主流程，贾伟思承担主线通讯。完整剧情与遗漏检查见 [序章重写与一致性检查](序章重写与一致性检查.md)。只读预览 /story-review。
