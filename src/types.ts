export const WRAP_MODE_NORMAL = 0;
export const WRAP_MODE_LOOP = 2;

export interface ParsedClip {
  label: string;
  fromFrame: number;
  toFrame: number;
}

export interface ClipRuleObject {
  name: string;
  wrapMode?: number;
  loop?: boolean;
}

export type ClipRule = string | ClipRuleObject;
export type ClipMap = Record<string, ClipRule>;

export interface AnimationSplit {
  name: string;
  from: number;
  to: number;
  wrapMode: number;
  speed: number;
  previousId: string;
}

export interface GeneratedClip extends ParsedClip, AnimationSplit {}

export interface AnimationImportSetting {
  name?: string;
  fps: number;
  duration?: number;
  splits?: AnimationSplit[];
  [key: string]: unknown;
}

export interface CocosFbxMeta {
  importer: string;
  uuid?: string;
  userData?: {
    animationImportSettings?: AnimationImportSetting[];
    [key: string]: unknown;
  };
  subMetas?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ApplyResult {
  meta: CocosFbxMeta;
  clips: GeneratedClip[];
  fps: number;
}

export interface WriteResult extends ApplyResult {
  metaPath: string;
  backupPath?: string;
}
