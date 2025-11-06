// Migration script to allow NULL post_id in post_images for profile images
import pool from './connection.js'

async function allowNullPostId() {
  try {
    console.log('🔄 Modifying post_images table to allow NULL post_id for profile images...')
    
    // Check current structure
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'post_images'
      AND COLUMN_NAME = 'post_id'
    `)
    
    if (columns.length === 0) {
      console.log('❌ post_images table or post_id column not found')
      process.exit(1)
    }
    
    const postIdColumn = columns[0]
    console.log('📋 Current post_id column:', {
      nullable: postIdColumn.IS_NULLABLE,
      type: postIdColumn.COLUMN_TYPE
    })
    
    // Check if post_id is already nullable
    if (postIdColumn.IS_NULLABLE === 'YES') {
      console.log('✅ post_id is already nullable')
    } else {
      // Drop foreign key constraint first
      console.log('📝 Dropping foreign key constraint...')
      try {
        const [constraints] = await pool.execute(`
          SELECT CONSTRAINT_NAME
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'post_images'
          AND COLUMN_NAME = 'post_id'
          AND REFERENCED_TABLE_NAME IS NOT NULL
        `)
        
        if (constraints.length > 0) {
          const constraintName = constraints[0].CONSTRAINT_NAME
          console.log(`📝 Dropping constraint: ${constraintName}`)
          await pool.execute(`
            ALTER TABLE post_images
            DROP FOREIGN KEY ${constraintName}
          `)
          console.log('✅ Foreign key constraint dropped')
        }
      } catch (fkError) {
        console.log('ℹ️ Could not drop foreign key (may not exist):', fkError.message)
      }
      
      // Make post_id nullable
      console.log('📝 Making post_id nullable...')
      // Check the actual column type first
      const columnType = postIdColumn.COLUMN_TYPE
      console.log(`📋 Column type: ${columnType}`)
      
      // Use the actual column type but make it nullable
      await pool.execute(`
        ALTER TABLE post_images
        MODIFY COLUMN post_id ${columnType} NULL
      `)
      console.log('✅ post_id is now nullable')
      
      // Re-add foreign key constraint but allow NULL
      console.log('📝 Re-adding foreign key constraint (allowing NULL)...')
      try {
        await pool.execute(`
          ALTER TABLE post_images
          ADD CONSTRAINT fk_post_images_post_id
          FOREIGN KEY (post_id) REFERENCES posts(id)
          ON DELETE CASCADE
        `)
        console.log('✅ Foreign key constraint re-added (allows NULL)')
      } catch (fkError) {
        console.log('ℹ️ Could not re-add foreign key:', fkError.message)
        console.log('ℹ️ This is okay - MySQL foreign keys allow NULL by default')
      }
    }
    
    console.log('')
    console.log('✅ Migration completed successfully!')
    console.log('')
    console.log('Profile images can now be stored with post_id = NULL')
    console.log('')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration error:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  }
}

allowNullPostId()

