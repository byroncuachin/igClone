const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new Schema({
    numOfPosts: Number,
    email: {
        type: String,
        required: true,
        unique: true,
    },
    profilePhoto: {
        type: Schema.Types.ObjectId,
        ref: "Image",
    },
    bio: String,
    followers: {
        amount: Number,
        users: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
    },
    following: {
        amount: Number,
        users: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
    },
});
UserSchema.plugin(passportLocalMongoose);

// UserSchema.post('findOneAndUpdate', async function (doc) {
//     if (doc) {
//         console.log(doc);
//         // delete images
//         const image = await Image.findById(doc.image);
//         if (doc.image) {
//             await cloudinary.uploader.destroy(image.filename);
//             await Image.deleteOne({ _id: doc.image })
//         }
//     }
// });

module.exports = mongoose.model('User', UserSchema);