// Fix password column - make it nullable since we use password_hash
import pool from './connection.js'

async function fixPasswordColumn() {
  try {
    console.log('🔄 Fixing password column...')
    
    // Check current password column
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'password'
    `)
    
    if (columns.length > 0) {
      const col = columns[0]
      console.log('📋 Current password column:', {
        type: col.COLUMN_TYPE,
        nullable: col.IS_NULLABLE,
        default: col.COLUMN_DEFAULT
      })
      
      // Make password nullable since we use password_hash
      if (col.IS_NULLABLE === 'NO') {
        console.log('📝 Making password column nullable...')
        await pool.execute(`
          ALTER TABLE users
          MODIFY COLUMN password VARCHAR(255) NULL
        `)
        console.log('✅ Made password column nullable')
      } else {
        console.log('✅ password column is already nullable')
      }
    }
    
    // Also ensure password_hash is NOT NULL (for new inserts)
    const [hashColumns] = await pool.execute(`
      SELECT IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'password_hash'
    `)
    
    if (hashColumns.length > 0 && hashColumns[0].IS_NULLABLE === 'YES') {
      console.log('📝 Making password_hash NOT NULL...')
      await pool.execute(`
        ALTER TABLE users
        MODIFY COLUMN password_hash VARCHAR(255) NOT NULL
      `)
      console.log('✅ Made password_hash NOT NULL')
    }
    
    console.log('')
    console.log('✅ Password column fix completed!')
    console.log('')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration error:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  }
}

fixPasswordColumn()


