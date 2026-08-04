import fs from 'node:fs/promises';
import type { ClipMap, ClipRuleObject } from './types.js';
import { WRAP_MODE_LOOP, WRAP_MODE_NORMAL } from './types.js';

function inferWrapMode(label: string): number {
  const loopKeywords = ['循环', '待机', '移动', '奔跑', '跑步', '游泳', '漂浮', 'idle', 'run', 'walk', 'loop'];
  const normalized = label.toLowerCase();
  return loopKeywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
    ? WRAP_MODE_LOOP
    : WRAP_MODE_NORMAL;
}

function validateRule(label: string, rule: unknown): asserts rule is string | ClipRuleObject {
  if (typeof rule === 'string' && rule.trim()) {
    return;
  }

  if (typeof rule !== 'object' || rule === null) {
    throw new Error(`配置项“${label}”必须是字符串或对象。`);
  }

  const candidate = rule as Partial<ClipRuleObject>;
  if (typeof candidate.name !== 'string' || !candidate.name.trim()) {
    throw new Error(`配置项“${label}”缺少有效的 name。`);
  }

  if (candidate.wrapMode !== undefined && !Number.isInteger(candidate.wrapMode)) {
    throw new Error(`配置项“${label}”的 wrapMode 必须是整数。`);
  }

  if (candidate.loop !== undefined && typeof candidate.loop !== 'boolean') {
    throw new Error(`配置项“${label}”的 loop 必须是布尔值。`);
  }
}

export async function loadClipMap(configPath?: string): Promise<ClipMap> {
  if (configPath === undefined) {
    return {};
  }

  const text = await fs.readFile(configPath, 'utf8');
  const parsed: unknown = JSON.parse(text);

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Clip 映射配置的根节点必须是对象。');
  }

  for (const [label, rule] of Object.entries(parsed)) {
    validateRule(label, rule);
  }

  return parsed as ClipMap;
}

export function resolveClipRule(label: string, clipMap: ClipMap): { name: string; wrapMode: number } {
  const rule = clipMap[label];

  if (typeof rule === 'string') {
    return {
      name: rule.trim(),
      wrapMode: inferWrapMode(label),
    };
  }

  if (rule !== undefined) {
    const wrapMode =
      rule.wrapMode ?? (rule.loop === undefined ? inferWrapMode(label) : rule.loop ? WRAP_MODE_LOOP : WRAP_MODE_NORMAL);

    return {
      name: rule.name.trim(),
      wrapMode,
    };
  }

  return {
    name: label,
    wrapMode: inferWrapMode(label),
  };
}
