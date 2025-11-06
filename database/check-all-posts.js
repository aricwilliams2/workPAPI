// Check all posts and their usernames
import pool from './connection.js'

async function checkAllPosts() {
  try {
    console.log('🔍 Checking all posts in database...\n')
    
    // Check posts table
    const [postsTable] = await pool.execute(`
      SELECT p.id, p.user_id, p.caption, p.created_at
      FROM posts p
      ORDER BY p.created_at DESC
      LIMIT 10
    `)
    console.log(`📊 Posts in posts table: ${postsTable.length}`)
    postsTable.forEach(p => {
      console.log(`  - Post ID: ${p.id}, user_id: ${p.user_id}`)
    })
    
    // Get usernames for those user_ids
    if (postsTable.length > 0) {
      const userIds = postsTable.map(p => p.user_id).filter(Boolean)
      if (userIds.length > 0) {
        const placeholders = userIds.map(() => '?').join(',')
        const [users] = await pool.execute(`
          SELECT id, username FROM users WHERE id IN (${placeholders})
        `, userIds)
        console.log(`\n👤 Users found:`)
        users.forEach(u => {
          console.log(`  - User ID: ${u.id}, username: ${u.username}`)
        })
      }
    }
    
    // Check post_details VIEW
    const [postDetails] = await pool.execute(`
      SELECT id, username, user_id, caption, created_at
      FROM post_details
      ORDER BY created_at DESC
      LIMIT 10
    `)
    console.log(`\n📊 Posts in post_details VIEW: ${postDetails.length}`)
    postDetails.forEach(p => {
      console.log(`  - Post ID: ${p.id}, username: ${p.username}, user_id: ${p.user_id}`)
    })
    
    // Check all users
    const [allUsers] = await pool.execute(`SELECT username FROM users`)
    console.log(`\n👤 All users in database: ${allUsers.length}`)
    allUsers.forEach(u => {
      console.log(`  - ${u.username}`)
    })
    
    // Check post_images
    const [images] = await pool.execute(`
      SELECT id, post_id, image_url IS NOT NULL as has_url, image_data IS NOT NULL as has_data
      FROM post_images
      LIMIT 10
    `)
    console.log(`\n🖼️ Post images: ${images.length}`)
    images.forEach(img => {
      console.log(`  - Image ID: ${img.id}, post_id: ${img.post_id}, has_url: ${img.has_url}, has_data: ${img.has_data}`)
    })
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

checkAllPosts()


