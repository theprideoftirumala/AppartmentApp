/**
 * File Upload Component
 * Supports drag & drop, camera capture, and file selection
 */

import { useState, useRef } from 'react';
import { Upload, Camera, X, File } from 'lucide-react';

export default function FileUpload({ onFileSelect, accept = 'image/*,.pdf', multiple = false, maxSize = 5 }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleChange = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
  };

  const processFiles = (files) => {
    const validFiles = files.filter(f => f.size <= maxSize * 1024 * 1024);
    if (validFiles.length < files.length) {
      alert(`Some files exceed the ${maxSize}MB limit and were skipped.`);
    }
    const newFiles = multiple ? [...selectedFiles, ...validFiles] : validFiles.slice(0, 1);
    setSelectedFiles(newFiles);
    if (onFileSelect) onFileSelect(newFiles);
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    if (onFileSelect) onFileSelect(newFiles);
  };

  return (
    <div className="file-upload-wrapper">
      <div
        className={`file-upload-zone ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload file"
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="sr-only"
        />
        <Upload size={28} className="file-upload-icon" />
        <p className="file-upload-text">
          Drag & drop or <span className="file-upload-link">browse files</span>
        </p>
        <p className="file-upload-hint">
          Images & PDFs up to {maxSize}MB
        </p>
      </div>

      {/* Camera button for mobile */}
      <button
        type="button"
        className="btn btn-secondary btn-sm file-upload-camera"
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.capture = 'environment';
          input.onchange = (e) => processFiles(Array.from(e.target.files));
          input.click();
        }}
      >
        <Camera size={16} />
        Take Photo
      </button>

      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <div className="file-upload-list">
          {selectedFiles.map((file, index) => (
            <div key={index} className="file-upload-item">
              <File size={16} />
              <span className="truncate">{file.name}</span>
              <span className="text-muted text-xs">
                {(file.size / 1024).toFixed(0)}KB
              </span>
              <button
                type="button"
                className="btn-ghost btn-icon"
                onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                aria-label="Remove file"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
