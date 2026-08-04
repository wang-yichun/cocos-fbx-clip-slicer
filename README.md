# Cocos FBX Clip Slicer

Generate Cocos Creator FBX animation clip splits from artist-friendly filenames.

> Status: initial project scaffold. The CLI parses animation names and frame ranges from an FBX filename, previews the generated clips, safely backs up the `.fbx.meta` file, and updates only `userData.animationImportSettings[].splits`.

## Problem

Animation assets are often delivered with filenames such as:

```text
主角：正常待机0-30正常移动40-62售卖70-102游泳中循环110-145 持钻机采集190-225.fbx
```

Creating every clip manually in Cocos Creator is repetitive and error-prone. This tool turns the filename into animation split settings automatically.

## Requirements

- Node.js 20 or newer
- Cocos Creator 3.x FBX `.meta` files

## Install

```bash
npm install
npm run build
```

## Usage

Preview without changing the file:

```bash
node dist/cli.js "assets/角色待机0-30移动40-60攻击70-100.fbx" --dry-run
```

Apply changes and create a timestamped backup:

```bash
node dist/cli.js "assets/角色待机0-30移动40-60攻击70-100.fbx"
```

Use a custom clip-name mapping:

```bash
node dist/cli.js "assets/角色待机0-30移动40-60攻击70-100.fbx" --config clip-map.json
```

After applying changes, return to Cocos Creator and reimport the FBX asset.

## Filename format

Supported range separators include `-`, `~`, `～`, `—`, `–`, `至`, and `到`.

```text
动画名称0-30另一个动画40-62.fbx
```

The values are frame numbers. The tool reads the actual FPS from the FBX `.meta` file and converts frames to seconds.

## Safety

The tool deliberately modifies only:

```text
userData.animationImportSettings[].splits
```

It preserves the root UUID, material settings, texture settings, and other importer metadata. Before writing, it creates a timestamped `.bak` copy.

## Development

```bash
npm run typecheck
npm test
npm run build
```

## Roadmap

- Batch processing
- Interactive clip preview and editing
- Cocos Creator 3.8 editor extension
- Project-level reusable naming dictionaries

## License

MIT
