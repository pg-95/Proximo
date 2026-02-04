import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Send, MessageSquare, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "/utils/supabase/info";

interface FeedbackProps {
  token: string;
  username: string;
}

interface Feedback {
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

export function Feedback({ token, username }: FeedbackProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/feedback`,
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
      setFeedbackList(data);
    } catch (error) {
      console.error("Error loading feedback:", error);
      toast.error("Failed to load feedback");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (subject.length > 100) {
      toast.error("Subject must be 100 characters or less");
      return;
    }

    if (message.length > 1000) {
      toast.error("Message must be 1000 characters or less");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-519349c9/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Session-Token": token,
          },
          body: JSON.stringify({ subject, message }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit feedback");
      }

      toast.success("Feedback submitted!", {
        description: "We'll review your message and get back to you soon.",
      });

      setSubject("");
      setMessage("");
      loadFeedback();
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast.error(error.message || "Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "unread":
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-yellow-400">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case "read":
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-blue-400">
            <CheckCircle2 className="h-3 w-3" />
            Read
          </span>
        );
      case "replied":
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-green-400">
            <MessageSquare className="h-3 w-3" />
            Replied
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
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

  return (
    <div className="space-y-8">
      {/* Submit Feedback Form */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <Send className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Submit Feedback</h2>
            <p className="text-sm text-purple-200">
              Share your thoughts, report issues, or request features
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-purple-200 mb-2">
              Subject <span className="text-purple-400 text-xs">({subject.length}/100)</span>
            </label>
            <Input
              id="subject"
              type="text"
              placeholder="Brief description of your feedback"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={100}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-purple-200 mb-2">
              Message <span className="text-purple-400 text-xs">({message.length}/1000)</span>
            </label>
            <Textarea
              id="message"
              placeholder="Provide details about your feedback..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              rows={5}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !subject.trim() || !message.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Feedback History */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <MessageSquare className="h-5 w-5 text-purple-300" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Your Feedback History</h2>
              <p className="text-sm text-purple-200">
                {feedbackList.length} message{feedbackList.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Button
            onClick={loadFeedback}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="border-white/20 hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-12 w-12 mx-auto text-purple-300 mb-4 animate-spin" />
            <p className="text-purple-200">Loading feedback...</p>
          </div>
        ) : feedbackList.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto text-purple-300 mb-4 opacity-50" />
            <p className="text-purple-200 mb-2">No feedback submitted yet</p>
            <p className="text-purple-300 text-sm">
              Submit your first feedback using the form above!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbackList.map((feedback) => (
              <div
                key={feedback.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">{feedback.subject}</h3>
                    <p className="text-purple-300 text-xs mt-1">
                      {formatDate(feedback.createdAt)}
                    </p>
                  </div>
                  {getStatusBadge(feedback.status)}
                </div>

                <p className="text-purple-100 text-sm mb-3 whitespace-pre-wrap">
                  {feedback.message}
                </p>

                {/* Admin Replies */}
                {feedback.replies && feedback.replies.length > 0 && (
                  <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-green-400">
                      <MessageSquare className="h-4 w-4" />
                      Admin Replies ({feedback.replies.length})
                    </div>
                    {feedback.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="bg-green-500/10 border border-green-500/20 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-green-400 text-xs font-semibold">Admin</span>
                          <span className="text-green-300 text-xs">
                            {formatDate(reply.createdAt)}
                          </span>
                        </div>
                        <p className="text-green-100 text-sm whitespace-pre-wrap">
                          {reply.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
