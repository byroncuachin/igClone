const express = require('express');
const router = express.Router({ mergeParams: true });
const catchAsync = require('../utils/catchAsync');
const User = require("../models/user");
const Image = require("../models/image");
const Post = require("../models/post");
const multer = require('multer')
const { cloudinary } = require('../cloudinary');
const { isLoggedIn, isProfileUser } = require("../middleware");

const { storage } = require("../cloudinary");
const { findByIdAndRemove, findByIdAndDelete } = require('../models/image');
const upload = multer({ storage });

// render profile page
router.get("/", catchAsync(async (req, res) => {
    const name = req.params.name;
    const preProfile = await User.findOne({ username: name });

    // getting all posts while populating different schemas
    const posts = await Post.find({ user: preProfile }).populate({
        path: "comments",
        populate: {
            path: "user",
        },
    }).populate("image").populate({
        path: "user",
        populate: {
            path: "profilePhoto"
        }
    });

    // updating number of posts
    const profile = await User.findOneAndUpdate({ username: name }, { numOfPosts: posts.length }, { new: true }).populate("profilePhoto");
    res.render("users/profile", { profile, posts });
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

// render all followers
router.get("/followers", catchAsync(async (req, res) => {
    const name = req.params.name;
    const user = await User.findOne({ username: name }).populate({
        path: "followers",
        populate: {
            path: "users",
            populate: {
                path: "profilePhoto",
            },
        },
    });
    const followers = user.followers.users;
    res.render("users/followers", { followers });
}));

// render all users following
router.get("/following", catchAsync(async (req, res) => {
    const name = req.params.name;
    const user = await User.findOne({ username: name }).populate({
        path: "following",
        populate: {
            path: "users",
            populate: {
                path: "profilePhoto",
            },
        },
    });
    const usersFollowing = user.following.users;
    res.render("users/following", { usersFollowing });
}));

// changing profile picture
router.patch("/editPhoto", upload.single("profilePhoto"), isLoggedIn, isProfileUser, catchAsync(async (req, res) => {
    if (req.user.profilePhoto) {
        // delete old profile photo if there is one
        const oldPfp = await Image.findById(req.user.profilePhoto);
        await cloudinary.uploader.destroy(oldPfp.filename);
        await findByIdAndDelete(req.user.profilePhoto);
    }
    // update profile photo
    const pfp = new Image({ url: req.file.path, filename: req.file.filename });
    const user = await User.findByIdAndUpdate(req.user._id, { profilePhoto: pfp }, { runValidators: true, new: true });
    await user.save();
    await pfp.save();
    res.redirect(`/profile/${req.user.username}`);
}));

// follow a user
router.patch("/follow", isLoggedIn, catchAsync(async (req, res) => {
    const name = req.params.name;
    const user = await User.findOne({ username: name });
    let users = user.followers.users;
    const userIndex = users.indexOf(req.user._id);
    const currentUser = await User.findById(req.user._id);
    if (userIndex === -1) {
        // user follows other user, update both users
        user.followers.users.push(req.user._id);
        user.followers.amount++;
        currentUser.following.users.push(user);
        currentUser.following.amount++;
    } else {
        // user unfollows other user, update both users
        user.followers.users.splice(userIndex, 1);
        user.followers.amount--;
        currentUser.following.users.splice(userIndex, 1);
        currentUser.following.amount--;
    }
    await user.save();
    await currentUser.save();

    res.redirect(`/profile/${user.username}`);
}));

module.exports = router;