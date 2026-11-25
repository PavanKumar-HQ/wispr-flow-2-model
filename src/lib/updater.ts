import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateStatus {
  available: boolean;
  version?: string;
  body?: string;
  downloading: boolean;
  downloaded: boolean;
  error?: string;
}

/**
 * Checks for updates using Tauri v2 official updater.
 * Safely handles environments where updater plugin is unavailable (e.g. browser preview).
 */
export async function checkForAppUpdates(
  onProgress?: (progressText: string) => void
): Promise<UpdateStatus> {
  try {
    const update = await check();
    if (!update) {
      return { available: false, downloading: false, downloaded: false };
    }

    if (update.available) {
      if (onProgress) onProgress(`Downloading VoxQuest v${update.version}...`);

      let downloadedBytes = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            break;
          case 'Progress':
            downloadedBytes += event.data.chunkLength;
            if (contentLength > 0 && onProgress) {
              const pct = Math.round((downloadedBytes / contentLength) * 100);
              onProgress(`Downloading update: ${pct}%`);
            }
            break;
          case 'Finished':
            if (onProgress) onProgress('Update downloaded and verified.');
            break;
        }
      });

      return {
        available: true,
        version: update.version,
        body: update.body,
        downloading: false,
        downloaded: true,
      };
    }

    return { available: false, downloading: false, downloaded: false };
  } catch (err: any) {
    console.warn('Auto-updater check failed or unavailable:', err);
    return {
      available: false,
      downloading: false,
      downloaded: false,
      error: String(err?.message || err),
    };
  }
}

/**
 * Restarts VoxQuest to apply the downloaded update.
 */
export async function relaunchToApplyUpdate(): Promise<void> {
  try {
    await relaunch();
  } catch (err) {
    console.error('Failed to relaunch:', err);
  }
}

