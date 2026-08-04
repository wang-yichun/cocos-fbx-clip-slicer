import assert from 'node:assert/strict';
import test from 'node:test';
import { parseClipsFromFilename } from '../src/parser.js';

test('解析连续中文动画名称和帧范围', () => {
  const filename =
    '主角：正常待机0-30正常移动40-62售卖70-102游泳中循环110-145 ' +
    '持钻机和矿刀移动150-185持钻机采集190-225持矿刀采集230-255' +
    '钻机待机270-300和移动305-328镐子漂浮待机330-371钻机漂浮待机375-412升级武器420-440.fbx';

  const clips = parseClipsFromFilename(filename);

  assert.equal(clips.length, 12);
  assert.deepEqual(clips[0], {
    label: '正常待机',
    fromFrame: 0,
    toFrame: 30,
  });
  assert.deepEqual(clips[8], {
    label: '移动',
    fromFrame: 305,
    toFrame: 328,
  });
  assert.deepEqual(clips[11], {
    label: '升级武器',
    fromFrame: 420,
    toFrame: 440,
  });
});

test('支持中文范围分隔符', () => {
  const clips = parseClipsFromFilename('角色：待机0至30移动40～60攻击70到100.fbx');
  assert.deepEqual(
    clips.map(({ label, fromFrame, toFrame }) => [label, fromFrame, toFrame]),
    [
      ['待机', 0, 30],
      ['移动', 40, 60],
      ['攻击', 70, 100],
    ],
  );
});

test('拒绝重叠帧范围', () => {
  assert.throws(
    () => parseClipsFromFilename('待机0-30移动30-60.fbx'),
    /帧范围发生重叠/u,
  );
});
