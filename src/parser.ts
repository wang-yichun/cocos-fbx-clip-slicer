import path from 'node:path';
import type { ParsedClip } from './types.js';

const RANGE_PATTERN = /(.+?)(\d+)\s*(?:-|~|～|—|–|至|到)\s*(\d+)/gu;

function stripAssetExtensions(input: string): string {
  return path.basename(input).replace(/\.meta$/iu, '').replace(/\.fbx$/iu, '');
}

function normalizeLabel(rawLabel: string, index: number): string {
  let label = rawLabel
    .replace(/^[\s,，;；|/]+/u, '')
    .replace(/[\s,，;；|/]+$/u, '')
    .trim();

  if (index === 0) {
    label = label.replace(/^.*?[：:]/u, '').trim();
  }

  label = label.replace(/^(?:以及|并且|然后|和|及)\s*/u, '').trim();
  return label;
}

export function parseClipsFromFilename(input: string): ParsedClip[] {
  const source = stripAssetExtensions(input);
  const clips: ParsedClip[] = [];

  RANGE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = RANGE_PATTERN.exec(source)) !== null) {
    const rawLabel = match[1];
    const rawFrom = match[2];
    const rawTo = match[3];

    if (rawLabel === undefined || rawFrom === undefined || rawTo === undefined) {
      continue;
    }

    const label = normalizeLabel(rawLabel, clips.length);
    const fromFrame = Number(rawFrom);
    const toFrame = Number(rawTo);

    if (!label) {
      throw new Error(`无法识别帧范围 ${rawFrom}-${rawTo} 前面的动画名称。`);
    }

    if (!Number.isInteger(fromFrame) || !Number.isInteger(toFrame)) {
      throw new Error(`动画“${label}”的帧范围必须是整数。`);
    }

    if (fromFrame < 0 || toFrame < fromFrame) {
      throw new Error(`动画“${label}”的帧范围无效：${fromFrame}-${toFrame}。`);
    }

    clips.push({ label, fromFrame, toFrame });
  }

  if (clips.length === 0) {
    throw new Error('文件名中没有找到“动画名称0-30”格式的动画片段。');
  }

  for (let index = 1; index < clips.length; index += 1) {
    const previous = clips[index - 1];
    const current = clips[index];

    if (previous !== undefined && current !== undefined && current.fromFrame <= previous.toFrame) {
      throw new Error(
        `动画帧范围发生重叠：“${previous.label}”${previous.fromFrame}-${previous.toFrame} 与 ` +
          `“${current.label}”${current.fromFrame}-${current.toFrame}。`,
      );
    }
  }

  return clips;
}
