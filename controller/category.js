const asyncHandler = require("express-async-handler");
const Category = require("../models/category");

//create category
exports.create = asyncHandler(async (req, res) => {

     const  image = req.cloudinaryImageUrl || null;
    const name = req.body.name;
    const category = await Category.create({
        name,
        image
    });
    res.status(200).json(category);
})

//get all categories
exports.getAll = asyncHandler(async (req, res) => {
    const categories = await Category.find();
    res.status(200).json(categories);
})

//get by Id
exports.get = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    res.status(200).json(category);
})

//update category
exports.update = asyncHandler(async (req, res) => {
 const  image = req.cloudinaryImageUrl;
     const name = req.body.name;
    const category = await Category.findByIdAndUpdate(req.params.id, {
        name,
        image
    }, {
        new: true
    });
    res.status(200).json(category);
})

//delete category
exports.delete = asyncHandler(async (req, res) => {
    const category = await Category.findByIdAndDelete(req.params.id);
    res.status(200).json(category);
})
