import { useState } from "react";
import axiosInstance from "@/src/lib/axiosinstance";

interface OTPModalProps {
  email: string;
  name: string;
  method: "email" | "sms";
  theme: "light" | "dark";
  onVerified: () => void;
  onClose: () => void;
}

const OTPModal = ({ email, name, method, theme, onVerified, onClose }: OTPModalProps) => {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const isDark = theme === "dark";

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("Please enter a 6-digit OTP");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.post("/otp/verify", { email, otp });
      if (res.data.success) {
        onVerified();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      await axiosInstance.post("/otp/send", { email, name });
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch {
      setError("Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className={`rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl ${
        isDark ? "bg-gray-900 text-white" : "bg-white text-black"
      }`}>
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">{method === "email" ? "📧" : "📱"}</span>
          </div>
          <h2 className="text-xl font-bold mb-1">Verify Your Identity</h2>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {method === "email"
              ? `OTP sent to your email: ${email}`
              : `OTP sent to your registered mobile number`}
          </p>
          <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            {method === "email" ? "📍 South India detected" : "📍 Outside South India"}
          </p>
        </div>

        {/* OTP Input */}
        <input
          type="text"
          maxLength={6}
          value={otp}
          onChange={(e) => {
            setOtp(e.target.value.replace(/\D/g, ""));
            setError("");
          }}
          placeholder="Enter 6-digit OTP"
          className={`w-full text-center text-2xl font-bold tracking-widest border-2 rounded-xl p-4 mb-4 outline-none focus:border-red-500 transition ${
            isDark
              ? "bg-gray-800 border-gray-700 text-white"
              : "bg-gray-50 border-gray-200 text-black"
          }`}
        />

        {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}
        {resent && <p className="text-green-500 text-sm text-center mb-3">OTP resent successfully!</p>}

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={loading || otp.length !== 6}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl mb-3 disabled:opacity-50 transition"
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        {/* Resend */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleResend}
            disabled={resending}
            className={`text-sm underline ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}
          >
            {resending ? "Resending..." : "Resend OTP"}
          </button>
          <button
            onClick={onClose}
            className={`text-sm ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}
          >
            Cancel
          </button>
        </div>

        <p className={`text-xs text-center mt-4 ${isDark ? "text-gray-600" : "text-gray-400"}`}>
          OTP expires in 5 minutes
        </p>
      </div>
    </div>
  );
};

export default OTPModal;