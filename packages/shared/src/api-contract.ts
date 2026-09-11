export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  fields?: ValidationField[];
}

export interface ApiErrorResponse {
  ok: false;
  error: ApiErrorBody;
}

export interface ValidationField {
  field: string;
  message: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorResponse;
