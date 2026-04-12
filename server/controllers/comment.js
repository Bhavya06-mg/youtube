import comment from "../Modals/comment.js";
import mongoose from "mongoose";
import fetch from "node-fetch"; // npm install node-fetch

// ─── Helper: Get city from IP ───────────────────────────────────────────────
const getCityFromIP = async (ip) => {
  try {
    // Remove IPv6 prefix if present
    const cleanIP = ip.replace("::ffff:", "");
    // Skip localhost
    if (cleanIP === "127.0.0.1" || cleanIP === "::1") return "Localhost";
    const res = await fetch(`http://ip-api.com/json/${cleanIP}`);
    const data = await res.json();
    return data.city || "Unknown City";
  } catch {
    return "Unknown City";
  }
};

// ─── POST COMMENT ────────────────────────────────────────────────────────────
export const postcomment = async (req, res) => {
  const { videoid, userid, commentbody, usercommented } = req.body;

  // 1. Block special characters
  const specialCharRegex = /[^a-zA-Z0-9\s.,!?'"()-]/;
  if (specialCharRegex.test(commentbody)) {
    return res.status(400).json({
      message: "Comment contains special characters. Please remove them.",
    });
  }

  // 2. Get city from IP
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const city = await getCityFromIP(ip);

  const newComment = new comment({
    videoid,
    userid,
    commentbody,
    usercommented,
    city,
    likes: 0,
    dislikes: 0,
    likedBy: [],
    dislikedBy: [],
  });

  try {
    await newComment.save();
    return res.status(200).json({ comment: true, data: newComment });
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─── GET ALL COMMENTS ────────────────────────────────────────────────────────
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment.find({ videoid });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─── DELETE COMMENT ──────────────────────────────────────────────────────────
export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id))
    return res.status(404).send("comment unavailable");
  try {
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─── EDIT COMMENT ────────────────────────────────────────────────────────────
export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id))
    return res.status(404).send("comment unavailable");

  // Block special characters on edit too
  const specialCharRegex = /[^a-zA-Z0-9\s.,!?'"()-]/;
  if (specialCharRegex.test(commentbody)) {
    return res.status(400).json({
      message: "Comment contains special characters. Please remove them.",
    });
  }

  try {
    const updated = await comment.findByIdAndUpdate(
      _id,
      { $set: { commentbody } },
      { new: true }
    );
    return res.status(200).json(updated);
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─── LIKE COMMENT ────────────────────────────────────────────────────────────
export const likecomment = async (req, res) => {
  const { id } = req.params;
  const { userid } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(404).send("comment unavailable");

  try {
    const found = await comment.findById(id);
    if (!found) return res.status(404).json({ message: "Comment not found" });

    // Toggle like
    const alreadyLiked = found.likedBy.includes(userid);
    if (alreadyLiked) {
      found.likedBy = found.likedBy.filter((u) => u !== userid);
      found.likes = Math.max(0, found.likes - 1);
    } else {
      found.likedBy.push(userid);
      found.likes += 1;
      // Remove dislike if switching
      if (found.dislikedBy.includes(userid)) {
        found.dislikedBy = found.dislikedBy.filter((u) => u !== userid);
        found.dislikes = Math.max(0, found.dislikes - 1);
      }
    }

    await found.save();
    return res.status(200).json(found);
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─── DISLIKE COMMENT ─────────────────────────────────────────────────────────
export const dislikecomment = async (req, res) => {
  const { id } = req.params;
  const { userid } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(404).send("comment unavailable");

  try {
    const found = await comment.findById(id);
    if (!found) return res.status(404).json({ message: "Comment not found" });

    const alreadyDisliked = found.dislikedBy.includes(userid);
    if (alreadyDisliked) {
      found.dislikedBy = found.dislikedBy.filter((u) => u !== userid);
      found.dislikes = Math.max(0, found.dislikes - 1);
      await found.save();
      return res.status(200).json(found);
    } else {
      found.dislikedBy.push(userid);
      found.dislikes += 1;
      // Remove like if switching
      if (found.likedBy.includes(userid)) {
        found.likedBy = found.likedBy.filter((u) => u !== userid);
        found.likes = Math.max(0, found.likes - 1);
      }
    }

    // AUTO-REMOVE if dislikes reach 2
    if (found.dislikes >= 2) {
      await comment.findByIdAndDelete(id);
      return res.status(200).json({ autoRemoved: true });
    }

    await found.save();
    return res.status(200).json(found);
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const translatecomment = async (req, res) => {
  const { text, targetLang } = req.body;
  try {
    // Step 1: Detect language first
    const detectUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
    
    // Use DeepL-free alternative: LibreTranslate on a reliable instance
    const response = await fetch("https://translate.fedilab.app/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: "auto",
        target: targetLang,
        format: "text"
      }),
    });

    const data = await response.json();
    console.log("Translation response:", data);

    if (data.translatedText) {
      return res.status(200).json({ translatedText: data.translatedText });
    } else {
      return res.status(500).json({ message: "Translation failed" });
    }
  } catch (error) {
    console.error("Translation error:", error);
    return res.status(500).json({ message: "Translation service unavailable" });
  }
};