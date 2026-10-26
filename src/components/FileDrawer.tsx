/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Host-to-VM File Bridge Drawer
 * Slides out to manage files in the Linux VM /root directory,
 * upload Android phone files, download to phone, and live code editing.
 */

import React, { useEffect, useState } from 'react';
import { vmManager } from '../vm-manager';
import { storage, type VMFile } from '../storage';
import {
  X,
  Upload,
  Download,
  Trash2,
  FileText,
  FileCode,
  FolderPlus,
  RefreshCw,
  Save,
  Check,
  Edit3,
} from 'lucide-react';

interface FileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FileDrawer: React.FC<FileDrawerProps> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<VMFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<VMFile | null>(null);
  const [editorContent, setEditorContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  const [showNewFileInput, setShowNewFileInput] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');

  const refreshFiles = async () => {
    try {
      const list = await storage.listFiles();
      setFiles(list);
    } catch (e: any) {
      console.warn('Failed to list files:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshFiles();
    }
  }, [isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const buffer = await file.arrayBuffer();
      const path = `/root/${file.name}`;

      await vmManager.createFile(path, new Uint8Array(buffer));
    }

    setStatusMsg(`Uploaded ${uploadedFiles.length} file(s) into /root/`);
    setTimeout(() => setStatusMsg(''), 3000);
    await refreshFiles();
  };

  const handleSelectFile = async (file: VMFile) => {
    setSelectedFile(file);
    const data = await vmManager.readFile(file.path);
    if (data) {
      const text = new TextDecoder().decode(data);
      setEditorContent(text);
      setIsEditing(true);
    }
  };

  const handleSaveEditor = async () => {
    if (!selectedFile) return;
    setIsSaving(true);
    try {
      await vmManager.createFile(selectedFile.path, editorContent);
      setStatusMsg(`Saved ${selectedFile.name} to VM`);
      setTimeout(() => setStatusMsg(''), 2500);
      await refreshFiles();
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadFile = async (file: VMFile) => {
    try {
      await storage.exportFile(file.path);
    } catch {
      alert('Could not export file to phone storage');
    }
  };

  const handleDeleteFile = async (file: VMFile) => {
    if (confirm(`Delete '${file.name}' from Linux VM?`)) {
      await storage.deleteFile(file.path);
      if (selectedFile?.path === file.path) {
        setSelectedFile(null);
        setIsEditing(false);
        setEditorContent('');
      }
      await refreshFiles();
    }
  };

  const handleCreateNewFile = async () => {
    if (!newFileName.trim()) return;
    let cleanName = newFileName.trim();
    if (!cleanName.startsWith('/')) {
      cleanName = `/root/${cleanName}`;
    }

    const initialTemplate = cleanName.endsWith('.py')
      ? '#!/usr/bin/env python3\nprint("Hello from WASM-Termux!")\n'
      : cleanName.endsWith('.js')
      ? '// Node.js script\nconsole.log("Hello from WASM-Termux!");\n'
      : cleanName.endsWith('.sh')
      ? '#!/bin/ash\necho "Script executed."\n'
      : '';

    await vmManager.createFile(cleanName, initialTemplate);
    setNewFileName('');
    setShowNewFileInput(false);
    await refreshFiles();

    const created = await storage.getFile(cleanName);
    if (created) {
      handleSelectFile(created);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 drawer-backdrop">
      <div className="w-full max-w-md h-full bg-[#0d141d] border-l border-[#223042] flex flex-col shadow-2xl text-gray-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f2c3d] bg-[#0a0f16]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#00ff88]/10 text-[#00ff88]">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">9p Host-to-VM File Bridge</h2>
              <p className="text-[11px] text-gray-400">Mounted at <code className="text-cyan-400">/root/</code></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a2533]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast */}
        {statusMsg && (
          <div className="px-4 py-1.5 bg-[#00ff88]/20 text-[#00ff88] text-xs flex items-center gap-1.5 border-b border-[#00ff88]/30">
            <Check className="w-3.5 h-3.5" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#121b26] border-b border-[#1f2c3d] gap-2">
          <label className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#1f2c3d] hover:bg-[#2a3c52] text-xs font-medium text-cyan-300">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload to VM</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          <button
            onClick={() => setShowNewFileInput(!showNewFileInput)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#1f2c3d] hover:bg-[#2a3c52] text-xs font-medium text-gray-200"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#00ff88]" />
            <span>New File</span>
          </button>

          <button
            onClick={refreshFiles}
            className="p-1.5 rounded bg-[#1f2c3d] hover:bg-[#2a3c52] text-gray-400 hover:text-white"
            title="Refresh Files"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* New File Inline Input */}
        {showNewFileInput && (
          <div className="p-3 bg-[#162130] border-b border-[#24354a] flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. script.py or main.c"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateNewFile()}
              className="flex-1 bg-[#0a0f16] border border-[#2b3c50] rounded px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff88]"
              autoFocus
            />
            <button
              onClick={handleCreateNewFile}
              className="px-3 py-1 bg-[#00ff88] text-black text-xs font-bold rounded hover:bg-[#00dd77]"
            >
              Create
            </button>
          </div>
        )}

        {/* File Content Area: Split View or Editor */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {isEditing && selectedFile ? (
            /* Built-in Mobile Code Editor */
            <div className="flex-1 flex flex-col h-full bg-[#0a0e14]">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#121924] border-b border-[#1f2c3d]">
                <div className="flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-mono text-cyan-300 font-medium truncate max-w-[180px]">
                    {selectedFile.name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleSaveEditor}
                    disabled={isSaving}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#00ff88] text-black font-semibold text-xs hover:bg-[#00dd77]"
                  >
                    <Save className="w-3 h-3" />
                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-2 py-1 rounded bg-[#1e2a38] text-gray-300 text-xs hover:bg-[#28394c]"
                  >
                    Files
                  </button>
                </div>
              </div>
              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                className="flex-1 w-full bg-[#0a0e14] text-gray-100 font-mono-termux text-xs p-3 focus:outline-none resize-none leading-relaxed selection:bg-[#00ff88]/30"
                spellCheck={false}
                placeholder="Write your code or script here..."
              />
            </div>
          ) : (
            /* File List */
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {files.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-xs">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No files in /root/</p>
                  <p className="mt-1">Tap "Upload to VM" to import scripts from Android</p>
                </div>
              ) : (
                files.map((file) => {
                  const isPy = file.name.endsWith('.py');
                  const isJs = file.name.endsWith('.js');
                  const isSh = file.name.endsWith('.sh');
                  const sizeKb = (file.size / 1024).toFixed(1);

                  return (
                    <div
                      key={file.path}
                      className="group flex items-center justify-between p-2 rounded-lg bg-[#141d29] hover:bg-[#1a2636] border border-[#202f42] transition-colors"
                    >
                      <div
                        onClick={() => handleSelectFile(file)}
                        className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                      >
                        <div
                          className={`p-1.5 rounded ${
                            isPy
                              ? 'bg-amber-500/10 text-amber-400'
                              : isJs
                              ? 'bg-cyan-500/10 text-cyan-400'
                              : isSh
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-gray-700/30 text-gray-400'
                          }`}
                        >
                          <FileCode className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-mono text-gray-200 truncate font-medium">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {sizeKb} KB • {new Date(file.lastModified).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDownloadFile(file)}
                          className="p-1.5 rounded text-gray-400 hover:text-cyan-400 hover:bg-[#202e40]"
                          title="Download to phone storage"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-[#202e40]"
                          title="Delete file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer Guide */}
        <div className="p-3 bg-[#0a0f16] border-t border-[#1f2c3d] text-[11px] text-gray-400 flex items-center justify-between">
          <span>Files are synced with VM filesystem</span>
          <span className="text-[#00ff88] font-mono">{files.length} file(s)</span>
        </div>
      </div>
    </div>
  );
};
