import mongoose from "mongoose";

const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  joinedon: { type: Date, default: Date.now },
  // ── Task 2: Premium & Downloads ──
  isPremium: { type: Boolean, default: false },
  premiumSince: { type: Date },
  downloadCount: { type: Number, default: 0 },
  lastDownloadDate: { type: String, default: "" },
  downloads: [
    {
      videoId: { type: String },
      videoTitle: { type: String },
      filepath: { type: String },
      downloadedAt: { type: Date, default: Date.now },
      subscriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
      subscriberCount: { type: Number, default: 0 },
    },
  ],
  // ── Task 3: Watch Time Plans ──
  plan: {
    type: String,
    enum: ["free", "bronze", "silver", "gold"],
    default: "free",
  },
  planSince: { type: Date },
  watchMinutes: { type: Number, default: 5 }, // 5=free, 7=bronze, 10=silver, -1=gold(unlimited)
  subscriptions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  ],
});

export default mongoose.model("user", userschema);
