// InkyCut Service Worker
// Intercepts fetch requests and serves LocalFiles from IndexedDB when available

const CACHE_NAME = 'inkycut-sw-v1';
const DB_NAME = 'InkyCutFiles';
const DB_VERSION = 1;
const OBJECT_STORE_NAME = 'files';

// Helper function to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
        const store = db.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

// Helper function to get file from IndexedDB by various identifiers
async function getFileFromDB(identifier) {
  try {
    const db = await openDB();
    const transaction = db.transaction([OBJECT_STORE_NAME], 'readonly');
    const store = transaction.objectStore(OBJECT_STORE_NAME);
    
    // Handle new identifier format {id, name} or string
    let searchId = identifier;
    let searchName = identifier;
    
    if (typeof identifier === 'object' && identifier !== null) {
      searchId = identifier.id;
      searchName = identifier.name;
    }
    
    // Try to get by ID first (most direct)
    if (searchId) {
      let request = store.get(searchId);
      let result = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (result) {
        return result;
      }
    }
    
    // Try to get by name (case-insensitive)
    if (searchName) {
      const nameIndex = store.index('name');
      const cursor = await new Promise((resolve, reject) => {
        const cursorRequest = nameIndex.openCursor();
        cursorRequest.onsuccess = () => resolve(cursorRequest.result);
        cursorRequest.onerror = () => reject(cursorRequest.error);
      });
      
      // Search through all files for case-insensitive name match
      let currentCursor = cursor;
      while (currentCursor) {
        const file = currentCursor.value;
        if (file.name.toLowerCase() === searchName.toLowerCase()) {
          return file;
        }
        currentCursor = await new Promise((resolve, reject) => {
          const continueRequest = currentCursor.continue();
          continueRequest.onsuccess = () => resolve(continueRequest.result);
          continueRequest.onerror = () => reject(continueRequest.error);
        });
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting file from IndexedDB:', error);
    return null;
  }
}

// Helper function to parse Range header
function parseRange(rangeHeader, contentLength) {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
    return null;
  }
  
  const range = rangeHeader.substring(6); // Remove 'bytes='
  
  // Handle multiple ranges (take first one for now)
  const firstRange = range.split(',')[0].trim();
  const [startStr, endStr] = firstRange.split('-');
  
  let start = startStr ? parseInt(startStr, 10) : 0;
  let end = endStr ? parseInt(endStr, 10) : contentLength - 1;
  
  // Validate and fix range
  if (isNaN(start)) start = 0;
  if (isNaN(end) || end >= contentLength) end = contentLength - 1;
  if (start < 0) start = 0;
  if (start > end) return null;
  
  return { start, end };
}

// Optimized base64 to ArrayBuffer conversion
function base64ToArrayBuffer(base64Data) {
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  
  // Use batch processing for better performance with large files
  const BATCH_SIZE = 8192; // 8KB batches for optimal performance
  for (let i = 0; i < len; i += BATCH_SIZE) {
    const end = Math.min(i + BATCH_SIZE, len);
    for (let j = i; j < end; j++) {
      bytes[j] = binaryString.charCodeAt(j);
    }
  }
  return bytes;
}

// Helper function to convert dataUrl to Response with Range support
function dataUrlToResponse(dataUrl, request, headers = {}) {
  try {
    // Parse the data URL
    const [header, base64Data] = dataUrl.split(',');
    const mimeMatch = header.match(/data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    
    // Convert base64 to ArrayBuffer using optimized function
    const bytes = base64ToArrayBuffer(base64Data);
    const contentLength = bytes.length;
    
    // Check for Range request
    const rangeHeader = request.headers.get('Range');
    const rangeData = parseRange(rangeHeader, contentLength);
    
    if (rangeData) {
      // Handle Range request (206 Partial Content)
      const { start, end } = rangeData;
      const chunkLength = end - start + 1;
      const chunk = bytes.slice(start, end + 1);
      
      const responseHeaders = {
        'Content-Type': mimeType,
        'Content-Length': chunkLength.toString(),
        'Content-Range': `bytes ${start}-${end}/${contentLength}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length',
        'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
        'Connection': 'keep-alive', // Important for streaming
        'ETag': `"${btoa(base64Data.substring(0, 32))}"`, // Simple ETag
        ...headers
      };
      
      return new Response(chunk, {
        status: 206,
        statusText: 'Partial Content',
        headers: responseHeaders
      });
    } else {
      // Handle full content request (200 OK)
      const responseHeaders = {
        'Content-Type': mimeType,
        'Content-Length': contentLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length',
        'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
        'Connection': 'keep-alive', // Important for streaming
        'ETag': `"${btoa(base64Data.substring(0, 32))}"`, // Simple ETag
        ...headers
      };
      
      return new Response(bytes, {
        status: 200,
        statusText: 'OK',
        headers: responseHeaders
      });
    }
  } catch (error) {
    console.error('Error converting dataUrl to Response:', error);
    return null;
  }
}

// Helper function to extract file identifier from URL
function extractFileIdentifier(url) {
  try {
    const urlObj = new URL(url);
    
    // Handle different URL patterns:
    // 1. Service worker files: /sw-files/{fileId}/{filename}
    // 2. Service worker query: /sw-file?file=filename&id=fileId
    // 3. Direct file access: /files/filename.ext
    // 4. File ID access: /files/file-123-abc
    // 5. Query parameter: ?file=filename.ext
    // 6. LocalFile: prefix in URL fragment or query
    
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;
    
    // Check for service worker files pattern: /sw-files/{fileId}/{filename}
    if (pathname.includes('/sw-files/')) {
      const parts = pathname.split('/sw-files/');
      if (parts.length > 1) {
        const pathParts = parts[1].split('/');
        if (pathParts.length >= 2) {
          const fileId = pathParts[0];
          const filename = decodeURIComponent(pathParts.slice(1).join('/'));
          // Return both ID and filename for lookup
          return { id: fileId, name: filename };
        }
      }
    }
    
    // Check for service worker query pattern: /sw-file?file=filename&id=fileId
    if (pathname.includes('/sw-file')) {
      const fileParam = searchParams.get('file');
      const idParam = searchParams.get('id');
      if (fileParam) {
        return { 
          id: idParam, 
          name: decodeURIComponent(fileParam).replace(/^LocalFile:/, '') 
        };
      }
    }
    
    // Check for file parameter
    const fileParam = searchParams.get('file') || searchParams.get('localfile');
    if (fileParam) {
      return { name: fileParam.replace(/^LocalFile:/, '') };
    }
    
    // Check for /files/ path
    if (pathname.includes('/files/')) {
      const parts = pathname.split('/files/');
      if (parts.length > 1) {
        return { name: decodeURIComponent(parts[1]).replace(/^LocalFile:/, '') };
      }
    }
    
    // Check for direct filename in path
    const filename = pathname.split('/').pop();
    if (filename && filename.includes('.')) {
      return { name: decodeURIComponent(filename).replace(/^LocalFile:/, '') };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting file identifier from URL:', error);
    return null;
  }
}

// Helper function to check if file is a video
function isVideoFile(mimeType, filename) {
  const videoMimeTypes = ['video/', 'application/mp4', 'application/x-mpegURL'];
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.3gp'];
  
  if (mimeType && videoMimeTypes.some(type => mimeType.includes(type))) {
    return true;
  }
  
  if (filename) {
    const lowerFilename = filename.toLowerCase();
    return videoExtensions.some(ext => lowerFilename.endsWith(ext));
  }
  
  return false;
}

// Main fetch event handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;
  
  // Only intercept GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip non-HTTP(S) requests
  if (!url.startsWith('http')) {
    return;
  }
  
  // Skip requests to the same origin API endpoints
  if (url.includes('/api/') || url.includes('/_wasp/')) {
    return;
  }
  
  // Try to extract file identifier
  const fileIdentifier = extractFileIdentifier(url);
  if (!fileIdentifier) {
    return;
  }
  
  console.log('Service worker intercepting request for:', fileIdentifier);
  
  event.respondWith(
    (async () => {
      try {
        // Try to get file from IndexedDB
        const localFile = await getFileFromDB(fileIdentifier);
        
        if (localFile && localFile.dataUrl) {
          const isVideo = isVideoFile(localFile.type, localFile.name);
          const rangeHeader = request.headers.get('Range');
          
          // Enhanced logging for video range requests
          if (isVideo && rangeHeader) {
            const rangeData = parseRange(rangeHeader, localFile.dataUrl.length);
            console.log('Video range request:', {
              file: fileIdentifier,
              range: rangeHeader,
              parsedRange: rangeData,
              fileName: localFile.name,
              fileType: localFile.type
            });
          } else {
            console.log('Service worker serving from IndexedDB:', {
              file: fileIdentifier,
              type: localFile.type,
              isVideo,
              hasRange: !!rangeHeader,
              range: rangeHeader
            });
          }
          
          // Convert dataUrl to Response with Range support
          const response = dataUrlToResponse(localFile.dataUrl, request, {
            'X-Served-By': 'InkyCut-ServiceWorker',
            'X-File-ID': localFile.id,
            'X-File-Name': localFile.name,
            'X-Is-Video': isVideo ? 'true' : 'false'
          });
          
          if (response) {
            if (isVideo) {
              console.log('Service worker served video with status:', response.status);
            }
            return response;
          }
        }
        
        // Fall back to network request
        console.log('Service worker falling back to network for:', fileIdentifier);
        return fetch(request);
        
      } catch (error) {
        console.error('Service worker error:', error);
        // Fall back to network on any error
        return fetch(request);
      }
    })()
  );
});

// Install event
self.addEventListener('install', (event) => {
  console.log('InkyCut Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('InkyCut Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  const { type } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'CLEAR_CACHE':
      caches.delete(CACHE_NAME).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});