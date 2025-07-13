#!/bin/bash

# 业务功能验证脚本
# 用于验证核心业务功能的完整性和正确性

echo "🧪 业务功能验证脚本"
echo "========================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 验证结果统计
total_tests=0
passed_tests=0
failed_tests=0

# 测试结果记录函数
record_test() {
    local test_name="$1"
    local result="$2"
    
    total_tests=$((total_tests + 1))
    
    if [ "$result" = "PASS" ]; then
        echo -e "  ✅ $test_name: ${GREEN}PASS${NC}"
        passed_tests=$((passed_tests + 1))
    else
        echo -e "  ❌ $test_name: ${RED}FAIL${NC}"
        failed_tests=$((failed_tests + 1))
    fi
}

# 检查文件是否存在
check_file_exists() {
    local file_path="$1"
    if [ -f "$file_path" ]; then
        echo "PASS"
    else
        echo "FAIL"
    fi
}

# 检查方法是否实现（不是占位符）
check_method_implemented() {
    local file_path="$1"
    local method_pattern="$2"
    
    if [ -f "$file_path" ]; then
        # 检查是否包含实际实现而不是占位符
        if grep -q "$method_pattern" "$file_path" && ! grep -q "暂时\|临时\|TODO\|return \[\]" "$file_path"; then
            echo "PASS"
        else
            echo "FAIL"
        fi
    else
        echo "FAIL"
    fi
}

echo -e "${YELLOW}📋 核心业务模块验证${NC}"
echo "----------------------------------------"

echo -e "${BLUE}1. 产品管理模块${NC}"
record_test "产品管理组件存在" $(check_file_exists "src/components/Inventory/ProductManagement.tsx")
record_test "产品服务方法完整" $(check_method_implemented "src/services/core/InventoryService.ts" "createProduct\|updateProduct\|deleteProduct")

echo -e "${BLUE}2. 库存管理模块${NC}"
record_test "库存操作组件存在" $(check_file_exists "src/components/Inventory/StockIn.tsx")
record_test "库存调整组件存在" $(check_file_exists "src/components/Inventory/StockAdjust.tsx")
record_test "库存服务方法完整" $(check_method_implemented "src/services/core/InventoryService.ts" "updateStock\|getInventoryStocks")

echo -e "${BLUE}3. 分类管理模块${NC}"
record_test "分类管理组件存在" $(check_file_exists "src/components/Inventory/CategoryManagement.tsx")
record_test "分类服务方法完整" $(check_method_implemented "src/services/core/InventoryService.ts" "createCategory\|updateCategory\|deleteCategory")

echo -e "${BLUE}4. 单位管理模块${NC}"
record_test "单位管理组件存在" $(check_file_exists "src/components/Settings/UnitManagement.tsx")
record_test "单位服务方法完整" $(check_method_implemented "src/services/core/InventoryService.ts" "createUnit\|updateUnit\|deleteUnit")

echo -e "${BLUE}5. 仓库管理模块${NC}"
record_test "仓库管理组件存在" $(check_file_exists "src/components/Inventory/WarehouseManagement.tsx")
record_test "仓库服务方法完整" $(check_method_implemented "src/services/core/InventoryService.ts" "createWarehouse\|updateWarehouse\|deleteWarehouse")

echo -e "${BLUE}6. 报表统计模块${NC}"
record_test "库存报表组件存在" $(check_file_exists "src/components/Reports/InventoryReports.tsx")
record_test "仪表板服务存在" $(check_file_exists "src/services/dashboard/dashboardService.ts")

echo ""
echo -e "${YELLOW}🔧 关键功能实现验证${NC}"
echo "----------------------------------------"

echo -e "${BLUE}转换规则功能${NC}"
# 检查全局转换规则是否已实现
if grep -q "暂时返回空数组" src/services/core/InventoryService.ts; then
    record_test "全局转换规则逻辑" "FAIL"
else
    record_test "全局转换规则逻辑" "PASS"
fi

# 检查转换规则管理是否已实现
if grep -q "暂时模拟成功" src/components/Settings/ConversionRulesManagement.tsx; then
    record_test "转换规则CRUD操作" "FAIL"
else
    record_test "转换规则CRUD操作" "PASS"
fi

