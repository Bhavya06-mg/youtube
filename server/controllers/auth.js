import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import fetch from "node-fetch";

// ── South India states ────────────────────────────────────────────────────────
const SOUTH_INDIA_STATES = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"];

const isSouthIndia = (region) => {
  if (!region) return false;
  return SOUTH_INDIA_STATES.some(state => region.toLowerCase().includes(state.toLowerCase()));
};

// ── Get IST time check ────────────────────────────────────────────────────────
const isLightThemeTime = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  const hours = istTime.getUTCHours();
  const minutes = istTime.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;
  return totalMinutes >= 600 && totalMinutes < 720;
};

// ── Get location from IP ──────────────────────────────────────────────────────
const getLocationFromIP = async (ip) => {
  try {
    const cleanIP = ip.replace("::ffff:", "");
    if (cleanIP === "127.0.0.1" || cleanIP === "::1") {
      return { region: "Karnataka", country: "IN", city: "Localhost" };
    }
    const res = await fetch(`http://ip-api.com/json/${cleanIP}`);
    const data = await res.json();
    return { region: data.regionName, country: data.countryCode, city: data.city };
  } catch {
    return { region: "", country: "", city: "" };
  }
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  const { email, name, image } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  try {
    const existingUser = await users.findOne({ email });
    let result;

    if (!existingUser) {
      result = await users.create({ email, name, image });
    } else {
      result = existingUser;
    }

    // Get location and theme info
    const location = await getLocationFromIP(ip);
    const southIndia = isSouthIndia(location.region);
    const lightTime = isLightThemeTime();
    const theme = (southIndia && lightTime) ? "light" : "dark";

    return res.status(200).json({
      result,
      theme,
      southIndia,
      region: location.region,
      city: location.city,
      otpMethod: southIndia ? "email" : "sms",
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ── UPDATE PROFILE ────────────────────────────────────────────────────────────
export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      { $set: { channelname, description } },
      { new: true }
    );
    return res.status(201).json({ result: updatedata });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};