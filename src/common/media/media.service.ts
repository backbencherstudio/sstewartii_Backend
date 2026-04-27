import { Injectable } from '@nestjs/common';

@Injectable()
export class MediaService {
  private readonly baseUrl = process.env.MEDIA_BASE_URL;

  getUrl(path: string | null | undefined): string | null {
    if (!path) return null;

    if (path.startsWith('http')) {
      return path;
    }

    return `${this.baseUrl}${path}`;
  }

  getUrls(paths: string[] = []): string[] {
    return paths.map((p) => this.getUrl(p)!);
  }
}