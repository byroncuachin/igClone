const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const User = require("../models/user");
const Image = require("../models/image");
const multer = require('multer')
const { cloudinary } = require('../cloudinary');
const { isLoggedIn, validatePost, isUser, isReviewUser, validateComment } = require("../middleware");

const { storage } = require("../cloudinary");
const upload = multer({ storage });

// render profile page
router.get("/", isLoggedIn, catchAsync(async (req, res) => {
    res.render("users/profile");
}));

// render edit bio page
router.get("/editBio", isLoggedIn, (req, res) => {
    res.render("users/editBio");
})

// edit bio
router.patch("/editBio", isLoggedIn, catchAsync(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.user._id, { bio: req.body.user.bio }, { runValidators: true, new: true });
    await user.save();
    res.redirect("/profile")
}));

// render edit profile photo page
router.get("/editPhoto", isLoggedIn, (req, res) => {
    res.render("users/editPhoto");
});

// changing profile picture
router.patch("/editPhoto", upload.single("profilePhoto"), isLoggedIn, catchAsync(async (req, res) => {
    if (req.user.profilePhoto) {
        const oldPfp = await Image.findById(req.user.profilePhoto);
        console.log(oldPfp);
        await cloudinary.uploader.destroy(oldPfp.filename);
    }
    const pfp = new Image({ url: req.file.path, filename: req.file.filename });
    const user = await User.findByIdAndUpdate(req.user._id, { profilePhoto: pfp }, { runValidators: true, new: true });
    await user.save();
    await pfp.save();
    res.redirect("/profile");
}));

module.exports = router;