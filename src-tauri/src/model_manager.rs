use std::path::{Path, PathBuf};
use std::fs::{self, File};
use std::io::{Read, Write};
use sha2::{Sha256, Digest};
use dirs::data_local_dir;
use crate::model_manifest::{get_official_manifest, ModelInfo};

pub fn get_voxquest_models_dir() -> PathBuf {
    let base = data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    let dir = base.join("VoxQuest").join("models");
    let _ = fs::create_dir_all(&dir);
    dir
}

pub fn list_models() -> Vec<ModelInfo> {
    let mut manifest = get_official_manifest();
    let models_dir = get_voxquest_models_dir();

    for m in manifest.iter_mut() {
        let target_path = models_dir.join(&m.filename);
        if target_path.exists() {
            if let Ok(meta) = fs::metadata(&target_path) {
                if meta.len() == m.size_bytes {
                    m.is_downloaded = true;
                }
            }
        }
    }
    manifest
}

pub fn verify_file_sha256(path: &Path, expected_sha: &str) -> Result<bool, String> {
    let mut file = File::open(path).map_err(|e| format!("Failed to open file for checksum: {}", e))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 65536];

    loop {
        let count = file.read(&mut buffer).map_err(|e| format!("Read error: {}", e))?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }

    let result = hasher.finalize();
    let computed_hex = hex_encode(result.as_slice());
    Ok(computed_hex.eq_ignore_ascii_case(expected_sha))
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

pub fn download_model_sync<F>(model_id: &str, progress_cb: F) -> Result<PathBuf, String>
where
    F: Fn(u64, u64),
{
    let manifest = get_official_manifest();
    let info = manifest.into_iter().find(|m| m.id == model_id)
        .ok_or_else(|| format!("Unknown model id: {}", model_id))?;

    let models_dir = get_voxquest_models_dir();
    let final_path = models_dir.join(&info.filename);

    if final_path.exists() {
        if let Ok(true) = verify_file_sha256(&final_path, &info.sha256) {
            progress_cb(info.size_bytes, info.size_bytes);
            return Ok(final_path);
        } else {
            let _ = fs::remove_file(&final_path);
        }
    }

    let temp_path = models_dir.join(format!("{}.download", info.filename));
    if temp_path.exists() {
        let _ = fs::remove_file(&temp_path);
    }

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(600))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let mut resp = client.get(&info.download_url)
        .send()
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Download failed with HTTP status: {}", resp.status()));
    }

    let mut dest_file = File::create(&temp_path)
        .map_err(|e| format!("Failed to create temporary download file: {}", e))?;

    let mut buffer = [0u8; 65536];
    let mut downloaded: u64 = 0;
    let total_bytes = info.size_bytes;

    loop {
        let count = resp.read(&mut buffer).map_err(|e| {
            let _ = fs::remove_file(&temp_path);
            format!("Error while streaming download: {}", e)
        })?;
        if count == 0 {
            break;
        }
        dest_file.write_all(&buffer[..count]).map_err(|e| {
            let _ = fs::remove_file(&temp_path);
            format!("Disk write error: {}", e)
        })?;
        downloaded += count as u64;
        progress_cb(downloaded, total_bytes);
    }

    dest_file.flush().map_err(|e| format!("Flush error: {}", e))?;
    drop(dest_file);

    let valid = verify_file_sha256(&temp_path, &info.sha256)
        .map_err(|e| {
            let _ = fs::remove_file(&temp_path);
            e
        })?;

    if !valid {
        let _ = fs::remove_file(&temp_path);
        return Err("Integrity verification failed! Checksum mismatch. Download discarded.".to_string());
    }

    fs::rename(&temp_path, &final_path).map_err(|e| {
        let _ = fs::remove_file(&temp_path);
        format!("Failed to finalize installed model: {}", e)
    })?;

    Ok(final_path)
}
