import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { MessageSquare, ThumbsUp, ThumbsDown, Send, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "/utils/supabase/info";

interface Post {
  id: string;
  author: string;
  content: string;
  votes: number;
  voters: { username: string; direction: string }[];
  createdAt: string;
}

interface Comment {
  id: string;
  postId: string;
  author: string;
  content: string;
  votes: number;
  voters: { username: string; direction: string }[];
  createdAt: string;
}

interface BanterBoardProps {
  token: string;
  username: string;
}

export function BanterBoard({ token, username }: BanterBoardProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [newCommentContent, setNewCommentContent] = useState<Record<string, string>>({});
  const [isLoadingComments, setIsLoadingComments] = useState<Record<string, boolean>>({});

  // Load all posts
  const loadPosts = async () => {
    setIsLoadingPosts(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/posts`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load posts");
      }

      const data = await response.json();
      setPosts(data);
      
      // Load top 2 comments for each post
      data.forEach((post: Post) => {
        loadTopComments(post.id);
      });
    } catch (error) {
      console.error("Error loading posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setIsLoadingPosts(false);
    }
  };

  // Load top 2 comments for a post
  const loadTopComments = async (postId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/posts/${postId}/comments`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load comments");
      }

      const data = await response.json();
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: data,
      }));
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  useEffect(() => {
    loadPosts();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadPosts, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // Create a new post
  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      toast.error("Post cannot be empty");
      return;
    }

    if (newPostContent.length > 500) {
      toast.error("Post must be 500 characters or less");
      return;
    }

    setIsCreatingPost(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/posts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
          body: JSON.stringify({ content: newPostContent }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create post");
      }

      setNewPostContent("");
      toast.success("Post created!");
      loadPosts();
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast.error(error.message || "Failed to create post");
    } finally {
      setIsCreatingPost(false);
    }
  };

  // Vote on a post
  const handleVotePost = async (postId: string, direction: "up" | "down") => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/posts/${postId}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
          body: JSON.stringify({ direction }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to vote");
      }

      const updatedPost = await response.json();
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? updatedPost : p))
          .sort((a, b) => b.votes - a.votes)
      );
    } catch (error) {
      console.error("Error voting on post:", error);
      toast.error("Failed to vote");
    }
  };

  // Create a comment
  const handleCreateComment = async (postId: string) => {
    const content = newCommentContent[postId];
    if (!content?.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    if (content.length > 300) {
      toast.error("Comment must be 300 characters or less");
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/posts/${postId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
          body: JSON.stringify({ content }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create comment");
      }

      setNewCommentContent((prev) => ({ ...prev, [postId]: "" }));
      toast.success("Comment added!");
      loadTopComments(postId);
    } catch (error: any) {
      console.error("Error creating comment:", error);
      toast.error(error.message || "Failed to create comment");
    }
  };

  // Vote on a comment
  const handleVoteComment = async (postId: string, commentId: string, direction: "up" | "down") => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/posts/${postId}/comments/${commentId}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
          body: JSON.stringify({ direction }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to vote");
      }

      const updatedComment = await response.json();
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] || [])
          .map((c) => (c.id === commentId ? updatedComment : c))
          .sort((a, b) => b.votes - a.votes),
      }));
    } catch (error) {
      console.error("Error voting on comment:", error);
      toast.error("Failed to vote");
    }
  };

  // Toggle expanded comments view
  const toggleExpandPost = (postId: string) => {
    setExpandedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  // Get user's vote on a post
  const getUserVote = (voters: { username: string; direction: string }[]) => {
    return voters?.find((v) => v.username === username)?.direction;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Create Post */}
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Create a Post
        </h3>
        <Textarea
          placeholder="Share your thoughts, banter, or game strategies..."
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          className="mb-4 bg-white/5 border-white/20 text-white placeholder:text-white/50 min-h-24"
          maxLength={500}
        />
        <div className="flex items-center justify-between">
          <span className="text-sm text-purple-200">
            {newPostContent.length}/500 characters
          </span>
          <Button
            onClick={handleCreatePost}
            disabled={isCreatingPost || !newPostContent.trim()}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Send className="h-4 w-4 mr-2" />
            Post
          </Button>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button
          onClick={loadPosts}
          variant="outline"
          size="sm"
          className="border-white/20 hover:bg-white/10"
          disabled={isLoadingPosts}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingPosts ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Posts List */}
      {isLoadingPosts && posts.length === 0 ? (
        <div className="text-center py-16">
          <RefreshCw className="h-16 w-16 mx-auto text-purple-300 mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-white mb-2">Loading posts...</h3>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="h-16 w-16 mx-auto text-purple-300 mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-white mb-2">No posts yet</h3>
          <p className="text-purple-200">Be the first to start the banter!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const userVote = getUserVote(post.voters);
            const postComments = commentsByPost[post.id] || [];
            const topComments = expandedPosts.has(post.id) ? postComments : postComments.slice(0, 2);
            const hasMoreComments = postComments.length > 2;

            return (
              <div
                key={post.id}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6"
              >
                {/* Post Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex flex-col items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVotePost(post.id, "up")}
                      className={`h-8 w-8 p-0 ${
                        userVote === "up" ? "text-green-400" : "text-white/60 hover:text-green-400"
                      }`}
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <span className={`text-sm font-semibold ${
                      post.votes > 0 ? "text-green-400" : post.votes < 0 ? "text-red-400" : "text-white"
                    }`}>
                      {post.votes}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVotePost(post.id, "down")}
                      className={`h-8 w-8 p-0 ${
                        userVote === "down" ? "text-red-400" : "text-white/60 hover:text-red-400"
                      }`}
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-purple-300 font-semibold">{post.author}</span>
                      <span className="text-white/40">•</span>
                      <span className="text-white/40 text-sm">{formatTimeAgo(post.createdAt)}</span>
                    </div>
                    <p className="text-white whitespace-pre-wrap">{post.content}</p>
                  </div>
                </div>

                {/* Comments Section */}
                {topComments.length > 0 && (
                  <div className="ml-12 space-y-3 mb-4">
                    {topComments.map((comment) => {
                      const commentUserVote = getUserVote(comment.voters);
                      return (
                        <div
                          key={comment.id}
                          className="bg-white/5 border border-white/10 rounded-lg p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleVoteComment(post.id, comment.id, "up")}
                                className={`h-6 w-6 p-0 ${
                                  commentUserVote === "up" ? "text-green-400" : "text-white/60 hover:text-green-400"
                                }`}
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                              <span className={`text-xs font-semibold ${
                                comment.votes > 0 ? "text-green-400" : comment.votes < 0 ? "text-red-400" : "text-white/60"
                              }`}>
                                {comment.votes}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleVoteComment(post.id, comment.id, "down")}
                                className={`h-6 w-6 p-0 ${
                                  commentUserVote === "down" ? "text-red-400" : "text-white/60 hover:text-red-400"
                                }`}
                              >
                                <ThumbsDown className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-purple-200 font-semibold text-sm">{comment.author}</span>
                                <span className="text-white/40">•</span>
                                <span className="text-white/40 text-xs">{formatTimeAgo(comment.createdAt)}</span>
                              </div>
                              <p className="text-white/90 text-sm whitespace-pre-wrap">{comment.content}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Show more/less comments button */}
                {hasMoreComments && (
                  <div className="ml-12 mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpandPost(post.id)}
                      className="text-purple-300 hover:text-purple-200"
                    >
                      {expandedPosts.has(post.id)
                        ? "Show less"
                        : `View all ${postComments.length} comments`}
                    </Button>
                  </div>
                )}

                {/* Add Comment */}
                <div className="ml-12 flex gap-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newCommentContent[post.id] || ""}
                    onChange={(e) =>
                      setNewCommentContent((prev) => ({ ...prev, [post.id]: e.target.value }))
                    }
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/50 text-sm min-h-20"
                    maxLength={300}
                  />
                  <Button
                    onClick={() => handleCreateComment(post.id)}
                    disabled={!newCommentContent[post.id]?.trim()}
                    size="sm"
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
