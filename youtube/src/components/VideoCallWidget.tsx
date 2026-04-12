"use client";

import { useEffect, useRef, useState } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  PhoneCall,
  PhoneOff,
  Circle,
  Square,
  Download,
  X,
  Users,
  PhoneMissed,
} from "lucide-react";
import axiosInstance from "@/src/lib/axiosinstance";
import { useUser } from "@/src/lib/AuthContext";

declare global {
  interface Window {
    Peer: any;
  }
}

interface VideoCallWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoCallWidget({
  isOpen,
  onClose,
}: VideoCallWidgetProps) {
  const { user } = useUser();

  const [callState, setCallState] = useState<
    "idle" | "calling" | "in-call" | "incoming"
  >("idle");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [callWith, setCallWith] = useState<any>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [incomingCallerName, setIncomingCallerName] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [missedCalls, setMissedCalls] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<{ url: string; name: string }[]>(
    [],
  );

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const currentCallRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!user) return;
    const loadPeer = () => {
      if (window.Peer) {
        initPeer();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js";
      script.async = true;
      script.onload = () => initPeer();
      document.body.appendChild(script);
    };
    loadPeer();
  }, [user]);
  // ✅ Re-attach remote stream when callState changes to in-call
  useEffect(() => {
    if (callState === "in-call" && currentCallRef.current) {
      const pc = currentCallRef.current?.peerConnection;
      if (pc) {
        const receivers = pc.getReceivers();
        receivers.forEach((receiver: any) => {
          if (receiver.track && remoteVideoRef.current) {
            const stream = new MediaStream([receiver.track]);
            remoteVideoRef.current.srcObject = stream;
            remoteVideoRef.current.play().catch(() => {});
          }
        });
      }
    }
  }, [callState]);

  const initPeer = () => {
    if (!user || peerRef.current) return;
    const peerId = `yourtube-${user._id}`;

    // ✅ Use a reliable TURN server config for mobile/cross-network calls
    const peer = new window.Peer(peerId, {
      host: "0.peerjs.com",
      port: 443,
      secure: true,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
          {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ],
      },
    });

    peer.on("open", (id: string) => console.log("Peer ready:", id));

    peer.on("call", (call: any) => {
      const callerName = call.metadata?.callerName || "Someone";
      setIncomingCallerName(callerName);
      setIncomingCall(call);
      setCallState("incoming");
      window.dispatchEvent(new Event("incoming-call"));
      const missedTimer = setTimeout(() => {
        setMissedCalls((prev) => [...prev, callerName]);
        setIncomingCall(null);
        setCallState("idle");
      }, 30000);
      (call as any)._missedTimer = missedTimer;
    });

    peer.on("error", (err: any) => {
      console.error("Peer error:", err);
      setStatusMsg("Connection error. Try again.");
      setCallState("idle");
    });

    peerRef.current = peer;
  };

  const getLocalStream = async () => {
    try {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
      return stream;
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        localStreamRef.current = stream;
        return stream;
      } catch {
        throw new Error("Camera/mic access denied.");
      }
    }
  };

  // ✅ Core fix: set remote video reliably using both stream event and ontrack
  const setupCallHandlers = (call: any, callerName?: string) => {
    const setRemoteStream = (stream: MediaStream) => {
      console.log("Setting remote stream", stream.getTracks());
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current
          .play()
          .catch((e) => console.log("play error", e));
      }
      if (callerName) setCallWith({ name: callerName });
      setCallState("in-call");
      setStatusMsg("");
    };

    // Method 1: PeerJS stream event
    call.on("stream", (remoteStream: MediaStream) => {
      console.log("stream event fired");
      setRemoteStream(remoteStream);
    });

    // Method 2: Direct WebRTC ontrack (backup)
    const waitForPC = (attempts = 0) => {
      const pc = call.peerConnection;
      if (pc) {
        pc.ontrack = (event: RTCTrackEvent) => {
          console.log("ontrack fired", event.streams.length);
          if (event.streams?.[0]) {
            setRemoteStream(event.streams[0]);
          }
        };
      } else if (attempts < 30) {
        setTimeout(() => waitForPC(attempts + 1), 100);
      }
    };
    waitForPC();

    call.on("close", () => {
      setStatusMsg("Call ended.");
      endCall();
    });

    call.on("error", (err: any) => {
      console.error("Call error:", err);
      setStatusMsg("Call failed.");
      endCall();
    });
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await axiosInstance.get(`/user/search?q=${q}`);
      setSearchResults(res.data.filter((u: any) => u._id !== user?._id));
    } catch {
      setSearchResults([]);
    }
  };

  const startCall = async (targetUser: any) => {
    if (!peerRef.current) return;
    setCallWith(targetUser);
    setCallState("calling");
    setStatusMsg(`Calling ${targetUser.name}...`);
    try {
      const stream = await getLocalStream();
      const call = peerRef.current.call(`yourtube-${targetUser._id}`, stream, {
        metadata: { callerName: user?.name || "Someone" },
      });
      setupCallHandlers(call, targetUser.name);
      currentCallRef.current = call;
    } catch (err: any) {
      setStatusMsg(err.message || "Camera/mic access denied.");
      setCallState("idle");
    }
  };

  const answerCall = async () => {
    if (!incomingCall) return;
    clearTimeout((incomingCall as any)._missedTimer);
    try {
      const stream = await getLocalStream();
      setupCallHandlers(incomingCall, incomingCallerName);
      incomingCall.answer(stream);
      currentCallRef.current = incomingCall;
      setIncomingCall(null);
    } catch (err: any) {
      setStatusMsg(err.message || "Camera/mic access denied.");
    }
  };

  const rejectCall = () => {
    clearTimeout((incomingCall as any)?._missedTimer);
    try {
      incomingCall?.close();
    } catch {}
    setIncomingCall(null);
    setCallState("idle");
  };

  const endCall = () => {
    try {
      currentCallRef.current?.close();
    } catch {}
    try {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    try {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    localStreamRef.current = null;
    screenStreamRef.current = null;
    currentCallRef.current = null;
    if (isRecording) stopRecording();
    setCallState("idle");
    setCallWith(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsSharingScreen(false);
    setStatusMsg("");
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = isMuted;
    });
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = isVideoOff;
    });
    setIsVideoOff(!isVideoOff);
  };

  const toggleScreenShare = async () => {
    if (!currentCallRef.current) return;
    const pc = currentCallRef.current?.peerConnection;
    if (!pc) return;

    if (isSharingScreen) {
      try {
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        const sender = pc
          .getSenders()
          .find((s: any) => s.track?.kind === "video");
        if (sender && videoTrack) await sender.replaceTrack(videoTrack);
        if (localVideoRef.current)
          localVideoRef.current.srcObject = localStreamRef.current;
        screenStreamRef.current = null;
        setIsSharingScreen(false);
      } catch (e) {
        console.error(e);
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 15 } as any,
          audio: false,
        });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        const videoSender = pc
          .getSenders()
          .find((s: any) => s.track?.kind === "video");
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        } else {
          pc.addTrack(screenTrack, screenStream);
        }
        if (localVideoRef.current)
          localVideoRef.current.srcObject = screenStream;
        screenTrack.onended = () => toggleScreenShare();
        setIsSharingScreen(true);
      } catch {
        setStatusMsg("Screen share cancelled.");
      }
    }
  };

  const startRecording = () => {
    if (!remoteVideoRef.current?.srcObject) return;
    const stream = remoteVideoRef.current.srcObject as MediaStream;
    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const name = `call-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.webm`;
      setRecordings((prev) => [...prev, { url, name }]);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const downloadRecording = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };

  if (!user) return null;
  if (!isOpen && callState !== "incoming") return null;

  return (
    <div
      className={`fixed top-14 right-4 z-50 w-96 bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700 ${callState === "incoming" ? "ring-2 ring-green-500" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2 text-white font-semibold">
          <Video className="w-5 h-5 text-red-500" />
          {callState === "in-call"
            ? `In call with ${callWith?.name}`
            : callState === "incoming"
              ? "Incoming Call"
              : "Video Call"}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Missed calls */}
      {missedCalls.length > 0 && callState === "idle" && (
        <div className="px-4 pt-3">
          {missedCalls.map((name, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2 mb-2"
            >
              <PhoneMissed className="w-4 h-4 text-red-400" />
              <p className="text-red-300 text-xs">
                Missed call from <strong>{name}</strong>
              </p>
              <button
                onClick={() =>
                  setMissedCalls((prev) => prev.filter((_, j) => j !== i))
                }
                className="ml-auto text-gray-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Incoming call */}
      {callState === "incoming" && (
        <div className="p-6 text-center text-white">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <PhoneCall className="w-8 h-8" />
          </div>
          <p className="text-lg font-bold mb-1">{incomingCallerName}</p>
          <p className="text-gray-400 text-sm mb-6">is calling you...</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={rejectCall}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full flex items-center gap-2"
            >
              <PhoneOff className="w-5 h-5" /> Decline
            </button>
            <button
              onClick={answerCall}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full flex items-center gap-2"
            >
              <PhoneCall className="w-5 h-5" /> Answer
            </button>
          </div>
        </div>
      )}

      {/* Idle / search */}
      {callState === "idle" && (
        <div className="p-4">
          <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2 mb-3">
            <Users className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder:text-gray-500 text-sm outline-none"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {searchResults.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2"
                >
                  <div>
                    <p className="text-white text-sm font-medium">{u.name}</p>
                    <p className="text-gray-400 text-xs">{u.email}</p>
                  </div>
                  <button
                    onClick={() => startCall(u)}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    <PhoneCall className="w-3 h-3" /> Call
                  </button>
                </div>
              ))}
            </div>
          )}
          {searchQuery.length > 1 && searchResults.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">
              No users found
            </p>
          )}
          {statusMsg && (
            <p className="text-yellow-400 text-xs text-center mt-2">
              {statusMsg}
            </p>
          )}
        </div>
      )}

      {/* Calling / in-call */}
      {(callState === "calling" || callState === "in-call") && (
        <div className="p-3 space-y-2">
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              onLoadedMetadata={() =>
                remoteVideoRef.current?.play().catch(() => {})
              }
              className="w-full h-full object-cover"
            />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`absolute bottom-2 right-2 object-cover rounded-lg border-2 border-gray-600 ${isSharingScreen ? "w-40 h-28" : "w-24 h-16"}`}
            />
            {callState === "calling" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white gap-2">
                <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                <p className="text-sm">Calling {callWith?.name}...</p>
              </div>
            )}
          </div>

          {callState === "in-call" && (
            <div className="flex justify-center gap-2 flex-wrap">
              <button
                onClick={toggleMute}
                className={`p-2 rounded-full ${isMuted ? "bg-red-600" : "bg-gray-700"} text-white`}
              >
                {isMuted ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={toggleVideo}
                className={`p-2 rounded-full ${isVideoOff ? "bg-red-600" : "bg-gray-700"} text-white`}
              >
                {isVideoOff ? (
                  <VideoOff className="w-4 h-4" />
                ) : (
                  <Video className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={toggleScreenShare}
                className={`p-2 rounded-full ${isSharingScreen ? "bg-blue-600" : "bg-gray-700"} text-white`}
              >
                {isSharingScreen ? (
                  <MonitorOff className="w-4 h-4" />
                ) : (
                  <Monitor className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-2 rounded-full ${isRecording ? "bg-red-600 animate-pulse" : "bg-gray-700"} text-white`}
              >
                {isRecording ? (
                  <Square className="w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={endCall}
                className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          )}

          {callState === "calling" && (
            <button
              onClick={endCall}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <PhoneOff className="w-4 h-4" /> Cancel Call
            </button>
          )}
        </div>
      )}

      {/* Recordings */}
      {recordings.length > 0 && (
        <div className="px-4 pb-4 border-t border-gray-700 pt-3">
          <p className="text-gray-400 text-xs mb-2 font-semibold">RECORDINGS</p>
          {recordings.map((rec, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 mb-1"
            >
              <p className="text-white text-xs truncate flex-1">{rec.name}</p>
              <button
                onClick={() => downloadRecording(rec.url, rec.name)}
                className="text-blue-400 hover:text-blue-300 ml-2"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
