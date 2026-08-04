import assert from 'node:assert/strict';
import test from 'node:test';
import { applyClipsToMeta } from '../src/meta.js';
import type { CocosFbxMeta } from '../src/types.js';

const sourceMeta: CocosFbxMeta = {
  ver: '1.0.0',
  importer: 'fbx',
  uuid: 'root-resource-uuid',
  userData: {
    materialImportSettings: [{ remap: [] }],
    animationImportSettings: [
      {
        name: 'Take 001',
        fps: 30,
        duration: 14.666667,
        splits: [
          {
            name: 'Take 001',
            from: 0,
            to: 14.666667,
            wrapMode: 2,
            speed: 1,
            previousId: '73b7f',
          },
        ],
      },
    ],
  },
  subMetas: {
    '73b7f': {
      importer: 'animation-clip',
      uuid: 'animation-resource-uuid',
    },
  },
};

test('只更新动画 splits 并保留资源 UUID 和其他导入设置', () => {
  const result = applyClipsToMeta(
    sourceMeta,
    [
      { label: '正常待机', fromFrame: 0, toFrame: 30 },
      { label: '正常移动', fromFrame: 40, toFrame: 62 },
    ],
    {
      正常待机: { name: 'idle_axe', loop: true },
      正常移动: { name: 'run_axe', loop: true },
    },
  );

  assert.equal(result.fps, 30);
  assert.equal(result.meta.uuid, 'root-resource-uuid');
  assert.deepEqual(result.meta.subMetas, sourceMeta.subMetas);
  assert.deepEqual(result.meta.userData?.materialImportSettings, [{ remap: [] }]);

  const splits = result.meta.userData?.animationImportSettings?.[0]?.splits;
  assert.equal(splits?.length, 2);
  assert.equal(splits?.[0]?.name, 'idle_axe');
  assert.equal(splits?.[0]?.previousId, '73b7f');
  assert.equal(splits?.[1]?.name, 'run_axe');
  assert.equal(splits?.[1]?.from, 40 / 30);
  assert.equal(splits?.[1]?.to, 62 / 30);
  assert.match(splits?.[1]?.previousId ?? '', /^[0-9a-f]{5}$/u);

  assert.equal(sourceMeta.userData?.animationImportSettings?.[0]?.splits?.length, 1);
});

test('拒绝多 Take FBX，避免错误覆盖', () => {
  const multiTake = structuredClone(sourceMeta);
  const settings = multiTake.userData?.animationImportSettings;
  if (settings !== undefined) {
    settings.push({ name: 'Take 002', fps: 30, duration: 1, splits: [] });
  }

  assert.throws(
    () => applyClipsToMeta(multiTake, [{ label: '待机', fromFrame: 0, toFrame: 10 }]),
    /只支持单 Take FBX/u,
  );
});
