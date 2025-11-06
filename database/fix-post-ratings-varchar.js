// Migration script to change post_ratings.post_id to VARCHAR to match post_details.id
import pool from './connection.js'

async function fixPostRatingsVarchar() {
  try {
    console.log('🔄 Changing post_ratings.post_id to VARCHAR to match post_details.id...')
    
    // Drop unique constraint first
    try {
      await pool.execute(`
        ALTER TABLE post_ratings
        DROP INDEX unique_rating
      `)
      console.log('✅ Dropped unique_rating index')
    } catch (error) {
      console.warn('⚠️ Could not drop unique_rating index (might not exist):', error.message)
    }
    
    // Change post_id to VARCHAR(255)
    await pool.execute(`
      ALTER TABLE post_ratings
      MODIFY COLUMN post_id VARCHAR(255) NOT NULL
    `)
    console.log('✅ Changed post_ratings.post_id to VARCHAR(255)')
    
    // Recreate unique constraint
    try {
      await pool.execute(`
        ALTER TABLE post_ratings
        ADD CONSTRAINT unique_rating UNIQUE (post_id, user_id)
      `)
      console.log('✅ Recreated unique_rating constraint')
    } catch (error) {
      console.warn('⚠️ Could not recreate unique_rating constraint:', error.message)
    }
    
    console.log('')
    console.log('✅ post_ratings.post_id migration completed successfully!')
    console.log('')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration error:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  }
}

fixPostRatingsVarchar()


