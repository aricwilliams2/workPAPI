// Migration script to fix post_ratings.post_id column type
import pool from './connection.js'

async function fixPostRatingsPostId() {
  try {
    console.log('🔄 Fixing post_ratings.post_id column type...')
    
    // Check if post_ratings table exists
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'post_ratings'
    `)

    if (tables.length === 0) {
      console.log('⚠️ post_ratings table does not exist. Skipping.')
      process.exit(0)
      return
    }

    // Check current column type
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'post_ratings' 
      AND COLUMN_NAME = 'post_id'
    `)
    
    if (columns.length === 0) {
      console.log('⚠️ post_id column does not exist in post_ratings. Skipping.')
      process.exit(0)
      return
    }
    
    const currentType = columns[0].DATA_TYPE.toLowerCase()
    console.log(`📋 Current post_id type: ${columns[0].COLUMN_TYPE}`)
    
    // Check what type post_details.id is
    const [postDetailsColumns] = await pool.execute(`
      SELECT COLUMN_TYPE, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'post_details' 
      AND COLUMN_NAME = 'id'
    `)
    
    if (postDetailsColumns.length > 0) {
      console.log(`📋 post_details.id type: ${postDetailsColumns[0].COLUMN_TYPE}`)
      const postDetailsType = postDetailsColumns[0].DATA_TYPE.toLowerCase()
      
      // If post_details.id is bigint but post_ratings.post_id is int, we need to change it
      if ((postDetailsType === 'bigint' || postDetailsType === 'varchar') && currentType === 'int') {
        console.log('📝 Changing post_ratings.post_id from INT to BIGINT to match post_details.id...')
        
        // First, drop the unique constraint if it exists (we'll recreate it)
        try {
          await pool.execute(`
            ALTER TABLE post_ratings
            DROP INDEX unique_rating
          `)
          console.log('✅ Dropped unique_rating index')
        } catch (error) {
          console.warn('⚠️ Could not drop unique_rating index (might not exist):', error.message)
        }
        
        // Change the column type
        await pool.execute(`
          ALTER TABLE post_ratings
          MODIFY COLUMN post_id BIGINT NOT NULL
        `)
        console.log('✅ Changed post_ratings.post_id to BIGINT')
        
        // Recreate the unique constraint
        try {
          await pool.execute(`
            ALTER TABLE post_ratings
            ADD CONSTRAINT unique_rating UNIQUE (post_id, user_id)
          `)
          console.log('✅ Recreated unique_rating constraint')
        } catch (error) {
          console.warn('⚠️ Could not recreate unique_rating constraint:', error.message)
        }
      } else if (postDetailsType === 'varchar' && currentType === 'int') {
        // If post_details.id is VARCHAR, we should also make post_ratings.post_id VARCHAR
        console.log('📝 Changing post_ratings.post_id from INT to VARCHAR to match post_details.id...')
        
        // Drop unique constraint
        try {
          await pool.execute(`
            ALTER TABLE post_ratings
            DROP INDEX unique_rating
          `)
        } catch (error) {
          console.warn('⚠️ Could not drop unique_rating index:', error.message)
        }
        
        // Change to VARCHAR
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
      } else {
        console.log('✅ post_ratings.post_id type is already compatible')
      }
    } else {
      // If we can't check post_details, just change to BIGINT to be safe
      if (currentType === 'int') {
        console.log('📝 Changing post_ratings.post_id from INT to BIGINT (safe default)...')
        
        try {
          await pool.execute(`
            ALTER TABLE post_ratings
            DROP INDEX unique_rating
          `)
        } catch (error) {
          console.warn('⚠️ Could not drop unique_rating index:', error.message)
        }
        
        await pool.execute(`
          ALTER TABLE post_ratings
          MODIFY COLUMN post_id BIGINT NOT NULL
        `)
        console.log('✅ Changed post_ratings.post_id to BIGINT')
        
        try {
          await pool.execute(`
            ALTER TABLE post_ratings
            ADD CONSTRAINT unique_rating UNIQUE (post_id, user_id)
          `)
          console.log('✅ Recreated unique_rating constraint')
        } catch (error) {
          console.warn('⚠️ Could not recreate unique_rating constraint:', error.message)
        }
      }
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

fixPostRatingsPostId()


