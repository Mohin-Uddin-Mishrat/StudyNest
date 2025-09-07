import Lecture from '../models/Lecture.js';
import Module from '../models/Module.js';
import Enrollment from '../models/Enrollment.js';

// @desc    Get lectures for a module
// @route   GET /api/lectures/module/:moduleId
// @access  Public
export const getLecturesByModule = async (req, res) => {
  try {
    const lectures = await Lecture.find({ moduleId: req.params.moduleId })
      .sort({ order: 1 });

    res.json(lectures);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all lectures with filters
// @route   GET /api/lectures
// @access  Private/Admin
export const getAllLectures = async (req, res) => {
  try {
    const { courseId, moduleId } = req.query;
    let filter = {};

    if (moduleId) {
      filter.moduleId = moduleId;
    } else if (courseId) {
      const modules = await Module.find({ courseId });
      filter.moduleId = { $in: modules.map(m => m._id) };
    }

    const lectures = await Lecture.find(filter)
      .populate({
        path: 'moduleId',
        populate: {
          path: 'courseId',
          select: 'title'
        }
      })
      .sort({ 'moduleId.number': 1, order: 1 });

    res.json(lectures);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single lecture
// @route   GET /api/lectures/:id
// @access  Private (with enrollment check for users)
export const getLecture = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id)
      .populate({
        path: 'moduleId',
        populate: {
          path: 'courseId'
        }
      });

    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }

    // If user is not admin, check enrollment and unlock status
    if (req.user.role !== 'admin') {
      const enrollment = await Enrollment.findOne({
        userId: req.user.id,
        courseId: lecture.moduleId.courseId._id
      });

      if (!enrollment) {
        return res.status(403).json({ message: 'Not enrolled in this course' });
      }

      if (!enrollment.unlocked.includes(lecture._id)) {
        return res.status(403).json({ message: 'Lecture not unlocked' });
      }
    }

    res.json(lecture);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create lecture (Admin only)
// @route   POST /api/lectures
// @access  Private/Admin
export const createLecture = async (req, res) => {
  try {
    const { title, moduleId, videoUrl } = req.body;

    // Check if module exists
    const module = await Module.findById(moduleId);
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    // Get next order number
    const lastLecture = await Lecture.findOne({ moduleId })
      .sort({ order: -1 });
    
    const nextOrder = lastLecture ? lastLecture.order + 1 : 1;

    const lecture = await Lecture.create({
      title,
      order: nextOrder,
      moduleId,
      videoUrl
    });

    res.status(201).json(lecture);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update lecture (Admin only)
// @route   PUT /api/lectures/:id
// @access  Private/Admin
export const updateLecture = async (req, res) => {
  try {
    const { title, order, videoUrl } = req.body;

    const lecture = await Lecture.findById(req.params.id);

    if (lecture) {
      // Check if new order conflicts with existing lecture
      if (order && order !== lecture.order) {
        const existingLecture = await Lecture.findOne({
          moduleId: lecture.moduleId,
          order: order,
          _id: { $ne: lecture._id }
        });

        if (existingLecture) {
          return res.status(400).json({ message: 'Lecture order already exists in this module' });
        }
      }

      lecture.title = title || lecture.title;
      lecture.order = order || lecture.order;
      lecture.videoUrl = videoUrl || lecture.videoUrl;

      const updatedLecture = await lecture.save();
      res.json(updatedLecture);
    } else {
      res.status(404).json({ message: 'Lecture not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete lecture (Admin only)
// @route   DELETE /api/lectures/:id
// @access  Private/Admin
export const deleteLecture = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);

    if (lecture) {
      await Lecture.findByIdAndDelete(req.params.id);
      res.json({ message: 'Lecture removed' });
    } else {
      res.status(404).json({ message: 'Lecture not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark lecture as completed (User only)
// @route   POST /api/lectures/:id/complete
// @access  Private
export const completeLecture = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id)
      .populate('moduleId');

    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }

    const enrollment = await Enrollment.findOne({
      userId: req.user.id,
      courseId: lecture.moduleId.courseId
    });

    if (!enrollment) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    // Add to completed if not already completed
    if (!enrollment.completed.includes(lecture._id)) {
      enrollment.completed.push(lecture._id);
      
      // Unlock next lecture
      await enrollment.unlockNextLecture(lecture._id);
      
      // Recalculate progress
      await enrollment.calculateProgress();
      await enrollment.save();
    }

    res.json({ message: 'Lecture marked as completed', progress: enrollment.progress });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};