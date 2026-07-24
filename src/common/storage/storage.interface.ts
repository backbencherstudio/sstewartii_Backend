export const IStorageService = 'IStorageService';

export interface IStorageService {
  uploadFile(file: Express.Multer.File, folder: string): Promise<string>;
  deleteFile(fileUrl: string): Promise<void>;
  deleteFiles(fileUrls: string[]): Promise<void>;
}
