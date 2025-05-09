// types/prisma.ts
// Type definitions for Prisma query results

export interface Author {
  id: string;
  username: string;
  avatar: string | null;
}

export interface TopicBasic {
  id: string;
  name: string;
  slug: string;
}

export interface PostWithAuthor {
  id: string;
  title: string;
  content: string;
  upvotes: number;
  downvotes: number;
  views: number;
  createdAt: Date | string;
  authorId: string;
  topicId: string;
  tags?: string[];
  author: Author;
  topic: TopicBasic;
  _count: {
    comments: number;
  };
}

export interface TopicWithPostCounts {
  id: string;
  name: string;
  slug: string;
  _count: {
    posts: number;
  };
  posts: {
    author: {
      id: string;
    }
  }[];
}