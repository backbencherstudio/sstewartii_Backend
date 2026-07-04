import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { RESPONSE_MESSAGE } from '../decorators/response-message.decorator';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const status = context.switchToHttp().getResponse().statusCode;
    const staticMessage =
      this.reflector.get<string>(RESPONSE_MESSAGE, context.getHandler()) ||
      'Request successful';

    return next.handle().pipe(
      map((payload) => {
        let data = payload;
        let message = staticMessage;

        if (payload && typeof payload === 'object' && 'message' in payload) {
          message = payload.message;
        }

        if (
          payload &&
          typeof payload === 'object' &&
          payload.message &&
          Object.keys(payload).length === 1
        ) {
          data = null;
        }

        if (payload && payload.data !== undefined) {
          data = payload.data;
        }

        return {
          success: true,
          statusCode: status,
          message,
          data,
        };
      }),
    );
  }
}
