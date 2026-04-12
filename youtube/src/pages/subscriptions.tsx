import React, { useEffect, useState } from "react";
import VideoCard from "@/src/components/videocard";
import axiosInstance from "@/src/lib/axiosinstance";
import { useUser } from "@/src/lib/AuthContext";
import { Bell, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import Link from "next/link";

export default function SubscriptionsPage() {
  const { user, theme } = useUser();
  const isDark = theme === "dark";
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [videosByChannel, setVideosByChannel] = useState<Record<string, any[]>>(
    {},
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchSubscriptions = async () => {
      try {
        // Get list of channels user subscribed to
        const res = await axiosInstance.get(`/subscribe/list/${user._id}`);
        const subs = Array.isArray(res.data) ? res.data : [];
        setSubscriptions(subs);

        // Get all videos and group by channel
        const videosRes = await axiosInstance.get("/video/getall");
        const allVideos = videosRes.data || [];

        const grouped: Record<string, any[]> = {};
        subs.forEach((channel: any) => {
          grouped[channel._id] = allVideos.filter(
            (v: any) =>
              v.uploader === channel._id ||
              v.videochanel === channel.channelname,
          );
        });
        setVideosByChannel(grouped);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    fetchSubscriptions();
  }, [user]);

  if (!user) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center gap-4 ${isDark ? "bg-gray-900 text-white" : "bg-white text-black"}`}
      >
        <Users className="w-16 h-16 text-gray-400" />
        <h2 className="text-xl font-semibold">Sign in to see subscriptions</h2>
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          Subscribe to channels to see their latest videos here
        </p>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen p-6 ${isDark ? "bg-gray-900 text-white" : "bg-white text-black"}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-red-600 p-2 rounded-lg">
          <Bell className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p
            className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            Latest from channels you follow
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-8">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div
                className={`h-10 w-48 rounded mb-4 ${isDark ? "bg-gray-800" : "bg-gray-200"}`}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(4)].map((_, j) => (
                  <div
                    key={j}
                    className={`rounded-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
                  >
                    <div className="aspect-video w-full bg-gray-700" />
                    <div className="p-3 space-y-2">
                      <div
                        className={`h-4 rounded ${isDark ? "bg-gray-700" : "bg-gray-200"}`}
                      />
                      <div
                        className={`h-3 w-2/3 rounded ${isDark ? "bg-gray-700" : "bg-gray-200"}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No subscriptions yet</h2>
          <p
            className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            Subscribe to channels to see their videos here
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Channel pills row */}
          <div className="flex gap-3 flex-wrap">
            {subscriptions.map((channel: any) => (
              <Link
                key={channel._id}
                href={`/channel/${channel._id}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-colors ${
                  isDark
                    ? "border-gray-700 bg-gray-800 hover:bg-gray-700 text-white"
                    : "border-gray-200 bg-gray-100 hover:bg-gray-200 text-black"
                }`}
              >
                <Avatar className="w-6 h-6">
                  <AvatarFallback
                    className={`text-xs ${isDark ? "bg-gray-600 text-white" : ""}`}
                  >
                    {channel.channelname?.[0] || channel.name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {channel.channelname || channel.name}
                </span>
              </Link>
            ))}
          </div>

          {/* Videos per channel */}
          {subscriptions.map((channel: any) => {
            const channelVideos = videosByChannel[channel._id] || [];
            return (
              <div key={channel._id}>
                {/* Channel header */}
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback
                      className={isDark ? "bg-gray-700 text-white" : ""}
                    >
                      {channel.channelname?.[0] || channel.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Link
                      href={`/channel/${channel._id}`}
                      className="font-semibold hover:text-red-500 transition-colors"
                    >
                      {channel.channelname || channel.name}
                    </Link>
                    <p
                      className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {channelVideos.length} video
                      {channelVideos.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {channelVideos.length === 0 ? (
                  <p
                    className={`text-sm italic ${isDark ? "text-gray-500" : "text-gray-400"}`}
                  >
                    No videos uploaded yet
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {channelVideos.slice(0, 4).map((video: any) => (
                      <VideoCard key={video._id} video={video} />
                    ))}
                  </div>
                )}

                <div
                  className={`mt-4 border-b ${isDark ? "border-gray-800" : "border-gray-100"}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
