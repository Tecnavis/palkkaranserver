// const multer = require("multer");

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "public/images");
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + "-" + file.originalname);
//   },
// });

// var upload = multer({ storage: storage });

// module.exports = upload;

const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const sharp = require("sharp");
require("dotenv").config();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Use memory storage (keeps image in memory, not on disk)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per image
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Upload a single image (compressed, direct to Cloudinary)
const uploadImageSingle = (req, res, next) => {
  upload.single("image")(req, res, async (err) => {
    if (err) return next(err);

    try {
       if (!req.file) {
        req.cloudinaryImageUrl = null; // set null
        return next();
      }

      const compressedBuffer = await sharp(req.file.buffer)
        .jpeg({
          quality: 80,
          chromaSubsampling: "4:4:4",
          mozjpeg: true,
        })
        .toBuffer();

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "palkaran" }, // optional: change folder
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(compressedBuffer);
      });

      req.cloudinaryImageUrl = result.secure_url;
      next();
    } catch (error) {
      next(error);
    }
  });
};

// Upload multiple images (compressed, direct to Cloudinary)
const uploadImageArray = (req, res, next) => {
  upload.array("images", 10)(req, res, async (err) => {
    if (err) return next(err);

    try {
      if (!req.files || req.files.length === 0) {
        return next(new Error("No images provided"));
      }

      const uploadedUrls = [];

      for (const file of req.files) {
        const compressedBuffer = await sharp(file.buffer)
          .jpeg({
            quality: 80,
            chromaSubsampling: "4:4:4",
            mozjpeg: true,
          })
          .toBuffer();

        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "palkaran" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          stream.end(compressedBuffer);
        });

        uploadedUrls.push(result.secure_url);
      }

      req.cloudinaryImageUrl = uploadedUrls;
      next();
    } catch (error) {
      next(error);
    }
  });
};

module.exports = { uploadImageSingle, uploadImageArray };
