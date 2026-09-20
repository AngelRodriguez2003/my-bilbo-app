import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { PickedFile, SaveOptions, SaveResult } from '@/lib/backupIO.types';

/**
 * Native: write the backup to the cache directory and hand it to the share
 * sheet, so the user picks Files / Drive / AirDrop / WhatsApp themselves.
 */
export async function saveTextFile({
  filename,
  contents,
  dialogTitle,
}: SaveOptions): Promise<SaveResult> {
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';

  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(contents);

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle,
    UTI: 'public.json',
  });
  return 'shared';
}

export async function pickTextFile(): Promise<PickedFile | null> {
  // '*/*': Android file providers often report .json as octet-stream, which a
  // narrower filter would hide. parseBackup() validates the contents anyway.
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  return { name: asset.name, contents: await new File(asset.uri).text() };
}
