import {
  Global,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { IStorageService } from './storage.interface';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';

@Global()
@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly uploadRoot: string;
  private readonly baseUrl: string;
  private readonly logger = new Logger(LocalStorageService.name);

  constructor(private readonly configService: ConfigService) {
    this.uploadRoot = path.join(process.cwd(), 'uploads');
    this.baseUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:3000';
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

  /**
   * Get full URL for a file from its local path
   * @param filePath - The local path (e.g., /uploads/customer/avatars/file.jpg)
   * @returns Full URL (e.g., http://localhost:3000/uploads/customer/avatars/file.jpg)
   */
  getFullUrl(filePath: string | null | undefined): string | null {
    if (!filePath) {
      return null;
    }

    // If it's already a full URL, return it as is
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }

    // Remove leading slash if present to avoid double slashes
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;

    return `${this.baseUrl}/${cleanPath}`;
  }

  /**
   * Get full URLs for multiple files from their local paths
   * @param filePaths - Array of local paths
   * @returns Array of full URLs
   */
  getFullUrls(filePaths: (string | null | undefined)[]): (string | null)[] {
    return filePaths.map((path) => this.getFullUrl(path));
  }

  /**
   * Check if a file exists at the given path
   * @param filePath - The local path
   * @returns boolean indicating if the file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    if (!filePath) {
      return false;
    }

    try {
      // Extract the path from the URL if it's a full URL
      let cleanPath = filePath;
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        const url = new URL(filePath);
        cleanPath = url.pathname;
      }

      // Remove leading slash if present
      const pathToCheck = cleanPath.startsWith('/')
        ? cleanPath
        : `/${cleanPath}`;
      const absolutePath = path.join(process.cwd(), pathToCheck);

      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the absolute file system path from a URL or relative path
   * @param filePath - The URL or relative path
   * @returns Absolute file system path
   */
  private getAbsolutePath(filePath: string): string {
    let cleanPath = filePath;

    // If it's a full URL, extract the path part
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      const url = new URL(filePath);
      cleanPath = url.pathname;
    }

    // Remove leading slash if present
    const pathToCheck = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    return path.join(process.cwd(), pathToCheck);
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      if (!fileUrl) {
        this.logger.warn('⚠️ Empty file URL provided for deletion');
        return;
      }

      const absolutePath = this.getAbsolutePath(fileUrl);

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
