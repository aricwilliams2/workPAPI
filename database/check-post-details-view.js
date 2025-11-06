// Check post_details VIEW definition
import pool from './connection.js'

async function checkPostDetailsView() {
  try {
    console.log('📋 Checking post_details VIEW definition...\n')
    
    // Get VIEW definition
    const [viewDef] = await pool.execute(`
      SELECT VIEW_DEFINITION
      FROM INFORMATION_SCHEMA.VIEWS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'post_details'
    `)
    
    if (viewDef.length > 0) {
      console.log('📋 post_details VIEW Definition:')
      console.log(viewDef[0].VIEW_DEFINITION)
    } else {
      console.log('❌ post_details VIEW not found')
    }
    
    // Check what columns it has
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'post_details'
      ORDER BY ORDINAL_POSITION
    `)
    
    console.log('\n📋 Columns in post_details VIEW:')
    columns.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}`)
    })
    
    // Check base tables
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME, TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('posts', 'users', 'post_details')
    `)
    
    console.log('\n📋 Tables/Views:')
    tables.forEach(t => {
      console.log(`  ${t.TABLE_NAME}: ${t.TABLE_TYPE}`)
    })
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkPostDetailsView()


