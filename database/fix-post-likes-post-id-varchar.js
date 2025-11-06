// Migration script to change post_likes.post_id to VARCHAR to match post_details.id
import pool from './connection.js'

async function fixPostLikesPostIdVarchar() {
  try {
    console.log('🔄 Changing post_likes.post_id to VARCHAR to match post_details.id...\n')
    
    // Check current column type
    const [columns] = await pool.execute(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'post_likes' 
      AND COLUMN_NAME = 'post_id'
    `)
    
    if (columns.length > 0) {
      const currentType = columns[0].COLUMN_TYPE
      console.log(`📋 Current post_likes.post_id type: ${currentType}`)
      
      if (!currentType.includes('varchar')) {
        // Drop foreign key constraint if it exists
        try {
          const [constraints] = await pool.execute(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'post_likes' 
            AND COLUMN_NAME = 'post_id'
            AND CONSTRAINT_NAME != 'PRIMARY'
          `)
          
          for (const constraint of constraints) {
            console.log(`📝 Dropping foreign key constraint: ${constraint.CONSTRAINT_NAME}`)
            await pool.execute(`
              ALTER TABLE post_likes 
              DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}
            `)
          }
        } catch (e) {
          console.log('ℹ️  No foreign key constraints to drop or already removed')
        }
        
        // Change post_id to VARCHAR(255)
        console.log('📝 Changing post_id to VARCHAR(255)...')
        await pool.execute(`
          ALTER TABLE post_likes 
          MODIFY COLUMN post_id VARCHAR(255) NOT NULL
        `)
        console.log('✅ Changed post_likes.post_id to VARCHAR(255)')
      } else {
        console.log('✅ post_likes.post_id is already VARCHAR')
      }
    } else {
      console.log('❌ post_likes table or post_id column not found')
    }
    
    console.log('\n✅ Migration complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

fixPostLikesPostIdVarchar()


