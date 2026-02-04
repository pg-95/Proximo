import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Badge } from "@/app/components/ui/badge";
import { RefreshCw, Mail, Clock, CheckCircle2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "/utils/supabase/info";

interface AdminInboxProps {
  token: string;
}

interface FeedbackItem {
  id: string;
  username: string;
  subject: string;
  message: string;
  createdAt: string;
  status: "unread" | "read" | "replied";
  replies: Array<{
    id: string;
    message: string;
    createdAt: string;
  }>;
}

export function AdminInbox({ token }: AdminInboxProps) {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [isReplying, setIsReplying] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/admin/feedback`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load feedback");
      }

      const data = await response.json();
      setFeedback(data);
    } catch (error) {
      console.error("Error loading feedback:", error);
      toast.error("Failed to load feedback");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReply = async (feedbackId: string) => {
    const reply = replyText[feedbackId]?.trim();
    
    if (!reply) {
      toast.error("Please enter a reply");
      return;
    }

    if (reply.length > 1000) {
      toast.error("Reply must be 1000 characters or less");
      return;
    }

    setIsReplying({ ...isReplying, [feedbackId]: true });
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/admin/feedback/${feedbackId}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
          body: JSON.stringify({ reply }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send reply");
      }

      toast.success("Reply sent!", {
        description: "The user will see your reply in their feedback tab",
      });

      // Clear reply text
      setReplyText({ ...replyText, [feedbackId]: "" });
      
      // Reload feedback
      loadFeedback();
    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast.error(error.message || "Failed to send reply");
    } finally {
      setIsReplying({ ...isReplying, [feedbackId]: false });
    }
  };

  const handleMarkAsRead = async (feedbackId: string) => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/admin/feedback/${feedbackId}/read`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
        }
      );

      loadFeedback();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "unread":
        return (
          <Badge variant="outline" className="border-yellow-400/30 text-yellow-300 bg-yellow-500/10">
            <Clock className="h-3 w-3 mr-1" />
            Unread
          </Badge>
        );
      case "read":
        return (
          <Badge variant="outline" className="border-blue-400/30 text-blue-300 bg-blue-500/10">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Read
          </Badge>
        );
      case "replied":
        return (
          <Badge variant="outline" className="border-green-400/30 text-green-300 bg-green-500/10">
            <MessageSquare className="h-3 w-3 mr-1" />
            Replied
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "Just now";
  };

  const unreadCount = feedback.filter(f => f.status === "unread").length;
  const repliedCount = feedback.filter(f => f.status === "replied").length;

  return (
    <>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-200 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Total Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{feedback.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-200 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Unread
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-300">{unreadCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-200 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Replied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-300">{repliedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback List */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">User Feedback</CardTitle>
              <CardDescription className="text-purple-200">
                View and respond to user feedback submissions
              </CardDescription>
            </div>
            <Button
              onClick={loadFeedback}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="border-white/20 hover:bg-white/10"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && feedback.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="h-12 w-12 mx-auto text-purple-300 mb-4 animate-spin" />
              <p className="text-purple-200">Loading feedback...</p>
            </div>
          ) : feedback.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 mx-auto text-purple-300 mb-4 opacity-50" />
              <p className="text-purple-200 mb-2">No feedback received yet</p>
              <p className="text-purple-300 text-sm">
                User feedback will appear here when submitted
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedback.map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-lg transition-colors ${
                    item.status === "unread"
                      ? "bg-yellow-500/10 border-yellow-400/30"
                      : "bg-white/5 border-white/10"
                  } ${
                    expandedId === item.id ? "ring-2 ring-purple-500/50" : ""
                  }`}
                >
                  {/* Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => {
                      setExpandedId(expandedId === item.id ? null : item.id);
                      if (item.status === "unread") {
                        handleMarkAsRead(item.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                            {item.username.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-semibold">{item.username}</span>
                            <span className="text-purple-300 text-xs">•</span>
                            <span className="text-purple-300 text-xs">
                              {formatRelativeTime(item.createdAt)}
                            </span>
                          </div>
                          <h4 className="text-white font-medium truncate mt-1">{item.subject}</h4>
                        </div>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>

                    {expandedId !== item.id && (
                      <p className="text-purple-200 text-sm line-clamp-2 mt-2">
                        {item.message}
                      </p>
                    )}
                  </div>

                  {/* Expanded Content */}
                  {expandedId === item.id && (
                    <div className="border-t border-white/10 p-4 space-y-4">
                      {/* Full Message */}
                      <div>
                        <div className="text-xs text-purple-400 mb-2">Message:</div>
                        <p className="text-white text-sm whitespace-pre-wrap bg-white/5 p-3 rounded-lg">
                          {item.message}
                        </p>
                        <div className="text-xs text-purple-400 mt-2">
                          Sent: {formatDate(item.createdAt)}
                        </div>
                      </div>

                      {/* Previous Replies */}
                      {item.replies && item.replies.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs text-green-400 font-semibold">
                            Your Replies ({item.replies.length}):
                          </div>
                          {item.replies.map((reply) => (
                            <div
                              key={reply.id}
                              className="bg-green-500/10 border border-green-500/20 rounded-lg p-3"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-green-400 text-xs font-semibold">Admin</span>
                                <span className="text-green-300 text-xs">
                                  {formatRelativeTime(reply.createdAt)}
                                </span>
                              </div>
                              <p className="text-green-100 text-sm whitespace-pre-wrap">
                                {reply.message}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Form */}
                      <div className="space-y-3">
                        <div className="text-xs text-purple-400 font-semibold">Send Reply:</div>
                        <Textarea
                          placeholder="Type your reply here..."
                          value={replyText[item.id] || ""}
                          onChange={(e) =>
                            setReplyText({ ...replyText, [item.id]: e.target.value })
                          }
                          maxLength={1000}
                          rows={4}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50 resize-none"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-purple-400">
                            {(replyText[item.id] || "").length}/1000
                          </span>
                          <Button
                            onClick={() => handleReply(item.id)}
                            disabled={
                              !replyText[item.id]?.trim() || isReplying[item.id]
                            }
                            size="sm"
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                          >
                            {isReplying[item.id] ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Send Reply
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
