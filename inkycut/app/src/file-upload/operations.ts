import * as z from 'zod';
import { HttpError } from 'wasp/server';
import { type File } from 'wasp/entities';
import {
  type CreateFile,
  type GetAllFilesByUser,
  type GetDownloadFileSignedURL,
} from 'wasp/server/operations';

import { getUploadFileSignedURLFromS3, getDownloadFileSignedURLFromS3 } from './s3Utils';
import { ensureArgsSchemaOrThrowHttpError } from '../server/validation';
import { ALLOWED_FILE_TYPES } from './validation';

const createFileInputSchema = z.object({
  fileType: z.enum(ALLOWED_FILE_TYPES),
  fileName: z.string().nonempty(),
});

type CreateFileInput = z.infer<typeof createFileInputSchema>;

export const createFile: CreateFile<
  CreateFileInput,
  {
    s3UploadUrl: string;
    s3UploadFields: Record<string, string>;
  }
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { fileType, fileName } = ensureArgsSchemaOrThrowHttpError(createFileInputSchema, rawArgs);

  const { s3UploadUrl, s3UploadFields, key } = await getUploadFileSignedURLFromS3({
    fileType,
    fileName,
    userId: context.user.id,
  });

  await context.entities.File.create({
    data: {
      name: fileName,
      key,
      uploadUrl: s3UploadUrl,
      type: fileType,
      user: { connect: { id: context.user.id } },
    },
  });

  return {
    s3UploadUrl,
    s3UploadFields,
  };
};

const getAllFilesByUserInputSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
});

type GetAllFilesByUserInput = z.infer<typeof getAllFilesByUserInputSchema>;

export const getAllFilesByUser: GetAllFilesByUser<
  GetAllFilesByUserInput,
  {
    files: File[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { page, limit } = ensureArgsSchemaOrThrowHttpError(getAllFilesByUserInputSchema, rawArgs);
  const skip = (page - 1) * limit;

  const whereClause = {
    user: {
      id: context.user.id,
    },
  };

  const [files, totalCount] = await Promise.all([
    context.entities.File.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    }),
    context.entities.File.count({
      where: whereClause,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    files,
    totalCount,
    totalPages,
    currentPage: page,
    hasNextPage,
    hasPrevPage,
  };
};

const getDownloadFileSignedURLInputSchema = z.object({ key: z.string().nonempty() });

type GetDownloadFileSignedURLInput = z.infer<typeof getDownloadFileSignedURLInputSchema>;

export const getDownloadFileSignedURL: GetDownloadFileSignedURL<
  GetDownloadFileSignedURLInput,
  string
> = async (rawArgs, _context) => {
  const { key } = ensureArgsSchemaOrThrowHttpError(getDownloadFileSignedURLInputSchema, rawArgs);
  return await getDownloadFileSignedURLFromS3({ key });
};
