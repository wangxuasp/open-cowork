import requests
import sys

# 设置 UTF-8 编码
sys.stdout.reconfigure(encoding='utf-8')

try:
    response = requests.post(
        'http://localhost:8099/api/chat',
        json={
            "question": "工艺问题",
            "keywords": ["关键字1", "关键字2"],
            "includeDebug": True
        },
        timeout=60
    )
    response.raise_for_status()
    print(response.text)
except Exception as e:
    print(f"错误：{e}", file=sys.stderr)
    sys.exit(1)
