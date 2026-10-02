---
name: tc-bop-ops
description: BOP（工艺结构 / Bill of Process）相关操作技能。
  当用户创建工艺、创建工序、创建工艺结构、创建单层工艺、挂载工序、指派工序资源（装入件、设备、工装）时使用此技能。
  触发关键词：BOP、工艺、工序、工艺结构、单层工艺、装入件、设备、工装、指派资源、MEProcess、MEOP、MEConsumed、METool、MEEquipment、bop create。
---

# BOP 操作技能

## 支持的操作

| 操作                | 说明                                              |
| ------------------- | ------------------------------------------------- |
| 1、创建工艺         | 经零组件接口创建，`type` 默认 `MEProcess`         |
| 2、创建工序         | 经零组件接口创建，`type` 默认 `MEOP`              |
| 3、创建单层工艺结构 | 为指定父级节点建立一组子级节点关系（如工艺→工序） |
| 4、指派工序资源     | 为工序指派装入件、设备或工装                      |

---

## 操作一：创建工艺

### 功能说明

通过零组件创建接口创建工艺对象。`type` 未指定时默认 `MEProcess`。

### 前置条件

执行前必须收集以下信息：

| 参数   | 是否必填 | 说明                       |
| ------ | -------- | -------------------------- |
| `name` | ✅ 必填  | 工艺名称                   |
| `type` | ❌ 可选  | 对象类型，默认 `MEProcess` |
| `uid`  | ❌ 可选  | 父级文件夹 UID             |

若用户未提供，按以下顺序询问：

1. 「请提供工艺名称」
2. 「请提供 type（直接回车则默认 MEProcess）」
3. 「如需放入指定文件夹，请提供父级文件夹 UID（可跳过）」

### 执行步骤

#### 第一步：构造请求

使用 `httpGet` 工具，{TEAMCENTER_RICH_CLIENT_MICROSERVICE_URL}由实际访问URL替换：

```
GET {TEAMCENTER_RICH_CLIENT_MICROSERVICE_URL}/tcai/item?action=create&name={process_name}&type=MEProcess
```

若提供了父级文件夹 UID，追加 `&uid={folder_uid}`。

含中文的 `name` 必须按文末「中文/非 ASCII 参数编码规范」处理。

#### 第二步：处理返回结果

| status | 含义       | 响应用户                                         |
| ------ | ---------- | ------------------------------------------------ |
| 200    | 创建成功   | ✅ 工艺创建成功，UID：`{uid}`，type：`MEProcess` |
| 400    | 参数错误   | ❌ 请求参数有误，请检查 name / type              |
| 500    | 服务器错误 | ❌ 服务器异常，请稍后重试                        |
| error  | 网络异常   | ❌ 无法连接服务器，请确认服务是否启动            |

---

## 操作二：创建工序

### 功能说明

通过零组件创建接口创建工序对象。`type` 未指定时默认 `MEOP`。

### 前置条件

执行前必须收集以下信息：

| 参数   | 是否必填 | 说明                  |
| ------ | -------- | --------------------- |
| `name` | ✅ 必填  | 工序名称              |
| `type` | ❌ 可选  | 对象类型，默认 `MEOP` |
| `uid`  | ❌ 可选  | 父级文件夹 UID        |

若用户未提供，按以下顺序询问：

1. 「请提供工序名称」
2. 「请提供 type（直接回车则默认 MEOP）」
3. 「如需放入指定文件夹，请提供父级文件夹 UID（可跳过）」

### 执行步骤

#### 第一步：构造请求

使用 `httpGet` 工具，{TEAMCENTER_RICH_CLIENT_MICROSERVICE_URL}由实际访问URL替换：

```
GET {TEAMCENTER_RICH_CLIENT_MICROSERVICE_URL}/tcai/item?action=create&name={operation_name}&type=MEOP
```

若提供了父级文件夹 UID，追加 `&uid={folder_uid}`。

含中文的 `name` 必须按文末「中文/非 ASCII 参数编码规范」处理。

#### 第二步：处理返回结果

| status | 含义       | 响应用户                                    |
| ------ | ---------- | ------------------------------------------- |
| 200    | 创建成功   | ✅ 工序创建成功，UID：`{uid}`，type：`MEOP` |
| 400    | 参数错误   | ❌ 请求参数有误，请检查 name / type         |
| 500    | 服务器错误 | ❌ 服务器异常，请稍后重试                   |
| error  | 网络异常   | ❌ 无法连接服务器，请确认服务是否启动       |

---

## 操作三：创建单层工艺结构

### 功能说明

在父级节点下批量挂载子级节点，建立单层工艺结构（如工艺→工序，或工序→下级）。
一次调用只建立**一层**父子关系，多层结构需多次调用。

### 前置条件

执行前必须收集以下信息：

| 参数       | 是否必填 | 说明                              |
| ---------- | -------- | --------------------------------- |
| `parent`   | ✅ 必填  | 父级节点的 UID                    |
| `children` | ✅ 必填  | 子级节点 UID 的集合，至少提供一个 |

若用户未提供，按以下顺序询问：

1. 「请提供父级节点的 UID」
2. 「请提供子级节点的 UID，多个请用逗号分隔」
3. 获得对象的 UID（格式示例：`gXhVErqOZ_jnSD`）
4. UID 必须符合标准 UUID 格式，否则拒绝执行并重新询问

### 执行步骤

#### 第一步：构造请求体

将收集到的参数组装为 JSON：

```json
{
  "parent": "{parent_uid}",
  "children": ["{child_uid_1}", "{child_uid_2}"]
}
```

#### 第二步：调用创建接口

