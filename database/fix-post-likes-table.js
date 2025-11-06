// Migration script to fix post_likes table structure
import pool from './connection.js'

async function fixPostLikesTable() {
  try {
    console.log('🔄 Fixing post_likes table structure...')
    
    // Check if post_likes table exists
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'post_likes'
    `)

    if (tables.length === 0) {
      console.log('📝 Creating post_likes table...')
      await pool.execute(`
        CREATE TABLE post_likes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          post_id INT NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_like (post_id, user_id),
          INDEX idx_post_id (post_id),
          INDEX idx_user_id (user_id)
        )
      `)
      console.log('✅ post_likes table created')
    } else {
      // Check if id column has AUTO_INCREMENT
      const [columns] = await pool.execute(`
        SELECT COLUMN_NAME, EXTRA
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'post_likes' 
        AND COLUMN_NAME = 'id'
      `)
      
      if (columns.length > 0 && !columns[0].EXTRA.includes('auto_increment')) {
        console.log('📝 Adding AUTO_INCREMENT to post_likes.id...')
        // First, we need to check if there are existing records
        const [existingRecords] = await pool.execute('SELECT COUNT(*) as count FROM post_likes')
        const hasRecords = existingRecords[0].count > 0
        
        if (hasRecords) {
          // If there are records, we need to be more careful
          // Get the max id first
          const [maxId] = await pool.execute('SELECT MAX(id) as max_id FROM post_likes')
          const maxIdValue = maxId[0].max_id || 0
          
          // Alter the table to add AUTO_INCREMENT (don't redefine PRIMARY KEY)
          await pool.execute(`
            ALTER TABLE post_likes 
            MODIFY COLUMN id INT AUTO_INCREMENT
          `)
          
          // Set the AUTO_INCREMENT to start after the max id
          if (maxIdValue > 0) {
            await pool.execute(`
              ALTER TABLE post_likes 
              AUTO_INCREMENT = ${maxIdValue + 1}
            `)
          }
          
          console.log('✅ Added AUTO_INCREMENT to post_likes.id (preserved existing data)')
        } else {
          // No records, safe to modify
          await pool.execute(`
            ALTER TABLE post_likes 
            MODIFY COLUMN id INT AUTO_INCREMENT
          `)
          console.log('✅ Added AUTO_INCREMENT to post_likes.id')
        }
      } else {
        console.log('✅ post_likes.id already has AUTO_INCREMENT')
      }
    }
    
    // Ensure unique constraint exists
    try {
      const [constraints] = await pool.execute(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'post_likes'
        AND CONSTRAINT_TYPE = 'UNIQUE'
        AND CONSTRAINT_NAME = 'unique_like'
      `)
      
      if (constraints.length === 0) {
        console.log('📝 Adding unique constraint to post_likes...')
        await pool.execute(`
          ALTER TABLE post_likes
          ADD CONSTRAINT unique_like UNIQUE (post_id, user_id)
        `)
        console.log('✅ Added unique constraint to post_likes')
      } else {
        console.log('✅ Unique constraint already exists on post_likes')
      }
    } catch (error) {
      // Constraint might already exist with a different name
      console.warn('⚠️ Could not add unique constraint (might already exist):', error.message)
    }
    
    console.log('')
    console.log('✅ post_likes table migration completed successfully!')
    console.log('')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration error:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  }
}

fixPostLikesTable()

