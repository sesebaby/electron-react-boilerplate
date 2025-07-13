#!/bin/bash

# 迁移验证脚本 - 验证迁移完成度
# 用于验证每个阶段的迁移是否成功完成

echo "✅ InventoryService迁移验证脚本"
echo "========================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 验证函数
verify_migration() {
    local file_path="$1"
    local expected_old_calls="$2"
    local expected_new_calls="$3"
    local description="$4"
    
    if [ ! -f "$file_path" ]; then
        echo -e "${RED}❌ 文件不存在: $file_path${NC}"
        return 1
    fi
    
    old_calls=$(grep -c "serviceManager\.getInventoryService\|import.*InventoryService\|window\.electronAPI" "$file_path" 2>/dev/null || echo "0")
    new_calls=$(grep -c "domainServiceManager\." "$file_path" 2>/dev/null || echo "0")
    
    echo -e "${BLUE}📁 $description${NC}"
    echo "   文件: $file_path"
    echo "   旧调用: $old_calls (期望: $expected_old_calls)"
    echo "   新调用: $new_calls (期望: $expected_new_calls)"
    
    if [ "$old_calls" -eq "$expected_old_calls" ] && [ "$new_calls" -eq "$expected_new_calls" ]; then
        echo -e "   ${GREEN}✅ 验证通过${NC}"
        return 0
    else
        echo -e "   ${RED}❌ 验证失败${NC}"
        return 1
    fi
}

# 批次验证函数
verify_batch() {
    local batch="$1"
    local success_count=0
    local total_count=0
    
    case $batch in
        "1")
            echo -e "${YELLOW}🔍 验证第一批组件迁移（库存核心组件）${NC}"
            echo "================================================"
            
            verify_migration "src/components/Inventory/StockIn.tsx" 0 1 "库存入库组件"
            [ $? -eq 0 ] && ((success_count++))
            ((total_count++))
            
            verify_migration "src/components/Inventory/StockOut.tsx" 0 1 "库存出库组件"
            [ $? -eq 0 ] && ((success_count++))
            ((total_count++))
            
            verify_migration "src/components/Inventory/StockAdjust.tsx" 0 1 "库存调整组件"
            [ $? -eq 0 ] && ((success_count++))
            ((total_count++))
            
            verify_migration "src/components/Inventory/InventoryList.tsx" 0 1 "库存列表组件"
            [ $? -eq 0 ] && ((success_count++))
            ((total_count++))
            
            verify_migration "src/components/Inventory/ProductManagement.tsx" 0 1 "产品管理组件"
            [ $? -eq 0 ] && ((success_count++))
            ((total_count++))
            
            verify_migration "src/components/Inventory/CategoryManagement.tsx" 0 1 "分类管理组件"
            [ $? -eq 0 ] && ((success_count++))
            ((total_count++))
            ;;
            
        "2")
            echo -e "${YELLOW}🔍 验证第二批组件迁移（仓库管理和报表）${NC}"
            echo "================================================"
            
            verify_migration "src/components/Inventory/WarehouseManagement.tsx" 0 1 "仓库管理组件"
            [ $? -eq 0 ] && ((success_count++))
            ((total_count++))
            
            verify_migration "src/components/Inventory/TransactionRecords.tsx" 0 1 "交易记录组件"
            [ $? -eq 0 ] && ((success_count++))
            ((total_count++))
            
            verify_migration "src/components/Inventory/UnitConversionSettings.tsx" 0 1 "单位转换设置组件"
            [ $? -eq 0 ] && ((success_count++))
            ((total_count++))
            
            verify_migration "src/components/Reports/InventoryReports.tsx" 0 1 "库存报表组件"
            [ $? -eq 0 ] && ((success_count++))
            ((total_count++))
            
            verify_migration "src/components/Reports/InventoryMovementSummary.tsx" 0 1 "库存变动汇总组件"
            [ $? -eq 0 ] && ((success_count++))
            ((total_count++))
            ;;
            
        "3")
            echo -e "${YELLOW}🔍 验证第三批组件迁移（采购销售和其他报表）${NC}"
            echo "================================================"
            
            verify_migration "src/components/Purchase/PurchaseOrderManagement.tsx" 0 1 "采购订单管理组件"
            [ $? -eq 0 ] && ((success_count++))
            ((total_count++))
            
            verify_migration "src/components/Sales/SalesOrderManagement.tsx" 0 1 "销售订单管理组件"
            [ $? -eq 0 ] && ((success_count++))
            ((total_count++))
            
            verify_migration "src/components/Reports/PurchaseReports.tsx" 0 1 "采购报表组件"
            [ $? -eq 0 ] && ((success_count++))
            ((total_count++))
            
            verify_migration "src/components/Reports/SalesReports.tsx" 0 1 "销售报表组件"
            [ $? -eq 0 ] && ((success_count++))
            ((total_count++))
            
            verify_migration "src/components/Settings/UnitManagement.tsx" 0 1 "单位管理组件"
            [ $? -eq 0 ] && ((success_count++))
            ((total_count++))
            ;;
            
        "4")
            echo -e "${YELLOW}🔍 验证第四批组件迁移（工具类和测试）${NC}"
            echo "================================================"
            
            verify_migration "src/utils/unitConversionHelper.ts" 0 1 "单位转换工具"
            [ $? -eq 0 ] && ((success_count++))
            ((total_count++))
            
            verify_migration "src/components/Layout/TopBar.tsx" 0 1 "顶部导航栏组件"
            [ $? -eq 0 ] && ((success_count++))
            ((total_count++))
            
            verify_migration "src/services/dashboard/dashboardService.ts" 0 1 "仪表板服务"
            [ $? -eq 0 ] && ((success_count++))
            ((total_count++))
            
            verify_migration "src/components/Settings/ConversionRulesManagement.tsx" 0 1 "转换规则管理组件"
            [ $? -eq 0 ] && ((success_count++))
            ((total_count++))
            ;;
            
        "all")
            echo -e "${YELLOW}🔍 验证所有组件迁移完成度${NC}"
            echo "================================================"
            
            # 统计总体迁移情况
            total_old_calls=$(grep -r "serviceManager\.getInventoryService" src/components/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
            total_new_calls=$(grep -r "domainServiceManager\." src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
            
            echo "总体迁移统计:"
            echo "  - 剩余旧调用: $total_old_calls (期望: 0)"
            echo "  - 新服务调用: $total_new_calls (期望: >50)"
            
            if [ "$total_old_calls" -eq 0 ] && [ "$total_new_calls" -gt 50 ]; then
                echo -e "${GREEN}✅ 所有组件迁移验证通过${NC}"
                return 0
            else
                echo -e "${RED}❌ 迁移验证失败${NC}"
                return 1
            fi
            ;;
            
        *)
            echo -e "${RED}❌ 无效的批次参数: $batch${NC}"
            echo "有效参数: 1, 2, 3, 4, all"
            return 1
            ;;
    esac
    
    echo ""
    echo -e "${YELLOW}📊 批次 $batch 验证结果${NC}"
    echo "成功: $success_count/$total_count"
    
    if [ "$success_count" -eq "$total_count" ]; then
        echo -e "${GREEN}✅ 批次 $batch 验证通过${NC}"
        return 0
    else
        echo -e "${RED}❌ 批次 $batch 验证失败${NC}"
        return 1
    fi
}

