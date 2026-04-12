import ChannelHeader from "@/src/components/ChannelHeader";
import Channeltabs from "@/src/components/Channeltabs";
import ChannelVideos from "@/src/components/ChannelVideos";
import VideoUploader from "@/src/components/VideoUploader";
import { useUser } from "@/src/lib/AuthContext";
import axiosInstance from "@/src/lib/axiosinstance";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const ChannelPage = () => {
  const router = useRouter();
  const { user, mounted } = useUser();
  const [videos, setVideos] = useState([]);

  const channelId = Array.isArray(router.query.id)
    ? router.query.id[0]
    : router.query.id;

  // Fetch videos uploaded by this channel
  useEffect(() => {
    const fetchChannelVideos = async () => {
      if (!user) return;
      try {
        const res = await axiosInstance.get("/video/getall");
        // Filter videos where videochanel matches user's channelname
        const channelVideos = res.data.filter(
          (vid: any) => vid.videochanel === user.channelname
        );
        setVideos(channelVideos);
      } catch (error) {
        console.log(error);
      }
    };
    fetchChannelVideos();
  }, [user]);

  if (!mounted || !router.isReady) return null;
  if (!user) return null;

  const channel = user;

  return (
    <div className="flex-1 min-h-screen bg-white">
      <ChannelHeader channel={channel} user={user} />
      <Channeltabs />
      <div className="px-4 pb-8">
        <VideoUploader channelId={channelId} channelName={channel?.channelname} />
      </div>
      <div className="px-4 pb-8">
        <ChannelVideos videos={videos} />  {/* ✅ Real videos now */}
      </div>
    </div>
  );
};

export default ChannelPage;