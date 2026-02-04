import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { MessageSquare, ThumbsUp, ThumbsDown, Send, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { Game } from "@/app/components/game-card";

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
  isAdmin: boolean;
  games: Game[];
  onGameClick: (gameId: string) => void;
}

export function BanterBoard({ token, username, isAdmin, games, onGameClick }: BanterBoardProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [newCommentContent, setNewCommentContent] = useState<Record<string, string>>({});
  const [showGameSuggestions, setShowGameSuggestions] = useState(false);
  const [gameSuggestionsFor, setGameSuggestionsFor] = useState<string | null>(null); // null for main post, postId for comment
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const textareaContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Get user's hosted games
  const userHostedGames = games.filter(game => game.host === username);

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

  // Calculate dropdown position when suggestions are shown
  useEffect(() => {
    if (showGameSuggestions) {
      const context = gameSuggestionsFor === null ? 'main' : gameSuggestionsFor;
      const ref = textareaContainerRefs.current[context];
      if (ref) {
        const rect = ref.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom,
          left: rect.left,
          width: rect.width,
        });
      }
    }
  }, [showGameSuggestions, gameSuggestionsFor]);

  // Convert game mentions from names back to IDs before saving
  const convertGameMentionsToIds = (content: string): string => {
    let convertedContent = content;
    
    // Find all @GameName mentions and replace with @gameId
    games.forEach(game => {
      const gameMentionPattern = new RegExp(`@${game.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`, 'g');
      convertedContent = convertedContent.replace(gameMentionPattern, `@${game.id}`);
    });
    
    return convertedContent;
  };

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
      // Convert game names to IDs before sending
      const contentWithIds = convertGameMentionsToIds(newPostContent);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/posts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
          body: JSON.stringify({ content: contentWithIds }),
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
      // Convert game names to IDs before sending
      const contentWithIds = convertGameMentionsToIds(content);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/posts/${postId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
          body: JSON.stringify({ content: contentWithIds }),
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

  // Delete a post
  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post? All comments will also be deleted.")) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/posts/${postId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete post");
      }

      toast.success("Post deleted");
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setCommentsByPost((prev) => {
        const newComments = { ...prev };
        delete newComments[postId];
        return newComments;
      });
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  // Delete a comment
  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/posts/${postId}/comments/${commentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete comment");
      }

      toast.success("Comment deleted");
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((c) => c.id !== commentId),
      }));
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
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

  // Parse content and render game mentions as clickable links
  const parseContent = (content: string) => {
    // Match @gameId pattern
    const parts = content.split(/(@[a-zA-Z0-9-]+)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const gameId = part.substring(1);
        const game = games.find(g => g.id === gameId);
        
        if (game) {
          return (
            <button
              key={index}
              onClick={() => onGameClick(gameId)}
              className="underline text-purple-300 hover:text-purple-200 cursor-pointer"
            >
              {game.name}
            </button>
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Handle textarea change for posts or comments
  const handleTextChange = (value: string, context: string | null) => {
    if (context === null) {
      setNewPostContent(value);
    } else {
      setNewCommentContent((prev) => ({ ...prev, [context]: value }));
    }

    // Check if @ was just typed to show suggestions
    const lastChar = value[value.length - 1];
    if (lastChar === '@') {
      setShowGameSuggestions(true);
      setGameSuggestionsFor(context);
      setSelectedSuggestionIndex(0);
    } else {
      setShowGameSuggestions(false);
    }
  };

  // Insert game mention into text
  const insertGameMention = (gameId: string, context: string | null) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    // Insert game name in a readable format
    const gameMention = `@${game.name}`;
    
    if (context === null) {
      // Insert into post
      const text = newPostContent;
      const lastAtIndex = text.lastIndexOf('@');
      if (lastAtIndex !== -1) {
        const newText = text.substring(0, lastAtIndex) + `${gameMention} `;
        setNewPostContent(newText);
      }
    } else {
      // Insert into comment
      const text = newCommentContent[context] || '';
      const lastAtIndex = text.lastIndexOf('@');
      if (lastAtIndex !== -1) {
        const newText = text.substring(0, lastAtIndex) + `${gameMention} `;
        setNewCommentContent((prev) => ({ ...prev, [context]: newText }));
      }
    }
    setShowGameSuggestions(false);
  };

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e: React.KeyboardEvent, context: string | null) => {
    if (!showGameSuggestions || gameSuggestionsFor !== context) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => 
        prev < userHostedGames.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && userHostedGames.length > 0) {
      e.preventDefault();
      insertGameMention(userHostedGames[selectedSuggestionIndex].id, context);
    } else if (e.key === 'Escape') {
      setShowGameSuggestions(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Post */}
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 overflow-visible">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Create a Post
        </h3>
        <div className="relative z-50 overflow-visible">
          <div ref={(ref) => { textareaContainerRefs.current['main'] = ref; }}>
            <Textarea
              placeholder="Share your thoughts, banter, or game strategies... Type @ to mention your games"
              value={newPostContent}
              onChange={(e) => handleTextChange(e.target.value, null)}
              onKeyDown={(e) => handleKeyDown(e, null)}
              className="mb-4 bg-white/5 border-white/20 text-white placeholder:text-white/50 min-h-24"
              maxLength={500}
            />
          </div>
          
          {/* Game Suggestions Dropdown for Post */}
          {showGameSuggestions && gameSuggestionsFor === null && userHostedGames.length > 0 && createPortal(
            <div 
              className="fixed z-[9999] bg-slate-900 border-2 border-purple-500/50 rounded-lg shadow-2xl max-h-48 overflow-y-auto backdrop-blur-md"
              style={{ top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px`, width: `${dropdownPosition.width}px` }}
            >
              <div className="p-2 text-xs text-purple-300 border-b border-purple-500/30 bg-purple-900/30">
                Your hosted games:
              </div>
              {userHostedGames.map((game, index) => (
                <button
                  key={game.id}
                  onClick={() => insertGameMention(game.id, null)}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-purple-500/20 transition-colors border-b border-white/5 last:border-b-0 ${
                    index === selectedSuggestionIndex ? 'bg-purple-500/30' : ''
                  }`}
                >
                  <div className="text-white font-medium">{game.name}</div>
                  <div className="text-purple-300 text-xs mt-0.5">
                    {game.gameType} • {game.stake ? `${game.stake} coins` : 'Fun'}
                  </div>
                </button>
              ))}
            </div>,
            document.body
          )}
          
          {/* No Games Message for Post */}
          {showGameSuggestions && gameSuggestionsFor === null && userHostedGames.length === 0 && createPortal(
            <div 
              className="fixed z-[9999] bg-slate-900 border-2 border-purple-500/50 rounded-lg shadow-2xl backdrop-blur-md"
              style={{ top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px`, width: `${dropdownPosition.width}px` }}
            >
              <div className="px-4 py-6 text-center">
                <div className="text-purple-300 text-sm mb-2">
                  No active games hosted by you
                </div>
                <div className="text-purple-400/70 text-xs">
                  Host a game to mention it here!
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
        
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
        <div className="space-y-4 overflow-visible">
          {posts.map((post) => {
            const userVote = getUserVote(post.voters);
            const postComments = commentsByPost[post.id] || [];
            const topComments = expandedPosts.has(post.id) ? postComments : postComments.slice(0, 2);
            const hasMoreComments = postComments.length > 2;

            return (
              <div
                key={post.id}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 overflow-visible"
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
                      {(post.author === username || isAdmin) && (
                        <>
                          <span className="text-white/40">•</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePost(post.id)}
                            className="h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                    <p className="text-white whitespace-pre-wrap">{parseContent(post.content)}</p>
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
                                {(comment.author === username || isAdmin) && (
                                  <>
                                    <span className="text-white/40">•</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteComment(post.id, comment.id)}
                                      className="h-5 px-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    >
                                      <Trash2 className="h-2.5 w-2.5 mr-0.5" />
                                      <span className="text-xs">Delete</span>
                                    </Button>
                                  </>
                                )}
                              </div>
                              <p className="text-white/90 text-sm whitespace-pre-wrap">{parseContent(comment.content)}</p>
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
                <div className="ml-12 relative z-40">
                  <div className="flex gap-2">
                    <div className="flex-1 relative z-50">
                      <div ref={(ref) => { textareaContainerRefs.current[post.id] = ref; }}>
                        <Textarea
                          placeholder="Add a comment... Type @ to mention your games"
                          value={newCommentContent[post.id] || ""}
                          onChange={(e) => handleTextChange(e.target.value, post.id)}
                          onKeyDown={(e) => handleKeyDown(e, post.id)}
                          className="bg-white/5 border-white/20 text-white placeholder:text-white/50 text-sm min-h-20"
                          maxLength={300}
                        />
                      </div>
                      
                      {/* Game Suggestions Dropdown for Comment */}
                      {showGameSuggestions && gameSuggestionsFor === post.id && userHostedGames.length > 0 && createPortal(
                        <div 
                          className="fixed z-[9999] bg-slate-900 border-2 border-purple-500/50 rounded-lg shadow-2xl max-h-60 overflow-y-auto backdrop-blur-md"
                          style={{ top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px`, width: `${dropdownPosition.width}px` }}
                        >
                          <div className="p-2 text-xs text-purple-300 border-b border-purple-500/30 bg-purple-900/30">
                            Your hosted games:
                          </div>
                          {userHostedGames.map((game, index) => (
                            <button
                              key={game.id}
                              onClick={() => insertGameMention(game.id, post.id)}
                              className={`w-full text-left px-4 py-3 text-sm hover:bg-purple-500/20 transition-colors border-b border-white/5 last:border-b-0 ${
                                index === selectedSuggestionIndex ? 'bg-purple-500/30' : ''
                              }`}
                            >
                              <div className="text-white font-medium">{game.name}</div>
                              <div className="text-purple-300 text-xs mt-0.5">
                                {game.gameType} • {game.stake ? `${game.stake} coins` : 'Fun'}
                              </div>
                            </button>
                          ))}
                        </div>,
                        document.body
                      )}
                      
                      {/* No Games Message for Comment */}
                      {showGameSuggestions && gameSuggestionsFor === post.id && userHostedGames.length === 0 && createPortal(
                        <div 
                          className="fixed z-[9999] bg-slate-900 border-2 border-purple-500/50 rounded-lg shadow-2xl backdrop-blur-md"
                          style={{ top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px`, width: `${dropdownPosition.width}px` }}
                        >
                          <div className="px-4 py-6 text-center">
                            <div className="text-purple-300 text-sm mb-2">
                              No active games hosted by you
                            </div>
                            <div className="text-purple-400/70 text-xs">
                              Host a game to mention it here!
                            </div>
                          </div>
                        </div>,
                        document.body
                      )}
                    </div>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}