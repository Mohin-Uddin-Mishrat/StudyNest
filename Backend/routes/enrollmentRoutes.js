import express from 'express';
import {
  enrollInCourse,
  getMyEnrollments,
  getEnrollment,
  getAllEnrollments,
  updateProgress,
  resetProgress,
  deleteEnrollment
} from '../controllers/enrollmentController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// User routes
router.post('/', protect, enrollInCourse);
router.get('/my', protect, getMyEnrollments);
router.get('/:courseId', protect, getEnrollment);
router.put('/:id/progress', protect, updateProgress);
router.delete('/:id', protect, deleteEnrollment);

// Admin routes
router.get('/', protect, admin, getAllEnrollments);
router.put('/:id/reset', protect, admin, resetProgress);

export default router;