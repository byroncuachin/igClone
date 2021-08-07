require('dotenv').config();

const express = require("express");
const mongoose = require("mongoose");
const Post = require("./models/post");
const User = require("./models/user");
const Image = require("./models/image");
const Comment = require("./models/comment");

const dbURL = process.env.DB_URL;

mongoose.connect(dbURL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Mongo Connection Open");
    })
    .catch((err) => {
        console.log("Mongo Connection Error");
        console.log(err);
    });

const reset = async () => {
    await Post.deleteMany({});
    await User.deleteMany({});
    await Comment.deleteMany({});
    const images = await Image.find({});
    for (image of images) {
        await cloudinary.uploader.destroy(image.filename);
        await Image.deleteOne({ _id: image })
    }
};

reset().then(() => {
    mongoose.connection.close();
})