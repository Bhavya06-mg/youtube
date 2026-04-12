import Header from "@/src/components/Header";
import Sidebar from "@/src/components/Sidebar";
import { Toaster } from "@/src/components/ui/sonner";
import type { AppProps } from "next/app";
import { UserProvider, useUser } from "../lib/AuthContext";
import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosinstance";
import OTPModal from "../components/OTPModal";

const AppContent = ({ Component, pageProps }: AppProps) => {
  const { theme } = useUser();
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpData, setOtpData] = useState({
    email: "",
    name: "",
    method: "email" as "email" | "sms",
  });

  // Listen for OTP trigger from AuthContext
  useEffect(() => {
    const handleOTPRequired = (e: any) => {
      setOtpData({
        email: e.detail.email,
        name: e.detail.name,
        method: e.detail.method || "email",
      });
      setShowOTPModal(true);
    };
    window.addEventListener("otp-required", handleOTPRequired);
    return () => window.removeEventListener("otp-required", handleOTPRequired);
  }, []);

  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen w-full transition-colors duration-500 ${isDark ? "bg-gray-950 text-white" : "bg-white text-black"}`}
    >
      <title>Your-Tube Clone</title>

      {/* Theme indicator badge */}
      <div
        className={`fixed bottom-4 left-4 z-40 text-xs px-3 py-1.5 rounded-full opacity-70 pointer-events-none ${
          isDark ? "bg-gray-800 text-gray-300" : "bg-gray-200 text-gray-600"
        }`}
      >
        {isDark ? "🌙 Dark Mode" : "☀️ Light Mode"}
      </div>

      <Header />
      <Toaster />
      <div className="flex">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="flex-1 w-full max-w-full overflow-x-hidden">
          <Component {...pageProps} />
        </main>
      </div>

      {/* OTP Modal */}
      {showOTPModal && (
        <OTPModal
          email={otpData.email}
          name={otpData.name}
          method={otpData.method}
          theme={theme}
          onVerified={() => setShowOTPModal(false)}
          onClose={() => setShowOTPModal(false)}
        />
      )}
    </div>
  );
};

export default function App(props: AppProps) {
  return (
    <UserProvider>
      <AppContent {...props} />
    </UserProvider>
  );
}
