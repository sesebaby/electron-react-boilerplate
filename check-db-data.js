#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'inventory.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 检查数据库内容...\n');

// 检查各表的数据
const tables = ['categories', 'suppliers', 'inventory_items', 'inventory_transactions'];

const checkTable = (tableName) => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT COUNT(*) as count FROM ${tableName}`, (err, rows) => {
      if (err) {
        console.error(`❌ 查询${tableName}失败:`, err);
        reject(err);
        return;
      }
      
      const count = rows[0].count;
      console.log(`📊 ${tableName}: ${count} 条记录`);
      
      if (count > 0) {
        // 显示前3条数据
        db.all(`SELECT * FROM ${tableName} LIMIT 3`, (err, sampleRows) => {
          if (err) {
            console.error(`❌ 查询${tableName}样本数据失败:`, err);
            reject(err);
            return;
          }
          
          console.log(`   样本数据:`);
          sampleRows.forEach((row, index) => {
            const key = row.name || row.id || Object.keys(row)[0];
            const value = row.name || row.description || row.transaction_type || Object.values(row)[1];
            console.log(`   ${index + 1}. ${key}: ${value}`);
          });
          console.log();
          resolve();
        });
      } else {
        console.log(`   ⚠️  表为空\n`);
        resolve();
      }
    });
  });
};

const checkAllTables = async () => {
  try {
    for (const table of tables) {
      await checkTable(table);
    }
    
    // 检查表结构
    console.log('🏗️  检查表结构...');
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      if (err) {
        console.error('❌ 查询表结构失败:', err);
        return;
      }
      
      console.log('📋 数据库中的表:');
      tables.forEach(table => {
        console.log(`   - ${table.name}`);
      });
      
      db.close((err) => {
        if (err) {
          console.error('❌ 关闭数据库失败:', err);
        } else {
          console.log('\n✅ 数据库检查完成');
        }
      });
    });
  } catch (error) {
    console.error('❌ 检查过程中出错:', error);
    db.close();
  }
};

checkAllTables();