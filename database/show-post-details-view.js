// Show post_details VIEW definition in readable format
import pool from './connection.js'

async function showPostDetailsView() {
  try {
    console.log('📋 post_details VIEW Structure:\n')
    
    // Get VIEW definition
    const [viewDef] = await pool.execute(`
      SELECT VIEW_DEFINITION
      FROM INFORMATION_SCHEMA.VIEWS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'post_details'
    `)
    
    if (viewDef.length > 0) {
      const definition = viewDef[0].VIEW_DEFINITION.toString()
      console.log('VIEW Definition:')
      console.log(definition)
      console.log('\n' + '='.repeat(80))
    }
    
    // Check what base tables it references
    console.log('\n📊 Base Tables Used:')
    console.log('  - posts (base table)')
    console.log('  - users (joined via user_id)')
    
    console.log('\n📋 Profile.getPosts() Query Flow:')
    console.log('  1. SELECT FROM post_details VIEW (filters by username)')
    console.log('  2. LEFT JOIN users table (to get current profile_image)')
    console.log('  3. For each post, query post_images table (to get images)')
    
    console.log('\n📋 Tables Called:')
    console.log('  ✅ post_details VIEW (main query)')
    console.log('     └─> Based on: posts table + users table')
    console.log('  ✅ users table (joined for profile_image)')
    console.log('  ✅ post_images table (separate query per post)')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

showPostDetailsView()


