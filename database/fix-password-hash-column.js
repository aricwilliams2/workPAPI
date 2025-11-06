// Fix password_hash column to remove default and ensure it's properly set up
import pool from './connection.js'

async function fixPasswordHashColumn() {
  try {
    console.log('🔄 Fixing password_hash column...')
    
    // Check current password_hash column
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'password_hash'
    `)
    
    if (columns.length > 0) {
      const col = columns[0]
      console.log('📋 Current password_hash:', {
        type: col.COLUMN_TYPE,
        nullable: col.IS_NULLABLE,
        default: col.COLUMN_DEFAULT
      })
      
      // Remove default if it exists
      if (col.COLUMN_DEFAULT !== null) {
        console.log('📝 Removing default value from password_hash...')
        await pool.execute(`
          ALTER TABLE users
          MODIFY COLUMN password_hash VARCHAR(255) NOT NULL
        `)
        console.log('✅ Removed default from password_hash')
      } else {
        console.log('✅ password_hash has no default (correct)')
      }
    } else {
      console.log('❌ password_hash column does not exist!')
      // Create it
      await pool.execute(`
        ALTER TABLE users
        ADD COLUMN password_hash VARCHAR(255) NOT NULL
      `)
      console.log('✅ Created password_hash column')
    }
    
    console.log('')
    console.log('✅ password_hash column fix completed!')
    console.log('')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration error:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  }
}

fixPasswordHashColumn()


