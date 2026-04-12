import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  ThumbsUp,
  History,
  User,
  Crown,
  Download,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/src/lib/AuthContext";

const Sidebar = () => {
  const { user, theme } = useUser();
  const [isdialogeopen, setisdialogeopen] = useState(false);
  const isDark = theme === "dark";

  const btnClass = `w-full justify-start ${isDark ? "text-gray-200 hover:bg-gray-800 hover:text-white" : ""}`;

  return (
    <aside
      className={`w-64 border-r min-h-screen p-2 transition-colors duration-500 ${
        isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
      }`}
    >
      <nav className="space-y-1">
        <Link href="/">
          <Button variant="ghost" className={btnClass}>
            <Home className="w-5 h-5 mr-3" />
            Home
          </Button>
        </Link>
        <Link href="/explore">
          <Button variant="ghost" className={btnClass}>
            <Compass className="w-5 h-5 mr-3" />
            Explore
          </Button>
        </Link>
        <Link href="/subscriptions">
          <Button asChild variant="ghost" className={btnClass}>
            <span>
              <PlaySquare className="w-5 h-5 mr-3" />
              Subscriptions
            </span>
          </Button>
        </Link>
        <Link href="/downloads">
          <Button variant="ghost" className={btnClass}>
            <Download className="w-5 h-5 mr-3" />
            Downloads
          </Button>
        </Link>
        <Link href="/plans">
          <Button
            variant="ghost"
            className="w-full justify-start text-yellow-500 hover:text-yellow-400 hover:bg-yellow-900/20"
          >
            <Crown className="w-5 h-5 mr-3 text-yellow-500" />
            Upgrade Plan
          </Button>
        </Link>

        {user && (
          <div
            className={`border-t pt-2 mt-2 ${isDark ? "border-gray-700" : "border-gray-200"}`}
          >
            <Link href="/history">
              <Button variant="ghost" className={btnClass}>
                <History className="w-5 h-5 mr-3" />
                History
              </Button>
            </Link>
            <Link href="/liked">
              <Button variant="ghost" className={btnClass}>
                <ThumbsUp className="w-5 h-5 mr-3" />
                Liked videos
              </Button>
            </Link>
            <Link href="/watch-later">
              <Button variant="ghost" className={btnClass}>
                <Clock className="w-5 h-5 mr-3" />
                Watch later
              </Button>
            </Link>
            {user?.channelname ? (
              <Link href={`/channel/${user.id}`}>
                <Button variant="ghost" className={btnClass}>
                  <User className="w-5 h-5 mr-3" />
                  Your channel
                </Button>
              </Link>
            ) : (
              <div className="px-2 py-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => setisdialogeopen(true)}
                >
                  Create Channel
                </Button>
              </div>
            )}
          </div>
        )}
      </nav>
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </aside>
  );
};

export default Sidebar;
