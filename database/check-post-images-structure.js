// Check post_images table structure
import pool from './connection.js'

async function checkStructure() {
  try {
    console.log('📋 Checking post_images table structure...\n')
    
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'post_images'
      ORDER BY ORDINAL_POSITION
    `)
    
    console.log('Columns:')
    columns.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${col.IS_NULLABLE === 'YES' ? '(nullable)' : '(not null)'} default: ${col.COLUMN_DEFAULT}`)
    })
    
    // Check for existing data with post_id = 0
    const [zeroPosts] = await pool.execute(`
      SELECT COUNT(*) as count FROM post_images WHERE post_id = 0 OR post_id IS NULL
    `)
    console.log(`\nExisting rows with post_id = 0 or NULL: ${zeroPosts[0].count}`)
    
    // Check sample data
    const [samples] = await pool.execute(`
      SELECT id, post_id FROM post_images LIMIT 5
    `)
    console.log('\nSample data:')
    samples.forEach(row => {
      console.log(`  id: ${row.id}, post_id: ${row.post_id} (type: ${typeof row.post_id})`)
    })
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkStructure()


