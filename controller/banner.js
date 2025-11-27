const BannerModel = require("../models/banner");
const asyncHandler = require("express-async-handler");

//create banner
exports.create = asyncHandler(async (req, res) => {
    // Access multiple files from req.files
    // const images = req.files.map(file => file.filename);
       const images = req.cloudinaryImageUrl; // This gives an array of filenames

       
    const banner = await BannerModel.create({ images }); 
    await banner.save();

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
exports.deleteBannerImage = asyncHandler(async (req, res) => {
  const { id, index } = req.params;

  // Find the banner by ID
  const banner = await BannerModel.findById(id);

  if (!banner) {
    return res.status(404).json({ message: "Banner not found" });
  }

  // Ensure index is valid
  const imgIndex = parseInt(index);
  if (isNaN(imgIndex) || imgIndex < 0 || imgIndex >= banner.images.length) {
    return res.status(400).json({ message: "Invalid image index" });
  }

  // Remove the image at that index
  const removedImage = banner.images.splice(imgIndex, 1)[0];

  // Optionally: delete the actual file from your server (if stored locally)
  // const imagePath = path.join(__dirname, "../uploads", removedImage);
  // if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

  // Save updated banner
  await banner.save();

  res.status(200).json({
    message: "Image removed successfully",
    removedImage,
    updatedBanner: banner,
  });
});

//delete all banner
exports.deleteAll = asyncHandler(async (req, res) => {
    const banner = await BannerModel.deleteMany();
    res.status(200).json(banner);
})
