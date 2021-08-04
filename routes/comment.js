const express = require('express');
const router = express.Router({ mergeParams: true });
const catchAsync = require('../utils/catchAsync');
const Post = require("../models/post");
const Comment = require("../models/comment");
const { isLoggedIn, isCommentUser, validateComment } = require("../middleware");

// creating a comment
router.post("/", isLoggedIn, validateComment, catchAsync(async (req, res) => {
    const id = req.params.id;
    console.log(req.params);
    const post = await Post.findById(id);
    const comment = new Comment(req.body.comment);
    comment.user = req.user._id;
    post.comments.push(comment);
    await comment.save();
    await post.save();
    req.flash('success', 'Created new comment!')
    res.redirect("/");
}));

// deleting a comment
router.delete("/:commentId", isLoggedIn, isCommentUser, catchAsync(async (req, res) => {
    const { id, commentId } = req.params;
    await Post.findByIdAndUpdate(id, { $pull: { comments: commentId } });
    await Comment.findByIdAndDelete(commentId);
    req.flash('success', 'Successfully deleted comment');
    res.redirect("/");
}));

module.exports = router;