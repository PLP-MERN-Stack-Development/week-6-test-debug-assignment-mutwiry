import React, { useEffect, useState } from 'react';
import { apiUtils, errorHandler } from '../utils/api';

const PostList = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await apiUtils.getPosts();
        // Correctly extract posts from backend response structure
        setPosts(response.data?.data?.posts || []);
      } catch (err) {
        setError(errorHandler.getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Posts</h1>
      <div className="bg-white shadow rounded-lg p-6">
        {loading && <p className="text-gray-600">Loading posts...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && posts.length === 0 && (
          <p className="text-gray-600">No posts found.</p>
        )}
        {!loading && !error && posts.length > 0 && (
          <ul className="space-y-4">
            {posts.map((post) => (
              <li key={post._id} className="border-b pb-2">
                <h2 className="text-xl font-semibold">{post.title}</h2>
                <p className="text-gray-700">{post.content}</p>
                <p className="text-sm text-gray-500">By {post.author?.username || 'Unknown'}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PostList; 