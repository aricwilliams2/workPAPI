import { Router } from 'express'
import { Provider } from '../models/Provider.js'

export const providersRouter = Router()

// GET /api/providers - Get all service providers with optional filtering
providersRouter.get('/', async (req, res) => {
  console.log('🔍 PROVIDERS ROUTE HIT - /api/providers')
  console.log('📋 Query params:', req.query)
  try {
    const { category, search, limit, offset } = req.query
    const filters = {}
    
    if (category) filters.category = category
    if (search) filters.search = search
    if (limit) filters.limit = limit
    if (offset) filters.offset = offset

    const providers = await Provider.getAll(filters)
    
    console.log(`✅ Returning ${providers.length} providers`)
    res.setHeader('Content-Type', 'application/json')
    res.json({
      success: true,
      data: providers,
      total: providers.length,
      limit: parseInt(limit) || 10,
      offset: parseInt(offset) || 0,
    })
  } catch (error) {
    console.error('❌ Providers route error:', error)
    res.setHeader('Content-Type', 'application/json')
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// GET /api/providers/:id - Get a specific service provider
providersRouter.get('/:id', async (req, res) => {
  try {
    const provider = await Provider.getById(parseInt(req.params.id))
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Service provider not found',
      })
    }

    res.json({
      success: true,
      data: provider,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// POST /api/providers - Create a new service provider
providersRouter.post('/', async (req, res) => {
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
    } = req.body

    if (!name || !category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, category',
      })
    }

    const newProvider = await Provider.create({
      name,
      category,
      image,
      rating,
      reviewCount,
      distance,
      location,
      services,
    })

    res.status(201).json({
      success: true,
      data: newProvider,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

