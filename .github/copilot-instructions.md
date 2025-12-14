# Fabric.js Copilot 说明

## 项目概况

Fabric.js 是一个功能强大且简单的 Javascript HTML5 画布库。该代码库是用 TypeScript 重写的版本 7（测试版）。

## 架构与核心概念

### 类层次结构

- **Base Object:** `FabricObject` (`src/shapes/Object/FabricObject.ts`) 是所有可渲染形状的根类。它继承自“InteractiveFabricObject”并使用诸如“FabricObjectSVGExportMixin”之类的混合。
- **Canvas:**
  - `StaticCanvas` (`src/canvas/StaticCanvas.ts`): 基本渲染循环，无交互性。
  - `Canvas` (`src/canvas/Canvas.ts`): 继承自`SelectableCanvas`（继承自`StaticCanvas`），添加交互性（鼠标/触摸事件、选择）。
- **Registry:** `classRegistry` (`src/ClassRegistry.ts`) 是序列化和反序列化的核心。所有形状类都必须使用“classRegistry.setClass(MyClass, 'my-class-name')”进行注册。

### Mixins Pattern

该项目使用 mixin 模式来共享功能。

-使用 applyMixins(TargetClass, [MixinClass]) 来应用 mixin。
-Mixin 通常在 `src/mixins` 中或与相关类一起定义。

### 事件系统

-事件在`src/EventTypeDefs.ts`中是强类型的。-对象和 Canvas 为“on”、“off”和“fire”方法实现“Observable”（“src/Observable.ts”）。

## 开发人员工作流程

### 建筑

- **Command:** `npm run build`
- **Tool:** Rollup
- **Output:** 在 `dist/` 中生成包。

### Testing

- **Tool:** Vitest
- **Commands:**
  - `npm run test:vitest`: 在 Node.js 环境（jsdom）中运行单元测试。
  - `npm run test:vitest:chromium`: 在 Chromium（Playwright）中运行测试。
  - `npm run test:vitest:all`: 运行所有测试项目。
- **Structure:** 测试位于源文件旁边（`*.spec.ts`，`*.test.ts`）。
- **Configuration:** `vitest.config.ts` 定义了项目（`unit-node`，`unit-chromium`，`unit-firefox`）。

### Linting & Formatting

- **Lint:** `npm run lint` (ESLint).
- **Format:** `npm run prettier:write` (Prettier).

## 编码约定

### TypeScript

- **Strictness:** 该项目使用严格的 TypeScript 配置。
- **Type Definitions:**
  - `src/typedefs.ts` 用于通用类型。
  - `src/EventTypeDefs.ts` 用于事件相关类型。
- **Assertions:** 使用 `src/util/typeAssertions.ts` 中的工具进行运行时检查（例如，`isActiveSelection`）。

### Directory Structure

-`src/shapes/`：形状实现（`Rect`、`Circle`、`Group` 等）。-`src/canvas/`：画布逻辑（`Canvas`、`StaticCanvas`）。-`src/controls/`：对象控制的逻辑（用于缩放、旋转的手柄）。-`src/util/`：实用函数（DOM、数学、杂项）。-`src/mixins/`：共享行为 mixins。

### Common Patterns

- **Creating a new Shape:**

1. 在 `src/shapes/` 中创建类。
2. 继承`FabricObject`。
3. 向`classRegistry`注册。
4. 实现`_render`方法。

- **Utilities:** 在适用的情况下，优先使用“src/util”中的帮助程序而不是本机 DOM/Math 调用（例如，“src/util/dom_event.ts”用于事件规范化）。

## Key Files

- `src/shapes/Object/FabricObject.ts`: 所有对象的基类。
- `src/canvas/Canvas.ts`: 主要的交互式画布类。
- `src/ClassRegistry.ts`: 可序列化类的注册表。
- `src/EventTypeDefs.ts`: 事件类型定义。
