const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { cloudinary } = require('../cloudinary');
const Image = require("./image");
const Comment = require("./comment");

const opts = { toJSON: { virtuals: true } };

const PostSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    likes: {
        amount: Number,
        users: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            }
        ],
    },
    caption: String,
    image: {
        type: Schema.Types.ObjectId,
        ref: "Image",
    },
    comments: [
        {
            type: Schema.Types.ObjectId,
            ref: "Comment",
        }
    ],
});

PostSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        // delete images
        const image = await Image.findById(doc.image);
        await cloudinary.uploader.destroy(image.filename);
        await Image.deleteOne({ _id: doc.image })
        await Comment.deleteMany({
            _id: {
                $in: doc.comments
            }
        })
    }
});

module.exports = mongoose.model("Post", PostSchema);