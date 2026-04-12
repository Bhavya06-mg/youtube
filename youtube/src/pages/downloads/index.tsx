import React, { useEffect, useState } from "react";
import { Download, Crown, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/src/lib/AuthContext";
import axiosInstance from "@/src/lib/axiosinstance";
import Link from "next/link";

interface DownloadItem {
  videoId: string;
  videoTitle: string;
  filepath: string;
  downloadedAt: string;
}

const DownloadsPage = () => {
  const { user } = useUser();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDownloads = async () => {
      if (!user) return;
      try {
        const res = await axiosInstance.get(`/download/user-downloads/${user._id}`);
        setDownloads(res.data.downloads || []);
        setIsPremium(res.data.isPremium);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    fetchDownloads();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Please login to view your downloads.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading downloads...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Download className="w-7 h-7 text-gray-700" />
          <h1 className="text-2xl font-bold">My Downloads</h1>
        </div>
        {isPremium && (
          <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full">
            <Crown className="w-4 h-4" />
            <span className="text-sm font-semibold">Premium Member</span>
          </div>
        )}
      </div>

      {/* Free user banner */}
      {!isPremium && (
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-yellow-500" />
            <div>
              <p className="font-semibold text-sm">Free Plan — 1 download/day</p>
              <p className="text-xs text-gray-500">Upgrade to Premium for unlimited downloads</p>
            </div>
          </div>
          <Link href="/">
            <button className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-4 py-2 rounded-full font-medium">
              Upgrade ₹199
            </button>
          </Link>
        </div>
      )}

      {/* Downloads list */}
      {downloads.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Download className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No downloads yet</p>
          <p className="text-sm mt-1">Videos you download will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {downloads.slice().reverse().map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Download className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <Link href={`/watch/${item.videoId}`}>
                    <p className="font-medium text-sm hover:text-red-600 transition-colors line-clamp-1">
                      {item.videoTitle}
                    </p>
                  </Link>
                  <p className="text-xs text-gray-400 mt-1">
                    Downloaded {formatDistanceToNow(new Date(item.downloadedAt))} ago
                  </p>
                </div>
              </div>
              <a
                href={`https://youtube-xn82.onrender.com/${item.filepath}`}
                download={item.videoTitle}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-full transition"
              >
                <Download className="w-3 h-3" />
                Re-download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DownloadsPage;