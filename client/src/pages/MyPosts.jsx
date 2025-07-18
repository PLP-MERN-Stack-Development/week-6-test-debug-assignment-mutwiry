import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Link } from 'react-router-dom';

const statusColors = {
  draft: 'bg-gray-200 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  archived: 'bg-gray-400 text-white',
};

const MyPosts = () => {
  const { user, token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const res = await api.get('/posts/my-posts', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPosts(res.data.data.posts);
      } catch (err) {
        toast.error('Failed to fetch your posts');
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchPosts();
  }, [token]);

  const handleSubmitForApproval = async (postId) => {
    setSubmitting(postId);
    try {
      await api.post(`/posts/${postId}/submit`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Post submitted for approval!');
      setPosts((prev) => prev.map((p) => p._id === postId ? { ...p, status: 'pending', submittedForApproval: true } : p));
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to submit post');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">My Posts</h1>
      <div className="mb-6 text-right">
        <Link to="/create-post" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition">+ New Post</Link>
      </div>
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-10 text-gray-500">You have not created any posts yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow rounded-lg">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post._id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">
                    <Link to={`/posts/${post._id}`} className="text-blue-600 hover:underline">{post.title}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColors[post.status] || 'bg-gray-100 text-gray-800'}`}>{post.status}</span>
                  </td>
                  <td className="px-4 py-3">{new Date(post.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 space-x-2">
                    <Link to={`/edit-post/${post._id}`} className="inline-block text-indigo-600 hover:underline">Edit</Link>
                    {post.status === 'draft' && (
                      <button
                        onClick={() => handleSubmitForApproval(post._id)}
                        disabled={submitting === post._id}
                        className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-1 px-3 rounded-lg shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting === post._id ? 'Submitting...' : 'Submit for Approval'}
                      </button>
                    )}
                    {post.status === 'rejected' && post.rejectionReason && (
                      <span className="inline-block text-red-500 ml-2" title={post.rejectionReason}>Rejected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyPosts; 