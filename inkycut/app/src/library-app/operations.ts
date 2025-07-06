import { type User, type Library, type File, type Page } from 'wasp/entities';
import { type GetPaginatedLibraries, type GetLibraryById, type CreateLibrary, type UpdateLibrary, type DeleteLibrary } from 'wasp/server/operations';
import { HttpError } from 'wasp/server';
import crypto from 'crypto';

type LibraryWithFile = Library & {
  manifestFile: File | null;
  user: User;
  pages: (Page & { videoFile: File | null })[];
};

export const getPaginatedLibraries: GetPaginatedLibraries<
  { skip: number; take: number },
  { libraries: LibraryWithFile[]; totalCount: number }
> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in to view libraries');
  }

  const { skip = 0, take = 10 } = args;

  const libraries = await context.entities.Library.findMany({
    skip,
    take,
    where: {
      userId: context.user.id,
    },
    include: {
      manifestFile: true,
      user: true,
      pages: {
        include: {
          videoFile: true,
        },
        orderBy: {
          orderIndex: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const totalCount = await context.entities.Library.count({
    where: {
      userId: context.user.id,
    },
  });

  return {
    libraries,
    totalCount,
  };
};

export const getLibraryById: GetLibraryById<{ id: string }, LibraryWithFile> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in to view a library');
  }

  const { id } = args;

  const library = await context.entities.Library.findUnique({
    where: { id },
    include: {
      manifestFile: true,
      user: true,
      pages: {
        include: {
          videoFile: true,
        },
        orderBy: {
          orderIndex: 'asc',
        },
      },
    },
  });

  if (!library) {
    throw new HttpError(404, 'Library not found');
  }

  if (library.userId !== context.user.id) {
    throw new HttpError(403, 'You do not have permission to view this library');
  }

  return library;
};

export const createLibrary: CreateLibrary<
  { title: string; description?: string; llmNotes?: string; type?: string; isPublic?: boolean; manifestFileId?: string },
  Library
> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in to create a library');
  }

  const { title, description, llmNotes, type = 'cutscene', isPublic = false, manifestFileId } = args;

  // Validate that the manifest file belongs to the user if provided
  if (manifestFileId) {
    const file = await context.entities.File.findUnique({
      where: { id: manifestFileId },
    });

    if (!file || file.userId !== context.user.id) {
      throw new HttpError(403, 'You do not have permission to use this file');
    }
  }

  const library = await context.entities.Library.create({
    data: {
      title,
      description,
      llmNotes,
      type,
      isPublic,
      userId: context.user.id,
      manifestFileId,
    },
  });

  return library;
};

export const updateLibrary: UpdateLibrary<
  { id: string; title?: string; description?: string; llmNotes?: string; type?: string; isPublic?: boolean; manifestFileId?: string },
  Library
> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in to update a library');
  }

  const { id, title, description, llmNotes, type, isPublic, manifestFileId } = args;

  // Check if the library belongs to the user
  const existingLibrary = await context.entities.Library.findUnique({
    where: { id },
  });

  if (!existingLibrary || existingLibrary.userId !== context.user.id) {
    throw new HttpError(403, 'You do not have permission to update this library');
  }

  // Validate that the manifest file belongs to the user if provided
  if (manifestFileId) {
    const file = await context.entities.File.findUnique({
      where: { id: manifestFileId },
    });

    if (!file || file.userId !== context.user.id) {
      throw new HttpError(403, 'You do not have permission to use this file');
    }
  }

  const library = await context.entities.Library.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(llmNotes !== undefined && { llmNotes }),
      ...(type !== undefined && { type }),
      ...(isPublic !== undefined && { isPublic }),
      ...(manifestFileId !== undefined && { manifestFileId }),
    },
  });

  return library;
};

export const deleteLibrary: DeleteLibrary<{ id: string }, Library> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in to delete a library');
  }

  const { id } = args;

  // Check if the library belongs to the user
  const existingLibrary = await context.entities.Library.findUnique({
    where: { id },
  });

  if (!existingLibrary || existingLibrary.userId !== context.user.id) {
    throw new HttpError(403, 'You do not have permission to delete this library');
  }

  const library = await context.entities.Library.delete({
    where: { id },
  });

  return library;
};

// Page operations
export const createPage = async (args: { 
  libraryId: string; 
  title?: string; 
  llmNotes?: string; 
  insertIndex?: number;
}, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in to create a page');
  }

  const { libraryId, title, llmNotes, insertIndex } = args;

  // Check if the library belongs to the user
  const library = await context.entities.Library.findUnique({
    where: { id: libraryId },
    include: { pages: true },
  });

  if (!library || library.userId !== context.user.id) {
    throw new HttpError(403, 'You do not have permission to add pages to this library');
  }

  // Calculate the order index
  let orderIndex: number;
  if (insertIndex !== undefined) {
    orderIndex = insertIndex;
    // Update existing pages that come after this index
    await context.entities.Page.updateMany({
      where: {
        libraryId,
        orderIndex: { gte: insertIndex },
      },
      data: {
        orderIndex: { increment: 1 },
      },
    });
  } else {
    // Add at the end
    const maxOrder = await context.entities.Page.aggregate({
      where: { libraryId },
      _max: { orderIndex: true },
    });
    orderIndex = (maxOrder._max.orderIndex || -1) + 1;
  }

  const pageTitle = title || `Page ${orderIndex + 1}`;

  const page = await context.entities.Page.create({
    data: {
      libraryId,
      title: pageTitle,
      llmNotes,
      orderIndex,
    },
    include: {
      videoFile: true,
    },
  });

  return page;
};

