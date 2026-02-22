export interface FileUploadPayload {
  base64: string;
  fileName: string;
  contentType: string;
  fileSize?: number;
}
