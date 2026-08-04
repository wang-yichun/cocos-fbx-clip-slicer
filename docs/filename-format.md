# Filename format

The CLI reads animation names and frame ranges directly from the FBX filename.

## Basic format

```text
动画名称0-30另一个动画40-62.fbx
```

Supported separators:

```text
-  ~  ～  —  –  至  到
```

Examples:

```text
角色：待机0-30移动40-62攻击70-100.fbx
角色：待机0至30移动40～62攻击70到100.fbx
```

## Prefix handling

For the first clip, text before `:` or `：` is treated as an asset prefix and removed:

```text
主角：正常待机0-30
```

becomes:

```text
正常待机  0-30
```

Leading connector words on later clips are removed automatically. For example:

```text
钻机待机270-300和移动305-328
```

is parsed as:

```text
钻机待机  270-300
移动      305-328
```

## Validation

The parser rejects:

- Missing animation names
- Negative or reversed ranges
- Overlapping frame ranges
- Filenames without any recognizable range

Gaps between clips are allowed.

## Naming configuration

Filename labels can be mapped to stable code-facing clip names with a JSON file:

```json
{
  "正常待机": {
    "name": "idle_axe",
    "loop": true
  },
  "持钻机采集": {
    "name": "attack_rig",
    "loop": false
  }
}
```

Run with:

```bash
cocos-fbx-clip-slicer "path/to/model.fbx" --config clip-map.json
```

Without a mapping, the original label is used as the Clip name. Loop mode is inferred conservatively from labels such as `循环`, `待机`, `移动`, `跑步`, `游泳`, and `漂浮`.