使用 `httpPost` 工具，{TEAMCENTER_RICH_CLIENT_MICROSERVICE_URL}由实际访问URL替换传入以下参数：

- path：`{TEAMCENTER_RICH_CLIENT_MICROSERVICE_URL}/bop/create/single`
- body：第一步构造的 JSON 对象

#### 第三步：处理返回结果

根据返回的 status 值响应用户：

| status | 含义       | 响应用户                                                     |
| ------ | ---------- | ------------------------------------------------------------ |
| 200    | 创建成功   | ✅ 单层工艺结构创建成功，父级 `{parent}` 已挂载 {n} 个子节点 |
| 400    | 参数错误   | ❌ 请求参数有误，请检查 UID 格式是否正确                     |
| 404    | 节点不存在 | ❌ 父级或子级节点不存在，请确认 UID 是否有效                 |
| 409    | 关系已存在 | ⚠️ 部分或全部子节点已在该工艺结构下，无需重复创建            |
| 500    | 服务器错误 | ❌ 服务器异常，请稍后重试                                    |
| error  | 网络异常   | ❌ 无法连接服务器，请确认服务是否启动                        |

---

## 操作四：指派工序资源

### 功能说明

为指定工序指派工艺资源。支持的资源类型（英文枚举）：

| resourceType  | 含义           |
| ------------- | -------------- |
| `MEConsumed`  | 装入件（默认） |
| `METool`      | 工装           |
| `MEEquipment` | 设备           |

### 前置条件

执行前必须收集以下信息：

| 参数           | 是否必填 | 说明                                                                         |
| -------------- | -------- | ---------------------------------------------------------------------------- |
| `operation`    | ✅ 必填  | 工序节点的 UID                                                               |
| `resourceType` | ✅ 必填  | 资源类型：`MEConsumed` / `METool` / `MEEquipment`，未指定时默认 `MEConsumed` |
| `resources`    | ✅ 必填  | 资源对象 UID 的集合，至少提供一个                                            |

若用户未提供，按以下顺序询问：

1. 「请提供工序节点的 UID」
2. 「请提供资源类型：MEConsumed（装入件）、METool（工装）、MEEquipment（设备）；直接回车则默认装入件」
3. 「请提供资源对象的 UID，多个请用逗号分隔」
4. UID 必须符合标准 UUID 格式，否则拒绝执行并重新询问
5. `resourceType` 必须为上述三个枚举之一，否则拒绝执行并重新询问

### 执行步骤

#### 第一步：构造请求体

将收集到的参数组装为 JSON：

```json
{
  "operation": "{operation_uid}",
  "resourceType": "MEConsumed",
  "resources": ["{resource_uid_1}", "{resource_uid_2}"]
}
```

#### 第二步：调用指派接口

使用 `httpPost` 工具，{TEAMCENTER_RICH_CLIENT_MICROSERVICE_URL}由实际访问URL替换传入以下参数：

- path：`{TEAMCENTER_RICH_CLIENT_MICROSERVICE_URL}/bop/assign/resource`
- body：第一步构造的 JSON 对象

#### 第三步：处理返回结果

根据返回的 status 值响应用户：

| status | 含义       | 响应用户                                                                |
| ------ | ---------- | ----------------------------------------------------------------------- |
| 200    | 指派成功   | ✅ 资源指派成功，工序 `{operation}` 已关联 {n} 个 `{resourceType}` 资源 |
| 400    | 参数错误   | ❌ 请求参数有误，请检查 UID 格式或 resourceType 枚举是否正确            |
| 404    | 节点不存在 | ❌ 工序或资源节点不存在，请确认 UID 是否有效                            |
| 409    | 关系已存在 | ⚠️ 部分或全部资源已指派到该工序，无需重复指派                           |
| 500    | 服务器错误 | ❌ 服务器异常，请稍后重试                                               |
| error  | 网络异常   | ❌ 无法连接服务器，请确认服务是否启动                                   |

---

## 安全要求

- `parent`、`children`、`operation`、`resources` 的值只能来自用户明确提供的 UID，不得推断或伪造
- 创建工艺/工序走零组件接口 `GET /tcai/item?action=create`：工艺默认 `type=MEProcess`，工序默认 `type=MEOP`
- `resourceType` 只能是 `MEConsumed`、`METool`、`MEEquipment` 三者之一
- 禁止将其他用户输入拼接到请求体中
- `children` 与 `resources` 必须为数组格式，即使只有一个元素也需包装为数组：`["uid"]`

## 中文/非 ASCII 参数编码规范（Windows 环境必须遵守）

1. 任何含中文等非 ASCII 字符的参数（name、filePath 等），**禁止**使用 argv 方式传参：
   `curl --data-urlencode "name=中文"` —— Windows 下 curl.exe 的 argv 会经 ANSI(GBK) 代码页转换，实际编码的是 GBK 字节，服务端按 UTF-8 解码必报 `500 Tried to read incomplete UTF8 decoded String`。
2. 以下两种方式任选其一（均已实测可靠）：
   - **预编码（首选）**：参数先做 UTF-8 percent-encoding，拼成纯 ASCII URL 后直接 GET。
     示例：`GET <BASE_URL>?action=create&name=%E4%B8%BB%E6%9D%BF&uid=xxx`（即"主板"的 UTF-8 编码）
   - **stdin 管道**：`printf '%s' '中文' | curl -s -G "<BASE_URL>" --data-urlencode "action=xxx" --data-urlencode "name@-" ...`（字节经管道传输，绕过 argv 转换）
3. 含中文的写操作逐条**串行**执行，不要并发。
