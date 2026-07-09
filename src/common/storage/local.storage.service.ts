import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { IStorageService } from './storage.interface';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly uploadRoot: string;
  private readonly baseUrl: string;
  private readonly logger = new Logger(LocalStorageService.name);

  constructor(private readonly configService: ConfigService) {
    this.uploadRoot = path.join(process.cwd(), 'uploads');
    this.baseUrl =
      this.configService.get<string>('app.baseUrl') || 'http://localhost:3000';
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const fileName = `${uuidv4()}${path.extname(file.originalname)}`;
    const targetFolder = path.join(this.uploadRoot, folder);
    const fullPath = path.join(targetFolder, fileName);

    try {
      // Ensure directory exists
      await fs.mkdir(targetFolder, { recursive: true });

      // Save file
      await fs.writeFile(fullPath, file.buffer);

      // Return the URL path (not the full URL)
      const urlPath = `/uploads/${folder}/${fileName}`;

      this.logger.log(`✅ File uploaded successfully: ${urlPath}`);

      return urlPath;
    } catch (error) {
      this.logger.error(`Failed to save file: ${error}`);
      throw new InternalServerErrorException(
        'Failed to save file to local storage',
      );
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      if (!fileUrl) {
        this.logger.warn('⚠️ Empty file URL provided for deletion');
        return;
      }

      // Extract the path from the URL
      let filePath = fileUrl;

      // If it's a full URL, extract the path part
      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        const url = new URL(fileUrl);
        filePath = url.pathname;
      }

      // Remove leading slash if present
      const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
      const absolutePath = path.join(process.cwd(), cleanPath);

      // Check if file exists before trying to delete
      try {
        await fs.access(absolutePath);
      } catch {
        this.logger.warn(`⚠️ File not found on disk: ${absolutePath}`);
        return; // File doesn't exist, nothing to delete
      }

      // Delete the file
      await fs.unlink(absolutePath);
      this.logger.log(`✅ File deleted: ${absolutePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${fileUrl}`, error);
      // Don't throw - we want to continue with database deletion even if file deletion fails
    }
  }

  async deleteFiles(fileUrls: string[]): Promise<void> {
    this.logger.log(`🗑️ Attempting to delete ${fileUrls.length} files`);

    const results = await Promise.allSettled(
      fileUrls.map((url) => this.deleteFile(url)),
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    this.logger.log(`✅ ${successful} files deleted, ❌ ${failed} failed`);
  }
}
