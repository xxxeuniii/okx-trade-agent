"""
调试测试脚本
"""
import os

print("Step 1: 检查环境变量")
print(f"ANTHROPIC_API_KEY: {os.getenv('ANTHROPIC_API_KEY')[:10] if os.getenv('ANTHROPIC_API_KEY') else 'None'}")
print(f"ANTHROPIC_BASE_URL: {os.getenv('ANTHROPIC_BASE_URL')}")

print("\nStep 2: 测试导入")
try:
    from anthropic import Anthropic
    print("anthropic 导入成功")
except Exception as e:
    print(f"anthropic 导入失败: {e}")

print("\nStep 3: 测试创建客户端")
try:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    base_url = os.getenv("ANTHROPIC_BASE_URL", "https://open.bigmodel.cn/api/anthropic")
    
    if api_key:
        client = Anthropic(api_key=api_key, base_url=base_url)
        print("Anthropic客户端创建成功")
    else:
        print("API Key为空，跳过客户端创建")
except Exception as e:
    print(f"客户端创建失败: {e}")

print("\nStep 4: 测试Agent导入")
try:
    from agent import run_agent
    print("agent模块导入成功")
except Exception as e:
    print(f"agent导入失败: {e}")

print("\nStep 5: 测试run_agent")
try:
    result = run_agent("BTC")
    print(f"run_agent成功: {result}")
except Exception as e:
    print(f"run_agent失败: {e}")

print("\n测试完成")
