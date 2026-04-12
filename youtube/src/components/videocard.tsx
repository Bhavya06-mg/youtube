import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useUser } from "@/src/lib/AuthContext";

export default function VideoCard({ video }: any) {
  const { theme } = useUser();
  const isDark = theme === "dark";

  return (
    <Link href={`/watch/${video?._id}`} className="group">
      <div className="space-y-3">
        {/* Thumbnail */}
        <div className={`relative aspect-video rounded-lg overflow-hidden ${
          isDark ? "bg-gray-800" : "bg-gray-100"
        }`}>
          <video
            src={video?.filepath ? `https://youtube-xn82.onrender.com/${video.filepath}` : ""}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            muted
            preload="metadata"
          />
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
            10:24
          </div>
        </div>

        {/* Info */}
        <div className="flex gap-3">
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarFallback className={isDark ? "bg-gray-700 text-white" : ""}>
              {video?.videochanel?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium text-sm line-clamp-2 group-hover:text-blue-400 ${
              isDark ? "text-white" : "text-black"
            }`}>
              {video?.videotitle}
            </h3>
            <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {video?.videochanel}
            </p>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {video?.views?.toLocaleString()} views •{" "}
              {formatDistanceToNow(new Date(video?.createdAt))} ago
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}