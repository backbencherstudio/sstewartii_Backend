export interface ApiResponses<T> {
  success: boolean;
  message: string;
  data: T;
}
