import nodemailer from "nodemailer";
import fetch from "node-fetch";
import users from "../Modals/Auth.js";

// In-memory OTP store (use Redis in production)
const otpStore = new Map();

// ── Generate 6-digit OTP ──────────────────────────────────────────────────────
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ── Get IST time and check if between 10AM-12PM ───────────────────────────────
const isLightThemeTime = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  const hours = istTime.getUTCHours();
  const minutes = istTime.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;
  return totalMinutes >= 600 && totalMinutes < 720; // 10:00 AM to 12:00 PM
};

// ── South India states ────────────────────────────────────────────────────────
const SOUTH_INDIA_STATES = [
  "Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"
];

const isSouthIndia = (region) => {
  if (!region) return false;
  return SOUTH_INDIA_STATES.some(state =>
    region.toLowerCase().includes(state.toLowerCase())
  );
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

// ── Send Email OTP ────────────────────────────────────────────────────────────
const sendEmailOTP = async (email, otp, name) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"YourTube" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "YourTube Login OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <div style="background: #CC0000; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">YourTube</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; text-align: center;">
          <p style="font-size: 16px;">Hi <strong>${name}</strong>, your login OTP is:</p>
          <div style="background: white; border: 2px solid #CC0000; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h1 style="color: #CC0000; font-size: 40px; letter-spacing: 10px; margin: 0;">${otp}</h1>
          </div>
          <p style="color: #666; font-size: 13px;">This OTP expires in 5 minutes. Do not share it with anyone.</p>
        </div>
      </div>
    `,
  });
};

// ── Send SMS OTP via Fast2SMS ─────────────────────────────────────────────────
const sendSMSOTP = async (phone, otp) => {
  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: process.env.FAST2SMS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route: "otp",
      variables_values: otp,
      numbers: phone,
    }),
  });
  const data = await response.json();
  console.log("Fast2SMS response:", data);
  return data;
};

// ── SEND OTP ──────────────────────────────────────────────────────────────────
export const sendOTP = async (req, res) => {
  const { email, name } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  try {
    const location = await getLocationFromIP(ip);
    const southIndia = isSouthIndia(location.region);
    const lightTheme = isLightThemeTime() && southIndia;

    // Find user to get phone number
    const existingUser = await users.findOne({ email });
    const otp = generateOTP();
    const expiry = Date.now() + 5 * 60 * 1000; // 5 min

    // Store OTP
    otpStore.set(email, { otp, expiry, southIndia });

    if (southIndia) {
      // Send email OTP for South India
      await sendEmailOTP(email, otp, name || "User");
      return res.status(200).json({
        success: true,
        method: "email",
        southIndia: true,
        theme: lightTheme ? "light" : "dark",
        location: location.region,
        message: "OTP sent to your email",
      });
    } else {
      // Send SMS OTP for other states
      const phone = existingUser?.phone;
      if (!phone) {
        // If no phone, fallback to email
        await sendEmailOTP(email, otp, name || "User");
        return res.status(200).json({
          success: true,
          method: "email",
          southIndia: false,
          theme: "dark",
          location: location.region,
          message: "OTP sent to your email (no phone registered)",
        });
      }
      await sendSMSOTP(phone, otp);
      return res.status(200).json({
        success: true,
        method: "sms",
        southIndia: false,
        theme: "dark",
        location: location.region,
        message: "OTP sent to your mobile number",
      });
    }
  } catch (error) {
    console.error("Send OTP error:", error);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
};

// ── VERIFY OTP ────────────────────────────────────────────────────────────────
export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  const stored = otpStore.get(email);
  if (!stored) {
    return res.status(400).json({ message: "OTP not found. Please request again." });
  }

  if (Date.now() > stored.expiry) {
    otpStore.delete(email);
    return res.status(400).json({ message: "OTP expired. Please request again." });
  }

  if (stored.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP. Please try again." });
  }

  otpStore.delete(email);
  return res.status(200).json({ success: true, message: "OTP verified successfully" });
};

// ── GET THEME ─────────────────────────────────────────────────────────────────
export const getTheme = async (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  try {
    const location = await getLocationFromIP(ip);
    const southIndia = isSouthIndia(location.region);
    const lightTime = isLightThemeTime();
    const theme = (southIndia && lightTime) ? "light" : "dark";
    return res.status(200).json({
      theme,
      southIndia,
      lightTime,
      region: location.region,
      city: location.city,
    });
  } catch (error) {
    return res.status(500).json({ theme: "dark" });
  }
};