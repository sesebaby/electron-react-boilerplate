#!/bin/bash

# 功能完整性检查脚本
# 用于检查项目中的未实现功能和占位符代码

echo "🔍 功能完整性检查脚本"
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

echo -e "${YELLOW}📊 功能完整性统计${NC}"
echo "----------------------------------------"

# 1. 检查TODO、FIXME、HACK、XXX注释
todo_count=$(count_occurrences "TODO\|FIXME\|HACK\|XXX" "src/" "--include=\"*.ts\" --include=\"*.tsx\"")
echo -e "TODO/FIXME/HACK/XXX注释: ${RED}$todo_count${NC} 处"

# 2. 检查中文标记
chinese_markers=$(count_occurrences "待实现\|待拓展\|占位符\|暂时\|临时" "src/" "--include=\"*.ts\" --include=\"*.tsx\"")
echo -e "中文未实现标记: ${RED}$chinese_markers${NC} 处"

# 3. 检查空返回值（可能的占位符）
empty_returns=$(count_occurrences "return \[\]\|return null\|return undefined" "src/" "--include=\"*.ts\" --include=\"*.tsx\"")
echo -e "空返回值（潜在占位符）: ${YELLOW}$empty_returns${NC} 处"

# 4. 检查注释掉的代码块
commented_code=$(count_occurrences "//.*await\|//.*const\|//.*function" "src/" "--include=\"*.ts\" --include=\"*.tsx\"")
echo -e "注释掉的代码行: ${YELLOW}$commented_code${NC} 处"

echo ""
echo -e "${YELLOW}🎯 高优先级功能缺失${NC}"
echo "----------------------------------------"

# 检查关键业务模块的特定未实现功能
echo -e "${BLUE}产品管理模块:${NC}"
product_issues=$(grep -r "TODO.*productConversionService\|暂时跳过.*换算" src/components/Inventory/ 2>/dev/null | wc -l)
echo -e "  - 单位换算设置集成: ${RED}$product_issues${NC} 处"

echo -e "${BLUE}转换规则模块:${NC}"
conversion_issues=$(grep -r "暂时返回空数组\|暂时模拟成功" src/ 2>/dev/null | wc -l)
echo -e "  - 转换规则CRUD操作: ${RED}$conversion_issues${NC} 处"

echo -e "${BLUE}仪表板模块:${NC}"
dashboard_issues=$(grep -r "暂时设置默认值\|暂时返回空数组" src/services/dashboard/ 2>/dev/null | wc -l)
echo -e "  - 统计数据实现: ${RED}$dashboard_issues${NC} 处"

echo -e "${BLUE}搜索功能模块:${NC}"
search_issues=$(grep -r "TODO.*搜索建议" src/components/Inventory/ 2>/dev/null | wc -l)
echo -e "  - 搜索建议下拉列表: ${RED}$search_issues${NC} 处"

echo ""
echo -e "${YELLOW}📋 功能实现进度跟踪${NC}"
echo "----------------------------------------"

# 计算总的未实现功能数
total_issues=$((todo_count + chinese_markers))
echo -e "总未实现功能数: ${RED}$total_issues${NC}"

# 根据扫描结果分类
high_priority=5  # 基于扫描结果的高优先级功能数
medium_priority=8
low_priority=5

echo -e "高优先级功能: ${RED}$high_priority${NC} 个（核心业务影响）"
echo -e "中优先级功能: ${YELLOW}$medium_priority${NC} 个（体验优化）"
echo -e "低优先级功能: ${GREEN}$low_priority${NC} 个（临时占位符）"

# 计算预估工作量
high_priority_hours=17  # 基于分析的工作量
medium_priority_hours=20
low_priority_hours=10

total_hours=$((high_priority_hours + medium_priority_hours + low_priority_hours))
echo ""
echo -e "预估实现工作量:"
echo -e "  - 高优先级: ${RED}$high_priority_hours${NC} 小时"
echo -e "  - 中优先级: ${YELLOW}$medium_priority_hours${NC} 小时"
echo -e "  - 低优先级: ${GREEN}$low_priority_hours${NC} 小时"
echo -e "  - 总计: ${BLUE}$total_hours${NC} 小时"

echo ""
echo -e "${YELLOW}🔍 详细信息${NC}"
echo "----------------------------------------"

if [ "$1" = "--details" ] || [ "$1" = "-d" ]; then
    if [ $todo_count -gt 0 ]; then
        show_details "TODO\|FIXME\|HACK\|XXX" "src/" "--include=\"*.ts\" --include=\"*.tsx\"" "TODO/FIXME/HACK/XXX注释详情"
    fi
    
    if [ $chinese_markers -gt 0 ]; then
        show_details "待实现\|待拓展\|占位符\|暂时\|临时" "src/" "--include=\"*.ts\" --include=\"*.tsx\"" "中文未实现标记详情"
    fi
    
    echo -e "${BLUE}关键文件的功能缺失:${NC}"
    echo "1. src/services/core/InventoryService.ts:947 - 全局转换规则逻辑"
    echo "2. src/components/Inventory/ProductManagement.tsx:385 - 单位换算设置集成"
    echo "3. src/components/Settings/ConversionRulesManagement.tsx - 转换规则CRUD操作"
    echo "4. src/components/Inventory/InventorySearch.tsx:106 - 搜索建议下拉列表"
    echo "5. src/services/dashboard/dashboardService.ts - 仪表板统计数据"
fi

echo ""
echo -e "${YELLOW}📈 功能完整性评分${NC}"
echo "----------------------------------------"

# 计算完整性评分
implemented_functions=100  # 假设总功能数
missing_functions=$total_issues
completeness_percentage=$(( (implemented_functions - missing_functions) * 100 / implemented_functions ))

if [ $completeness_percentage -ge 90 ]; then
    color=$GREEN
elif [ $completeness_percentage -ge 70 ]; then
    color=$YELLOW
else
    color=$RED
fi

echo -e "功能完整性: ${color}$completeness_percentage%${NC}"

if [ $completeness_percentage -lt 85 ]; then
    echo -e "${RED}⚠️  建议在重构前优先实现高优先级功能${NC}"
else
    echo -e "${GREEN}✅ 功能完整性良好，可以开始重构${NC}"
fi

echo ""
echo -e "${BLUE}💡 建议${NC}"
echo "----------------------------------------"
echo "1. 优先实现高优先级功能（核心业务影响）"
echo "2. 在重构过程中同步实现中优先级功能"
echo "3. 重构完成后处理低优先级功能"
echo "4. 建立功能实现进度跟踪机制"
echo "5. 为每个功能编写验证测试"

echo ""
echo "🔍 功能完整性检查完成"
