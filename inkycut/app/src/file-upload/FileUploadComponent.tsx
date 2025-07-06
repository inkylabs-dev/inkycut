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

  return (
    <form onSubmit={handleUpload} className={cn('flex flex-col gap-2', className)}>
      <input
        type='file'
        id='file-upload'
        name='file-upload'
        accept={acceptedFileTypes.join(',')}
        className='text-gray-600 dark:text-gray-400'
        onChange={() => setUploadError(null)}
        disabled={disabled || uploadProgressPercent > 0}
      />
      <button
        type='submit'
        disabled={disabled || uploadProgressPercent > 0}
        className='min-w-[7rem] relative font-medium text-gray-800/90 bg-yellow-50 shadow-md ring-1 ring-inset ring-slate-200 py-2 px-4 rounded-md hover:bg-yellow-100 duration-200 ease-in-out focus:outline-none focus:shadow-none hover:shadow-none disabled:cursor-progress disabled:opacity-50'
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
          buttonText
        )}
      </button>
      {uploadError && <div className='text-red-500 text-sm'>{uploadError.message}</div>}
    </form>
  );
}