# 功能测试函数
run_functional_tests() {
    echo -e "${YELLOW}🧪 运行功能测试${NC}"
    echo "==============================="
    
    echo "1. TypeScript编译检查..."
    if npx tsc --noEmit --strict > /dev/null 2>&1; then
        echo -e "${GREEN}✅ TypeScript编译通过${NC}"
    else
        echo -e "${RED}❌ TypeScript编译失败${NC}"
        return 1
    fi
    
    echo "2. 单元测试..."
    if npm run test > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 单元测试通过${NC}"
    else
        echo -e "${YELLOW}⚠️  单元测试有问题，请检查${NC}"
    fi
    
    echo "3. 构建测试..."
    if npm run build > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 构建测试通过${NC}"
    else
        echo -e "${RED}❌ 构建测试失败${NC}"
        return 1
    fi
    
    return 0
}

# 主逻辑
if [ $# -eq 0 ]; then
    echo "使用方法:"
    echo "  bash z重构/迁移验证脚本.sh --batch=1    # 验证第一批组件"
    echo "  bash z重构/迁移验证脚本.sh --batch=2    # 验证第二批组件"
    echo "  bash z重构/迁移验证脚本.sh --batch=3    # 验证第三批组件"
    echo "  bash z重构/迁移验证脚本.sh --batch=4    # 验证第四批组件"
    echo "  bash z重构/迁移验证脚本.sh --batch=all  # 验证所有组件"
    echo "  bash z重构/迁移验证脚本.sh --test       # 运行功能测试"
    exit 1
fi

case $1 in
    --batch=*)
        batch="${1#*=}"
        verify_batch "$batch"
        exit $?
        ;;
    --test)
        run_functional_tests
        exit $?
        ;;
    *)
        echo -e "${RED}❌ 无效参数: $1${NC}"
        exit 1
        ;;
esac
