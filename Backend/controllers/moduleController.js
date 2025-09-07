import Module from '../models/Module.js';
import Lecture from '../models/Lecture.js';
import Course from '../models/Course.js';

// @desc    Get modules for a course
// @route   GET /api/modules/course/:courseId
// @access  Public
export const getModulesByCourse = async (req, res) => {
  try {
    const modules = await Module.find({ courseId: req.params.courseId })
      .populate('lectures')
      .sort({ number: 1 });

    res.json(modules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single module
// @route   GET /api/modules/:id
// @access  Public
export const getModule = async (req, res) => {
  try {
    const module = await Module.findById(req.params.id)
      .populate('courseId')
      .populate({
        path: 'lectures',
        options: { sort: { order: 1 } }
      });

    if (module) {
      res.json(module);
    } else {
      res.status(404).json({ message: 'Module not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create module (Admin only)
// @route   POST /api/modules
// @access  Private/Admin
export const createModule = async (req, res) => {
  try {
    const { title, courseId } = req.body;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Get next module number
    const lastModule = await Module.findOne({ courseId })
      .sort({ number: -1 });
    
    const nextNumber = lastModule ? lastModule.number + 1 : 1;

    const module = await Module.create({
      title,
      number: nextNumber,
      courseId
    });

    res.status(201).json(module);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update module (Admin only)
// @route   PUT /api/modules/:id
// @access  Private/Admin
export const updateModule = async (req, res) => {
  try {
    const { title, number } = req.body;

    const module = await Module.findById(req.params.id);

    if (module) {
      // Check if new number conflicts with existing module
      if (number && number !== module.number) {
        const existingModule = await Module.findOne({
          courseId: module.courseId,
          number: number,
          _id: { $ne: module._id }
        });

        if (existingModule) {
          return res.status(400).json({ message: 'Module number already exists in this course' });
        }
      }

      module.title = title || module.title;
      module.number = number || module.number;

      const updatedModule = await module.save();
      res.json(updatedModule);
    } else {
      res.status(404).json({ message: 'Module not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete module (Admin only)
// @route   DELETE /api/modules/:id
// @access  Private/Admin
export const deleteModule = async (req, res) => {
  try {
    const module = await Module.findById(req.params.id);

    if (module) {
      // Delete all lectures in this module
      await Lecture.deleteMany({ moduleId: module._id });
      await Module.findByIdAndDelete(req.params.id);

      res.json({ message: 'Module and related lectures removed' });
    } else {
      res.status(404).json({ message: 'Module not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reorder modules (Admin only)
// @route   PUT /api/modules/reorder
// @access  Private/Admin
export const reorderModules = async (req, res) => {
  try {
    const { modules } = req.body; // Array of { id, number }

    const updatePromises = modules.map(({ id, number }) =>
      Module.findByIdAndUpdate(id, { number }, { new: true })
    );

    const updatedModules = await Promise.all(updatePromises);
    res.json(updatedModules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};