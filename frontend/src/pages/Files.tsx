import React, { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Download,
  Trash2,
  Eye,
  X,
  Lock,
  File,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPostForm, apiDelete, apiDownload } from '../lib/api';
import { FileMetadata } from '../lib/types';
import { queryClient } from '../lib/queryClient';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(mime: string) {
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.startsWith('video/')) return Film;
  if (mime.startsWith('audio/')) return Music;
  return FileText;
}

export const Files: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch file list
  const { data: files = [], isLoading, error } = useQuery<FileMetadata[]>({
    queryKey: ['files'],
    queryFn: () => apiGet<FileMetadata[]>('/api/files'),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => apiDelete(`/api/files/${fileId}`),
    onSuccess: (_, fileId) => {
      toast.success('Confidential file deleted from vault.');
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
      }
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete file.');
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const fileToUpload = fileList[0];
    const formData = new FormData();
    formData.append('file', fileToUpload);

    setIsUploading(true);
    try {
      await apiPostForm<FileMetadata>('/api/files', formData);
      toast.success(`'${fileToUpload.name}' safely stored in vault.`);
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (file: FileMetadata) => {
    try {
      toast.info(`Preparing secure download for '${file.original_filename}'...`);
      await apiDownload(`/api/files/${file.id}/download`, file.original_filename);
      toast.success('Download complete.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download file.');
    }
  };

  const handleViewMetadata = async (file: FileMetadata) => {
    try {
      const freshMeta = await apiGet<FileMetadata>(`/api/files/${file.id}`);
      setSelectedFile(freshMeta);
    } catch (err: any) {
      toast.error(err.message || 'Failed to retrieve file metadata.');
    }
  };

  return (
    <div data-testid="files-page" className="space-y-8">
      {/* Top Header & Upload Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <Lock className="h-3 w-3" />
            ENCRYPTED FILE REPOSITORY
          </div>
          <h1 className="mt-1 text-3xl font-light tracking-tight text-white">My Files</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Manage your stored personal documents and digital assets. Maximum file size: 25 MB.
          </p>
        </div>

        {/* Upload Button & Hidden Input */}
        <div>
          <input
            data-testid="upload-file-input"
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            disabled={isUploading}
            accept=".jpg,.jpeg,.png,.pdf,.txt,.mp3,.mp4"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-zinc-950 shadow hover:bg-zinc-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isUploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            <span>{isUploading ? 'Securing File...' : 'Upload File'}</span>
          </button>
        </div>
      </div>

      {/* Allowed Formats Tagline */}
      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-zinc-500">
        <span className="text-zinc-400">Supported Formats:</span>
        {['JPG', 'PNG', 'PDF', 'TXT', 'MP3', 'MP4'].map((fmt) => (
          <span key={fmt} className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-zinc-400">
            .{fmt.toLowerCase()}
          </span>
        ))}
      </div>

      {/* Main Files Table */}
      <div
        data-testid="files-table-panel"
        className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm shadow-xl"
      >
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
              <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">Scanning Vault...</span>
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-400">
            Failed to load vault files. Please check network connection.
          </div>
        ) : files.length === 0 ? (
          <div data-testid="files-empty-state" className="py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-500">
              <File className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-mono text-sm font-semibold text-zinc-300">Vault is empty</h3>
            <p className="mt-1 text-xs text-zinc-500">
              No files have been added yet. Click 'Upload File' to securely store your first asset.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-950/60 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-6 py-3.5">Filename</th>
                  <th className="px-6 py-3.5">MIME Type</th>
                  <th className="px-6 py-3.5">Size</th>
                  <th className="px-6 py-3.5">Added Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {files.map((file) => {
                  const Icon = getFileIcon(file.mime_type);
                  return (
                    <tr
                      key={file.id}
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded border border-zinc-700 bg-zinc-800 text-zinc-300 shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-zinc-200 truncate max-w-xs sm:max-w-sm">
                            {file.original_filename}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-[11px] text-zinc-400">
                        {file.mime_type}
                      </td>
                      <td className="px-6 py-4 font-mono text-[11px] text-zinc-400">
                        {formatBytes(file.file_size)}
                      </td>
                      <td className="px-6 py-4 font-mono text-[11px] text-zinc-500">
                        {new Date(file.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* View Metadata Action */}
                          <button
                            data-testid={`view-file-${file.id}`}
                            onClick={() => handleViewMetadata(file)}
                            title="Inspect File Metadata"
                            className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Download Action */}
                          <button
                            data-testid={`download-file-${file.id}`}
                            onClick={() => handleDownload(file)}
                            title="Download File"
                            className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-emerald-400 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          {/* Delete Action */}
                          <button
                            data-testid={`delete-file-${file.id}`}
                            onClick={() => deleteMutation.mutate(file.id)}
                            title="Delete File"
                            className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Asset Metadata Drawer/Modal */}
      {selectedFile && (
        <div
          data-testid="file-detail-panel"
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col justify-between border-l border-zinc-800 bg-zinc-950 p-6 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right duration-200"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-emerald-400">
                <Lock className="h-3.5 w-3.5" />
                Asset Metadata Inspector
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Original Filename</label>
                <p className="mt-0.5 text-sm font-medium text-white break-words">{selectedFile.original_filename}</p>
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">File Identifier (UUID)</label>
                <p className="mt-0.5 font-mono text-xs text-zinc-300">{selectedFile.id}</p>
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Physical Storage Handle</label>
                <p className="mt-0.5 font-mono text-xs text-zinc-400">{selectedFile.stored_filename}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">MIME Type</label>
                  <p className="mt-0.5 font-mono text-xs text-zinc-300">{selectedFile.mime_type}</p>
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Payload Size</label>
                  <p className="mt-0.5 font-mono text-xs text-zinc-300">{formatBytes(selectedFile.file_size)}</p>
                </div>
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Date Stored</label>
                <p className="mt-0.5 font-mono text-xs text-zinc-400">
                  {new Date(selectedFile.created_at).toLocaleString()}
                </p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-400 space-y-1">
                <span className="font-mono text-[10px] uppercase text-emerald-400 font-semibold">Privacy Boundary</span>
                <p className="text-[11px] leading-relaxed text-zinc-400">
                  Telemetry logs track this file ID and action metadata only. File bytes remain stored inside your private vault repository.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-zinc-800/80 pt-4">
            <button
              data-testid="detail-download-button"
              onClick={() => handleDownload(selectedFile)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-zinc-950 shadow hover:bg-zinc-200 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download File</span>
            </button>
            <button
              onClick={() => deleteMutation.mutate(selectedFile.id)}
              className="flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
