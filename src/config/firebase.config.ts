import { ConfigService } from '@nestjs/config';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';

export const initializeFirebase = (configService: ConfigService): App => {
  const serviceAccount = {
    type: configService.get<string>('FIREBASE_TYPE'),
    project_id: configService.get<string>('FIREBASE_PROJECT_ID'),
    private_key_id: configService.get<string>('FIREBASE_PRIVATE_KEY_ID'),
    private_key: configService
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n'),
    client_email: configService.get<string>('FIREBASE_CLIENT_EMAIL'),
    client_id: configService.get<string>('FIREBASE_CLIENT_ID'),
    auth_uri: configService.get<string>('FIREBASE_AUTH_URI'),
    token_uri: configService.get<string>('FIREBASE_TOKEN_URI'),
    auth_provider_x509_cert_url: configService.get<string>(
      'FIREBASE_AUTH_PROVIDER_CERT_URL',
    ),
    client_x509_cert_url: configService.get<string>('FIREBASE_CLIENT_CERT_URL'),
  };

  // Check if Firebase is already initialized
  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount as any),
    });
  }

  return getApps()[0];
};
