// Migration script to fix post_images table structure
// This ensures post_id is INT to match posts.id
import pool from './connection.js'

async function fixPostImagesRelation() {
  try {
    console.log('🔄 Fixing post_images table structure...')
    
    // Check if post_images table exists
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'post_images'
    `)
    
    if (tables.length === 0) {
      console.log('✅ post_images table does not exist, will be created by schema.sql')
      return
    }
    
    // Check current post_id column type
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'post_images'
      AND COLUMN_NAME = 'post_id'
    `)
    
    if (columns.length === 0) {
      console.log('⚠️ post_id column does not exist, adding it...')
      await pool.execute(`
        ALTER TABLE post_images 
        ADD COLUMN post_id INT NOT NULL,
        ADD INDEX idx_post_id (post_id)
      `)
      console.log('✅ Added post_id column')
    } else {
      const columnType = columns[0].DATA_TYPE
      if (columnType === 'varchar' || columnType === 'char' || columnType === 'text') {
        console.log('⚠️ post_id is VARCHAR, converting to INT...')
        
        // First, update any NULL post_id values (if any)
        await pool.execute(`
          UPDATE post_images 
          SET post_id = 0 
          WHERE post_id IS NULL OR post_id = ''
        `)
        
        // Convert VARCHAR to INT
        // Note: This will fail if there are non-numeric values
        try {
          await pool.execute(`
            ALTER TABLE post_images 
            MODIFY COLUMN post_id INT NOT NULL
          `)
          console.log('✅ Converted post_id from VARCHAR to INT')
        } catch (error) {
          console.error('❌ Error converting post_id:', error.message)
          console.log('⚠️ You may need to clean up invalid post_id values first')
          throw error
        }
      } else if (columnType === 'int') {
        console.log('✅ post_id is already INT')
      } else {
        console.log(`⚠️ post_id is ${columnType}, expected INT`)
      }
    }
    
    // Check if foreign key exists
    const [foreignKeys] = await pool.execute(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'post_images'
      AND COLUMN_NAME = 'post_id'
      AND REFERENCED_TABLE_NAME = 'posts'
    `)
    
    if (foreignKeys.length === 0) {
      console.log('⚠️ Foreign key constraint missing, adding it...')
      try {
        await pool.execute(`
          ALTER TABLE post_images 
          ADD CONSTRAINT fk_post_images_post_id 
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
        `)
        console.log('✅ Added foreign key constraint')
      } catch (error) {
        console.warn('⚠️ Could not add foreign key:', error.message)
        console.log('⚠️ This may be because some post_id values don\'t match existing posts')
      }
    } else {
      console.log('✅ Foreign key constraint already exists')
    }
    
    // Ensure BLOB columns exist
    const [blobColumns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'post_images' 
      AND COLUMN_NAME = 'image_data'
    `)
    
    if (blobColumns.length === 0) {
      console.log('📝 Adding BLOB columns...')
      await pool.execute(`
        ALTER TABLE post_images 
        ADD COLUMN image_data MEDIUMBLOB,
        ADD COLUMN mime_type VARCHAR(100),
        ADD COLUMN file_size INT
      `)
      console.log('✅ Added BLOB columns')
    } else {
      console.log('✅ BLOB columns already exist')
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

fixPostImagesRelation()


