import express from "express";
import { login, updateprofile } from "../controllers/auth.js";
import user from "../Modals/Auth.js";

const routes = express.Router();

routes.post("/login", login);
routes.put("/update/:id", updateprofile);

// ── Search users by name or email ─────────────────────────────────────────────
routes.get("/search", async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.status(200).json([]);
  try {
    const results = await user.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    }).select("name email image _id").limit(10);
    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({ message: "Search failed" });
  }
});

export default routes;