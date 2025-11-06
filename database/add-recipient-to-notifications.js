// Migration script to add recipient_username to notifications table
import pool from './connection.js'

async function addRecipientToNotifications() {
  try {
    console.log('🔄 Adding recipient_username to notifications table...\n')
    
    // Check if column already exists
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'notifications' 
      AND COLUMN_NAME = 'recipient_username'
    `)
    
    if (columns.length > 0) {
      console.log('✅ recipient_username column already exists')
    } else {
      // Add recipient_username column
      await pool.execute(`
        ALTER TABLE notifications 
        ADD COLUMN recipient_username VARCHAR(100),
        ADD INDEX idx_recipient_username (recipient_username)
      `)
      console.log('✅ Added recipient_username column and index')
      
      // For existing notifications, set recipient_username to NULL (global notifications)
      // Or you can set them to a default user if needed
      console.log('ℹ️  Existing notifications have recipient_username = NULL (global)')
    }
    
    // Also add post_id and related_id for linking notifications to posts/comments
    const [postIdColumn] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'notifications' 
      AND COLUMN_NAME = 'post_id'
    `)
    
    if (postIdColumn.length === 0) {
      await pool.execute(`
        ALTER TABLE notifications 
        ADD COLUMN post_id VARCHAR(255),
        ADD COLUMN related_id VARCHAR(255),
        ADD INDEX idx_post_id (post_id)
      `)
      console.log('✅ Added post_id and related_id columns for linking notifications')
    } else {
      console.log('✅ post_id column already exists')
    }
    
    console.log('\n✅ Migration complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

addRecipientToNotifications()


