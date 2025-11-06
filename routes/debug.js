import { Router } from 'express'
import pool from '../database/connection.js'

export const debugRouter = Router()

// Debug endpoint to check database
debugRouter.get('/test-posts', async (req, res) => {
  try {
    // Test 1: Check if table exists
    const [tables] = await pool.execute("SHOW TABLES LIKE 'posts'")
    console.log('📋 Tables found:', tables)
    
    // Test 2: Get table structure
    const [columns] = await pool.execute('DESCRIBE posts')
    console.log('📋 Posts table columns:', columns.map(c => c.Field))
    
    // Test 3: Count all posts (no filters)
    const [countAll] = await pool.execute('SELECT COUNT(*) as total FROM posts')
    console.log('📊 Total posts in database:', countAll[0].total)
    
    // Test 4: Get first 5 posts (no filters)
    const [posts] = await pool.execute('SELECT * FROM posts LIMIT 5')
    console.log('📝 Sample posts:', posts.length)
    
    // Test 5: Check is_active values
    const [activeCount] = await pool.execute('SELECT COUNT(*) as total FROM posts WHERE is_active = 1')
    const [inactiveCount] = await pool.execute('SELECT COUNT(*) as total FROM posts WHERE is_active = 0')
    const [nullActiveCount] = await pool.execute('SELECT COUNT(*) as total FROM posts WHERE is_active IS NULL')
    
    res.json({
      success: true,
      debug: {
        tableExists: tables.length > 0,
        columns: columns.map(c => ({
          name: c.Field,
          type: c.Type,
          null: c.Null,
          default: c.Default
        })),
        totalPosts: countAll[0].total,
        samplePostsCount: posts.length,
        samplePost: posts[0] || null,
        activePosts: activeCount[0].total,
        inactivePosts: inactiveCount[0].total,
        nullActivePosts: nullActiveCount[0].total,
      }
    })
  } catch (error) {
    console.error('❌ Debug error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
})

