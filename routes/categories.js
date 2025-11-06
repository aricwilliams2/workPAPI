import { Router } from 'express'
import { Category } from '../models/Category.js'
import pool from '../database/connection.js'

export const categoriesRouter = Router()

// GET /api/categories - Get all categories
categoriesRouter.get('/', async (req, res) => {
  try {
    // Set content-type header explicitly
    res.setHeader('Content-Type', 'application/json')
    
    // Fallback to default categories if database fails
    try {
      const categories = await Category.getAll()
      
      return res.json({
        success: true,
        data: categories,
      })
    } catch (dbError) {
      console.error('Database error, returning default categories:', dbError.message)
      // Return default categories if database query fails
      const defaultCategories = [
        { id: 'all', name: 'All' },
        { id: 'carpenters', name: 'Carpenters' },
        { id: 'electricians', name: 'Electricians' },
        { id: 'plumbers', name: 'Plumbers' },
        { id: 'painters', name: 'Painters' },
        { id: 'landscapers', name: 'Landscapers' },
        { id: 'roofers', name: 'Roofers' },
      ]
      
      return res.json({
        success: true,
        data: defaultCategories,
      })
    }
  } catch (error) {
    console.error('Categories route error:', error)
    res.setHeader('Content-Type', 'application/json')
    return res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

