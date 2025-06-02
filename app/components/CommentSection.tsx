// /components/CommentSection.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { formatDistance } from "date-fns";
import { useRouter } from "next/navigation";
import { useKeystroke } from '@/app/components/KeystrokeTrackerProvider';

interface Author {
  username: string;
  avatar: string | null;
}

interface Reply {
  id: string;
  content: string;
  author: Author;
  createdAt: Date;
  upvotes: number;
  downvotes: number;
}

interface Comment {
  id: string;
  content: string;
  author: Author;
  createdAt: Date;
  upvotes: number;
  downvotes: number;
  replies: Reply[];
}

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
}

export default function CommentSection({ postId, comments: initialComments }: CommentSectionProps) {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [replyContents, setReplyContents] = useState<Record<string, string>>({});
  const [activeReplies, setActiveReplies] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs for keystroke tracking
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Get keystroke tracking from provider
  const { 
    attachToInput, 
    getKeystrokeData, 
    getMetrics,
    clearData, 
    serverProbability,
    localAnalysis,
    debugInfo 
  } = useKeystroke();

  // Attach keystroke tracking to main comment textarea
  useEffect(() => {
    if (commentTextareaRef.current) {
      const cleanup = attachToInput(commentTextareaRef.current);
      console.log('Keystroke tracking attached to comment textarea');
      return cleanup;
    }
  }, [attachToInput]);

  // Function to attach tracking to reply textareas
  const attachToReplyTextarea = (commentId: string, element: HTMLTextAreaElement | null) => {
    if (element) {
      // Clean up previous attachment if any
      const prevElement = replyTextareaRefs.current[commentId];
      if (prevElement && (prevElement as any).__keystrokeCleanup) {
        (prevElement as any).__keystrokeCleanup();
      }

      // Store reference and attach tracking
      replyTextareaRefs.current[commentId] = element;
      const cleanup = attachToInput(element);
      (element as any).__keystrokeCleanup = cleanup;
      console.log(`Keystroke tracking attached to reply textarea for comment ${commentId}`);
    }
  };

  // Cleanup reply textarea tracking when replies are closed
  useEffect(() => {
    return () => {
      Object.values(replyTextareaRefs.current).forEach(element => {
        if (element && (element as any).__keystrokeCleanup) {
          (element as any).__keystrokeCleanup();
        }
      });
    };
  }, []);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    // Log keystroke analysis for comment submission
    console.log('=== COMMENT SUBMISSION KEYSTROKE ANALYSIS ===');
    console.log('Keystroke Data:', getKeystrokeData());
    console.log('Metrics:', getMetrics());
    console.log('Local Analysis:', localAnalysis);
    console.log('Server Probability:', serverProbability);
    console.log('Debug Info:', debugInfo);
    console.log('=============================================');

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          content: newComment,
          // Include keystroke analysis data (optional)
          keystrokeData: {
            localBotScore: localAnalysis.botScore,
            serverBotScore: Math.round(serverProbability * 100),
            totalKeys: debugInfo.totalKeys,
            metrics: getMetrics()
          }
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to post comment");
      }

      const comment = await response.json();
      setComments([comment, ...comments]);
      setNewComment("");
      
      // Clear keystroke data after successful submission
      clearData();
      console.log('Comment submitted successfully, keystroke data cleared');
      
      router.refresh();
    } catch (error) {
      console.error("Error posting comment:", error);
      alert("Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = (commentId: string) => {
    setActiveReplies({
      ...activeReplies,
      [commentId]: !activeReplies[commentId],
    });
  };

  const handleSubmitReply = async (commentId: string) => {
    const replyContent = replyContents[commentId];
    if (!replyContent?.trim() || isSubmitting) return;

    // Log keystroke analysis for reply submission
    console.log('=== REPLY SUBMISSION KEYSTROKE ANALYSIS ===');
    console.log('Reply to comment:', commentId);
    console.log('Keystroke Data:', getKeystrokeData());
    console.log('Metrics:', getMetrics());
    console.log('Local Analysis:', localAnalysis);
    console.log('Server Probability:', serverProbability);
    console.log('Debug Info:', debugInfo);
    console.log('==========================================');

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          parentId: commentId,
          content: replyContent,
          // Include keystroke analysis data (optional)
          keystrokeData: {
            localBotScore: localAnalysis.botScore,
            serverBotScore: Math.round(serverProbability * 100),
            totalKeys: debugInfo.totalKeys,
            metrics: getMetrics()
          }
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to post reply");
      }

      const reply = await response.json();
      
      // Update the comments state with the new reply
      const updatedComments = comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            replies: [...comment.replies, reply],
          };
        }
        return comment;
      });
      
      setComments(updatedComments);
      setReplyContents({
        ...replyContents,
        [commentId]: "",
      });
      setActiveReplies({
        ...activeReplies,
        [commentId]: false,
      });
      
      // Clean up reply textarea tracking
      const element = replyTextareaRefs.current[commentId];
      if (element && (element as any).__keystrokeCleanup) {
        (element as any).__keystrokeCleanup();
      }
      delete replyTextareaRefs.current[commentId];
      
      console.log('Reply submitted successfully, keystroke tracking cleaned up');
      router.refresh();
    } catch (error) {
      console.error("Error posting reply:", error);
      alert("Failed to post reply. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (commentId: string, isUpvote: boolean) => {
    try {
      const response = await fetch(`/api/comments/${commentId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isUpvote,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to vote");
      }

      const updatedComment = await response.json();
      
      // Update comments state based on whether it's a top-level comment or a reply
      setComments(
        comments.map(comment => {
          // If this is the comment we voted on
          if (comment.id === commentId) {
            return {
              ...comment,
              upvotes: updatedComment.upvotes,
              downvotes: updatedComment.downvotes,
            };
          }
          
          // Check if the vote was for a reply
          const updatedReplies = comment.replies.map(reply => {
            if (reply.id === commentId) {
              return {
                ...reply,
                upvotes: updatedComment.upvotes,
                downvotes: updatedComment.downvotes,
              };
            }
            return reply;
          });
          
          if (JSON.stringify(updatedReplies) !== JSON.stringify(comment.replies)) {
            return {
              ...comment,
              replies: updatedReplies,
            };
          }
          
          return comment;
        })
      );
    } catch (error) {
      console.error("Error voting:", error);
      alert("Failed to register vote. Please try again.");
    }
  };

  // Get current bot score for display
  const getCurrentBotScore = () => {
    if (serverProbability > 0) return Math.round(serverProbability * 100);
    if (localAnalysis.botScore > 0) return localAnalysis.botScore;
    return 0;
  };

  const currentBotScore = getCurrentBotScore();

  return (
    <div className="space-y-6">
      {/* Keystroke Analysis Display (only show if there's typing activity) */}
      {debugInfo.totalKeys > 3 && (
        <div className={`p-3 rounded-lg border ${
          currentBotScore > 70 ? 'bg-red-50 border-red-200' : 
          currentBotScore > 40 ? 'bg-orange-50 border-orange-200' : 
          'bg-green-50 border-green-200'
        }`}>
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center space-x-2">
              <span className="font-medium">Typing Analysis:</span>
              <span className={`font-bold ${
                currentBotScore > 70 ? 'text-red-600' : 
                currentBotScore > 40 ? 'text-orange-600' : 
                'text-green-600'
              }`}>
                {currentBotScore}% Bot Score
              </span>
              {localAnalysis.isAnalyzing && (
                <span className="text-blue-600">⚡</span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {debugInfo.totalKeys} keystrokes • {Math.floor(debugInfo.totalKeys / 13)} server calls
            </div>
          </div>
        </div>
      )}

      {/* Comment form */}
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Leave a comment</h3>
        <form className="space-y-4" onSubmit={handleSubmitComment}>
          <textarea
            ref={commentTextareaRef}
            className="w-full border rounded-md p-3 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Write your comment here..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            required
          ></textarea>
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {debugInfo.totalKeys > 0 && (
                <span>
                  Keystroke analysis active • Next server call: {13 - (debugInfo.totalKeys % 13)} keys
                </span>
              )}
            </div>
            <button
              type="submit"
              className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${
                isSubmitting ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>
      </div>

      {/* Comments list */}
      <div className="space-y-6">
        {comments.map(comment => (
          <div key={comment.id} className="border-b pb-6">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden mr-3">
                {comment.author.avatar ? (
                  <img src={comment.author.avatar} alt={comment.author.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white text-xs">
                    {comment.author.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium">{comment.author.username}</p>
                <p className="text-xs text-gray-500">
                  {formatDistance(new Date(comment.createdAt), new Date(), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="ml-11">
              <p>{comment.content}</p>
              <div className="mt-2 flex items-center space-x-4 text-sm">
                <button 
                  className="text-gray-500 hover:text-blue-600"
                  onClick={() => handleReply(comment.id)}
                >
                  Reply
                </button>
                <div className="flex items-center space-x-1">
                  <button 
                    className="text-gray-500 hover:text-blue-600"
                    onClick={() => handleVote(comment.id, true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <span>{comment.upvotes}</span>
                  <button 
                    className="text-gray-500 hover:text-red-600"
                    onClick={() => handleVote(comment.id, false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <span>{comment.downvotes}</span>
                </div>
              </div>
              
              {/* Reply form */}
              {activeReplies[comment.id] && (
                <div className="mt-3 pl-4">
                  <textarea
                    ref={(el) => attachToReplyTextarea(comment.id, el)}
                    className="w-full border rounded-md p-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Write your reply..."
                    value={replyContents[comment.id] || ""}
                    onChange={(e) => 
                      setReplyContents({
                        ...replyContents,
                        [comment.id]: e.target.value,
                      })
                    }
                  ></textarea>
                  <div className="mt-2 flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      {debugInfo.totalKeys > 0 && (
                        <span>Keystroke tracking active</span>
                      )}
                    </div>
                    <button
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Posting..." : "Reply"}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Nested replies */}
              {comment.replies.length > 0 && (
                <div className="mt-4 space-y-4 pl-4 border-l border-gray-200">
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="mt-2">
                      <div className="flex items-center mb-1">
                        <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden mr-2">
                          {reply.author.avatar ? (
                            <img src={reply.author.avatar} alt={reply.author.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white text-xs">
                              {reply.author.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{reply.author.username}</p>
                          <p className="text-xs text-gray-500">
                            {formatDistance(new Date(reply.createdAt), new Date(), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="ml-8">
                        <p className="text-sm">{reply.content}</p>
                        <div className="mt-1 flex items-center space-x-2 text-xs">
                          <div className="flex items-center space-x-1">
                            <button 
                              className="text-gray-500 hover:text-blue-600"
                              onClick={() => handleVote(reply.id, true)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <span>{reply.upvotes}</span>
                            <button 
                              className="text-gray-500 hover:text-red-600"
                              onClick={() => handleVote(reply.id, false)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            <span>{reply.downvotes}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}