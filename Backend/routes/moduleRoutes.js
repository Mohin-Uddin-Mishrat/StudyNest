import express from 'express';
import {
  getModulesByCourse,
  getModule,
  createModule,
  updateModule,
  deleteModule,
  reorderModules
} from '../controllers/moduleController.js';
import { protect, admin, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Public/Protected routes
router.get('/course/:courseId', optionalAuth, getModulesByCourse);
router.get('/:id', optionalAuth, getModule);

// Admin only routes
router.post('/', protect, admin, createModule);
router.put('/reorder', protect, admin, reorderModules);
router.put('/:id', protect, admin, updateModule);
router.delete('/:id', protect, admin, deleteModule);

export default router;