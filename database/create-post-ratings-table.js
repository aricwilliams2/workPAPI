// Migration script to create post_ratings table
import pool from './connection.js'

async function createPostRatingsTable() {
  try {
    console.log('🔄 Creating post_ratings table...')
    
    // Check if post_ratings table exists
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'post_ratings'
    `)

    if (tables.length === 0) {
      console.log('📝 Creating post_ratings table...')
      await pool.execute(`
        CREATE TABLE post_ratings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          post_id INT NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          rating DECIMAL(2, 1) NOT NULL CHECK (rating >= 0 AND rating <= 5),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_rating (post_id, user_id),
          INDEX idx_post_id (post_id),
          INDEX idx_user_id (user_id),
          INDEX idx_rating (rating)
        )
      `)
      console.log('✅ post_ratings table created')
    } else {
      console.log('✅ post_ratings table already exists')
      
      // Check if unique constraint exists
      const [constraints] = await pool.execute(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'post_ratings'
        AND CONSTRAINT_TYPE = 'UNIQUE'
        AND CONSTRAINT_NAME = 'unique_rating'
      `)
      
      if (constraints.length === 0) {
        console.log('📝 Adding unique constraint to post_ratings...')
        try {
          await pool.execute(`
            ALTER TABLE post_ratings
            ADD CONSTRAINT unique_rating UNIQUE (post_id, user_id)
          `)
          console.log('✅ Added unique constraint to post_ratings')
        } catch (error) {
          console.warn('⚠️ Could not add unique constraint (might already exist):', error.message)
        }
      } else {
        console.log('✅ Unique constraint already exists on post_ratings')
      }
    }
    
    console.log('')
    console.log('✅ post_ratings table migration completed successfully!')
    console.log('')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration error:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  }
}

createPostRatingsTable()


