// Migration script to fix comments table user_id column type
import pool from './connection.js'

async function fixCommentsUserId() {
  try {
    console.log('🔄 Fixing comments table user_id column...\n')
    
    // Check if table exists
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'comments'
    `)
    
    if (tables.length === 0) {
      console.log('✅ Comments table does not exist yet - will be created with correct schema')
      return
    }
    
    // Check current column type
    const [columns] = await pool.execute(`
      SELECT COLUMN_TYPE, COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'comments'
      AND COLUMN_NAME = 'user_id'
    `)
    
    if (columns.length === 0) {
      console.log('⚠️ user_id column not found in comments table')
      return
    }
    
    const currentType = columns[0].COLUMN_TYPE
    console.log(`📋 Current user_id type: ${currentType}`)
    
    if (currentType.includes('varchar(36)') || currentType.includes('char(36)')) {
      console.log('✅ user_id column already has correct type (VARCHAR(36))')
    } else {
      console.log('🔧 Updating user_id column type to VARCHAR(36)...')
      
      // First, drop foreign key if it exists (with error handling)
      try {
        await pool.execute(`
          ALTER TABLE comments 
          DROP FOREIGN KEY comments_ibfk_2
        `)
        console.log('✅ Dropped existing foreign key')
      } catch (e) {
        // Foreign key might not exist or have different name
        console.log('ℹ️ No foreign key to drop (or different name)')
      }
      
      // Update column type
      await pool.execute(`
        ALTER TABLE comments 
        MODIFY COLUMN user_id VARCHAR(36) NOT NULL
      `)
      console.log('✅ Updated user_id column type to VARCHAR(36)')
      
      // Add foreign key constraint
      try {
        await pool.execute(`
          ALTER TABLE comments 
          ADD CONSTRAINT fk_comments_user_id 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        `)
        console.log('✅ Added foreign key constraint to users table')
      } catch (e) {
        console.warn('⚠️ Could not add foreign key (users table might not exist yet):', e.message)
      }
    }
    
    console.log('\n✅ Migration complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

fixCommentsUserId()

