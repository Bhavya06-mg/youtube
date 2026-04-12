import React, { useEffect, useState } from "react";
import VideoCard from "@/src/components/videocard";
import axiosInstance from "@/src/lib/axiosinstance";
import { useUser } from "@/src/lib/AuthContext";
import { TrendingUp } from "lucide-react";

export default function ExplorePage() {
  const { theme } = useUser();
  const isDark = theme === "dark";
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        // Sort by views descending for "trending"
        const sorted = (res.data || []).sort((a: any, b: any) => (b.views || 0) - (a.views || 0));
        setVideos(sorted);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  return (
    <div className={`min-h-screen p-6 ${isDark ? "bg-gray-900 text-white" : "bg-white text-black"}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-red-600 p-2 rounded-lg">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Trending</h1>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Most popular videos right now
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className={`rounded-lg overflow-hidden animate-pulse ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
              <div className="aspect-video w-full bg-gray-700" />
              <div className="p-3 space-y-2">
                <div className={`h-4 rounded ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                <div className={`h-3 w-2/3 rounded ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20">
          <TrendingUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className={`text-lg ${isDark ? "text-gray-400" : "text-gray-500"}`}>No videos yet</p>
        </div>
      ) : (
        <>
          {/* Top 1 — Hero */}
          {videos[0] && (
            <div className="mb-8">
              <div className={`flex items-center gap-2 mb-3`}>
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">#1 TRENDING</span>
              </div>
              <VideoCard video={videos[0]} />
            </div>
          )}

          {/* Rest of trending */}
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
            More Trending Videos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.slice(1).map((video: any, index: number) => (
              <div key={video._id} className="relative">
                <span className={`absolute top-2 left-2 z-10 text-xs font-bold px-1.5 py-0.5 rounded ${
                  isDark ? "bg-gray-900/80 text-gray-300" : "bg-white/80 text-gray-600"
                }`}>
                  #{index + 2}
                </span>
                <VideoCard video={video} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}