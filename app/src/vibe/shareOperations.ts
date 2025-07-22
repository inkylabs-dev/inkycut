import type { User } from 'wasp/entities';
import { HttpError } from 'wasp/server';
import * as z from 'zod';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { ensureArgsSchemaOrThrowHttpError } from '../server/validation';

// S3 client setup
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_S3_IAM_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_S3_IAM_SECRET_KEY!,
  },
});

// Share project schema for input validation
const shareProjectSchema = z.object({
  encryptedData: z.string().nonempty(),
  projectName: z.string().optional(),
});

type ShareProjectInput = z.infer<typeof shareProjectSchema>;

// Get shared project schema
const getSharedProjectSchema = z.object({
  shareId: z.string().nonempty(),
});

type GetSharedProjectInput = z.infer<typeof getSharedProjectSchema>;

/**
 * Share a project by uploading encrypted data to S3 and storing metadata
 *
 * @param args The input data including encrypted project data
 * @param context The operation context containing user authentication data and entities
 * @returns Share ID for the created shared project
 * @throws HttpError if upload fails or user is not authenticated
 */
export const shareProject = async (
  rawArgs: any,
  context: { user?: User; entities: any }
) => {
  // Note: We don't require authentication for sharing as projects are encrypted client-side
  // However, we can optionally track the user if authenticated for analytics
  
  const { encryptedData, projectName } = ensureArgsSchemaOrThrowHttpError(
    shareProjectSchema,
    rawArgs
  );

  try {
    console.log('Sharing project:', projectName || 'Untitled');

    // Generate unique share ID and S3 key
    const shareId = randomUUID();
    const s3Key = `shared-projects/${shareId}.json`;

    // Upload encrypted data to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_FILES_BUCKET!,
      Key: s3Key,
      Body: encryptedData,
      ContentType: 'application/json',
      Metadata: {
        projectName: projectName || 'Untitled Project',
        createdAt: new Date().toISOString(),
        userId: context.user?.id || 'anonymous'
      },
    });

    await s3Client.send(uploadCommand);

    // Store share metadata in database (only S3 key, data stored in S3)
    await context.entities.SharedProject.create({
      data: {
        id: shareId,
        s3Key: s3Key,
      },
    });

    return {
      shareId,
      message: 'Project shared successfully',
    };

  } catch (error: unknown) {
    console.error('Error in shareProject:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new HttpError(500, `Failed to share project: ${errorMessage}`);
  }
};

/**
 * Get a shared project by share ID
 *
 * @param args The input data including share ID
 * @param context The operation context containing entities
 * @returns Encrypted project data
 * @throws HttpError if project not found
 */
export const getSharedProject = async (
  rawArgs: any,
  context: { entities: any }
) => {
  const { shareId } = ensureArgsSchemaOrThrowHttpError(
    getSharedProjectSchema,
    rawArgs
  );

  try {
    console.log('Getting shared project:', shareId);

    // Find shared project in database to get S3 key
    const sharedProject = await context.entities.SharedProject.findUnique({
      where: { id: shareId },
    });

    if (!sharedProject) {
      throw new HttpError(404, 'Shared project not found');
    }

    // Fetch encrypted data from S3
    const getCommand = new GetObjectCommand({
      Bucket: process.env.AWS_S3_FILES_BUCKET!,
      Key: sharedProject.s3Key,
    });

    const s3Response = await s3Client.send(getCommand);
    
    if (!s3Response.Body) {
      throw new HttpError(404, 'Project data not found in storage');
    }

    // Convert S3 response body to string
    const encryptedData = await s3Response.Body.transformToString();

    return {
      encryptedData,
      createdAt: sharedProject.createdAt,
    };

  } catch (error: unknown) {
    console.error('Error in getSharedProject:', error);
    
    if (error instanceof HttpError) {
      throw error;
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new HttpError(500, `Failed to get shared project: ${errorMessage}`);
  }
};