echo -e "${BLUE}产品换算设置功能${NC}"
# 检查产品换算设置是否已集成
if grep -q "暂时跳过" src/components/Inventory/ProductManagement.tsx; then
    record_test "产品换算设置集成" "FAIL"
else
    record_test "产品换算设置集成" "PASS"
fi

echo -e "${BLUE}搜索功能${NC}"
# 检查搜索建议是否已实现
if grep -q "TODO.*搜索建议" src/components/Inventory/InventorySearch.tsx; then
    record_test "搜索建议下拉列表" "FAIL"
else
    record_test "搜索建议下拉列表" "PASS"
fi

echo -e "${BLUE}仪表板统计功能${NC}"
# 检查仪表板统计数据是否已实现
dashboard_placeholders=$(grep -c "暂时设置默认值\|暂时返回空数组" src/services/dashboard/dashboardService.ts)
if [ $dashboard_placeholders -gt 5 ]; then
    record_test "仪表板统计数据实现" "FAIL"
else
    record_test "仪表板统计数据实现" "PASS"
fi

echo ""
echo -e "${YELLOW}📊 数据完整性验证${NC}"
echo "----------------------------------------"

echo -e "${BLUE}数据库架构${NC}"
record_test "统一数据库文件存在" $(check_file_exists "data/inventory.db")

# 检查是否还有重复数据库
if [ -f "inventory.db" ]; then
    record_test "无重复数据库文件" "FAIL"
else
    record_test "无重复数据库文件" "PASS"
fi

# 检查是否还有重复数据库目录
if [ -d "src/services/database" ]; then
    record_test "无重复数据库目录" "FAIL"
else
    record_test "无重复数据库目录" "PASS"
fi

echo -e "${BLUE}服务架构${NC}"
record_test "InventoryService存在" $(check_file_exists "src/services/core/InventoryService.ts")
record_test "ServiceManager存在" $(check_file_exists "src/services/core/ServiceManager.ts")

echo ""
echo -e "${YELLOW}🎯 功能验证总结${NC}"
echo "----------------------------------------"

echo -e "总测试数: ${BLUE}$total_tests${NC}"
echo -e "通过测试: ${GREEN}$passed_tests${NC}"
echo -e "失败测试: ${RED}$failed_tests${NC}"

# 计算通过率
if [ $total_tests -gt 0 ]; then
    pass_rate=$(( passed_tests * 100 / total_tests ))
    echo -e "通过率: ${BLUE}$pass_rate%${NC}"
    
    if [ $pass_rate -ge 90 ]; then
        echo -e "${GREEN}✅ 业务功能验证优秀${NC}"
    elif [ $pass_rate -ge 70 ]; then
        echo -e "${YELLOW}⚠️  业务功能验证良好，但需要改进${NC}"
    else
        echo -e "${RED}❌ 业务功能验证不合格，需要重点关注${NC}"
    fi
else
    echo -e "${RED}❌ 无法执行验证测试${NC}"
fi

echo ""
echo -e "${YELLOW}📋 改进建议${NC}"
echo "----------------------------------------"

if [ $failed_tests -gt 0 ]; then
    echo "基于验证结果，建议优先处理以下问题："
    
    # 根据失败的测试给出具体建议
    if grep -q "暂时返回空数组" src/services/core/InventoryService.ts 2>/dev/null; then
        echo "1. 实现全局转换规则逻辑（InventoryService.ts:947）"
    fi
    
    if grep -q "暂时模拟成功" src/components/Settings/ConversionRulesManagement.tsx 2>/dev/null; then
        echo "2. 实现转换规则CRUD操作（ConversionRulesManagement.tsx）"
    fi
    
    if grep -q "暂时跳过" src/components/Inventory/ProductManagement.tsx 2>/dev/null; then
        echo "3. 完成产品换算设置集成（ProductManagement.tsx:385）"
    fi
    
    if [ -f "inventory.db" ]; then
        echo "4. 删除重复的数据库文件（inventory.db）"
    fi
    
    if [ -d "src/services/database" ]; then
        echo "5. 删除重复的数据库目录（src/services/database/）"
    fi
else
    echo -e "${GREEN}✅ 所有业务功能验证通过，可以继续重构流程${NC}"
fi

echo ""
echo "🧪 业务功能验证完成"
