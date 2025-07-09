#!/bin/bash

# 自动提交脚本 - 15分钟后执行
# 创建时间: $(date)

echo "=== 自动提交脚本启动 ==="
echo "当前时间: $(date)"
echo "将在15分钟后执行提交操作..."
echo ""

# 等待15分钟 (900秒)
echo "等待15分钟..."
sleep 900

echo ""
echo "=== 开始执行提交操作 ==="
echo "执行时间: $(date)"

# 检查当前git状态
echo ""
echo "1. 检查当前git状态:"
git status

echo ""
echo "2. 添加源代码文件到暂存区:"

# 添加所有src目录下的修改文件
if [ -d "src" ]; then
    echo "添加src目录下的所有修改..."
    git add src/
else
    echo "警告: src目录不存在"
fi

# 检查暂存区状态
echo ""
echo "3. 检查暂存区状态:"
git status --staged

# 如果暂存区有文件，则执行提交
if git diff --staged --quiet; then
    echo ""
    echo "暂存区为空，没有需要提交的文件"
    echo "脚本结束"
else
    echo ""
    echo "4. 执行提交:"
    
    # 创建提交信息
    commit_message="定时提交

- 自动提交源代码修改
- 更新组件和样式文件
- 执行时间: $(date)
- 脚本自动生成"

    # 执行提交
    git commit -m "$commit_message"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ 提交成功!"
        echo "提交哈希: $(git rev-parse HEAD)"
        echo ""
        echo "5. 最新提交记录:"
        git log --oneline -3
    else
        echo ""
        echo "❌ 提交失败!"
        exit 1
    fi
fi

echo ""
echo "=== 自动提交脚本完成 ==="
echo "结束时间: $(date)"