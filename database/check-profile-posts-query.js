// Check how posts are stored and can be queried for profile
import pool from './connection.js'

async function checkProfilePosts() {
  try {
    console.log('📋 Checking posts for profile display...\n')
    
    // Check posts table structure
    const [postColumns] = await pool.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'posts'
      ORDER BY ORDINAL_POSITION
    `)
    
    console.log('Posts table columns:')
    postColumns.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`)
    })
    
    // Check post_details view structure
    const [viewColumns] = await pool.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'post_details'
      ORDER BY ORDINAL_POSITION
    `)
    
    console.log('\npost_details VIEW columns:')
    viewColumns.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}`)
    })
    
    // Check sample posts
    const [posts] = await pool.execute(`
      SELECT id, user_id, caption, category, created_at FROM posts LIMIT 5
    `)
    console.log('\nSample posts from posts table:')
    posts.forEach(post => {
      console.log(`  id: ${post.id}, user_id: ${post.user_id}, caption: ${post.caption?.substring(0, 30)}...`)
    })
    
    // Check post_details
    const [postDetails] = await pool.execute(`
      SELECT id, username, user_id, caption, category FROM post_details LIMIT 5
    `)
    console.log('\nSample posts from post_details VIEW:')
    postDetails.forEach(post => {
      console.log(`  id: ${post.id}, username: ${post.username}, user_id: ${post.user_id}, caption: ${post.caption?.substring(0, 30)}...`)
    })
    
    // Check a specific user's posts
    const [users] = await pool.execute(`SELECT username FROM users LIMIT 1`)
    if (users.length > 0) {
      const testUsername = users[0].username
      console.log(`\n📋 Checking posts for user: ${testUsername}`)
      
      // Check posts by user_id
      const [userPosts] = await pool.execute(`
        SELECT id, user_id, caption FROM posts WHERE user_id = (SELECT id FROM users WHERE username = ?) LIMIT 5
      `, [testUsername])
      console.log(`Posts in posts table by user_id: ${userPosts.length}`)
      
      // Check post_details by username
      const [detailPosts] = await pool.execute(`
        SELECT id, username, caption FROM post_details WHERE username = ? LIMIT 5
      `, [testUsername])
      console.log(`Posts in post_details by username: ${detailPosts.length}`)
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkProfilePosts()


