# MORI · 曙光营地 DEMO

主工程 `E:/cslgDemo`，浏览器交付、单机本地存档。当前版本 0.8：新增《夺回营地》序章、中路开局、关键操作强引导、荒地逐栋建设、画面外 GM 清档、破门王终战与黑金背弹僵尸。保留物资搜刮 → 禁区猎场 → 英雄成长与招募 → 内城补给闭环，普通猎场射速 4 发/秒。

双击 **Start-Demo.cmd**。本机：http://localhost:3010/#merged 。同一局域网：http://10.100.102.227:3010/#merged （电脑服务需运行，IP 变化时更新地址）。未修改旧 8080 原型服务。

## 试玩顺序

1. 开局中路三人：坦克、医疗兵、无人机输出。可拖动或点击换位，点击“开始搜刮”。支持暂停和 1/2/4 倍速。
2. 每关三波，整关首通获得黑金弹，开启“连续挑战”自动进入下一关；每五关的首领节点需要返回确认挑战。失败停下。重新布阵或刷新会从当前未通关关卡第一波重来。
3. 第一关后进入禁区猎场：按住/拖动瞄准，或持续开火。消耗黑金弹，获得能源核心并自动提升全队等级。每 200 核心发 1 招募券。实际消耗每 1000 弹产生运钞僵尸挑战资格，击破才获得橙色英雄。
4. 英雄页面可单抽/十连、查看九位英雄、用重复进度升星进阶，再返回搜刮上阵。新英雄共享当前等级；品质和星级独立成长，最高红色三星。
5. 第二关开放左路与内城；第四关开放右路。新序章初次进入内城给200建材：免费指挥部→100建材回收站→100建材弹药工厂，工厂建成另领150发备用弹。
6. 切换到猎场、英雄或内城时，搜刮继续，小窗显示实时进度。关闭/挂起浏览器不模拟离线战斗；内城依据时间戳累积，最多储存 20 批。

主画面外的 GM「清除存档」可确认后从序章重玩，设置中也可重置存档和领取有限应急补给。新循环使用 `mori.demo.campaign.v2`，旧版 v1 存档保留并备份，未将旧原型无限波次/赠券进度直接换算为本版本关卡。

## 美术与当前边界

持盾大汉、医疗兵、无人机手、大刀战士和狙击手使用人物序列帧；其余四位使用现有精灵与程序特效。初始三人动作可在 http://localhost:3010/animation-preview/index.html 放大、暂停和逐帧查看。狙击手已有多个射击朝向，其它动作和角色仍未全部完成多方向制作。内城地面与十二张阶段建筑独立分层；猎场九种僵尸已修复跨格裁剪。招募收敛为九名可实际战斗的英雄。

这是闭环接入版，数值为集中声明的试玩参数。引导包含短剧情、遮罩手势和分阶段解锁；全角色多方向动画、成套音效、真机性能调优和长线数值仍需后续完善。

## 开发和检查

- 安装：`npm ci`；本机 npm 包装器异常时用 `node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" ci`。
- 开发：`node node_modules/vinext/dist/cli.js dev --hostname 0.0.0.0 --port 3010`。
- 构建：`node node_modules/vinext/dist/cli.js build`。
- 类型：`node node_modules/typescript/bin/tsc --noEmit`。
- 逻辑：`node scripts/test-merged.mjs`、`node scripts/test-animation.mjs`、`node scripts/test-loop.mjs`、`node scripts/test-hunt-cadence.mjs`。

详见 [游戏设计](docs/游戏设计.md)、[技术架构](docs/技术架构.md)、[项目进展](docs/项目进展.md)。未修改 E:/mori、Unity 正式工程。

动画生产约束：docs/角色动画生产约束.md。最新站定动作构建：node scripts/build-animation-v07.mjs；验证：node scripts/check-animation-v07.mjs。动画预览：http://localhost:3010/animation-preview/index.html。v0.7增加清路跨路支援与残余僵尸转攻。

## 在线试玩

- 内网： http://10.100.102.227:3010/#merged
- 外网： https://mori-dawn-camp.berniekoko.chatgpt.site/
- GitHub： https://github.com/smc002/cslgDemo
- 序章独立存档：在试玩地址后使用 `?prologue=preview#merged`。

版本标识可通过各站点 `/demo-info.json` 核对。存档属于各访问地址的浏览器本地数据，不跨域同步。
