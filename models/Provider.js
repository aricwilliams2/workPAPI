import pool from '../database/connection.js'

export class Provider {
  static async getAll(filters = {}) {
    try {
      let rows = []
      
      // Try service_providers table first (schema table)
      try {
        let query = 'SELECT * FROM service_providers'
        const conditions = []
        const params = []

        if (filters.category && filters.category !== 'all') {
          // Handle case-insensitive category matching
          const categoryLower = filters.category.toLowerCase()
          conditions.push('LOWER(category) = ?')
          params.push(categoryLower)
        }

        if (filters.search) {
          conditions.push('name LIKE ?')
          params.push(`%${filters.search}%`)
        }

        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ')
        }

        query += ' ORDER BY rating DESC, review_count DESC'

        if (filters.limit) {
          query += ' LIMIT ?'
          params.push(parseInt(filters.limit))
        } else {
          query += ' LIMIT 20'
        }

        if (filters.offset) {
          query += ' OFFSET ?'
          params.push(parseInt(filters.offset))
        }

        console.log('🔍 service_providers query:', query)
        console.log('📋 service_providers params:', params)
        
        const result = await pool.execute(query, params)
        rows = result[0]
        console.log(`✅ Found ${rows.length} providers from service_providers table`)
      } catch (tableError) {
        console.warn('⚠️ service_providers table query failed, trying services table:', tableError.message)
        // Fallback: try services table (user's actual table)
        try {
          let query = 'SELECT * FROM services'
          const conditions = []
          const params = []

          if (filters.category && filters.category !== 'all') {
            // Try different possible column names
            const categoryLower = filters.category.toLowerCase()
            conditions.push('(LOWER(category) = ? OR LOWER(service_category) = ? OR LOWER(type) = ?)')
            params.push(categoryLower)
            params.push(categoryLower)
            params.push(categoryLower)
          }

          if (filters.search) {
            conditions.push('(name LIKE ? OR title LIKE ? OR description LIKE ?)')
            params.push(`%${filters.search}%`)
            params.push(`%${filters.search}%`)
            params.push(`%${filters.search}%`)
          }

          if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ')
          }

          query += ' ORDER BY rating DESC, review_count DESC LIMIT 20'
          
          console.log('🔍 Trying services table query:', query)
          const result = await pool.execute(query, params)
          rows = result[0]
          console.log(`✅ Found ${rows.length} providers from services table`)
        } catch (e) {
          console.error('❌ Both tables failed:', e.message)
          rows = []
        }
      }
      
      return rows.map((row, index) => {
        try {
          // Handle services - could be JSON or array
          let services = []
          try {
            if (row.services) {
              if (typeof row.services === 'string') {
                services = JSON.parse(row.services || '[]')
              } else if (Array.isArray(row.services)) {
                services = row.services
              }
            }
          } catch (e) {
            services = []
          }
          
          // Get image from various possible columns
          let image = row.image || row.image_url || row.thumbnail || row.photo
          
          // Get name/title
          const name = row.name || row.title || row.service_name || `Service ${index + 1}`
          
          // Get category
          const category = row.category || row.service_category || row.type || 'Other'
          
          // Calculate distance if location data exists
          let distance = row.distance || 'Unknown'
          if (!row.distance && row.location_lat && row.location_lng) {
            // Could calculate distance here if needed
            distance = 'Nearby'
          }
          
          return {
            id: row.id || row.ID || row.service_id || `provider-${index}`,
            name: name,
            category: category,
            image: image || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=300&fit=crop',
            rating: parseFloat(row.rating || row.avg_rating || 0) || 0,
            reviewCount: parseInt(row.review_count || row.reviewCount || row.reviews_count || 0) || 0,
            distance: distance,
            trustedBy: row.trusted_by || row.trustedBy || row.trusted_count || null,
            location: (row.location_lat && row.location_lng) ? {
              lat: parseFloat(row.location_lat),
              lng: parseFloat(row.location_lng),
            } : null,
            services: services,
          }
        } catch (rowError) {
          console.error(`❌ Error processing provider row ${index}:`, rowError)
          return null
        }
      }).filter(provider => provider !== null)
    } catch (error) {
      console.error('Provider.getAll error:', error)
      throw new Error(`Failed to fetch providers: ${error.message}`)
    }
  }

  static async getById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM service_providers WHERE id = ?',
        [id]
      )

      if (rows.length === 0) {
        return null
      }

      const row = rows[0]
      return {
        ...row,
        services: typeof row.services === 'string' ? JSON.parse(row.services || '[]') : row.services,
        location: row.location_lat && row.location_lng ? {
          lat: parseFloat(row.location_lat),
          lng: parseFloat(row.location_lng),
        } : null,
      }
    } catch (error) {
      throw new Error(`Failed to fetch provider: ${error.message}`)
    }
  }

  static async create(providerData) {
    try {
      const {
        name,
        category,
        image,
        rating,
        reviewCount,
        distance,
        location,
        services,
      } = providerData

      const [result] = await pool.execute(
        `INSERT INTO service_providers (name, category, image, rating, review_count, distance, location_lat, location_lng, services, trusted_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          category,
          image || 'https://via.placeholder.com/400x300',
          rating || 0,
          reviewCount || 0,
          distance || 'Unknown',
          location?.lat || null,
          location?.lng || null,
          JSON.stringify(services || []),
          null,
        ]
      )

      return await this.getById(result.insertId)
    } catch (error) {
      throw new Error(`Failed to create provider: ${error.message}`)
    }
  }
}

