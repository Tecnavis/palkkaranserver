const BannerModel = require("../models/banner");
const asyncHandler = require("express-async-handler");

//create banner
exports.create = asyncHandler(async (req, res) => {
    // Access multiple files from req.files
    // const images = req.files.map(file => file.filename);
       const images = req.cloudinaryImageUrl; // This gives an array of filenames
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
  const image = req.cloudinaryImageUrl; // New uploaded image URL
  const index = parseInt(req.body.index); // Get index from body

  const banner = await BannerModel.findById(req.params.id);
  if (!banner) {
    return res.status(404).json({ message: "Banner not found" });
  }

  if (
    isNaN(index) ||
    index < 0 ||
    index >= banner.images.length
  ) {
    return res.status(400).json({ message: "Invalid image index" });
  }

  // Replace the image at that index
  banner.images[index] = image;
  await banner.save();

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
