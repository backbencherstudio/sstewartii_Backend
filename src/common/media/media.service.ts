import { Injectable } from '@nestjs/common';

@Injectable()
export class MediaService {
  private readonly baseUrl = process.env.MEDIA_BASE_URL;

  getUrl(path: string | null | undefined): string | undefined {
    if (!path) return undefined;

    if (path.startsWith('http')) {
      return path;
    }

    return `${this.baseUrl}${path}`;
  }

  getUrls(paths: (string | null | undefined)[] = []): string[] {
    return paths
      .map((p) => this.getUrl(p))
      .filter((url): url is string => !!url);
  }
}
