#!/bin/bash

# 回滚检查脚本 - 支持快速回滚验证
# 用于在重构过程中出现问题时快速回滚和验证

echo "🔄 InventoryService重构回滚检查脚本"
echo "========================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查Git状态
check_git_status() {
    echo -e "${YELLOW}📋 Git状态检查${NC}"
    echo "==============================="
    
    if ! git status > /dev/null 2>&1; then
        echo -e "${RED}❌ 当前目录不是Git仓库${NC}"
        return 1
    fi
    
    # 检查是否有未提交的更改
    if ! git diff-index --quiet HEAD --; then
        echo -e "${YELLOW}⚠️  检测到未提交的更改${NC}"
        echo "未提交的文件:"
        git status --porcelain
        echo ""
        echo "建议在回滚前提交或暂存这些更改"
        return 1
    else
        echo -e "${GREEN}✅ 工作目录干净，可以安全回滚${NC}"
    fi
    
    # 显示最近的提交
    echo ""
    echo "最近的提交记录:"
    git log --oneline -5
    echo ""
    
    return 0
}

# 检查备份文件
check_backup_files() {
    echo -e "${YELLOW}💾 备份文件检查${NC}"
    echo "==============================="
    
    backup_dir="backup"
    if [ ! -d "$backup_dir" ]; then
        echo -e "${RED}❌ 备份目录不存在: $backup_dir${NC}"
        echo "请确保在重构前创建了备份"
        return 1
    fi
    
    # 检查关键备份文件
    key_files=(
        "backup/services/core/InventoryService.ts"
        "backup/services/core/ServiceManager.ts"
    )
    
    missing_files=()
    for file in "${key_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        else
            echo -e "${GREEN}✅ 备份文件存在: $file${NC}"
        fi
    done
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        echo -e "${RED}❌ 缺少关键备份文件:${NC}"
        for file in "${missing_files[@]}"; do
            echo "   - $file"
        done
        return 1
    fi
    
    echo -e "${GREEN}✅ 所有关键备份文件都存在${NC}"
    return 0
}

# 检查当前系统状态
check_current_status() {
    echo -e "${YELLOW}🔍 当前系统状态检查${NC}"
    echo "==============================="
    
    # 检查应用是否能正常启动
    echo "1. 检查TypeScript编译..."
    if npx tsc --noEmit > /dev/null 2>&1; then
        echo -e "${GREEN}✅ TypeScript编译正常${NC}"
    else
        echo -e "${RED}❌ TypeScript编译失败${NC}"
        echo "可能需要回滚到稳定状态"
        return 1
    fi
    
    # 检查构建
    echo "2. 检查构建..."
    if npm run build > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 构建正常${NC}"
    else
        echo -e "${RED}❌ 构建失败${NC}"
        echo "可能需要回滚到稳定状态"
        return 1
    fi
    
    # 检查依赖状态
    echo "3. 检查依赖迁移状态..."
    old_calls=$(grep -r "serviceManager\.getInventoryService" src/components/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
    new_calls=$(grep -r "domainServiceManager\." src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
    
    echo "   - 旧服务调用: $old_calls"
    echo "   - 新服务调用: $new_calls"
    
    if [ "$old_calls" -gt 0 ] && [ "$new_calls" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  系统处于混合状态（部分迁移）${NC}"
        echo "   建议完成迁移或回滚到稳定状态"
        return 2
    elif [ "$old_calls" -eq 0 ] && [ "$new_calls" -gt 0 ]; then
        echo -e "${GREEN}✅ 系统已完全迁移到新架构${NC}"
    else
        echo -e "${GREEN}✅ 系统使用原始架构${NC}"
    fi
    
    return 0
}

# 执行回滚
perform_rollback() {
    local rollback_type="$1"
    
    echo -e "${YELLOW}🔄 执行回滚操作${NC}"
    echo "==============================="
    
    case $rollback_type in
        "git")
            echo "选择Git回滚方式:"
            echo "1. 回滚到上一个提交 (git reset --hard HEAD~1)"
            echo "2. 回滚到指定提交 (需要输入commit hash)"
            echo "3. 取消"
            
            read -p "请选择 (1-3): " choice
            
            case $choice in
                1)
                    echo "回滚到上一个提交..."
                    git reset --hard HEAD~1
                    echo -e "${GREEN}✅ 回滚完成${NC}"
                    ;;
                2)
                    read -p "请输入commit hash: " commit_hash
                    if git cat-file -e "$commit_hash" 2>/dev/null; then
                        git reset --hard "$commit_hash"
                        echo -e "${GREEN}✅ 回滚完成${NC}"
                    else
                        echo -e "${RED}❌ 无效的commit hash${NC}"
                        return 1
                    fi
                    ;;
                3)
                    echo "取消回滚操作"
                    return 0
                    ;;
                *)
                    echo -e "${RED}❌ 无效选择${NC}"
                    return 1
                    ;;
            esac
            ;;
            
        "backup")
            echo "从备份文件恢复..."
            
            # 恢复关键文件
            if [ -f "backup/services/core/InventoryService.ts" ]; then
                cp "backup/services/core/InventoryService.ts" "src/services/core/InventoryService.ts"
                echo -e "${GREEN}✅ 恢复 InventoryService.ts${NC}"
            fi
            
            if [ -f "backup/services/core/ServiceManager.ts" ]; then
                cp "backup/services/core/ServiceManager.ts" "src/services/core/ServiceManager.ts"
                echo -e "${GREEN}✅ 恢复 ServiceManager.ts${NC}"
            fi
            
            # 恢复其他备份文件
            if [ -d "backup/services/database" ]; then
                cp -r "backup/services/database" "src/services/"
                echo -e "${GREEN}✅ 恢复数据库服务目录${NC}"
            fi
            
            echo -e "${GREEN}✅ 备份恢复完成${NC}"
            ;;
            
        *)
            echo -e "${RED}❌ 无效的回滚类型: $rollback_type${NC}"
            return 1
            ;;
    esac
    
    return 0
}

