"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Crown } from "lucide-react";
import axiosInstance from "@/src/lib/axiosinstance";
import { useUser } from "@/src/lib/AuthContext";
import { useRouter } from "next/router";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  allVideos?: any[]; // for skip to next
  onOpenComments?: () => void; // for open comments gesture
}

const PLANS = {
  free: { label: "Free", minutes: 5, color: "bg-gray-500" },
  bronze: { label: "Bronze", minutes: 7, color: "bg-orange-500" },
  silver: { label: "Silver", minutes: 10, color: "bg-gray-400" },
  gold: { label: "Gold", minutes: -1, color: "bg-yellow-500" },
};

const PLAN_OPTIONS = [
  {
    key: "bronze",
    label: "Bronze",
    price: 10,
    minutes: 7,
    color: "border-orange-400 bg-orange-50",
  },
  {
    key: "silver",
    label: "Silver",
    price: 50,
    minutes: 10,
    color: "border-gray-400 bg-gray-50",
  },
  {
    key: "gold",
    label: "Gold",
    price: 100,
    minutes: -1,
    color: "border-yellow-400 bg-yellow-50",
  },
];

export default function VideoPlayer({
  video,
  allVideos = [],
  onOpenComments,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const router = useRouter();

  const cleanPath = video?.filepath?.replace(/\\/g, "/");
  const videoSrc = `https://youtube-xn82.onrender.com/${cleanPath}`;

  // ── Plan / watch time state ───────────────────────────────────────────────
  const [watchLimit, setWatchLimit] = useState(5 * 60);
  const [timeWatched, setTimeWatched] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [currentPlan, setCurrentPlan] = useState("free");
  const [isProcessing, setIsProcessing] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Gesture state ─────────────────────────────────────────────────────────
  const [gestureHint, setGestureHint] = useState("");
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapZoneRef = useRef<"left" | "center" | "right" | null>(null);

  // Fetch user plan
  useEffect(() => {
    const fetchPlan = async () => {
      if (!user) return;
      try {
        const res = await axiosInstance.get(`/plan/status/${user._id}`);
        const mins = res.data.watchMinutes;
        setCurrentPlan(res.data.plan || "free");
        setWatchLimit(mins === -1 ? Infinity : mins * 60);
      } catch (error) {
        console.log(error);
      }
    };
    fetchPlan();
  }, [user]);

  // Track watch time
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handlePlay = () => {
      if (watchLimit === Infinity) return;
      intervalRef.current = setInterval(() => {
        setTimeWatched((prev) => {
          const next = prev + 1;
          if (next >= watchLimit) {
            videoEl.pause();
            setLimitReached(true);
            setShowUpgradeModal(true);
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
          return next;
        });
      }, 1000);
    };

    const handlePause = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    videoEl.addEventListener("play", handlePlay);
    videoEl.addEventListener("pause", handlePause);
    videoEl.addEventListener("ended", handlePause);

    return () => {
      videoEl.removeEventListener("play", handlePlay);
      videoEl.removeEventListener("pause", handlePause);
      videoEl.removeEventListener("ended", handlePause);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [watchLimit]);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // ── Show gesture hint briefly ─────────────────────────────────────────────
  const showHint = (msg: string) => {
    setGestureHint(msg);
    setTimeout(() => setGestureHint(""), 1500);
  };

  // ── Handle tap actions ────────────────────────────────────────────────────
  const handleTapAction = useCallback(
    (zone: "left" | "center" | "right", taps: number) => {
      const videoEl = videoRef.current;
      if (!videoEl) return;

      if (zone === "right" && taps === 2) {
        // Double tap right → forward 10s
        videoEl.currentTime = Math.min(
          videoEl.currentTime + 10,
          videoEl.duration,
        );
        showHint(">> 10s");
      } else if (zone === "left" && taps === 2) {
        // Double tap left → backward 10s
        videoEl.currentTime = Math.max(videoEl.currentTime - 10, 0);
        showHint("<< 10s");
      } else if (zone === "center" && taps === 1) {
        // Single tap center → pause/play
        if (videoEl.paused) {
          videoEl.play();
          showHint(" ▶ Play");
        } else {
          videoEl.pause();
          showHint("⏸ Pause");
        }
      } else if (zone === "center" && taps === 3) {
        // Triple tap center → skip to next video
        if (allVideos.length > 0) {
          const currentIndex = allVideos.findIndex(
            (v: any) => v._id === video._id,
          );
          const nextVideo = allVideos[currentIndex + 1] || allVideos[0];
          showHint("⏭ Next Video");
          setTimeout(() => router.push(`/watch/${nextVideo._id}`), 500);
        } else {
          showHint("No next video");
        }
      } else if (zone === "right" && taps === 3) {
        // Triple tap right → go to home page (browser blocks window.close)
        showHint(" Going Home...");
        setTimeout(() => router.push("/"), 800);
      } else if (zone === "left" && taps === 3) {
        // Triple tap left → open comments
        showHint(" Opening Comments");
        if (onOpenComments) {
          onOpenComments();
        } else {
          // Scroll to comments section
          const commentsEl = document.getElementById("comments-section");
          if (commentsEl) commentsEl.scrollIntoView({ behavior: "smooth" });
        }
      }
    },
    [allVideos, video._id, router, onOpenComments],
  );

  // ── Tap detection ─────────────────────────────────────────────────────────
  const handleVideoClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (limitReached) return;
      e.preventDefault(); // ← ADD THIS
      e.stopPropagation(); // ← ADD THIS

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;

      // Determine zone
      let zone: "left" | "center" | "right";
      if (x < width / 3) {
        zone = "left";
      } else if (x > (width * 2) / 3) {
        zone = "right";
      } else {
        zone = "center";
      }

      // If zone changed reset count
      if (lastTapZoneRef.current !== zone) {
        tapCountRef.current = 0;
        lastTapZoneRef.current = zone;
      }

      tapCountRef.current += 1;

      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

      tapTimerRef.current = setTimeout(() => {
        const taps = tapCountRef.current;
        const tapZone = lastTapZoneRef.current!;
        tapCountRef.current = 0;
        lastTapZoneRef.current = null;
        handleTapAction(tapZone, taps);
      }, 300);
    },
    [limitReached, handleTapAction],
  );

  // Format seconds
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Razorpay upgrade
  const handleUpgrade = async (planKey: string) => {
    if (!user) return;
    setIsProcessing(true);
    setUpgradeMessage("");
    try {
      const orderRes = await axiosInstance.post("/plan/create-order", {
        plan: planKey,
      });
      const order = orderRes.data;
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "YourTube",
        description: `${order.planName} Plan Upgrade`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            const verifyRes = await axiosInstance.post("/plan/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: user._id,
              plan: planKey,
            });
            if (verifyRes.data.success) {
              const newMins = verifyRes.data.watchMinutes;
              setCurrentPlan(planKey);
              setWatchLimit(newMins === -1 ? Infinity : newMins * 60);
              setLimitReached(false);
              setTimeWatched(0);
              setShowUpgradeModal(false);
              setUpgradeMessage(
                `🎉 ${planKey.charAt(0).toUpperCase() + planKey.slice(1)} plan activated!`,
              );
              videoRef.current?.play();
            }
          } catch {
            setUpgradeMessage("Payment verification failed.");
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: { name: user?.name || "", email: user?.email || "" },
        theme: { color: "#CC0000" },
        modal: { ondismiss: () => setIsProcessing(false) },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch {
      setIsProcessing(false);
      setUpgradeMessage("Failed to initiate payment.");
    }
  };

  const planInfo = PLANS[currentPlan as keyof typeof PLANS];
  const limitInMins =
    watchLimit === Infinity ? "Unlimited" : `${watchLimit / 60} min`;

  return (
    <div className="space-y-2">
      {/* Plan badge */}
      <div className="flex items-center justify-between">
        <div
          className={`flex items-center gap-1.5 text-xs text-white px-3 py-1 rounded-full ${planInfo.color}`}
        >
          <Crown className="w-3 h-3" />
          {planInfo.label} Plan — {limitInMins} watch time
        </div>
        {watchLimit !== Infinity && (
          <span className="text-xs text-gray-500">
            Watched: {formatTime(timeWatched)} /{" "}
            {formatTime(watchLimit as number)}
          </span>
        )}
      </div>

      {/* Video player */}
      <div
        ref={containerRef}
        className="aspect-video bg-black rounded-lg overflow-hidden relative cursor-pointer select-none"
        onClick={handleVideoClick}
      >
        <video
          ref={videoRef}
          key={videoSrc}
          className="w-full h-full"
          controls={!limitReached}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>

        {/* Gesture hint overlay */}
        {gestureHint && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/70 text-white text-xl font-bold px-6 py-3 rounded-2xl animate-pulse">
              {gestureHint}
            </div>
          </div>
        )}

        {/* Gesture zone indicators (subtle) */}
        {!limitReached && (
          <div className="absolute inset-0 flex pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
            <div className="flex-1 flex items-center justify-center text-white/20 text-xs">
              ◀◀ left
            </div>
            <div className="flex-1 flex items-center justify-center text-white/20 text-xs">
              tap center
            </div>
            <div className="flex-1 flex items-center justify-center text-white/20 text-xs">
              right ▶▶
            </div>
          </div>
        )}

        {/* Limit overlay */}
        {limitReached && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white">
            <Crown className="w-12 h-12 text-yellow-400 mb-3" />
            <h3 className="text-xl font-bold mb-1">Watch Limit Reached</h3>
            <p className="text-gray-300 text-sm mb-4">
              Your {planInfo.label} plan allows {limitInMins} per video
            </p>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-full font-semibold"
            >
              Upgrade Plan
            </button>
          </div>
        )}
      </div>

      {/* Gesture guide */}
      <div className="grid grid-cols-3 gap-1 text-xs text-gray-400 text-center px-1">
        <div>
          <p>Double tap: ⏪ -10s</p>
          <p>Triple tap: 💬 Comments</p>
        </div>
        <div>
          <p>Single tap: ⏯ Play/Pause</p>
          <p>Triple tap: ⏭ Next video</p>
        </div>
        <div>
          <p>Double tap: ⏩ +10s</p>
          <p>Triple tap: ❌ Close</p>
        </div>
      </div>

      {upgradeMessage && (
        <p className="text-sm text-green-600 px-1">{upgradeMessage}</p>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <Crown className="w-14 h-14 text-yellow-500 mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Upgrade Your Plan</h2>
              <p className="text-gray-500 text-sm mt-1">
                You've reached your {planInfo.label} plan limit. Upgrade for
                more watch time!
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {PLAN_OPTIONS.map((plan) => (
                <div
                  key={plan.key}
                  className={`border-2 rounded-xl p-4 text-center ${plan.color} ${
                    currentPlan === plan.key
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:shadow-md transition"
                  }`}
                >
                  <p className="font-bold text-lg">{plan.label}</p>
                  <p className="text-2xl font-bold text-gray-800 my-1">
                    Rs.{plan.price}
                  </p>
                  <p className="text-xs text-gray-600">
                    {plan.minutes === -1 ? "Unlimited" : `${plan.minutes} min`}{" "}
                    per video
                  </p>
                  <button
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={isProcessing || currentPlan === plan.key}
                    className="mt-3 w-full bg-gray-800 hover:bg-gray-900 text-white text-xs py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {currentPlan === plan.key
                      ? "Current"
                      : isProcessing
                        ? "Processing..."
                        : "Select"}
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
