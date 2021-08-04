const express = require('express');
const router = express.Router({ mergeParams: true });
const catchAsync = require('../utils/catchAsync');
const User = require("../models/user");
const Image = require("../models/image");
const multer = require('multer')
const { cloudinary } = require('../cloudinary');
const { isLoggedIn, isProfileUser } = require("../middleware");

const { storage } = require("../cloudinary");
const upload = multer({ storage });

// render profile page
router.get("/", catchAsync(async (req, res) => {
    const name = req.params.name;
    const user = await User.findOne({ username: name }).populate("profilePhoto");
    // console.log(user);
    res.render("users/profile", { user });
}));

// render edit bio page
router.get("/editBio", isLoggedIn, isProfileUser, (req, res) => {
    res.render("users/editBio");
})

// edit bio
router.patch("/editBio", isLoggedIn, isProfileUser, catchAsync(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.user._id, { bio: req.body.user.bio }, { runValidators: true, new: true });
    await user.save();
    res.redirect(`/profile/${req.user.username}`);
}));

// render edit profile photo page
router.get("/editPhoto", isLoggedIn, isProfileUser, (req, res) => {
    res.render("users/editPhoto");
});

// changing profile picture
router.patch("/editPhoto", upload.single("profilePhoto"), isLoggedIn, isProfileUser, catchAsync(async (req, res) => {
    if (req.user.profilePhoto) {
        const oldPfp = await Image.findById(req.user.profilePhoto);
        console.log(oldPfp);
        await cloudinary.uploader.destroy(oldPfp.filename);
    }
    const pfp = new Image({ url: req.file.path, filename: req.file.filename });
    const user = await User.findByIdAndUpdate(req.user._id, { profilePhoto: pfp }, { runValidators: true, new: true });
    await user.save();
    await pfp.save();
    res.redirect(`/profile/${req.user.username}`);
}));

module.exports = router;