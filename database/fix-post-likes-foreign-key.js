// Migration script to remove foreign key constraint on post_likes.user_id
import pool from './connection.js'

async function fixPostLikesForeignKey() {
  try {
    console.log('🔄 Fixing post_likes foreign key constraints...')
    
    // Check if post_likes table exists
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'post_likes'
    `)

    if (tables.length === 0) {
      console.log('⚠️ post_likes table does not exist. Skipping.')
      process.exit(0)
      return
    }

    // Get all foreign key constraints on post_likes table
    const [constraints] = await pool.execute(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'post_likes'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `)

    // Remove foreign key constraints
    for (const constraint of constraints) {
      const constraintName = constraint.CONSTRAINT_NAME
      console.log(`📝 Removing foreign key constraint: ${constraintName}`)
      
      try {
        await pool.execute(`
          ALTER TABLE post_likes
          DROP FOREIGN KEY ${constraintName}
        `)
        console.log(`✅ Removed foreign key constraint: ${constraintName}`)
      } catch (error) {
        console.warn(`⚠️ Could not remove constraint ${constraintName}:`, error.message)
      }
    }

    // Check if there's a foreign key on post_id that references posts (should be removed if using post_details)
    const [postIdConstraints] = await pool.execute(`
      SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'post_likes'
      AND COLUMN_NAME = 'post_id'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `)

    for (const constraint of postIdConstraints) {
      // If it references 'posts' but we're using 'post_details', remove it
      if (constraint.REFERENCED_TABLE_NAME === 'posts') {
        console.log(`📝 Removing foreign key constraint on post_id (references posts, but we use post_details): ${constraint.CONSTRAINT_NAME}`)
        try {
          await pool.execute(`
            ALTER TABLE post_likes
            DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}
          `)
          console.log(`✅ Removed foreign key constraint: ${constraint.CONSTRAINT_NAME}`)
        } catch (error) {
          console.warn(`⚠️ Could not remove constraint ${constraint.CONSTRAINT_NAME}:`, error.message)
        }
      }
    }

    console.log('')
    console.log('✅ post_likes foreign key constraints fixed!')
    console.log('')
    console.log('Note: user_id is now stored as VARCHAR (username) without foreign key constraint')
    console.log('')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration error:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  }
}

fixPostLikesForeignKey()


