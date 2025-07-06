import { type User, type Library, type File } from 'wasp/entities';
import { type GetPaginatedLibraries, type GetLibraryById, type CreateLibrary, type UpdateLibrary, type DeleteLibrary } from 'wasp/server/operations';
import { HttpError } from 'wasp/server';

type LibraryWithFile = Library & {
  manifestFile: File | null;
  user: User;
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
