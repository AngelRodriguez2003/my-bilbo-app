import type { PickedFile, SaveOptions, SaveResult } from '@/lib/backupIO.types';

/** Web: a plain browser download — no native module involved. */
export async function saveTextFile({ filename, contents }: SaveOptions): Promise<SaveResult> {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke on the next tick so the download has already started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'saved';
}

export async function pickTextFile(): Promise<PickedFile | null> {
  return new Promise<PickedFile | null>((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';

    let settled = false;
    let picked = false;
    const finish = (result: PickedFile | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('focus', onFocus);
      input.remove();
      resolve(result);
    };

    // Safari/Firefox don't always fire `cancel`: when the window regains focus
    // without a file having been chosen, treat it as a cancelled pick.
    const onFocus = () => {
      setTimeout(() => {
        if (!picked) finish(null);
      }, 500);
    };

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return finish(null);
      picked = true;
      file
        .text()
        .then((contents) => finish({ name: file.name, contents }))
        .catch((error) => {
          if (!settled) {
            settled = true;
            window.removeEventListener('focus', onFocus);
            input.remove();
            reject(error);
          }
        });
    };
    input.oncancel = () => finish(null);

    document.body.appendChild(input);
    window.addEventListener('focus', onFocus);
    input.click();
  });
}
