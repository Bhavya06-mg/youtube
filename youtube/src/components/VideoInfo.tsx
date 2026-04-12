import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
  Crown,
  Bell,
  BellOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/src/lib/AuthContext";
import axiosInstance from "@/src/lib/axiosinstance";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video?.Like || 0);
  const [dislikes, setDislikes] = useState(video?.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const { user } = useUser();

  // Helper: choose uploader or channel name
  const getChannelIdentifier = () => {
    if (
      video?.uploader &&
      video.uploader !== "anonymous" &&
      video.uploader !== "undefined"
    ) {
      return video.uploader;
    }
    return video?.videochanel;
  };

  useEffect(() => {
    setlikes(video?.Like || 0);
    setDislikes(video?.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }, [video]);

  // Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Premium status
  useEffect(() => {
    const fetchPremiumStatus = async () => {
      if (!user) return;
      try {
        const res = await axiosInstance.get(
          `/download/premium-status/${user._id}`
        );
        setIsPremium(res.data.isPremium);
      } catch (error) {
        console.log(error);
      }
    };
    fetchPremiumStatus();
  }, [user]);

  // Fetch subscription info
  useEffect(() => {
    const fetchSubscribeData = async () => {
      const channelIdentifier = getChannelIdentifier();
      if (!channelIdentifier) return;

      try {
        const countRes = await axiosInstance.get(
          `/subscribe/count/${encodeURIComponent(channelIdentifier)}`
        );

        setSubscriberCount(countRes.data.count || 0);

        if (user) {
          const statusRes = await axiosInstance.get(
            `/subscribe/status/${encodeURIComponent(
              channelIdentifier
            )}/${user._id}`
          );

          setIsSubscribed(statusRes.data.subscribed);
        }
      } catch (error) {
        console.log(error);
      }
    };

    fetchSubscribeData();
  }, [user, video]);

  console.log("FULL VIDEO OBJECT:", video);

  // SUBSCRIBE FIX
  const handleSubscribe = async () => {
    if (!user) return;

    const channelIdentifier = getChannelIdentifier();

    console.log("DEBUG uploader:", video?.uploader);
    console.log("DEBUG videochanel:", video?.videochanel);
    console.log("DEBUG channelIdentifier:", channelIdentifier);

    if (!channelIdentifier) return;

    if (user?.name === video?.videochanel || user?._id === video?.uploader)
      return;

    setIsSubscribing(true);

    try {
      const res = await axiosInstance.post(
        `/subscribe/${encodeURIComponent(channelIdentifier)}`,
        { userId: user._id }
      );

      setIsSubscribed(res.data.subscribed);

      setSubscriberCount((prev) =>
        res.data.subscribed ? prev + 1 : Math.max(0, prev - 1)
      );
    } catch (error) {
      console.log("Subscribe error:", error);
    } finally {
      setIsSubscribing(false);
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // VIEW COUNT
  useEffect(() => {
    const handleviews = async () => {
      try {
        if (user) {
          await axiosInstance.post(`/history/${video?._id}`, {
            userId: user?._id,
          });
        } else {
          await axiosInstance.post(`/history/views/${video?._id}`);
        }
      } catch (error) {
        console.log(error);
      }
    };

    if (video?._id) handleviews();
  }, [user, video]);

  const handleLike = async () => {
    if (!user) return;

    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user._id,
      });

      if (res.data.liked) {
        if (isLiked) {
          setlikes((prev: number) => prev - 1);
          setIsLiked(false);
        } else {
          setlikes((prev: number) => prev - 1);
          setIsLiked(true);

          if (isDisliked) {
            setDislikes((prev: number) => prev - 1);
            setIsDisliked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDislike = async () => {
    if (!user) return;

    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user._id,
      });

      if (!res.data.liked) {
        if (isDisliked) {
          setDislikes((prev: number) => prev - 1);
          setIsDisliked(false);
        } else {
          setDislikes((prev: number) => prev + 1);
          setIsDisliked(true);

          if (isLiked) {
            setlikes((prev: number) => prev - 1);
            setIsLiked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleWatchLater = async () => {
    if (!user) return;

    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user._id,
      });

      if (res.data.watchlater) {
        setIsWatchLater(!isWatchLater);
      } else {
        setIsWatchLater(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const isOwnChannel =
    user?.name === video?.videochanel ||
    (video?.uploader && user?._id === video?.uploader);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video?.videotitle}</h1>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{video?.videochanel?.[0]}</AvatarFallback>
          </Avatar>

          <div>
            <h3 className="font-medium">{video?.videochanel}</h3>
            <p className="text-sm text-gray-600">
              {formatCount(subscriberCount)} subscriber
              {subscriberCount !== 1 ? "s" : ""}
            </p>
          </div>

          {!isOwnChannel && (
            <Button
              onClick={handleSubscribe}
              disabled={isSubscribing || !user}
              className={`ml-4 rounded-full px-5 flex items-center gap-2 ${
                isSubscribed
                  ? "bg-gray-200 text-gray-800"
                  : "bg-black text-white"
              }`}
            >
              {isSubscribed ? (
                <>
                  <BellOff className="w-4 h-4" /> Subscribed
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" /> Subscribe
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoInfo;