// Check post ID format from post_details
import pool from './connection.js'

async function checkPostIdFormat() {
  try {
    console.log('📋 Checking post ID format...\n')
    
    const [posts] = await pool.execute(`
      SELECT id, username, caption 
      FROM post_details 
      LIMIT 3
    `)
    
    console.log('Sample posts from post_details:')
    posts.forEach((post, i) => {
      console.log(`  ${i + 1}. ID: ${post.id} (type: ${typeof post.id})`)
      console.log(`     Username: ${post.username}`)
      console.log(`     Caption: ${post.caption?.substring(0, 50) || 'N/A'}...`)
    })
    
    // Check the actual column type
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'post_details'
      AND COLUMN_NAME = 'id'
    `)
    
    if (columns.length > 0) {
      console.log('\n📋 post_details.id column type:')
      console.log(`  DATA_TYPE: ${columns[0].DATA_TYPE}`)
      console.log(`  COLUMN_TYPE: ${columns[0].COLUMN_TYPE}`)
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkPostIdFormat()


