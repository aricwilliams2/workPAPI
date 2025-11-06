// Migration script to create all post-related tables with proper relationships
import pool from './connection.js'

async function migrateRelations() {
  try {
    console.log('🔄 Migrating post-related tables...')
    
    // Create post_videos table
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS post_videos (
          id VARCHAR(255) PRIMARY KEY,
          post_id INT NOT NULL,
          video_url VARCHAR(500),
          video_data MEDIUMBLOB,
          mime_type VARCHAR(100),
          file_size INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
          INDEX idx_post_id (post_id)
        )
      `)
      console.log('✅ post_videos table created/verified')
    } catch (error) {
      console.warn('⚠️ post_videos table error:', error.message)
    }
    
    // Create post_tags table
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS post_tags (
          id INT AUTO_INCREMENT PRIMARY KEY,
          post_id INT NOT NULL,
          tag VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
          INDEX idx_post_id (post_id),
          INDEX idx_tag (tag)
        )
      `)
      console.log('✅ post_tags table created/verified')
    } catch (error) {
      console.warn('⚠️ post_tags table error:', error.message)
    }
    
    // Create post_likes table
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS post_likes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          post_id INT NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
          UNIQUE KEY unique_like (post_id, user_id),
          INDEX idx_post_id (post_id),
          INDEX idx_user_id (user_id)
        )
      `)
      console.log('✅ post_likes table created/verified')
    } catch (error) {
      console.warn('⚠️ post_likes table error:', error.message)
    }
    
    // Create comments table
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS comments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          post_id INT NOT NULL,
          user_id VARCHAR(36) NOT NULL,
          username VARCHAR(100) NOT NULL,
          comment_text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
          INDEX idx_post_id (post_id),
          INDEX idx_user_id (user_id)
        )
      `)
      console.log('✅ comments table created/verified')
      
      // Fix user_id column type if it's wrong (for existing tables)
      try {
        const [columns] = await pool.execute(`
          SELECT COLUMN_TYPE
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'comments'
          AND COLUMN_NAME = 'user_id'
        `)
        
        if (columns.length > 0 && !columns[0].COLUMN_TYPE.includes('varchar(36)')) {
          console.log('🔧 Fixing comments.user_id column type...')
          // Drop foreign key if it exists
          try {
            await pool.execute(`ALTER TABLE comments DROP FOREIGN KEY comments_ibfk_2`)
          } catch (e) {
            // Foreign key might not exist
          }
          await pool.execute(`ALTER TABLE comments MODIFY COLUMN user_id VARCHAR(36) NOT NULL`)
          console.log('✅ Fixed comments.user_id column type')
        }
      } catch (error) {
        console.warn('⚠️ Could not fix comments.user_id:', error.message)
      }
    } catch (error) {
      console.warn('⚠️ comments table error:', error.message)
    }
    
    // Fix post_images table post_id type if needed
    try {
      const [columns] = await pool.execute(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'post_images' 
        AND COLUMN_NAME = 'post_id'
      `)
      
      if (columns.length > 0 && columns[0].DATA_TYPE !== 'int') {
        console.log('⚠️ post_images.post_id is not INT, fixing...')
        await pool.execute(`
          ALTER TABLE post_images 
          MODIFY COLUMN post_id INT NOT NULL
        `)
        console.log('✅ Fixed post_images.post_id type')
      }
    } catch (error) {
      console.warn('⚠️ post_images.post_id fix error:', error.message)
    }
    
    console.log('')
    console.log('✅ Migration completed successfully!')
    console.log('')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration error:', error.message)
    process.exit(1)
  }
}

migrateRelations()


