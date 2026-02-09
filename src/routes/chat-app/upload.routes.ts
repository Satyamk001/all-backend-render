import { Request, Router } from 'express';
import multer from 'multer';
import { cloudinary } from '../../config/cloudinary.js';

export const uploadRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fieldSize: 10 * 1024 * 1024
  }
});

uploadRouter.post('/image-upload', upload.single('file'), async (req: Request, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = req.file;

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!file.mimetype.startsWith('image/') && !allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only images, PDF, DOC/DOCX, and TXT are allowed.' });
    }


    const result = await new Promise<{
      secure_url: string;
      width: number;
      height: number;
      resource_type: string;
      format: string;
    }>((resolve, reject) => {
      // Use 'auto' to let Cloudinary decide (PDF -> image/document, DOC -> raw)
      // BUT we still want to ensure the filename/extension is preserved in the public_id
      // to avoid download issues.
      
      // Sanitize filename and keep extension
      const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
      const publicId = `${Date.now()}_${cleanName}`;

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'real_time_chat_threads_app',
          resource_type: 'auto',
          public_id: publicId,
          use_filename: true,
          unique_filename: false
        },
        (err, uploaded) => {
          if (err || !uploaded) {
            return reject(err ?? new Error('File upload failed'));
          }

          resolve({
            secure_url: uploaded.secure_url,
            width: uploaded.width,
            height: uploaded.height,
            resource_type: uploaded.resource_type,
            format: uploaded.format
          });
        }
      );

      uploadStream.end(file.buffer);
    });

    return res.status(200).json({
      url: result.secure_url,
      width: result.width,
      height: result.height,
      resourceType: result.resource_type,
      format: result.format,
      originalName: file.originalname
    });
  } catch (err) {
    next(err);
  }
});

uploadRouter.post('/delete', async (req: Request, res, next) => {
  try {
    const { url, publicId, resourceType = 'image' } = req.body;

    if (!url && !publicId) {
      return res.status(400).json({ error: 'URL or publicId is required' });
    }

    let idToDelete = publicId;

    if (!idToDelete && url) {
      // Extract public ID from URL
      // Example: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/filename.jpg
      const parts = url.split('/');
      const versionIndex = parts.findIndex((part: string) => part.startsWith('v') && !isNaN(Number(part.substring(1))));
      
      if (versionIndex !== -1) {
        const publicIdWithExtension = parts.slice(versionIndex + 1).join('/');
        const lastDotIndex = publicIdWithExtension.lastIndexOf('.');
        idToDelete = lastDotIndex !== -1 ? publicIdWithExtension.substring(0, lastDotIndex) : publicIdWithExtension;
      }
    }

    if (!idToDelete) {
       return res.status(400).json({ error: 'Could not extract public ID' });
    }

    const result = await cloudinary.uploader.destroy(idToDelete, {
      resource_type: resourceType
    });

    if (result.result !== 'ok' && result.result !== 'not found') {
        throw new Error(`Cloudinary delete failed: ${result.result}`);
    }

    return res.status(200).json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Error in /delete endpoint:', err);
    next(err);
  }
});
