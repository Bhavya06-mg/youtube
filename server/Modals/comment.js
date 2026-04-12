import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    videoid: { type: String, required: true },
    userid: { type: String, required: true },
    commentbody: { type: String, required: true },
    usercommented: { type: String, required: true },
    city: { type: String, default: "Unknown City" },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    likedBy: { type: [String], default: [] },
    dislikedBy: { type: [String], default: [] },
  },
  { timestamps: { createdAt: "commentedon", updatedAt: "updatedAt" } }
);

export default mongoose.model("Comment", commentSchema);