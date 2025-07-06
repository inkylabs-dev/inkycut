import { useState } from 'react';
import { useQuery, getPaginatedLibraries, deleteLibrary } from 'wasp/client/operations';
import { type Library, type File } from 'wasp/entities';
import { CgSpinner } from 'react-icons/cg';
import { TiDelete } from 'react-icons/ti';
import { FiEdit2, FiPlus, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Link } from 'wasp/client/router';
import { useNavigate } from 'react-router-dom';
import { cn } from '../client/cn';

type LibraryWithFile = Library & {
  manifestFile: File | null;
};

interface LibraryPageState {
  libraries: LibraryWithFile[];
  totalCount: number;
}

export default function LibraryPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery(getPaginatedLibraries, {
    skip: (currentPage - 1) * itemsPerPage,
    take: itemsPerPage,
  });

  const totalPages = data ? Math.ceil(data.totalCount / itemsPerPage) : 0;

  const handleEditLibrary = (libraryId: string) => {
    navigate(`/library/edit/${libraryId}`);
  };

  const handleDeleteLibrary = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this library?')) {
      try {
        await deleteLibrary({ id });
      } catch (error) {
        console.error('Error deleting library:', error);
      }
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
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
        <div className="text-red-500">Error loading libraries: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="py-10 lg:mt-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-white">
            My <span className="text-yellow-500">Library</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600 dark:text-white">
            Manage your creative libraries and cutscenes
          </p>
        </div>

        {/* Create Library Button */}
        <div className="mt-10 flex justify-center">
          <Link
            to="/library/add"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            <FiPlus className="mr-2" />
            Create New Library
          </Link>
        </div>

        {/* Libraries List */}
        <div className="mt-10">
          {data?.libraries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400">
                No libraries found. Create your first library to get started!
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {data?.libraries.map((library) => (
                <LibraryCard
                  key={library.id}
                  library={library}
                  onEdit={() => handleEditLibrary(library.id)}
                  onDelete={() => handleDeleteLibrary(library.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex justify-center items-center space-x-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={cn(
                "inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium",
                currentPage === 1
                  ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                  : "text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              )}
            >
              <FiChevronLeft className="mr-1" />
              Previous
            </button>

            <div className="flex space-x-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={cn(
                    "px-3 py-2 border rounded-md text-sm font-medium",
                    currentPage === page
                      ? "bg-yellow-500 text-white border-yellow-500"
                      : "text-gray-700 bg-white border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                  )}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={cn(
                "inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium",
                currentPage === totalPages
                  ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                  : "text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              )}
            >
              Next
              <FiChevronRight className="ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface LibraryCardProps {
  library: LibraryWithFile;
  onDelete: () => void;
  onEdit: () => void;
}

function LibraryCard({ library, onDelete, onEdit }: LibraryCardProps) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {library.title}
            </h3>
            <span className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
              library.type === 'cutscene' 
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
            )}>
              {library.type}
            </span>
            {library.isPublic && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Public
              </span>
            )}
          </div>
          
          {library.description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {library.description}
            </p>
          )}
          
          {library.llmNotes && (
            <div className="mt-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">LLM Notes:</span>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                {library.llmNotes}
              </p>
            </div>
          )}
          
          {library.manifestFile && (
            <div className="mt-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Manifest File:</span>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {library.manifestFile.name}
              </p>
            </div>
          )}
          
          <div className="mt-4 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            <span>Created: {formatDate(library.createdAt)}</span>
            <span>Updated: {formatDate(library.updatedAt)}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
            title="Edit library"
          >
            <FiEdit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete library"
          >
            <TiDelete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
