import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

// Create connection pool
// Note: mysql2 handles BLOBs automatically - no special configuration needed
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Support for large BLOBs and convert TEXT fields to strings
  typeCast: function (field, next) {
    if (field.type === 'BLOB' || field.type === 'MEDIUMBLOB' || field.type === 'LONGBLOB') {
      return field.buffer()
    }
    // Convert TEXT fields to strings instead of Buffers
    if (field.type === 'TEXT' || field.type === 'LONGTEXT' || field.type === 'MEDIUMTEXT' || field.type === 'TINYTEXT') {
      return field.string()
    }
    return next()
  }
})

// Test connection - but don't block server startup if it fails
pool.getConnection()
  .then((connection) => {
    console.log('✅ MySQL database connected successfully')
    connection.release()
  })
  .catch((error) => {
    console.error('❌ MySQL database connection error:', error.message)
    console.error('⚠️  Server will continue but database operations may fail')
  })

export default pool

