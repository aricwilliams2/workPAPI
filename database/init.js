import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from './connection.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read and execute SQL schema
async function initializeDatabase() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0)

    for (const statement of statements) {
      try {
        await pool.execute(statement.trim())
      } catch (error) {
        // Ignore errors for CREATE TABLE IF NOT EXISTS and INSERT IGNORE
        if (!error.message.includes('already exists') && !error.message.includes('Duplicate entry')) {
          console.warn('SQL execution warning:', error.message)
        }
      }
    }

    console.log('✅ Database schema initialized successfully')
  } catch (error) {
    console.error('❌ Database initialization error:', error.message)
    throw error
  }
}

export default initializeDatabase

