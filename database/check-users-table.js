// Script to check users table structure
import pool from './connection.js'

async function checkUsersTable() {
  try {
    console.log('📋 Checking users table structure...\n')
    
    const [columns] = await pool.execute('DESCRIBE users')
    console.log('Users table columns:')
    columns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'} ${col.Default ? `default: ${col.Default}` : ''}`)
    })
    
    // Check if password_hash exists
    const hasPasswordHash = columns.some(c => c.Field === 'password_hash')
    const hasPassword = columns.some(c => c.Field === 'password')
    
    console.log('\n📊 Column check:')
    console.log(`  password_hash: ${hasPasswordHash ? '✅' : '❌'}`)
    console.log(`  password: ${hasPassword ? '✅' : '❌'}`)
    
    if (hasPassword && !hasPasswordHash) {
      console.log('\n⚠️  Table has "password" but not "password_hash"')
      console.log('   The Auth model expects "password_hash"')
    } else if (!hasPasswordHash) {
      console.log('\n❌ Table is missing password_hash column!')
    } else {
      console.log('\n✅ Table structure is correct!')
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkUsersTable()


