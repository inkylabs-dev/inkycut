import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, getLibraryById, updateLibrary } from 'wasp/client/operations';
import { type Library, type File, type Page } from 'wasp/entities';
import { Link } from 'wasp/client/router';
import { FiArrowLeft } from 'react-icons/fi';
import { CgSpinner } from 'react-icons/cg';
import PageManager from './PageManager';

type LibraryWithFile = Library & {
  manifestFile: File | null;
  pages: (Page & { videoFile: File | null })[];
};

export default function EditLibraryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    llmNotes: '',
    type: 'cutscene',
    isPublic: false,
  });
  const [pages, setPages] = useState<(Page & { videoFile: File | null })[]>([]);

  const { data: library, isLoading, error } = useQuery(getLibraryById, { id: id! });

  // Update form data when library is loaded
  useEffect(() => {
    if (library) {
      setFormData({
        title: library.title || '',
        description: library.description || '',
        llmNotes: library.llmNotes || '',
        type: library.type || 'cutscene',
        isPublic: library.isPublic || false,
      });
      setPages(library.pages || []);
    }
  }, [library]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsSubmitting(true);

    try {
      await updateLibrary({ id, ...formData });
      // Redirect to library page after successful update
      navigate('/library');
    } catch (error) {
      console.error('Error updating library:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <CgSpinner className="animate-spin text-4xl text-yellow-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">Error loading library: {error.message}</div>
      </div>
    );
  }

  if (!library) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500">Library not found</div>
      </div>
    );
  }

  return (
    <div className="py-10 lg:mt-10">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/library"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FiArrowLeft className="mr-1" />
            Back to Library
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Edit Library
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Update your library details
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 sm:rounded-xl">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter library title"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter library description"
              />
            </div>

            {/* LLM Notes */}
            <div>
              <label htmlFor="llmNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                LLM Notes
              </label>
              <textarea
                id="llmNotes"
                name="llmNotes"
                rows={4}
                value={formData.llmNotes}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter notes for LLM processing"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                These notes will help the AI understand the context and purpose of your library
              </p>
            </div>

            {/* Type and Public settings */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="cutscene">Cutscene</option>
                  {/* <option value="animation">Animation</option> */}
                  {/* <option value="storyboard">Storyboard</option> */}
                  {/* <option value="other">Other</option> */}
                </select>
              </div>

              <div className="flex items-center justify-center">
                <div className="flex items-center">
                  <input
                    id="isPublic"
                    name="isPublic"
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={handleChange}
                    className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Make this library public
                  </label>
                </div>
              </div>
            </div>

            {/* Submit buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Link
                to="/library"
                className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !formData.title}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Updating...' : 'Update Library'}
              </button>
            </div>
          </form>
        </div>

        {/* Page Manager for Cutscene Libraries */}
        {formData.type === 'cutscene' && library && (
          <div className="mt-8 bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 sm:rounded-xl">
            <div className="p-6">
              <PageManager
                libraryId={library.id}
                pages={pages}
                onPagesChange={setPages}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
