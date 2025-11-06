// Migration script to add BLOB columns for image storage
import pool from './connection.js'

async function migrateToBlob() {
  try {
    console.log('🔄 Migrating to BLOB storage for images...')
    
    // Check if post_images table exists and add BLOB column
    try {
      // Check current structure
      const [columns] = await pool.execute(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'post_images'
      `)
      
      const hasBlobColumn = columns.some(col => col.COLUMN_NAME === 'image_data')
      
      if (!hasBlobColumn) {
        console.log('📝 Adding image_data BLOB column to post_images table...')
        await pool.execute(`
          ALTER TABLE post_images 
          ADD COLUMN image_data MEDIUMBLOB,
          ADD COLUMN mime_type VARCHAR(100),
          ADD COLUMN file_size INT
        `)
        console.log('✅ Added BLOB columns to post_images table')
      } else {
        console.log('✅ post_images table already has BLOB columns')
      }
      
      // Also add BLOB column to posts table for direct storage (optional)
      const [postColumns] = await pool.execute(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'posts'
      `)
      
      const postsHasBlob = postColumns.some(col => col.COLUMN_NAME === 'image_data')
      
      if (!postsHasBlob) {
        console.log('📝 Adding image_data BLOB column to posts table (optional)...')
        await pool.execute(`
          ALTER TABLE posts 
          ADD COLUMN image_data MEDIUMBLOB,
          ADD COLUMN image_mime_type VARCHAR(100)
        `)
        console.log('✅ Added BLOB columns to posts table')
      } else {
        console.log('✅ posts table already has BLOB columns')
      }
      
      console.log('')
      console.log('✅ Migration completed successfully!')
      console.log('')
      console.log('New columns:')
      console.log('  - post_images.image_data (MEDIUMBLOB)')
      console.log('  - post_images.mime_type (VARCHAR)')
      console.log('  - post_images.file_size (INT)')
      console.log('  - posts.image_data (MEDIUMBLOB) - optional')
      console.log('  - posts.image_mime_type (VARCHAR) - optional')
      
    } catch (error) {
      if (error.message.includes("doesn't exist")) {
        console.log('⚠️ post_images table does not exist, creating it...')
        await pool.execute(`
          CREATE TABLE IF NOT EXISTS post_images (
            id VARCHAR(255) PRIMARY KEY,
            post_id VARCHAR(255) NOT NULL,
            image_url VARCHAR(500),
            image_data MEDIUMBLOB,
            mime_type VARCHAR(100),
            file_size INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_post_id (post_id)
          )
        `)
        console.log('✅ Created post_images table with BLOB support')
      } else {
        throw error
      }
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration error:', error.message)
    process.exit(1)
  }
}

migrateToBlob()


