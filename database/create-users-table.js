// Migration script to create users table
import pool from './connection.js'

async function createUsersTable() {
  try {
    console.log('🔄 Creating users table...')
    
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
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
    
    console.log('✅ Users table structure verified')
    
    console.log('✅ Users table created successfully!')
    console.log('')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration error:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  }
}

createUsersTable()