export const updatePage = async (args: {
  id: string;
  title?: string;
  llmNotes?: string;
}, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in to update a page');
  }

  const { id, title, llmNotes } = args;

  // Check if the page belongs to the user
  const page = await context.entities.Page.findUnique({
    where: { id },
    include: { library: true },
  });

  if (!page || page.library.userId !== context.user.id) {
    throw new HttpError(403, 'You do not have permission to update this page');
  }

  const updatedPage = await context.entities.Page.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(llmNotes !== undefined && { llmNotes }),
    },
    include: {
      videoFile: true,
    },
  });

  return updatedPage;
};

export const deletePage = async (args: { id: string }, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in to delete a page');
  }

  const { id } = args;

  // Check if the page belongs to the user
  const page = await context.entities.Page.findUnique({
    where: { id },
    include: { library: true },
  });

  if (!page || page.library.userId !== context.user.id) {
    throw new HttpError(403, 'You do not have permission to delete this page');
  }

  // Delete the page
  await context.entities.Page.delete({
    where: { id },
  });

  // Reorder remaining pages
  await context.entities.Page.updateMany({
    where: {
      libraryId: page.libraryId,
      orderIndex: { gt: page.orderIndex },
    },
    data: {
      orderIndex: { decrement: 1 },
    },
  });

  return { success: true };
};

export const reorderPages = async (args: {
  libraryId: string;
  pageIds: string[];
}, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in to reorder pages');
  }

  const { libraryId, pageIds } = args;

  // Check if the library belongs to the user
  const library = await context.entities.Library.findUnique({
    where: { id: libraryId },
  });

  if (!library || library.userId !== context.user.id) {
    throw new HttpError(403, 'You do not have permission to reorder pages in this library');
  }

  // Update order indexes
  for (let i = 0; i < pageIds.length; i++) {
    await context.entities.Page.update({
      where: { id: pageIds[i] },
      data: { orderIndex: i },
    });
  }

  return { success: true };
};

export const uploadPageVideo = async (args: {
  pageId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in to upload a video');
  }

  const { pageId, fileName, fileType, fileSize } = args;

  // Check if the page belongs to the user
  const page = await context.entities.Page.findUnique({
    where: { id: pageId },
    include: { library: true },
  });

  if (!page || page.library.userId !== context.user.id) {
    throw new HttpError(403, 'You do not have permission to upload to this page');
  }

  // Generate a hashed filename
  const hash = crypto.createHash('sha256').update(`${context.user.id}-${Date.now()}-${fileName}`).digest('hex');
  const hashedFileName = `${hash}.mp4`;
  const filePath = `/${context.user.id}/library/${page.libraryId}/${hashedFileName}`;

  // Create file record
  const file = await context.entities.File.create({
    data: {
      name: fileName,
      type: fileType,
      key: filePath,
      uploadUrl: `https://your-storage-domain.com${filePath}`, // Replace with actual storage URL
      userId: context.user.id,
    },
  });

  // Update page with video file
  const updatedPage = await context.entities.Page.update({
    where: { id: pageId },
    data: { videoFileId: file.id },
    include: {
      videoFile: true,
    },
  });

  return { page: updatedPage, uploadUrl: file.uploadUrl };
};

export const generateManifest = async (args: { libraryId: string }, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'You must be logged in to generate a manifest');
  }

  const { libraryId } = args;

  // Check if the library belongs to the user
  const library = await context.entities.Library.findUnique({
    where: { id: libraryId },
    include: {
      pages: {
        include: { videoFile: true },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!library || library.userId !== context.user.id) {
    throw new HttpError(403, 'You do not have permission to generate manifest for this library');
  }

  // Generate manifest content
  const manifest = {
    library: {
      id: library.id,
      title: library.title,
      description: library.description,
      llmNotes: library.llmNotes,
      type: library.type,
      createdAt: library.createdAt,
      updatedAt: library.updatedAt,
    },
    pages: library.pages.map(page => ({
      id: page.id,
      title: page.title,
      llmNotes: page.llmNotes,
      orderIndex: page.orderIndex,
      videoFile: page.videoFile ? {
        id: page.videoFile.id,
        name: page.videoFile.name,
        key: page.videoFile.key,
        uploadUrl: page.videoFile.uploadUrl,
      } : null,
    })),
  };

  const manifestContent = JSON.stringify(manifest, null, 2);
  const manifestPath = `/${context.user.id}/library/${libraryId}/manifest.json`;

  // Create or update manifest file
  let manifestFile = await context.entities.File.findFirst({
    where: {
      key: manifestPath,
      userId: context.user.id,
    },
  });

  if (manifestFile) {
    // Update existing manifest
    manifestFile = await context.entities.File.update({
      where: { id: manifestFile.id },
      data: {
        name: 'manifest.json',
        type: 'application/json',
        uploadUrl: `https://your-storage-domain.com${manifestPath}`, // Replace with actual storage URL
      },
    });
  } else {
    // Create new manifest
    manifestFile = await context.entities.File.create({
      data: {
        name: 'manifest.json',
        type: 'application/json',
        key: manifestPath,
        uploadUrl: `https://your-storage-domain.com${manifestPath}`, // Replace with actual storage URL
        userId: context.user.id,
      },
    });
  }

  // Update library with manifest file
  await context.entities.Library.update({
    where: { id: libraryId },
    data: { manifestFileId: manifestFile.id },
  });

  return { manifest: manifestContent, file: manifestFile };
};
