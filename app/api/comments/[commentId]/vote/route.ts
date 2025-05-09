// /app/api/comments/[commentId]/vote/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth"

export async function POST(
  request: Request,
  { params }: { params: { commentId: string } }
) {
  try {
    const session = await auth();
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "You must be logged in to vote" },
        { status: 401 }
      );
    }

    const { commentId } = params;
    const { isUpvote } = await request.json();
    
    // Validate inputs
    if (typeof isUpvote !== "boolean") {
      return NextResponse.json(
        { error: "isUpvote parameter must be a boolean" },
        { status: 400 }
      );
    }

    // Get the current comment
    const comment = await prisma.comment.findUnique({
      where: {
        id: commentId,
      },
    });

    if (!comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    // Update the comment vote count
    const updatedComment = await prisma.comment.update({
      where: {
        id: commentId,
      },
      data: {
        ...(isUpvote 
          ? { upvotes: { increment: 1 } } 
          : { downvotes: { increment: 1 } }),
      },
    });

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error("Error voting on comment:", error);
    return NextResponse.json(
      { error: "Failed to vote on comment" },
      { status: 500 }
    );
  }
}