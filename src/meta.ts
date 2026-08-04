import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import type {
  AnimationSplit,
  ApplyResult,
  ClipMap,
  CocosFbxMeta,
  ParsedClip,
  WriteResult,
} from './types.js';
import { resolveClipRule } from './config.js';

function approximatelyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.000001;
}

function createPreviousId(usedIds: Set<string>): string {
  let id: string;
  do {
    id = crypto.randomBytes(3).toString('hex').slice(0, 5);
  } while (usedIds.has(id));

  usedIds.add(id);
  return id;
}

function resolvePreviousId(
  oldSplits: AnimationSplit[],
  from: number,
  to: number,
  index: number,
  usedIds: Set<string>,
): string {
  const sameRange = oldSplits.find(
    (split) => approximatelyEqual(split.from, from) && approximatelyEqual(split.to, to) && split.previousId,
  );

  if (sameRange !== undefined) {
    usedIds.add(sameRange.previousId);
    return sameRange.previousId;
  }

  const originalId = oldSplits[0]?.previousId;
  if (index === 0 && originalId !== undefined && originalId !== '') {
    usedIds.add(originalId);
    return originalId;
  }

  return createPreviousId(usedIds);
}

export function applyClipsToMeta(
  sourceMeta: CocosFbxMeta,
  parsedClips: ParsedClip[],
  clipMap: ClipMap = {},
): ApplyResult {
  const meta = structuredClone(sourceMeta);

  if (meta.importer !== 'fbx') {
    throw new Error(`不支持 importer=${meta.importer}，当前工具只处理 FBX meta。`);
  }

  const settings = meta.userData?.animationImportSettings;
  if (!Array.isArray(settings) || settings.length === 0) {
    throw new Error('meta 中没有找到 userData.animationImportSettings。');
  }

  if (settings.length !== 1) {
    throw new Error(`当前版本只支持单 Take FBX；该文件包含 ${settings.length} 个动画设置。`);
  }

  const setting = settings[0];
  if (setting === undefined) {
    throw new Error('无法读取 FBX 动画设置。');
  }

  const fps = Number(setting.fps);
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new Error(`meta 中的 FPS 无效：${String(setting.fps)}。`);
  }

  const oldSplits = Array.isArray(setting.splits) ? setting.splits : [];
  const usedIds = new Set<string>(Object.keys(meta.subMetas ?? {}));

  for (const split of oldSplits) {
    if (typeof split.previousId === 'string' && split.previousId !== '') {
      usedIds.add(split.previousId);
    }
  }

  const generatedClips = parsedClips.map((clip, index) => {
    const from = clip.fromFrame / fps;
    const to = clip.toFrame / fps;

    if (typeof setting.duration === 'number' && to > setting.duration + 1 / fps) {
      throw new Error(
        `动画“${clip.label}”的结束帧 ${clip.toFrame} 超过 FBX 动画总时长 ` +
          `${setting.duration.toFixed(6)} 秒（FPS=${fps}）。`,
      );
    }

    const rule = resolveClipRule(clip.label, clipMap);
    return {
      ...clip,
      name: rule.name,
      from,
      to,
      wrapMode: rule.wrapMode,
      speed: 1,
      previousId: resolvePreviousId(oldSplits, from, to, index, usedIds),
    };
  });

  setting.splits = generatedClips.map(({ name, from, to, wrapMode, speed, previousId }) => ({
    name,
    from,
    to,
    wrapMode,
    speed,
    previousId,
  }));

  return {
    meta,
    clips: generatedClips,
    fps,
  };
}

export function resolveMetaPath(inputPath: string): string {
  return inputPath.toLowerCase().endsWith('.meta') ? inputPath : `${inputPath}.meta`;
}

export async function updateMetaFile(
  inputPath: string,
  parsedClips: ParsedClip[],
  clipMap: ClipMap = {},
  dryRun = false,
): Promise<WriteResult> {
  const metaPath = resolveMetaPath(inputPath);
  const sourceText = await fs.readFile(metaPath, 'utf8');
  const sourceMeta = JSON.parse(sourceText) as CocosFbxMeta;
  const result = applyClipsToMeta(sourceMeta, parsedClips, clipMap);

  if (dryRun) {
    return {
      ...result,
      metaPath,
    };
  }

  const timestamp = new Date().toISOString().replace(/[:.]/gu, '-');
  const backupPath = `${metaPath}.${timestamp}.bak`;
  await fs.copyFile(metaPath, backupPath);
  await fs.writeFile(metaPath, `${JSON.stringify(result.meta, null, 2)}\n`, 'utf8');

  return {
    ...result,
    metaPath,
    backupPath,
  };
}
