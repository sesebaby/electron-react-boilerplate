#!/bin/bash

# 依赖检查脚本 - 检查当前依赖状态
# 用于重构过程中跟踪依赖迁移进度

echo "🔍 InventoryService依赖关系检查脚本"
echo "========================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 统计函数
count_occurrences() {
    local pattern="$1"
    local path="$2"
    local includes="$3"
    
    if [ -n "$includes" ]; then
        grep -r "$pattern" "$path" $includes 2>/dev/null | wc -l
    else
        grep -r "$pattern" "$path" 2>/dev/null | wc -l
    fi
}

# 显示详细信息函数
show_details() {
    local pattern="$1"
    local path="$2"
    local includes="$3"
    local description="$4"
    
    echo -e "${BLUE}$description:${NC}"
    if [ -n "$includes" ]; then
        grep -r "$pattern" "$path" $includes 2>/dev/null | head -10
    else
        grep -r "$pattern" "$path" 2>/dev/null | head -10
    fi
    echo ""
}

echo -e "${YELLOW}📊 当前依赖统计${NC}"
echo "----------------------------------------"

# 1. 检查serviceManager.getInventoryService调用
inventory_service_calls=$(count_occurrences "serviceManager\.getInventoryService" "src/" "--include=\"*.ts\" --include=\"*.tsx\"")
echo -e "serviceManager.getInventoryService调用: ${RED}$inventory_service_calls${NC} 处"

# 2. 检查直接InventoryService导入
direct_imports=$(count_occurrences "import.*InventoryService" "src/" "--include=\"*.ts\" --include=\"*.tsx\"")
echo -e "直接InventoryService导入: ${RED}$direct_imports${NC} 个文件"

# 3. 检查window.electronAPI直接调用
api_calls=$(count_occurrences "window\.electronAPI" "src/components/" "--include=\"*.ts\" --include=\"*.tsx\"")
echo -e "window.electronAPI直接调用: ${RED}$api_calls${NC} 处"

# 4. 检查新服务调用
domain_service_calls=$(count_occurrences "domainServiceManager\.getInventoryDomainService" "src/" "--include=\"*.ts\" --include=\"*.tsx\"")
master_service_calls=$(count_occurrences "domainServiceManager\.getMasterDataService" "src/" "--include=\"*.ts\" --include=\"*.tsx\"")
report_service_calls=$(count_occurrences "domainServiceManager\.getReportService" "src/" "--include=\"*.ts\" --include=\"*.tsx\"")

echo -e "新服务调用统计:"
echo -e "  - InventoryDomainService: ${GREEN}$domain_service_calls${NC} 处"
echo -e "  - MasterDataService: ${GREEN}$master_service_calls${NC} 处"
echo -e "  - ReportService: ${GREEN}$report_service_calls${NC} 处"

total_new_calls=$((domain_service_calls + master_service_calls + report_service_calls))
echo -e "  - 新服务调用总计: ${GREEN}$total_new_calls${NC} 处"

echo ""
echo -e "${YELLOW}📈 迁移进度分析${NC}"
echo "----------------------------------------"

# 计算迁移进度
original_calls=58
original_imports=6
original_api_calls=7

if [ $inventory_service_calls -eq 0 ] && [ $direct_imports -le 2 ] && [ $api_calls -eq 0 ]; then
    echo -e "${GREEN}✅ 迁移已完成！${NC}"
    echo -e "所有依赖已成功迁移到新的领域服务架构"
else
    remaining_calls=$inventory_service_calls
    remaining_imports=$((direct_imports - 2))  # 允许保留core/index.ts等2个文件
    remaining_api_calls=$api_calls
    
    migrated_calls=$((original_calls - remaining_calls))
    migrated_imports=$((original_imports - remaining_imports))
    migrated_api_calls=$((original_api_calls - remaining_api_calls))
    
    call_progress=$((migrated_calls * 100 / original_calls))
    import_progress=$((migrated_imports * 100 / original_imports))
    api_progress=$((migrated_api_calls * 100 / original_api_calls))
    
    echo -e "serviceManager调用迁移进度: ${YELLOW}$call_progress%${NC} ($migrated_calls/$original_calls)"
    echo -e "直接导入迁移进度: ${YELLOW}$import_progress%${NC} ($migrated_imports/$original_imports)"
    echo -e "API调用迁移进度: ${YELLOW}$api_progress%${NC} ($migrated_api_calls/$original_api_calls)"
    
    overall_progress=$(((call_progress + import_progress + api_progress) / 3))
    echo -e "总体迁移进度: ${YELLOW}$overall_progress%${NC}"
fi

echo ""
echo -e "${YELLOW}🔍 详细信息${NC}"
echo "----------------------------------------"

if [ "$1" = "--details" ] || [ "$1" = "-d" ]; then
    if [ $inventory_service_calls -gt 0 ]; then
        show_details "serviceManager\.getInventoryService" "src/" "--include=\"*.ts\" --include=\"*.tsx\"" "剩余的serviceManager.getInventoryService调用"
    fi
    
    if [ $direct_imports -gt 2 ]; then
        show_details "import.*InventoryService" "src/" "--include=\"*.ts\" --include=\"*.tsx\"" "剩余的直接InventoryService导入"
    fi
    
    if [ $api_calls -gt 0 ]; then
        show_details "window\.electronAPI" "src/components/" "--include=\"*.ts\" --include=\"*.tsx\"" "剩余的window.electronAPI直接调用"
    fi
fi

echo ""
echo -e "${YELLOW}📋 下一步建议${NC}"
echo "----------------------------------------"

if [ $inventory_service_calls -gt 0 ]; then
    echo -e "${RED}⚠️  还有 $inventory_service_calls 处 serviceManager.getInventoryService 调用需要迁移${NC}"
    echo "   建议按照重构计划逐步迁移这些调用"
fi

if [ $direct_imports -gt 2 ]; then
    echo -e "${RED}⚠️  还有 $((direct_imports - 2)) 个文件直接导入 InventoryService${NC}"
    echo "   建议更新这些导入为新的领域服务"
fi

if [ $api_calls -gt 0 ]; then
    echo -e "${RED}⚠️  还有 $api_calls 处 window.electronAPI 直接调用${NC}"
    echo "   建议将这些调用迁移到相应的领域服务中"
fi

if [ $inventory_service_calls -eq 0 ] && [ $direct_imports -le 2 ] && [ $api_calls -eq 0 ]; then
    echo -e "${GREEN}🎉 所有依赖迁移完成，可以开始清理旧代码！${NC}"
    echo "   运行: bash z重构/清理检查脚本.sh"
fi

echo ""
echo -e "${BLUE}💡 使用说明${NC}"
echo "----------------------------------------"
echo "运行方式:"
echo "  bash z重构/依赖检查脚本.sh           # 基本检查"
echo "  bash z重构/依赖检查脚本.sh --details # 显示详细信息"
echo "  bash z重构/依赖检查脚本.sh -d        # 显示详细信息（简写）"
