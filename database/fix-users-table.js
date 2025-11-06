// Migration script to fix users table structure
import pool from './connection.js'

async function fixUsersTable() {
  try {
    console.log('🔄 Fixing users table structure...')
    
    // Check if users table exists
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
    `)

    if (tables.length === 0) {
      console.log('📝 Creating users table...')
      await pool.execute(`
        CREATE TABLE users (
          id VARCHAR(36) PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          display_name VARCHAR(100),
          profile_image TEXT,
          account_type ENUM('personal', 'business') DEFAULT 'personal',
          business_category VARCHAR(100),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_username (username),
          INDEX idx_email (email)
        )
      `)
      console.log('✅ Users table created')
    } else {
      // Check current columns
      const [columns] = await pool.execute(`
        SELECT COLUMN_NAME, COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users'
      `)
      
      const columnNames = columns.map(c => c.COLUMN_NAME)
      console.log('📋 Current columns:', columnNames.join(', '))
      
      // Add missing columns
      if (!columnNames.includes('password_hash')) {
        console.log('📝 Adding password_hash column...')
        await pool.execute(`
          ALTER TABLE users
          ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT ''
        `)
        console.log('✅ Added password_hash column')
      }
      
      if (!columnNames.includes('display_name')) {
        console.log('📝 Adding display_name column...')
        await pool.execute(`
          ALTER TABLE users
          ADD COLUMN display_name VARCHAR(100)
        `)
        console.log('✅ Added display_name column')
      }
      
      if (!columnNames.includes('profile_image')) {
        console.log('📝 Adding profile_image column...')
        await pool.execute(`
          ALTER TABLE users
          ADD COLUMN profile_image TEXT
        `)
        console.log('✅ Added profile_image column')
      }
      
      if (!columnNames.includes('account_type')) {
        console.log('📝 Adding account_type column...')
        await pool.execute(`
          ALTER TABLE users
          ADD COLUMN account_type ENUM('personal', 'business') DEFAULT 'personal'
        `)
        console.log('✅ Added account_type column')
      }
      
      if (!columnNames.includes('business_category')) {
        console.log('📝 Adding business_category column...')
        await pool.execute(`
          ALTER TABLE users
          ADD COLUMN business_category VARCHAR(100)
        `)
        console.log('✅ Added business_category column')
      }
      
      if (!columnNames.includes('is_active')) {
        console.log('📝 Adding is_active column...')
        await pool.execute(`
          ALTER TABLE users
          ADD COLUMN is_active BOOLEAN DEFAULT TRUE
        `)
        console.log('✅ Added is_active column')
      }
      
      // Remove default from password_hash if it was added with default
      try {
        const [passwordHashCol] = await pool.execute(`
          SELECT COLUMN_DEFAULT
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = 'password_hash'
        `)
        
        if (passwordHashCol.length > 0 && passwordHashCol[0].COLUMN_DEFAULT === '') {
          console.log('📝 Removing default value from password_hash...')
          await pool.execute(`
            ALTER TABLE users
            MODIFY COLUMN password_hash VARCHAR(255) NOT NULL
          `)
          console.log('✅ Removed default from password_hash')
        }
      } catch (e) {
        console.warn('⚠️ Could not modify password_hash:', e.message)
      }
    }
    
    console.log('')
    console.log('✅ Users table migration completed successfully!')
    console.log('')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration error:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  }
}

fixUsersTable()


