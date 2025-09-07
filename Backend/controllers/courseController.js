import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Lecture from '../models/Lecture.js';
import Enrollment from '../models/Enrollment.js';

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find({}).sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
export const getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate({
        path: 'modules',
        populate: {
          path: 'lectures',
          options: { sort: { order: 1 } }
        },
        options: { sort: { number: 1 } }
      });

    if (course) {
      res.json(course);
    } else {
      res.status(404).json({ message: 'Course not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create course (Admin only)
// @route   POST /api/courses
// @access  Private/Admin
export const createCourse = async (req, res) => {
  try {
    const { title, description, price, thumbnailPath } = req.body;

    const course = await Course.create({
      title,
      description,
      price,
      thumbnailPath
    });

    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update course (Admin only)
// @route   PUT /api/courses/:id
// @access  Private/Admin
export const updateCourse = async (req, res) => {
  try {
    const { title, description, price, thumbnailPath } = req.body;

    const course = await Course.findById(req.params.id);

    if (course) {
      course.title = title || course.title;
      course.description = description || course.description;
      course.price = price || course.price;
      course.thumbnailPath = thumbnailPath || course.thumbnailPath;

      const updatedCourse = await course.save();
      res.json(updatedCourse);
    } else {
      res.status(404).json({ message: 'Course not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete course (Admin only)
// @route   DELETE /api/courses/:id
// @access  Private/Admin
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (course) {
      // Delete all related modules and lectures
      const modules = await Module.find({ courseId: course._id });
      const moduleIds = modules.map(module => module._id);
      
      await Lecture.deleteMany({ moduleId: { $in: moduleIds } });
      await Module.deleteMany({ courseId: course._id });
      await Enrollment.deleteMany({ courseId: course._id });
      await Course.findByIdAndDelete(req.params.id);

      res.json({ message: 'Course and related data removed' });
    } else {
      res.status(404).json({ message: 'Course not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get courses with enrollment info for user
// @route   GET /api/courses/user/enrolled
// @access  Private
export const getUserCourses = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.user.id })
      .populate('courseId')
      .sort({ createdAt: -1 });

    const courses = enrollments.map(enrollment => ({
      ...enrollment.courseId.toObject(),
      progress: enrollment.progress,
      enrollmentId: enrollment._id
    }));

    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};