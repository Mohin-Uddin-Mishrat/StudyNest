import express from 'express';
import {
  getLecturesByModule,
  getAllLectures,
  getLecture,
  createLecture,
  updateLecture,
  deleteLecture,
  completeLecture
} from '../controllers/lectureController.js';
import { protect, admin, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Public/Protected routes
router.get('/module/:moduleId', optionalAuth, getLecturesByModule);
router.get('/:id', protect, getLecture); // Protected because of enrollment check

// User routes
router.post('/:id/complete', protect, completeLecture);

// Admin only routes
router.get('/', protect, admin, getAllLectures); // Admin lecture list with filters
router.post('/', protect, admin, createLecture);
router.put('/:id', protect, admin, updateLecture);
router.delete('/:id', protect, admin, deleteLecture);

export default router;