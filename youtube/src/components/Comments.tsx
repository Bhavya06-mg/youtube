import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/src/lib/AuthContext";
import axiosInstance from "@/src/lib/axiosinstance";
import { ThumbsUp, ThumbsDown, Languages } from "lucide-react";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  city: string;
  likes: number;
  dislikes: number;
  likedBy: string[];
  dislikedBy: string[];
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
  { code: "ar", label: "Arabic" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
];

// Block special characters — allow only letters, numbers, spaces and basic punctuation
const SPECIAL_CHAR_REGEX = /[^a-zA-Z0-9\s.,!?'"()-]/;

const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [commentError, setCommentError] = useState("");
  const [editError, setEditError] = useState("");
  const [loading, setLoading] = useState(true);

  // Translation state per comment
  const [translatedTexts, setTranslatedTexts] = useState<
    Record<string, string>
  >({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [showLangPicker, setShowLangPicker] = useState<string | null>(null);

  const { user } = useUser();

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  // ── Validate special characters ──────────────────────────────────────────
  const validateComment = (text: string) => {
    if (SPECIAL_CHAR_REGEX.test(text)) {
      return "Special characters are not allowed (e.g. @, #, $, %, ^, &, *, etc.)";
    }
    return "";
  };

  // ── Submit new comment ───────────────────────────────────────────────────
  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    const error = validateComment(newComment);
    if (error) {
      setCommentError(error);
      return;
    }
    setCommentError("");
    setIsSubmitting(true);

    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name,
      });
      if (res.data.comment) {
        const newCommentObj: Comment = {
          _id: res.data.data?._id || Date.now().toString(),
          videoid: videoId,
          userid: user._id,
          commentbody: newComment,
          usercommented: user.name || "Anonymous",
          commentedon: new Date().toISOString(),
          city: res.data.data?.city || "Unknown City",
          likes: 0,
          dislikes: 0,
          likedBy: [],
          dislikedBy: [],
        };
        setComments([newCommentObj, ...comments]);
        setNewComment("");
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        setCommentError(error.response.data.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Edit comment ─────────────────────────────────────────────────────────
  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
    setEditError("");
  };

  const handleUpdateComment = async () => {
    if (!editText.trim()) return;
    const error = validateComment(editText);
    if (error) {
      setEditError(error);
      return;
    }
    setEditError("");
    try {
      const res = await axiosInstance.post(
        `/comment/editcomment/${editingCommentId}`,
        {
          commentbody: editText,
        },
      );
      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId ? { ...c, commentbody: editText } : c,
          ),
        );
        setEditingCommentId(null);
        setEditText("");
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        setEditError(error.response.data.message);
      }
    }
  };

  // ── Delete comment ───────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error) {
      console.log(error);
    }
  };

  // ── Like comment ─────────────────────────────────────────────────────────
  const handleLike = async (commentId: string) => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(
        `/comment/likecomment/${commentId}`,
        {
          userid: user._id,
        },
      );
      setComments((prev) =>
        prev.map((c) => (c._id === commentId ? res.data : c)),
      );
    } catch (error) {
      console.log(error);
    }
  };

  // ── Dislike comment ───────────────────────────────────────────────────────
  const handleDislike = async (commentId: string) => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(
        `/comment/dislikecomment/${commentId}`,
        {
          userid: user._id,
        },
      );
      if (res.data.autoRemoved) {
        // Auto-removed because dislikes reached 2
        setComments((prev) => prev.filter((c) => c._id !== commentId));
      } else {
        setComments((prev) =>
          prev.map((c) => (c._id === commentId ? res.data : c)),
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  // ── Translate comment ─────────────────────────────────────────────────────
  const handleTranslate = async (
    commentId: string,
    text: string,
    targetLang: string,
  ) => {
    setTranslatingId(commentId);
    setShowLangPicker(null);
    try {
      const res = await axiosInstance.post("/comment/translate", {
        text,
        targetLang,
      });
      setTranslatedTexts((prev) => ({
        ...prev,
        [commentId]: res.data.translatedText,
      }));
    } catch (error) {
      console.log("Translation failed", error);
    } finally {
      setTranslatingId(null);
    }
  };

  if (loading) return <div>Loading comments...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{comments.length} Comments</h2>

      {/* ── New Comment Box ──────────────────────────────────────────────── */}
      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e: any) => {
                setNewComment(e.target.value);
                setCommentError(validateComment(e.target.value));
              }}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />
            {commentError && (
              <p className="text-red-500 text-xs">{commentError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setNewComment("");
                  setCommentError("");
                }}
                disabled={!newComment.trim()}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting || !!commentError}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Comments List ────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="flex gap-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src="/placeholder.svg?height=40&width=40" />
                <AvatarFallback>
                  {comment.usercommented?.[0] || "U"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                {/* Name + time + city */}
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-sm">
                    {comment.usercommented}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(comment.commentedon))} ago
                  </span>
                  {comment.city && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      📍 {comment.city}
                    </span>
                  )}
                </div>

                {/* Edit mode */}
                {editingCommentId === comment._id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => {
                        setEditText(e.target.value);
                        setEditError(validateComment(e.target.value));
                      }}
                    />
                    {editError && (
                      <p className="text-red-500 text-xs">{editError}</p>
                    )}
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={handleUpdateComment}
                        disabled={!editText.trim() || !!editError}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditText("");
                          setEditError("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Comment body */}
                    <p className="text-sm">{comment.commentbody}</p>

                    {/* Translated text */}
                    {translatedTexts[comment._id] && (
                      <div className="mt-1 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded">
                        <span className="text-xs text-blue-400 block mb-1">
                          Translated:
                        </span>
                        {translatedTexts[comment._id]}
                      </div>
                    )}

                    {/* Action buttons row */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {/* Like */}
                      <button
                        onClick={() => handleLike(comment._id)}
                        className={`flex items-center gap-1 text-xs transition-colors ${
                          user && comment.likedBy?.includes(user._id)
                            ? "text-blue-600 font-semibold"
                            : "text-gray-500 hover:text-blue-500"
                        }`}
                      >
                        <ThumbsUp size={14} />
                        {comment.likes || 0}
                      </button>

                      {/* Dislike */}
                      <button
                        onClick={() => handleDislike(comment._id)}
                        className={`flex items-center gap-1 text-xs transition-colors ${
                          user && comment.dislikedBy?.includes(user._id)
                            ? "text-red-600 font-semibold"
                            : "text-gray-500 hover:text-red-500"
                        }`}
                      >
                        <ThumbsDown size={14} />
                        {comment.dislikes || 0}
                      </button>

                      {/* Translate */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setShowLangPicker(
                              showLangPicker === comment._id
                                ? null
                                : comment._id,
                            )
                          }
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-600 transition-colors"
                        >
                          <Languages size={14} />
                          {translatingId === comment._id
                            ? "Translating..."
                            : "Translate"}
                        </button>

                        {/* Language picker dropdown */}
                        {showLangPicker === comment._id && (
                          <div className="absolute z-10 top-6 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid grid-cols-2 gap-1 w-44">
                            {LANGUAGES.map((lang) => (
                              <button
                                key={lang.code}
                                onClick={() =>
                                  handleTranslate(
                                    comment._id,
                                    comment.commentbody,
                                    lang.code,
                                  )
                                }
                                className="text-xs text-left px-2 py-1 hover:bg-gray-100 rounded"
                              >
                                {lang.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Edit / Delete (own comments only) */}
                      {comment.userid === user?._id && (
                        <>
                          <button
                            onClick={() => handleEdit(comment)}
                            className="text-xs text-gray-500 hover:text-gray-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(comment._id)}
                            className="text-xs text-gray-500 hover:text-red-600"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;
