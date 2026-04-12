import Razorpay from "razorpay";
import user from "../Modals/Auth.js";
import video from "../Modals/video.js";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// ADD this helper function instead:
const getRazorpay = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const getTodayDate = () => new Date().toISOString().split("T")[0]; // YYYY-MM-DD

// ── CREATE RAZORPAY ORDER ────────────────────────────────────────────────────
export const createOrder = async (req, res) => {
  try {
    const razorpay = getRazorpay(); // create instance here, not at top
    const options = {
      amount: 19900,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);
    return res.status(200).json(order);
  } catch (error) {
    console.error("Razorpay order error:", error);
    return res.status(500).json({ message: "Failed to create order" });
  }
};

// ── VERIFY PAYMENT & UPGRADE TO PREMIUM ─────────────────────────────────────
export const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } =
    req.body;

  // Verify signature
  const sign = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(sign)
    .digest("hex");

  if (expectedSign !== razorpay_signature) {
    return res.status(400).json({ message: "Invalid payment signature" });
  }

  // Upgrade user to premium
  try {
    await user.findByIdAndUpdate(userId, {
      isPremium: true,
      premiumSince: new Date(),
    });
    return res
      .status(200)
      .json({ success: true, message: "Premium activated!" });
  } catch (error) {
    console.error("Premium upgrade error:", error);
    return res.status(500).json({ message: "Failed to upgrade to premium" });
  }
};

// ── DOWNLOAD VIDEO ────────────────────────────────────────────────────────────
export const downloadVideo = async (req, res) => {
  const { userId, videoId } = req.body;

  try {
    const foundUser = await user.findById(userId);
    if (!foundUser) return res.status(404).json({ message: "User not found" });

    const today = getTodayDate();

    // Check daily download limit for free users
    if (!foundUser.isPremium) {
      if (
        foundUser.lastDownloadDate === today &&
        foundUser.downloadCount >= 1
      ) {
        return res.status(403).json({
          message:
            "Free users can only download 1 video per day. Upgrade to Premium!",
          limitReached: true,
        });
      }
    }

    // Find video
    const foundVideo = await video.findById(videoId);
    if (!foundVideo)
      return res.status(404).json({ message: "Video not found" });

    const cleanPath = foundVideo.filepath.replace(/\\/g, "/");
    const filePath = path.resolve(cleanPath);

    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ message: "Video file not found on server" });
    }

    // Update download count & history
    const isNewDay = foundUser.lastDownloadDate !== today;
    await user.findByIdAndUpdate(userId, {
      downloadCount: isNewDay ? 1 : foundUser.downloadCount + 1,
      lastDownloadDate: today,
      $push: {
        downloads: {
          videoId,
          videoTitle: foundVideo.videotitle,
          filepath: cleanPath,
          downloadedAt: new Date(),
        },
      },
    });

    // Send file for download
    res.download(filePath, foundVideo.videotitle + ".mp4");
  } catch (error) {
    console.error("Download error:", error);
    return res.status(500).json({ message: "Download failed" });
  }
};

// ── GET USER DOWNLOADS ────────────────────────────────────────────────────────
export const getUserDownloads = async (req, res) => {
  const { userId } = req.params;
  try {
    const foundUser = await user.findById(userId).select("downloads isPremium");
    return res.status(200).json(foundUser);
  } catch (error) {
    console.error("Get downloads error:", error);
    return res.status(500).json({ message: "Failed to fetch downloads" });
  }
};

// ── GET USER PREMIUM STATUS ───────────────────────────────────────────────────
export const getPremiumStatus = async (req, res) => {
  const { userId } = req.params;
  try {
    const foundUser = await user
      .findById(userId)
      .select("isPremium downloadCount lastDownloadDate");
    return res.status(200).json(foundUser);
  } catch (error) {
    console.error("Premium status error:", error);
    return res.status(500).json({ message: "Failed to fetch status" });
  }
};
