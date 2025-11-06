// Debug profile posts query
import pool from './connection.js'

async function debugProfilePosts() {
  try {
    console.log('🔍 Debugging profile posts query...\n')
    
    // Get a test username
    const [users] = await pool.execute(`SELECT username FROM users LIMIT 1`)
    if (users.length === 0) {
      console.log('❌ No users found')
      process.exit(1)
    }
    
    const testUsername = users[0].username
    console.log(`📋 Testing with username: ${testUsername}\n`)
    
    // Check posts in posts table
    const [userRecord] = await pool.execute(`SELECT id FROM users WHERE username = ?`, [testUsername])
    const userId = userRecord[0]?.id
    console.log(`📋 User ID: ${userId}`)
    
    const [postsInPostsTable] = await pool.execute(`
      SELECT id, user_id, caption FROM posts WHERE user_id = ? LIMIT 5
    `, [userId])
    console.log(`\n📊 Posts in posts table by user_id: ${postsInPostsTable.length}`)
    postsInPostsTable.forEach(p => {
      console.log(`  - Post ID: ${p.id}, user_id: ${p.user_id}, caption: ${p.caption?.substring(0, 30)}...`)
    })
    
    // Check post_details VIEW
    const [postsInView] = await pool.execute(`
      SELECT id, username, user_id, caption FROM post_details WHERE username = ? LIMIT 5
    `, [testUsername])
    console.log(`\n📊 Posts in post_details VIEW by username: ${postsInView.length}`)
    postsInView.forEach(p => {
      console.log(`  - Post ID: ${p.id}, username: ${p.username}, user_id: ${p.user_id}, caption: ${p.caption?.substring(0, 30)}...`)
    })
    
    // Test the exact query used in Profile.getPosts
    const [profilePosts] = await pool.execute(`
      SELECT 
        p.id,
        p.username,
        p.display_name as business_name,
        CASE WHEN p.account_type = 'business' THEN 1 ELSE 0 END as is_pro,
        COALESCE(u.profile_image, p.profile_image) as profile_image,
        p.caption as description,
        p.category,
        p.rating,
        COALESCE(p.likes_count, 0) as likes,
        COALESCE(p.shares_count, 0) as shares,
        p.created_at
      FROM post_details p
      LEFT JOIN users u ON u.username = p.username
      WHERE p.username = ?
      ORDER BY p.created_at DESC
      LIMIT 20
    `, [testUsername])
    
    console.log(`\n📊 Results from Profile.getPosts query: ${profilePosts.length}`)
    profilePosts.forEach(p => {
      console.log(`  - Post ID: ${p.id}, username: ${p.username}, description: ${p.description?.substring(0, 30)}...`)
    })
    
    // Check images for first post
    if (profilePosts.length > 0) {
      const firstPost = profilePosts[0]
      console.log(`\n🖼️ Checking images for post ${firstPost.id}...`)
      const [images] = await pool.execute(`
        SELECT id, image_url, image_data
        FROM post_images
        WHERE CAST(post_id AS CHAR) = CAST(? AS CHAR)
        LIMIT 1
      `, [firstPost.id])
      console.log(`  Found ${images.length} images`)
      if (images.length > 0) {
        console.log(`  Image ID: ${images[0].id}, has_data: ${!!images[0].image_data}, url: ${images[0].image_url}`)
      }
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

debugProfilePosts()


