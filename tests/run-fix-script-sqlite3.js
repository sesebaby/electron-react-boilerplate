const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// 读取修复脚本
const fixScript = fs.readFileSync('fix-data-issues.sql', 'utf8');

console.log('🔧 开始执行数据修复脚本...\n');

// 连接数据库
const db = new sqlite3.Database('inventory.db', (err) => {
    if (err) {
        console.error('❌ 数据库连接失败:', err.message);
        return;
    }
    console.log('✅ 数据库连接成功');
});

// 分割SQL语句并执行
const statements = fixScript
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

let processedCount = 0;
const totalStatements = statements.length;

function executeStatement(index) {
    if (index >= statements.length) {
        // 所有语句执行完成，进行最终验证
        console.log('\n🎉 数据修复脚本执行完成！');
        performFinalValidation();
        return;
    }

    const statement = statements[index];
    processedCount++;
    
    if (statement.toUpperCase().startsWith('SELECT')) {
        // 查询语句
        db.all(statement, [], (err, rows) => {
            if (err) {
                if (!err.message.includes('no such table') && 
                    !err.message.includes('no such column')) {
                    console.warn(`⚠️  查询语句警告 (${processedCount}/${totalStatements}): ${err.message}`);
                }
            } else if (rows && rows.length > 0) {
                console.log(`\n📊 查询结果 (${processedCount}/${totalStatements}):`);
                console.table(rows);
            }
            executeStatement(index + 1);
        });
    } else {
        // 执行语句（INSERT, UPDATE, DELETE, CREATE等）
        db.run(statement, [], function(err) {
            if (err) {
                if (!err.message.includes('UNIQUE constraint failed') && 
                    !err.message.includes('no such table') &&
                    !err.message.includes('no such column')) {
                    console.warn(`⚠️  执行语句警告 (${processedCount}/${totalStatements}): ${err.message}`);
                }
            } else if (this.changes > 0) {
                console.log(`✅ 语句执行成功 (${processedCount}/${totalStatements})，影响 ${this.changes} 行`);
            }
            executeStatement(index + 1);
        });
    }
}

function performFinalValidation() {
    console.log('\n🔍 执行最终验证...');
    
    // 检查负库存
    db.all(`
        SELECT id, name, stock_quantity 
        FROM inventory_items 
        WHERE stock_quantity < 0
    `, [], (err, rows) => {
        if (err) {
            console.warn('⚠️  负库存检查失败:', err.message);
        } else {
            console.log('\n负库存检查结果:');
            if (rows.length === 0) {
                console.log('✅ 无负库存商品');
            } else {
                console.log('❌ 仍有负库存商品:');
                console.table(rows);
            }
        }
        
        // 检查总体库存状态
        db.all(`
            SELECT 
                status,
                COUNT(*) as count,
                SUM(stock_quantity) as total_stock,
                ROUND(SUM(total_value), 2) as total_value
            FROM inventory_items 
            GROUP BY status
        `, [], (err, rows) => {
            if (err) {
                console.warn('⚠️  库存状态检查失败:', err.message);
            } else {
                console.log('\n📈 库存状态汇总:');
                console.table(rows);
            }
            
            // 关闭数据库连接
            db.close((err) => {
                if (err) {
                    console.error('❌ 关闭数据库失败:', err.message);
                } else {
                    console.log('\n🔐 数据库连接已关闭');
                    console.log('\n✨ 数据修复流程完成！');
                }
            });
        });
    });
}

// 开始执行
executeStatement(0);