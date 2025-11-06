// Check notifications table structure
import pool from './connection.js'

async function checkNotificationsTable() {
  try {
    console.log('📋 Checking notifications table structure...\n')
    
    const [columns] = await pool.execute('DESCRIBE notifications')
    
    console.log('Columns in notifications table:')
    columns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default !== null ? `DEFAULT ${col.Default}` : ''}`)
    })
    
    // Check if read_status column exists
    const hasReadStatus = columns.some(col => col.Field === 'read_status')
    console.log(`\n📊 read_status column exists: ${hasReadStatus}`)
    
    // Check if recipient_username column exists
    const hasRecipient = columns.some(col => col.Field === 'recipient_username')
    console.log(`📊 recipient_username column exists: ${hasRecipient}`)
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkNotificationsTable()


