const ExpressError = require('./utils/expressError');
const { postSchema, commentSchema } = require('./schemas.js');
const Post = require('./models/post');
const User = require("./models/user");
const Comment = require("./models/comment");

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'You must be signed in first!');
        return res.redirect('/login');
    }
    next();
}

module.exports.validatePost = (req, res, next) => {
    const { error } = postSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',');
        throw new ExpressError(msg, 400);
    } else {
        next();
    }
}

module.exports.isUser = async (req, res, next) => {
    const id = req.params.id;
    const post = await Post.findById(id);
    if (!post.user.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect("/");
    }
    next();
}

module.exports.isCommentUser = async (req, res, next) => {
    const { commentId, id } = req.params;
    const comment = await Comment.findById(commentId);
    const post = await Post.findById(id);
    if (comment.user.equals(req.user._id) || post.user.equals(req.user._id)) {
    } else {
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect("/");
    }
    next();
}

module.exports.validateComment = (req, res, next) => {
    const { error } = commentSchema.validate(req.body);
    if (error) {
        console.log(error);
        const msg = error.details.map(el => el.message).join(',');
        throw new ExpressError(msg, 400);
    } else {
        next();
    }
}