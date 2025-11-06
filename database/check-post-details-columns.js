// Check post_details columns
import pool from './connection.js'

async function checkPostDetailsColumns() {
  try {
    console.log('📋 Checking post_details columns...\n')
    
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'post_details'
      ORDER BY ORDINAL_POSITION
    `)
    
    console.log('Columns in post_details:')
    columns.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}`)
    })
    
    // Check if user_id exists
    const hasUserId = columns.some(col => col.COLUMN_NAME === 'user_id')
    console.log(`\n📊 Has user_id column: ${hasUserId}`)
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkPostDetailsColumns()


