import Razorpay from "razorpay";
import nodemailer from "nodemailer";
import user from "../Modals/Auth.js";
import crypto from "crypto";

// ── Lazy Razorpay init ────────────────────────────────────────────────────────
const getRazorpay = () => new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── Plans config ─────────────────────────────────────────────────────────────
const PLANS = {
  bronze: { name: "Bronze", price: 10, watchMinutes: 7, amount: 1000 },
  silver: { name: "Silver", price: 50, watchMinutes: 10, amount: 5000 },
  gold:   { name: "Gold",   price: 100, watchMinutes: -1, amount: 10000 }, // -1 = unlimited
};

// ── Email transporter ─────────────────────────────────────────────────────────
const getTransporter = () => nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ── Send invoice email ────────────────────────────────────────────────────────
const sendInvoiceEmail = async (email, name, plan, paymentId, amount) => {
  const transporter = getTransporter();
  const planDetails = PLANS[plan];
  const watchTime = planDetails.watchMinutes === -1 ? "Unlimited" : `${planDetails.watchMinutes} minutes`;
  const date = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #CC0000; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">YourTube</h1>
        <p style="color: #ffcccc; margin: 5px 0;">Payment Invoice</p>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd;">
        <p style="font-size: 16px;">Dear <strong>${name}</strong>,</p>
        <p>Thank you for upgrading to the <strong>${planDetails.name} Plan</strong>! Your payment was successful.</p>
        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #CC0000; margin-top: 0;">Invoice Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; color: #666;">Plan</td>
              <td style="padding: 8px 0; font-weight: bold;">${planDetails.name} Plan</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; color: #666;">Amount Paid</td>
              <td style="padding: 8px 0; font-weight: bold;">Rs.${amount}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; color: #666;">Watch Time</td>
              <td style="padding: 8px 0; font-weight: bold;">${watchTime} per video</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; color: #666;">Payment ID</td>
              <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${paymentId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Date</td>
              <td style="padding: 8px 0;">${date}</td>
            </tr>
          </table>
        </div>
        <p style="color: #666; font-size: 14px;">You can now enjoy ${watchTime} of video watching on YourTube. Thank you for your support!</p>
      </div>
      <div style="background: #eee; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
        <p style="color: #999; font-size: 12px; margin: 0;">This is an automated invoice from YourTube. Please keep it for your records.</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"YourTube" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `YourTube ${planDetails.name} Plan - Payment Confirmation`,
    html,
  });
};

// ── CREATE ORDER ──────────────────────────────────────────────────────────────
export const createPlanOrder = async (req, res) => {
  const { plan } = req.body;
  const planData = PLANS[plan];
  if (!planData) return res.status(400).json({ message: "Invalid plan" });

  try {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: planData.amount,
      currency: "INR",
      receipt: `plan_${plan}_${Date.now()}`,
    });
    return res.status(200).json({ ...order, planName: planData.name });
  } catch (error) {
    console.error("Order error:", error);
    return res.status(500).json({ message: "Failed to create order" });
  }
};

// ── VERIFY PAYMENT & UPGRADE PLAN ────────────────────────────────────────────
export const verifyPlanPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, plan } = req.body;
  const planData = PLANS[plan];
  if (!planData) return res.status(400).json({ message: "Invalid plan" });

  // Verify signature
  const sign = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(sign)
    .digest("hex");

  if (expectedSign !== razorpay_signature) {
    return res.status(400).json({ message: "Invalid payment signature" });
  }

  try {
    // Update user plan
    const updatedUser = await user.findByIdAndUpdate(
      userId,
      {
        plan: plan,
        planSince: new Date(),
        watchMinutes: planData.watchMinutes,
      },
      { new: true }
    );

    // Send invoice email
    try {
      await sendInvoiceEmail(
        updatedUser.email,
        updatedUser.name || "User",
        plan,
        razorpay_payment_id,
        planData.price
      );
    } catch (emailError) {
      console.error("Email error (non-critical):", emailError);
    }

    return res.status(200).json({
      success: true,
      message: `${planData.name} plan activated!`,
      watchMinutes: planData.watchMinutes,
    });
  } catch (error) {
    console.error("Plan upgrade error:", error);
    return res.status(500).json({ message: "Failed to upgrade plan" });
  }
};

// ── GET PLAN STATUS ───────────────────────────────────────────────────────────
export const getPlanStatus = async (req, res) => {
  const { userId } = req.params;
  try {
    const foundUser = await user.findById(userId).select("plan watchMinutes planSince");
    return res.status(200).json(foundUser || { plan: "free", watchMinutes: 5 });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch plan" });
  }
};