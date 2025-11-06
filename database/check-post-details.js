// Script to check post_details table structure
import pool from './connection.js'

async function checkPostDetails() {
  try {
    console.log('📋 Checking post_details table structure...')
    
    const [rows] = await pool.execute('DESCRIBE post_details')
    console.log('\npost_details columns:')
    rows.forEach(r => {
      console.log(`  ${r.Field}: ${r.Type} ${r.Null === 'YES' ? '(nullable)' : '(not null)'}`)
    })
    
    // Check a sample row
    const [sampleRows] = await pool.execute('SELECT * FROM post_details LIMIT 1')
    if (sampleRows.length > 0) {
      console.log('\n📝 Sample row keys:')
      console.log(Object.keys(sampleRows[0]))
      console.log('\n📝 Sample caption:', sampleRows[0].caption?.substring(0, 100) || 'NULL')
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkPostDetails()


