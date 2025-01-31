const BannerModel = require("../models/banner");
const asyncHandler = require("express-async-handler");

//create banner
exports.create = asyncHandler(async (req, res) => {
    // Access multiple files from req.files
    const images = req.files.map(file => file.filename); // This gives an array of filenames
    const banner = await BannerModel.create({ images }); // Store array of images
    res.status(200).json(banner);
});

//get all banner
exports.getAll = asyncHandler(async (req, res) => {
    const banner = await BannerModel.find();
    res.status(200).json(banner);
})  

//get by Id
exports.get = asyncHandler(async (req, res) => {
    const banner = await BannerModel.findById(req.params.id);
    res.status(200).json(banner);
})

//update banner
exports.update = asyncHandler(async (req, res) => {
    const images = req.files.map(file => file.filename); // Handle multiple files
    const banner = await BannerModel.findByIdAndUpdate(req.params.id, { images }, {
        new: true
    });
    res.status(200).json(banner);
}); 


//delete banner
exports.delete = asyncHandler(async (req, res) => {
    const banner = await BannerModel.findByIdAndDelete(req.params.id);
    res.status(200).json(banner);
})

//delete all banner
exports.deleteAll = asyncHandler(async (req, res) => {
    const banner = await BannerModel.deleteMany();
    res.status(200).json(banner);
})
