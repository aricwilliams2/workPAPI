// Check if messages table exists
import pool from './connection.js'

async function checkMessagesTable() {
  try {
    console.log('📋 Checking for messages/conversations table...\n')
    
    // Check if messages table exists
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('messages', 'conversations', 'direct_messages')
    `)
    
    if (tables.length > 0) {
      console.log('📊 Found tables:')
      tables.forEach(t => console.log(`  - ${t.TABLE_NAME}`))
      
      // Check structure of messages table
      const [columns] = await pool.execute('DESCRIBE messages')
      console.log('\n📋 Messages table columns:')
      columns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type}`)
      })
    } else {
      console.log('❌ No messages/conversations table found')
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkMessagesTable()


