#!/usr/bin/env node

import { loadClipMap } from './config.js';
import { updateMetaFile } from './meta.js';
import { parseClipsFromFilename } from './parser.js';
import { WRAP_MODE_LOOP } from './types.js';

interface CliOptions {
  inputPath: string;
  configPath?: string;
  dryRun: boolean;
}

function printHelp(): void {
  console.log(`
Cocos FBX Clip Slicer

用法：
  cocos-fbx-clip-slicer <fbx-or-meta-path> [选项]

选项：
  --config <path>   使用自定义 Clip 映射 JSON
  --dry-run         只预览，不修改 .meta 文件
  -h, --help        显示帮助

示例：
  cocos-fbx-clip-slicer "assets/角色待机0-30移动40-60攻击70-100.fbx" --dry-run
  cocos-fbx-clip-slicer "assets/角色待机0-30移动40-60攻击70-100.fbx" --config clip-map.json
`);
}

function parseArguments(args: string[]): CliOptions | null {
  let inputPath: string | undefined;
  let configPath: string | undefined;
  let dryRun = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '-h' || argument === '--help') {
      printHelp();
      return null;
    }

    if (argument === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (argument === '--config') {
      const value = args[index + 1];
      if (value === undefined || value.startsWith('-')) {
        throw new Error('--config 后面必须提供 JSON 文件路径。');
      }
      configPath = value;
      index += 1;
      continue;
    }

    if (argument?.startsWith('--config=')) {
      configPath = argument.slice('--config='.length);
      continue;
    }

    if (argument?.startsWith('-')) {
      throw new Error(`未知选项：${argument}`);
    }

    if (argument !== undefined && inputPath === undefined) {
      inputPath = argument;
      continue;
    }

    if (argument !== undefined) {
      throw new Error(`只能处理一个 FBX；发现多余参数：${argument}`);
    }
  }

  if (inputPath === undefined) {
    printHelp();
    throw new Error('缺少 FBX 或 .fbx.meta 文件路径。');
  }

  return configPath === undefined
    ? { inputPath, dryRun }
    : { inputPath, configPath, dryRun };
}

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  if (options === null) {
    return;
  }

  const parsedClips = parseClipsFromFilename(options.inputPath);
  const clipMap = await loadClipMap(options.configPath);
  const result = await updateMetaFile(options.inputPath, parsedClips, clipMap, options.dryRun);

  console.table(
    result.clips.map((clip, index) => ({
      '#': index + 1,
      原始名称: clip.label,
      Clip名称: clip.name,
      帧范围: `${clip.fromFrame}-${clip.toFrame}`,
      时间范围: `${clip.from.toFixed(6)}-${clip.to.toFixed(6)}`,
      模式: clip.wrapMode === WRAP_MODE_LOOP ? 'Loop' : `WrapMode ${clip.wrapMode}`,
      previousId: clip.previousId,
    })),
  );

  console.log(`FPS: ${result.fps}`);
  console.log(`Meta: ${result.metaPath}`);

  if (options.dryRun) {
    console.log('预览完成：未修改任何文件。');
  } else {
    console.log(`备份: ${result.backupPath}`);
    console.log('写入完成。请回到 Cocos Creator 中重新导入该 FBX。');
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`处理失败：${message}`);
  process.exitCode = 1;
});
