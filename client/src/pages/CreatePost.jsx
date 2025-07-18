import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const CreatePost = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Fetch categories from backend
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        setCategories(res.data.data.categories);
      } catch (err) {
        setError('Failed to load categories');
      }
    };
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      // Prepare tags array
      const tagsArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      
      // Generate slug from title with timestamp to ensure uniqueness
      const baseSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim('-'); // Remove leading/trailing hyphens
      
      // Add timestamp to make slug unique
      const timestamp = Date.now();
      const slug = `${baseSlug}-${timestamp}`;
      
      // Send post data to backend
      await api.post('/posts', {
        title,
        content,
        category,
        slug,
        tags: tagsArray,
        featuredImage
      });
      setSuccess('Post created successfully!');
      setTitle('');
      setContent('');
      setCategory('');
      setTags('');
      setFeaturedImage('');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Create Post</h1>
      <div className="bg-white shadow rounded-lg p-6">
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {success && <div className="text-green-600 mb-4">{success}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold mb-1">Title</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Content</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={6}
              required
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Category</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={category}
              onChange={e => setCategory(e.target.value)}
              required
            >
              <option value="">Select a category</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Tags (comma separated)</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="e.g. react, node, mongodb"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Featured Image URL</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={featuredImage}
              onChange={e => setFeaturedImage(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Post'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePost; 