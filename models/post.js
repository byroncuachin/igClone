const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { cloudinary } = require('../cloudinary')

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
        await cloudinary.uploader.destroy(doc.image.filename);
    }
});

module.exports = mongoose.model("Post", PostSchema);