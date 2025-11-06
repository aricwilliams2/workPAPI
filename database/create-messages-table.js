// Migration script to create messages table for direct messaging
import pool from './connection.js'

async function createMessagesTable() {
  try {
    console.log('🔄 Creating messages table...\n')
    
    // Check if table already exists
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'messages'
    `)
    
    if (tables.length > 0) {
      console.log('✅ Messages table already exists')
      return
    }
    
    // Create messages table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        conversation_id VARCHAR(36) NOT NULL,
        sender_id VARCHAR(36) NOT NULL,
        sender_username VARCHAR(100) NOT NULL,
        recipient_id VARCHAR(36) NOT NULL,
        recipient_username VARCHAR(100) NOT NULL,
        message_text TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_conversation_id (conversation_id),
        INDEX idx_sender_id (sender_id),
        INDEX idx_recipient_id (recipient_id),
        INDEX idx_created_at (created_at),
        INDEX idx_is_read (is_read)
      )
    `)
    
    console.log('✅ Created messages table')
    
    // Create conversations table to track message threads
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user1_id VARCHAR(36) NOT NULL,
        user1_username VARCHAR(100) NOT NULL,
        user2_id VARCHAR(36) NOT NULL,
        user2_username VARCHAR(100) NOT NULL,
        last_message_id VARCHAR(36),
        last_message_text TEXT,
        last_message_at TIMESTAMP,
        unread_count_user1 INT DEFAULT 0,
        unread_count_user2 INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_conversation (user1_id, user2_id),
        INDEX idx_user1_id (user1_id),
        INDEX idx_user2_id (user2_id),
        INDEX idx_last_message_at (last_message_at)
      )
    `)
    
    console.log('✅ Created conversations table')
    
    console.log('\n✅ Migration complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

createMessagesTable()


