require('dotenv').config();

const express = require("express");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const ExpressError = require('./utils/expressError')
const catchAsync = require('./utils/catchAsync');
const path = require("path");
const multer = require('multer')
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const flash = require('connect-flash');
const Post = require("./models/post");
const User = require("./models/user");
const Comment = require("./models/comment");
const Image = require("./models/image");
const postsRoutes = require("./routes/posts");
const { cloudinary } = require('./cloudinary');
const { isLoggedIn, validatePost, isUser, isReviewUser, validateComment } = require("./middleware")

const MongoStore = require('connect-mongo');

const { storage } = require("./cloudinary");
const upload = multer({ storage });

const app = express();

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(methodOverride('_method'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect("mongodb://localhost:27017/igClone", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
})
    .then(() => {
        console.log("Database Connected")
    })
    .catch((err) => {
        console.log("Database Connection Error");
        console.log(err);
    })

const secret = process.env.SECRET || 'thisshouldbeabettersecret'

const store = MongoStore.create({
    mongoUrl: "mongodb://localhost:27017/igClone",
    touchAfter: 24 * 60 * 60,
    crypto: {
        secret: secret,
    }
});

const sessionConfig = {
    store: store,
    name: 'session',
    secret: secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure: true,
        expires: Date.now() + (1000 * 60 * 60 * 24 * 7),
        maxAge: 1000 * 60 * 60 * 24 * 7,
    }
}

app.use(session(sessionConfig));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(async (req, res, next) => {
    if (!req.user) {
        res.locals.currentUser = null;
    } else {
        res.locals.currentUser = await User.findById(req.user._id).populate("profilePhoto");
    }
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

// routes for posts
app.use("/posts", postsRoutes);

// home page with posts
app.get("/", catchAsync(async (req, res) => {
    const posts = await Post.find({}).populate({
        path: "comments",
        populate: {
            path: "user",
        },
    }).populate("image").populate("user");
    res.render("home", { posts });
}));

// creating a post
app.post("/", isLoggedIn, validatePost, async (req, res) => {
    const post = new Post(req.body.post);
    const image = new Image(req.session.image);
    // post.image = image._id;
    post.image = image;
    post.user = req.user._id;
    post.likes.amount = "0";
    await image.save();
    await post.save();
    res.redirect("/");
})

// creating a comment
app.post("/posts/:id/comment", isLoggedIn, validateComment, catchAsync(async (req, res) => {
    const id = req.params.id;
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
app.delete("/posts/:id/comment/:commentId", isLoggedIn, isReviewUser, catchAsync(async (req, res) => {
    const { id, commentId } = req.params;
    await Post.findByIdAndUpdate(id, { $pull: { comments: commentId } });
    await Comment.findByIdAndDelete(commentId);
    req.flash('success', 'Successfully deleted review');
    res.redirect("/");
}));

// rendering register form
app.get("/register", (req, res) => {
    res.render('./users/register');
});

// registering
app.post("/register", catchAsync(async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if (err) {
                return next(err);
            }
        });
        user.bio = "I should probably update this...";
        user.save();
        req.flash('success', 'Welcome to igClone!');
        res.redirect('/');
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/register');
    }
}));

// rendering login form
app.get("/login", (req, res) => {
    res.render('users/login');
});

// logging in
app.post("/login", passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    req.flash('success', 'welcome back!');
    const redirectUrl = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
});

// logging out
app.get("/logout", (req, res) => {
    req.logout();
    req.flash('success', "Goodbye!");
    res.redirect('/');
});

// render profile page
app.get("/profile", async (req, res) => {
    res.render("users/profile");
})

// render edit bio page
app.get("/profile/editBio", (req, res) => {
    res.render("users/editBio");
})

// edit bio
app.patch("/profile/editBio", async (req, res) => {
    const user = await User.findByIdAndUpdate(req.user._id, { bio: req.body.user.bio }, { runValidators: true, new: true });
    await user.save();
    res.redirect("/profile")
})

// render edit profile photo page
app.get("/profile/editPhoto", (req, res) => {
    res.render("users/editPhoto");
});

// changing profile picture
app.patch("/profile/editPhoto", upload.single("profilePhoto"), async (req, res) => {
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
})

// error page
app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404));
})
app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) {
        err.message = 'Oh No, Something went Wrong!';
    }
    res.status(statusCode).render('error', { err });
})

app.listen(3000, () => {
    console.log("Serving...");
})