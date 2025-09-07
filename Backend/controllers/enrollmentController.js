import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Lecture from '../models/Lecture.js';

// @desc    Enroll in a course
// @route   POST /api/enrollments
// @access  Private
export const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.body;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      userId: req.user.id,
      courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Find first lecture to unlock
    const firstModule = await Module.findOne({ courseId }).sort({ number: 1 });
    const firstLecture = firstModule ? 
      await Lecture.findOne({ moduleId: firstModule._id }).sort({ order: 1 }) : null;

    const enrollment = await Enrollment.create({
      userId: req.user.id,
      courseId,
      unlocked: firstLecture ? [firstLecture._id] : []
    });

    await enrollment.populate(['courseId', 'userId']);

    res.status(201).json(enrollment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's enrollments
// @route   GET /api/enrollments/my
// @access  Private
export const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.user.id })
      .populate('courseId')
      .sort({ createdAt: -1 });

    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get enrollment details
// @route   GET /api/enrollments/:courseId
// @access  Private
export const getEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({
      userId: req.user.id,
      courseId: req.params.courseId
    })
    .populate({
      path: 'courseId',
      populate: {
        path: 'modules',
        populate: {
          path: 'lectures',
          options: { sort: { order: 1 } }
        },
        options: { sort: { number: 1 } }
      }
    })
    .populate('completed')
    .populate('unlocked');

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    res.json(enrollment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all enrollments (Admin only)
// @route   GET /api/enrollments
// @access  Private/Admin
export const getAllEnrollments = async (req, res) => {
  try {
    const { courseId, userId } = req.query;
    let filter = {};

    if (courseId) filter.courseId = courseId;
    if (userId) filter.userId = userId;

    const enrollments = await Enrollment.find(filter)
      .populate('userId', 'name email')
      .populate('courseId', 'title price')
      .sort({ createdAt: -1 });

    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update enrollment progress (Internal use)
// @route   PUT /api/enrollments/:id/progress
// @access  Private
export const updateProgress = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Check if user owns this enrollment or is admin
    if (enrollment.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const progress = await enrollment.calculateProgress();
    await enrollment.save();

    res.json({ progress });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset enrollment progress (Admin only)
// @route   PUT /api/enrollments/:id/reset
// @access  Private/Admin
export const resetProgress = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Reset progress and unlock only first lecture
    const course = await Course.findById(enrollment.courseId);
    const firstModule = await Module.findOne({ courseId: course._id }).sort({ number: 1 });
    const firstLecture = firstModule ? 
      await Lecture.findOne({ moduleId: firstModule._id }).sort({ order: 1 }) : null;

    enrollment.progress = 0;
    enrollment.completed = [];
    enrollment.unlocked = firstLecture ? [firstLecture._id] : [];

    await enrollment.save();

    res.json({ message: 'Progress reset successfully', enrollment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete enrollment
// @route   DELETE /api/enrollments/:id
// @access  Private (own enrollment) / Admin
export const deleteEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Check if user owns this enrollment or is admin
    if (enrollment.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Enrollment.findByIdAndDelete(req.params.id);

    res.json({ message: 'Enrollment removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};