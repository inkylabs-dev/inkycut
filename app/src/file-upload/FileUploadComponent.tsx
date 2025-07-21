import { cn } from '../client/cn';
import { useState, FormEvent } from 'react';
import {
  type FileWithValidType,
  type FileUploadError,
  validateFile,
  uploadFileWithProgress,
} from './fileUploading';
import { ALLOWED_FILE_TYPES } from './validation';

interface FileUploadComponentProps {
  onUploadComplete?: (uploadedFile: any) => void;
  onUploadError?: (error: FileUploadError) => void;
  acceptedFileTypes?: readonly string[];
  buttonText?: string;
  className?: string;
  disabled?: boolean;
}

export default function FileUploadComponent({
  onUploadComplete,
  onUploadError,
  acceptedFileTypes = ALLOWED_FILE_TYPES,
  buttonText = 'Upload',
  className = '',
  disabled = false,
}: FileUploadComponentProps) {
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number>(0);
  const [uploadError, setUploadError] = useState<FileUploadError | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = async (e: FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault();
      setUploadError(null);

      const formElement = e.target;
      if (!(formElement instanceof HTMLFormElement)) {
        throw new Error('Event target is not a form element');
      }

      const formData = new FormData(formElement);
      const file = formData.get('file-upload');

      if (!file || !(file instanceof File)) {
        const error = {
          message: 'Please select a file to upload.',
          code: 'NO_FILE' as const,
        };
        setUploadError(error);
        if (onUploadError) onUploadError(error);
        return;
      }

      const fileValidationError = validateFile(file);
      if (fileValidationError !== null) {
        setUploadError(fileValidationError);
        if (onUploadError) onUploadError(fileValidationError);
        return;
      }

      const result = await uploadFileWithProgress({ 
        file: file as FileWithValidType, 
        setUploadProgressPercent 
      });
      
      formElement.reset();
      setSelectedFile(null);
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      const uploadError = {
        message:
          error instanceof Error ? error.message : 'An unexpected error occurred while uploading the file.',
        code: 'UPLOAD_FAILED' as const,
      };
      setUploadError(uploadError);
      if (onUploadError) onUploadError(uploadError);
    } finally {
      setUploadProgressPercent(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadError(null);
  };

  return (
    <form onSubmit={handleUpload} className={cn('flex flex-col gap-2', className)}>
      <input
        type='file'
        id='file-upload'
        name='file-upload'
        accept={acceptedFileTypes.join(',')}
        className='text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'
        onChange={handleFileChange}
        disabled={disabled || uploadProgressPercent > 0}
      />
      {selectedFile && (
        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded border">
          Selected: {selectedFile.name}
        </div>
      )}
      <button
        type='submit'
        disabled={disabled || uploadProgressPercent > 0 || !selectedFile}
        className={cn(
          'min-w-[7rem] relative font-medium py-2 px-4 rounded-md duration-200 ease-in-out focus:outline-none',
          selectedFile && uploadProgressPercent === 0
            ? 'text-white bg-blue-600 hover:bg-blue-700 shadow-md'
            : 'text-gray-500 bg-gray-100 cursor-not-allowed',
          uploadProgressPercent > 0 && 'cursor-progress opacity-75'
        )}
      >
        {uploadProgressPercent > 0 ? (
          <>
            <span>Uploading {uploadProgressPercent}%</span>
            <div
              role='progressbar'
              aria-valuenow={uploadProgressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className='absolute bottom-0 left-0 h-1 bg-blue-300 transition-all duration-300 ease-in-out rounded-b-md'
              style={{ width: `${uploadProgressPercent}%` }}
            ></div>
          </>
        ) : selectedFile ? (
          buttonText
        ) : (
          'Select a file first'
        )}
      </button>
      {uploadError && <div className='text-red-500 text-sm'>{uploadError.message}</div>}
    </form>
  );
}
