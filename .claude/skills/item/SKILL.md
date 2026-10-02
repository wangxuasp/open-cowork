---
name: tc-item-ops
description:
  用于操作零组件（Item）的技能，支持创建、删除、查询零组件信息以及零组件使用影响分析（Where Used）。
  当用户提到零件管理、创建零件、删除零件、查询零件详情、零件影响分析等操作时，务必使用此技能。
  即使用户只是简单提及"零件"、"item"或相关操作，也应触发此技能。
---

# 零组件技能

通过 HTTP GET 请求操作零件数据，所有操作均通过 `/item` 接口完成，使用 `action` 参数区分不同操作类型。

## 基础配置

- **Base URL**: `{TEAMCENTER_RICH_CLIENT_MICROSERVICE_URL}`
- **接口路径**: `/item`
- **请求方式**: HTTP GET
- **工具**: `httpGet`

---

## 操作说明

### 1. 创建零件

**描述**: 根据零件名称、类型和父级文件夹 UID 创建零件。零组件默认类型Item

**参数**:

| 参数名 | 类型   | 必填 | 说明             |
| ------ | ------ | ---- | ---------------- |
| action | string | 是   | 固定值：`create` |
| name   | string | 是   | 零件名称         |
| type   | string | 是   | 零件类型         |
| uid    | string | 否   | 父级文件夹 UID   |

**示例请求**:

```
GET /item?action=create&name=螺栓A&type=标准件&uid=folder-001
```

---

### 2. 删除零件

**描述**: 根据零件 UID 删除零件。

**参数**:

| 参数名 | 类型   | 必填 | 说明             |
| ------ | ------ | ---- | ---------------- |
| action | string | 是   | 固定值：`delete` |
| uid    | string | 是   | 零件 UID         |

**示例请求**:

```
GET /item?action=delete&uid=item-001
```

---

### 3. 查询零件详情

**描述**: 根据零件 UID 查询零件的详细信息。

**参数**:

| 参数名 | 类型   | 必填 | 说明            |
| ------ | ------ | ---- | --------------- |
| action | string | 是   | 固定值：`query` |
| uid    | string | 是   | 零件 UID        |

**示例请求**:

```
GET /item?action=query&uid=item-001
```

---

### 4. 零件使用影响分析（Where Used）

**描述**: 根据零件 UID 查询该零件被哪些上层结构使用，用于影响分析。

**参数**:

| 参数名 | 类型   | 必填 | 说明                |
| ------ | ------ | ---- | ------------------- |
| action | string | 是   | 固定值：`whereused` |
| uid    | string | 是   | 零件 UID            |

**示例请求**:

```
GET /item?action=whereused&uid=item-001
```

---

## 操作流程

1. **明确用户意图**：判断用户需要执行创建、删除、查询还是影响分析操作。
2. **收集必要参数**：
   - 创建操作：需要 `name`、`type`、`uid`（父级文件夹）
   - 删除/查询/影响分析：需要 `uid`（零件本身的 UID）
3. **构造请求**：使用 `httpGet` 工具，拼接正确的 `action` 和对应参数。
4. **返回结果**：将接口返回内容以清晰易懂的方式呈现给用户。

---

## 注意事项

- 所有操作均使用 **GET** 方法，参数通过 Query String 传递。
- `uid` 在不同操作中含义不同：创建时是**父级文件夹**的 UID，其余操作是**零件本身**的 UID，请在调用前向用户确认。格式如`wivl6c7iZ_jnSD`
- 如果用户未提供必要参数，应主动询问，不要使用默认值或猜测。

## 中文/非 ASCII 参数编码规范（Windows 环境必须遵守）

1. 任何含中文等非 ASCII 字符的参数（name、filePath 等），**禁止**使用 argv 方式传参：
   `curl --data-urlencode "name=中文"` —— Windows 下 curl.exe 的 argv 会经 ANSI(GBK) 代码页转换，实际编码的是 GBK 字节，服务端按 UTF-8 解码必报 `500 Tried to read incomplete UTF8 decoded String`。
2. 以下两种方式任选其一（均已实测可靠）：
   - **预编码（首选）**：参数先做 UTF-8 percent-encoding，拼成纯 ASCII URL 后直接 GET。
     示例：`GET <BASE_URL>?action=create&name=%E4%B8%BB%E6%9D%BF&uid=xxx`（即"主板"的 UTF-8 编码）
   - **stdin 管道**：`printf '%s' '中文' | curl -s -G "<BASE_URL>" --data-urlencode "action=xxx" --data-urlencode "name@-" ...`（字节经管道传输，绕过 argv 转换）
3. 含中文的写操作逐条**串行**执行，不要并发。
