const fs = require('fs');
const Database = require('better-sqlite3');

// 读取修复脚本
const fixScript = fs.readFileSync('fix-data-issues.sql', 'utf8');

// 连接数据库
const db = new Database('inventory.db');

console.log('🔧 开始执行数据修复脚本...\n');

try {
    // 分割SQL语句（基于分号分隔）
    const statements = fixScript
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let results = [];
    
    for (const statement of statements) {
        try {
            if (statement.toUpperCase().startsWith('SELECT')) {
                // 查询语句
                const result = db.prepare(statement).all();
                if (result && result.length > 0) {
                    console.log('\n📊 查询结果:');
                    console.table(result);
                    results.push(result);
                }
            } else {
                // 执行语句（INSERT, UPDATE, DELETE, CREATE等）
                const result = db.prepare(statement).run();
                if (result.changes > 0) {
                    console.log(`✅ 语句执行成功，影响 ${result.changes} 行`);
                }
            }
        } catch (err) {
            if (!err.message.includes('UNIQUE constraint failed') && 
                !err.message.includes('no such table') &&
                !err.message.includes('no such column')) {
                console.warn(`⚠️  语句执行警告: ${err.message}`);
            }
        }
    }

    console.log('\n🎉 数据修复脚本执行完成！');
    
    // 执行最终验证
    console.log('\n🔍 执行最终验证...');
    
    // 检查负库存
    const negativeStock = db.prepare(`
        SELECT id, name, stock_quantity 
        FROM inventory_items 
        WHERE stock_quantity < 0
    `).all();
    
    console.log('\n负库存检查结果:');
    if (negativeStock.length === 0) {
        console.log('✅ 无负库存商品');
    } else {
        console.log('❌ 仍有负库存商品:');
        console.table(negativeStock);
    }
    
    // 检查总体库存状态
    const stockSummary = db.prepare(`
        SELECT 
            status,
            COUNT(*) as count,
            SUM(stock_quantity) as total_stock,
            ROUND(SUM(total_value), 2) as total_value
        FROM inventory_items 
        GROUP BY status
    `).all();
    
    console.log('\n📈 库存状态汇总:');
    console.table(stockSummary);

} catch (error) {
    console.error('❌ 修复脚本执行失败:', error.message);
} finally {
    db.close();
    console.log('\n🔐 数据库连接已关闭');
}