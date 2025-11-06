// Check posts table structure
import pool from './connection.js'

async function checkStructure() {
  try {
    console.log('📋 Checking posts table structure...\n')
    
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'posts'
      ORDER BY ORDINAL_POSITION
    `)
    
    console.log('Columns in posts table:')
    columns.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${col.IS_NULLABLE === 'YES' ? '(nullable)' : '(not null)'} default: ${col.COLUMN_DEFAULT}`)
    })
    
    // Also check if post_details is a view
    const [views] = await pool.execute(`
      SELECT TABLE_NAME, TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('posts', 'post_details')
    `)
    
    console.log('\nTables/Views:')
    views.forEach(v => {
      console.log(`  ${v.TABLE_NAME}: ${v.TABLE_TYPE}`)
    })
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkStructure()


