import requests
import sys

# 设置 UTF-8 编码
sys.stdout.reconfigure(encoding='utf-8')

try:
    response = requests.post(
        'http://localhost:8099/api/qdrant/chat',
        json={
            'question': '问题内容',
            'stream': True
        },
        stream=True,
        timeout=60
    )
    response.raise_for_status()
    print(response.text)
except Exception as e:
    print(f"错误：{e}", file=sys.stderr)
    sys.exit(1)