# 验证回滚结果
verify_rollback() {
    echo -e "${YELLOW}✅ 验证回滚结果${NC}"
    echo "==============================="
    
    # 检查TypeScript编译
    echo "1. 验证TypeScript编译..."
    if npx tsc --noEmit > /dev/null 2>&1; then
        echo -e "${GREEN}✅ TypeScript编译正常${NC}"
    else
        echo -e "${RED}❌ TypeScript编译仍有问题${NC}"
        return 1
    fi
    
    # 检查构建
    echo "2. 验证构建..."
    if npm run build > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 构建正常${NC}"
    else
        echo -e "${RED}❌ 构建仍有问题${NC}"
        return 1
    fi
    
    # 检查应用启动
    echo "3. 验证应用启动..."
    echo "   请手动运行 'npm start' 验证应用是否正常启动"
    
    echo -e "${GREEN}✅ 回滚验证完成${NC}"
    return 0
}

# 主逻辑
case $1 in
    "--check")
        echo "执行回滚前检查..."
        check_git_status && check_backup_files && check_current_status
        exit $?
        ;;
        
    "--rollback-git")
        check_git_status || exit 1
        perform_rollback "git" && verify_rollback
        exit $?
        ;;
        
    "--rollback-backup")
        check_backup_files || exit 1
        perform_rollback "backup" && verify_rollback
        exit $?
        ;;
        
    "--verify")
        verify_rollback
        exit $?
        ;;
        
    *)
        echo "使用方法:"
        echo "  bash z重构/回滚检查脚本.sh --check           # 检查回滚前状态"
        echo "  bash z重构/回滚检查脚本.sh --rollback-git    # 使用Git回滚"
        echo "  bash z重构/回滚检查脚本.sh --rollback-backup # 使用备份文件回滚"
        echo "  bash z重构/回滚检查脚本.sh --verify          # 验证回滚结果"
        echo ""
        echo "建议的回滚流程:"
        echo "1. 先运行 --check 检查当前状态"
        echo "2. 根据情况选择 --rollback-git 或 --rollback-backup"
        echo "3. 运行 --verify 验证回滚结果"
        exit 1
        ;;
esac
