import { cn } from '../client/cn';
import { useState, useEffect, FormEvent } from 'react';
import type { File } from 'wasp/entities';
import { useQuery, getAllFilesByUser, getDownloadFileSignedURL } from 'wasp/client/operations';
import {
  type FileWithValidType,
  type FileUploadError,
  validateFile,
  uploadFileWithProgress,
} from './fileUploading';
import { ALLOWED_FILE_TYPES } from './validation';

// Helper function to determine file type category
const getFileTypeCategory = (fileType: string): 'image' | 'video' | 'audio' | 'other' => {
  const type = fileType.toLowerCase();
  if (type.includes('image/') || type.endsWith('.jpg') || type.endsWith('.jpeg') || type.endsWith('.png') || type.endsWith('.gif') || type.endsWith('.webp')) {
    return 'image';
  }
  if (type.includes('video/') || type.endsWith('.mp4') || type.endsWith('.webm') || type.endsWith('.mov')) {
    return 'video';
  }
  if (type.includes('audio/') || type.endsWith('.mp3') || type.endsWith('.wav') || type.endsWith('.ogg')) {
    return 'audio';
  }
  return 'other';
};

// Preview component for files
const FilePreview = ({ file }: { file: File }) => {
  const fileCategory = getFileTypeCategory(file.type);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const previewQuery = useQuery(
    getDownloadFileSignedURL,
    { key: file.key },
    { enabled: false }
  );

  const loadPreview = async () => {
    if (previewUrl || isLoading) return;
    
    setIsLoading(true);
    try {
      const result = await previewQuery.refetch();
      if (result.status === 'success') {
        setPreviewUrl(result.data);
      }
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load preview on mount for media files
  useEffect(() => {
    if (fileCategory !== 'other') {
      loadPreview();
    }
  }, [file.key, fileCategory]);

  if (fileCategory === 'other') return null;

  if (!previewUrl) {
    return (
      <div className='mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
        {isLoading ? 'Loading preview...' : 'No preview available'}
      </div>
    );
  }

  switch (fileCategory) {
    case 'image':
      return (
        <div className='mt-2 max-w-xs'>
          <img
            src={previewUrl}
            alt={file.name}
            className='w-full h-auto max-h-48 object-contain rounded-md border border-gray-200 dark:border-gray-700'
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      );
    case 'video':
      return (
        <div className='mt-2 max-w-xs'>
          <video
            controls
            className='w-full h-auto max-h-48 rounded-md border border-gray-200 dark:border-gray-700'
            preload='metadata'
          >
            <source src={previewUrl} type={file.type} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    case 'audio':
      return (
        <div className='mt-2 max-w-xs'>
          <audio
            controls
            className='w-full'
            preload='metadata'
          >
            <source src={previewUrl} type={file.type} />
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    default:
      return null;
  }
};

export default function FileUploadPage() {
  const [fileKeyForS3, setFileKeyForS3] = useState<File['key']>('');
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number>(0);
  const [uploadError, setUploadError] = useState<FileUploadError | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filesPerPage] = useState<number>(10);

  const allUserFiles = useQuery(
    getAllFilesByUser,
    { page: currentPage, limit: filesPerPage },
    {
      // We disable automatic refetching because otherwise files would be refetched after `createFile` is called and the S3 URL is returned,
      // which happens before the file is actually fully uploaded. Instead, we manually (re)fetch on mount and after the upload is complete.
      enabled: false,
    }
  );
  const { isLoading: isDownloadUrlLoading, refetch: refetchDownloadUrl } = useQuery(
    getDownloadFileSignedURL,
    { key: fileKeyForS3 },
    { enabled: false }
  );

  useEffect(() => {
    allUserFiles.refetch();
  }, []);

  useEffect(() => {
    allUserFiles.refetch();
  }, [currentPage]);

  useEffect(() => {
    if (fileKeyForS3.length > 0) {
      refetchDownloadUrl()
        .then((urlQuery) => {
          switch (urlQuery.status) {
            case 'error':
              console.error('Error fetching download URL', urlQuery.error);
              alert('Error fetching download');
              return;
            case 'success':
              window.open(urlQuery.data, '_blank');
              return;
          }
        })
        .finally(() => {
          setFileKeyForS3('');
        });
    }
  }, [fileKeyForS3]);

  const handleUpload = async (e: FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault();

      const formElement = e.target;
      if (!(formElement instanceof HTMLFormElement)) {
        throw new Error('Event target is not a form element');
      }

      const formData = new FormData(formElement);
      const file = formData.get('file-upload');

      if (!file || !(file instanceof File)) {
        setUploadError({
          message: 'Please select a file to upload.',
          code: 'NO_FILE',
        });
        return;
      }

      const fileValidationError = validateFile(file);
      if (fileValidationError !== null) {
        setUploadError(fileValidationError);
        return;
      }

      await uploadFileWithProgress({ file: file as FileWithValidType, setUploadProgressPercent });
      formElement.reset();
      setCurrentPage(1); // Reset to first page after successful upload
      allUserFiles.refetch();
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError({
        message:
          error instanceof Error ? error.message : 'An unexpected error occurred while uploading the file.',
        code: 'UPLOAD_FAILED',
      });
    } finally {
      setUploadProgressPercent(0);
    }
  };

  return (
    <div className='py-10 lg:mt-10'>
      <div className='mx-auto max-w-7xl px-6 lg:px-8'>
        <div className='mx-auto max-w-4xl text-center'>
          <h2 className='mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-white'>
            My File Uploads
          </h2>
        </div>
        <p className='mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600 dark:text-white'>
          Manage all your file uploads in one place. Upload new files and download previously uploaded files.
        </p>
        <div className='my-8 border rounded-3xl border-gray-900/10 dark:border-gray-100/10'>
          <div className='space-y-10 my-10 py-8 px-4 mx-auto sm:max-w-lg'>
            <form onSubmit={handleUpload} className='flex flex-col gap-2'>
              <input
                type='file'
                id='file-upload'
                name='file-upload'
                accept={ALLOWED_FILE_TYPES.join(',')}
                className='text-gray-600'
                onChange={() => setUploadError(null)}
              />
              <button
                type='submit'
                disabled={uploadProgressPercent > 0}
                className='min-w-[7rem] relative font-medium text-gray-800/90 bg-yellow-50 shadow-md ring-1 ring-inset ring-slate-200 py-2 px-4 rounded-md hover:bg-yellow-100 duration-200 ease-in-out focus:outline-none focus:shadow-none hover:shadow-none disabled:cursor-progress'
              >
                {uploadProgressPercent > 0 ? (
                  <>
                    <span>Uploading {uploadProgressPercent}%</span>
                    <div
                      role='progressbar'
                      aria-valuenow={uploadProgressPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className='absolute bottom-0 left-0 h-1 bg-yellow-500 transition-all duration-300 ease-in-out rounded-b-md'
                      style={{ width: `${uploadProgressPercent}%` }}
                    ></div>
                  </>
                ) : (
                  'Upload'
                )}
              </button>
              {uploadError && <div className='text-red-500'>{uploadError.message}</div>}
            </form>
            <div className='border-b-2 border-gray-200 dark:border-gray-100/10'></div>
            <div className='space-y-4 col-span-full'>
              <div className='flex items-center justify-between'>
                <h2 className='text-xl font-bold'>Uploaded Files</h2>
                {allUserFiles.data && allUserFiles.data.totalCount > 0 && (
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    {allUserFiles.data.totalCount} file{allUserFiles.data.totalCount !== 1 ? 's' : ''} total
                  </p>
                )}
              </div>
              {allUserFiles.isLoading && <p>Loading...</p>}
              {allUserFiles.error && <p>Error: {allUserFiles.error.message}</p>}
              {!!allUserFiles.data && allUserFiles.data.files.length > 0 && !allUserFiles.isLoading ? (
                <>
                  <div className='space-y-3'>
                    {allUserFiles.data.files.map((file: File) => (
                      <div
                        key={file.key}
                        className={cn(
                          'flex flex-col gap-3 p-4 border border-gray-200 rounded-lg dark:border-gray-700',
                          {
                            'opacity-70': file.key === fileKeyForS3 && isDownloadUrlLoading,
                          }
                        )}
                      >
                        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
                          <div className='flex-1 min-w-0'>
                            <p className='text-sm font-medium text-gray-900 dark:text-white truncate'>{file.name}</p>
                            <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                              {file.type} • {new Date(file.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() => setFileKeyForS3(file.key)}
                            disabled={file.key === fileKeyForS3 && isDownloadUrlLoading}
                            className='min-w-[7rem] text-sm text-gray-800/90 bg-purple-50 shadow-md ring-1 ring-inset ring-slate-200 py-1 px-2 rounded-md hover:bg-purple-100 duration-200 ease-in-out focus:outline-none focus:shadow-none hover:shadow-none disabled:cursor-not-allowed'
                          >
                            {file.key === fileKeyForS3 && isDownloadUrlLoading ? 'Loading...' : 'Download'}
                          </button>
                        </div>
                        <FilePreview file={file} />
                      </div>
                    ))}
                  </div>
                  {/* Pagination Controls */}
                  {allUserFiles.data.totalPages > 1 && (
                    <div className='flex items-center justify-between pt-4'>
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={!allUserFiles.data.hasPrevPage}
                          className='px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                        >
                          Previous
                        </button>
                        <span className='text-sm text-gray-700 dark:text-gray-300'>
                          Page {allUserFiles.data.currentPage} of {allUserFiles.data.totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={!allUserFiles.data.hasNextPage}
                          className='px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                        >
                          Next
                        </button>
                      </div>
                      <div className='text-sm text-gray-600 dark:text-gray-400'>
                        Showing {(allUserFiles.data.currentPage - 1) * filesPerPage + 1} to{' '}
                        {Math.min(allUserFiles.data.currentPage * filesPerPage, allUserFiles.data.totalCount)} of{' '}
                        {allUserFiles.data.totalCount} files
                      </div>
                    </div>
                  )}
                </>
              ) : (
                !allUserFiles.isLoading && <p>No files uploaded yet :(</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
