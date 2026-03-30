import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { IStorageService } from './storage.interface';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly uploadRoot = path.join(process.cwd(), 'uploads');

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const fileName = `${uuidv4()}${path.extname(file.originalname)}`;
    const targetFolder = path.join(this.uploadRoot, folder);
    const fullPath = path.join(targetFolder, fileName);

    try {
      await fs.mkdir(targetFolder, { recursive: true });

      await fs.writeFile(fullPath, file.buffer);
      
      return `/uploads/${folder}/${fileName}`;
    } catch (error) {
      throw new InternalServerErrorException('Failed to save file to local storage');
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const absolutePath = path.join(process.cwd(), fileUrl);
      await fs.unlink(absolutePath);
    } catch (e) {
        
    }
  }
}