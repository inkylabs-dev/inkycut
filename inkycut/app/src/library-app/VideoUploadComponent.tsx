import { useState } from 'react';
import { FiUpload, FiVideo } from 'react-icons/fi';
import { CgSpinner } from 'react-icons/cg';
import { uploadPageVideo } from 'wasp/client/operations';
import { type FileUploadError, validateFile } from '../file-upload/fileUploading';
import axios from 'axios';

interface VideoUploadComponentProps {
  pageId: string;
  onVideoUploaded: (uploadedFile: any) => void;
  disabled?: boolean;
  className?: string;
}

const VIDEO_FILE_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;

function getFileUploadFormData(file: File, s3UploadFields: Record<string, string>) {
  const formData = new FormData();
  Object.entries(s3UploadFields).forEach(([key, value]) => {
    formData.append(key, value);
  });
  formData.append('file', file);
  return formData;
}

export default function VideoUploadComponent({
  pageId,
  onVideoUploaded,
  disabled = false,
  className = '',
}: VideoUploadComponentProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!VIDEO_FILE_TYPES.includes(file.type as any)) {
      setUploadError('Please select a valid video file (MP4, WebM, or QuickTime)');
      return;
    }

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError.message);
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      // First, call the uploadPageVideo operation to get S3 upload URL and associate with page
      const uploadData = await uploadPageVideo({
        pageId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });

      // Upload file to S3
      const formData = getFileUploadFormData(file, uploadData.s3UploadFields);
      await axios.post(uploadData.uploadUrl, formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentage = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setUploadProgress(percentage);
          }
        },
      });

      // Call the callback with the uploaded page data
      onVideoUploaded(uploadData.page);
      
      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading video:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload video');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
        <FiVideo className="h-4 w-4" />
        <span>Upload Video for Page</span>
      </div>
      
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 transition-colors hover:border-gray-400 dark:hover:border-gray-500">
        <div className="text-center space-y-3">
          {isUploading ? (
            <div className="flex items-center justify-center space-x-2">
              <CgSpinner className="h-5 w-5 animate-spin text-yellow-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Uploading video... {uploadProgress}%
              </span>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <FiUpload className="h-8 w-8 text-gray-400" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload a video file for this page
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Supported formats: MP4, WebM, QuickTime
                </p>
              </div>
              
              <div className="max-w-xs mx-auto">
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleFileSelect}
                  disabled={disabled}
                  className="hidden"
                  id={`video-upload-${pageId}`}
                />
                <label
                  htmlFor={`video-upload-${pageId}`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiVideo className="mr-2 h-4 w-4" />
                  Choose Video
                </label>
              </div>
            </>
          )}
          
          {uploadError && (
            <div className="text-red-500 text-sm mt-2">
              {uploadError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
