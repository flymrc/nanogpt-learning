# Live2D 模型授权

本目录里的 **Hiyori（桃瀬ひより）** 来自 Live2D 官方 Cubism 示例：

- 来源：[Live2D/CubismWebSamples](https://github.com/Live2D/CubismWebSamples) `Samples/Resources/Hiyori`
- 角色：[Hiyori Momose](https://www.live2d.com/en/learn/sample/)（Live2D 原创角色）

使用前需要同意：

1. [Live2D Free Material License Agreement](https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html)
2. [Terms of Use for Live2D Cubism Sample Data](https://www.live2d.com/en/learn/sample/model-terms/)

一般个人 / 小规模主体可以把该示例用于学习与展示。本游戏只在 **宽屏电脑**（CSS 宽度 ≥ 1024px，且非手机）加载模型；手机与竖屏完全不下载、不初始化 Live2D。

Cubism Core（`live2dcubismcore.min.js`）**没有**放进仓库，运行时从 Live2D 官方 CDN 加载。渲染用 [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display)（MIT）+ PixiJS。
