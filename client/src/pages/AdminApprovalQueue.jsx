import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import api from '../utils/api';

const AdminApprovalQueue = () => {
  const { user, token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectionReasons, setRejectionReasons] = useState({});

  useEffect(() => {
    const fetchPendingPosts = async () => {
      setLoading(true);
      try {
        const res = await api.get('/posts/pending/approval', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPosts(res.data.data.posts);
      } catch (err) {
        toast.error('Failed to fetch pending posts');
      } finally {
        setLoading(false);
      }
    };
    if (token && user?.role === 'admin') fetchPendingPosts();
  }, [token, user]);

  const handleApprove = async (postId) => {
    setActionLoading(postId + '-approve');
    try {
      await api.post(`/posts/${postId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Post approved!');
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to approve post');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (postId) => {
    setActionLoading(postId + '-reject');
    try {
      const reason = rejectionReasons[postId] || '';
      await api.post(`/posts/${postId}/reject`, { reason }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Post rejected!');
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to reject post');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReasonChange = (postId, value) => {
    setRejectionReasons((prev) => ({ ...prev, [postId]: value }));
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Admin Approval Queue</h1>
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-10 text-gray-500">No posts are pending approval.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow rounded-lg">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Author</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Submitted</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post._id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">{post.title}</td>
                  <td className="px-4 py-3">{post.author?.username || 'N/A'}</td>
                  <td className="px-4 py-3">{post.category?.name || 'N/A'}</td>
                  <td className="px-4 py-3">{post.submittedAt ? new Date(post.submittedAt).toLocaleDateString() : ''}</td>
                  <td className="px-4 py-3 space-x-2">
                    <button
                      onClick={() => handleApprove(post._id)}
                      disabled={actionLoading === post._id + '-approve'}
                      className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-3 rounded-lg shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === post._id + '-approve' ? 'Approving...' : 'Approve'}
                    </button>
                    <input
                      type="text"
                      placeholder="Rejection reason"
                      value={rejectionReasons[post._id] || ''}
                      onChange={e => handleReasonChange(post._id, e.target.value)}
                      className="inline-block border border-gray-300 rounded px-2 py-1 text-sm w-40 mr-2"
                    />
                    <button
                      onClick={() => handleReject(post._id)}
                      disabled={actionLoading === post._id + '-reject'}
                      className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-3 rounded-lg shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === post._id + '-reject' ? 'Rejecting...' : 'Reject'}
                    </button>
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

export default AdminApprovalQueue; 