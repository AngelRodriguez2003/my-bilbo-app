export interface SaveOptions {
  filename: string;
  contents: string;
  /** Android/web share sheet title; ignored elsewhere. */
  dialogTitle: string;
}

/** `saved`: written straight to disk (web download). `shared`: handed to the OS share sheet. */
export type SaveResult = 'saved' | 'shared' | 'unavailable';

export interface PickedFile {
  name: string;
  contents: string;
}
