import Comments from "@/src/components/Comments";
import RelatedVideos from "@/src/components/Related";
import VideoInfo from "@/src/components/VideoInfo";
import Videopplayer from "@/src/components/Videopplayer";
import axiosInstance from "@/src/lib/axiosinstance";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const WatchPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || typeof id !== "string") return;

    const fetchVideo = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get("/video/getall");
        const found = res.data?.find((vid: any) => vid._id === id);
        setCurrentVideo(found || null);
        setAllVideos(res.data?.filter((vid: any) => vid._id !== id)); // exclude current from related
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-lg">Loading...</div>
      </div>
    );
  }

  if (!currentVideo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-lg">Video not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Videopplayer
              video={currentVideo}
              allVideos={allVideos}
              onOpenComments={() => {
                document
                  .getElementById("comments-section")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            />
            <VideoInfo video={currentVideo} />
            <div id="comments-section">
              <Comments videoId={id as string} />
            </div>
          </div>
          <div className="space-y-4">
            <RelatedVideos videos={allVideos} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchPage;
