const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const Post = require("../models/post");
const multer = require('multer')
const { isLoggedIn, validatePost, isUser, isReviewUser, validateComment } = require("../middleware");

const { storage } = require("../cloudinary");
const upload = multer({ storage });

// render add image page
router.get("/new", isLoggedIn, (req, res) => {
    res.render("posts/new");
})

// render add details for image page
router.get("/new/details", isLoggedIn, (req, res) => {
    const image = req.session.image;
    res.render("posts/details", { image });
})

// rendering edit form
router.get("/:id/edit", isLoggedIn, isUser, catchAsync(async (req, res) => {
    const id = req.params.id;
    const post = await Post.findById(id);
    res.render("posts/edit", { post });
}));

// show page for post
router.get("/:id", catchAsync(async (req, res) => {
    const id = req.params.id;
    // getting all posts while populating different schemas
    const post = await Post.findById(id).populate({
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
    res.render("posts/show", { post });
}));

// creating an image
router.post("/", upload.single("image"), isLoggedIn, (req, res) => {
    req.session.image = { url: req.file.path, filename: req.file.filename };
    res.redirect("/posts/new/details");
});

// editing a post
router.patch("/:id", isLoggedIn, isUser, validatePost, catchAsync(async (req, res) => {
    const id = req.params.id;
    const post = await Post.findByIdAndUpdate(id, { ...req.body.post }, { runValidators: true, new: true });
    post.save();
    res.redirect("/");
}));

// deleting a post
router.delete("/:id", isLoggedIn, isUser, catchAsync(async (req, res) => {
    const id = req.params.id;
    await Post.findByIdAndDelete(id);
    res.redirect("/");
}));

// liking a post
router.patch("/:id/like", isLoggedIn, catchAsync(async (req, res) => {
    const id = req.params.id;
    const post = await Post.findById(id);
    let users = post.likes.users;
    const userIndex = users.indexOf(req.user._id);
    if (userIndex === -1) {
        // if user has not liked post push user into liked users
        post.likes.users.push(req.user._id);
        post.likes.amount++;
    } else {
        // if user has liked post remove user from array of liked users
        post.likes.users.splice(userIndex, 1);
        post.likes.amount--;
    }
    await post.save();

    res.redirect("/");
}));

// show page for users who liked post
router.get("/:id/like", catchAsync(async (req, res) => {
    const id = req.params.id;
    // get posts along with users who liked post
    const post = await Post.findById(id).populate({
        path: "likes",
        populate: {
            path: "users",
            populate: {
                path: "profilePhoto",
            },
        },
    });
    const usersLiked = post.likes.users;
    res.render("posts/like", { usersLiked });
}))


module.exports = router;