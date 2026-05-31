'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Newspaper,
  X,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  editionCount: number;
  isActive: boolean;
}

export default function EditionCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const fetchCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
      } else {
        setError(data.error || 'Failed to fetch categories');
      }
    } catch (err) {
      setError('Failed to load categories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }
    setError('');
    setSuccess('');
    try {
      if (editingCategory) {
        const response = await fetch(`/api/categories/${editingCategory._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name, description: formData.description }),
        });
        const data = await response.json();
        if (data.success) {
          setCategories(prev => prev.map(cat => 
            cat._id === editingCategory._id 
              ? { ...cat, name: formData.name, description: formData.description }
              : cat
          ));
          setSuccess('Category updated successfully');
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError(data.error || 'Failed to update category');
          return;
        }
      } else {
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name, description: formData.description }),
        });
        const data = await response.json();
        if (data.success) {
          setCategories(prev => [...prev, data.category]);
          setSuccess('Category created successfully');
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError(data.error || 'Failed to create category');
          return;
        }
      }
      closeModal();
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    }
  };

  const openModal = (category?: Category) => {
    setError('');
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, description: category.description });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
  };

  const toggleActive = async (category: Category) => {
    setError('');
    const newActiveState = !category.isActive;
    try {
      const response = await fetch(`/api/categories/${category._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newActiveState }),
      });
      const data = await response.json();
      if (data.success) {
        setCategories(prev => prev.map(cat => 
          cat._id === category._id ? { ...cat, isActive: newActiveState } : cat
        ));
      } else {
        setError(data.error || 'Failed to update status');
      }
    } catch (err) {
      setError('Failed to update status');
      console.error(err);
    }
  };

  const deleteCategory = async (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      setError('');
      try {
        const response = await fetch(`/api/categories/${id}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (data.success) {
          setCategories(prev => prev.filter(cat => cat._id !== id));
          setSuccess('Category deleted successfully');
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError(data.error || 'Failed to delete category');
        }
      } catch (err) {
        setError('Failed to delete category');
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Edition Categories</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your ePaper categories</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-[#3b5bdb] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#364fc7] transition-colors shadow-lg shadow-[#3b5bdb]/20"
        >
          <Plus size={18} />
          Add Category
        </button>
      </div>

      {/* Error / Success Banners */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto hover:opacity-80">
            <X size={18} />
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-600">
          <Check size={20} />
          <span>{success}</span>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 size={36} className="animate-spin text-[#3b5bdb]" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Newspaper size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No categories found</p>
          <button
            onClick={() => openModal()}
            className="mt-4 inline-flex items-center gap-2 bg-[#3b5bdb] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#364fc7] transition-colors shadow-md"
          >
            <Plus size={16} />
            Create First Category
          </button>
        </div>
      ) : (
        /* Categories Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div 
              key={category._id}
              className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-all ${
                category.isActive ? 'border-gray-100' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-[#e8edfc] rounded-xl flex items-center justify-center">
                  <Newspaper size={24} className="text-[#3b5bdb]" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openModal(category)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit size={16} className="text-gray-500" />
                  </button>
                  <button
                    onClick={() => deleteCategory(category._id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-gray-800 text-lg">{category.name}</h3>
              <p className="text-gray-500 text-sm mt-1 mb-4">{category.description || 'No description provided.'}</p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                  {(category.editionCount || 0).toLocaleString()} editions
                </span>
                <button
                  onClick={() => toggleActive(category)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    category.isActive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {category.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-gray-800">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button 
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter category name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Enter category description"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb] resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#3b5bdb] text-white font-semibold rounded-xl hover:bg-[#364fc7] transition-colors"
              >
                <Check size={18} />
                {editingCategory ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
