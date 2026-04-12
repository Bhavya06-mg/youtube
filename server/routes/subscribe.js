import express from "express";
import user from "../Modals/Auth.js";

const routes = express.Router();

// Helper: find channel by MongoDB ID or by name/channelname string
const findChannel = async (channelId) => {
  if (channelId.match(/^[0-9a-fA-F]{24}$/)) {
    return await user.findById(channelId);
  }
  return await user.findOne({
    $or: [{ channelname: channelId }, { name: channelId }],
  });
};

// ── Subscribe / Unsubscribe toggle ────────────────────────────────────────────
routes.post("/:channelId", async (req, res) => {
  const { channelId } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: "userId required" });

  try {
    const channel = await findChannel(channelId);
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    const subscriber = await user.findById(userId);
    if (!subscriber) return res.status(404).json({ message: "User not found" });

    const realChannelId = channel._id.toString();
    const alreadySubscribed = subscriber.subscriptions?.map(String).includes(realChannelId);

    if (alreadySubscribed) {
      await user.findByIdAndUpdate(userId, { $pull: { subscriptions: channel._id } });
      await user.findByIdAndUpdate(channel._id, { $inc: { subscriberCount: -1 } });
      return res.json({ subscribed: false, message: "Unsubscribed" });
    } else {
      await user.findByIdAndUpdate(userId, { $addToSet: { subscriptions: channel._id } });
      await user.findByIdAndUpdate(channel._id, { $inc: { subscriberCount: 1 } });
      return res.json({ subscribed: true, message: "Subscribed" });
    }
  } catch (error) {
    console.error("Subscribe error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
});

// ── Get subscription status ───────────────────────────────────────────────────
routes.get("/status/:channelId/:userId", async (req, res) => {
  const { channelId, userId } = req.params;
  try {
    const channel = await findChannel(channelId);
    if (!channel) return res.json({ subscribed: false });

    const subscriber = await user.findById(userId);
    const subscribed = subscriber?.subscriptions?.map(String).includes(channel._id.toString()) || false;
    return res.json({ subscribed });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

// ── Get list of subscribed channels for a user ────────────────────────────────
routes.get("/list/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.json([]);
    }

    const subscriber = await user.findById(userId);

    if (!subscriber || !subscriber.subscriptions) {
      return res.json([]);
    }

    const channels = await user.find({
      _id: { $in: subscriber.subscriptions },
    }).select("name channelname image subscriberCount");

    res.json(channels);
  } catch (error) {
    console.error("Subscription list error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Get subscriber count for a channel ───────────────────────────────────────
routes.get("/count/:channelId", async (req, res) => {
  const { channelId } = req.params;
  try {
    const channel = await findChannel(channelId);
    return res.json({ count: channel?.subscriberCount || 0 });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

export default routes;