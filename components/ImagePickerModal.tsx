"use client";

import { useState, useEffect, useRef } from "react";

interface ImageItem {
  imageId: string;
  imageUrl: string;
  thumbnailUrl: string;
  filename: string;
  category?: string;
}

interface ImagePickerModalProps {
  open: boolean;
  onClose: () => void;
  onPick: (imageId: string, imageUrl: string, label: string) => void;
  isPremium: boolean;
}

export default function ImagePickerModal({
  open,
  onClose,
  onPick,
  isPremium,
}: ImagePickerModalProps) {
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [myImages, setMyImages] = useState<ImageItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [label, setLabel] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSelectedImage(null);
      setLabel("");
      setUploadError("");
      loadLibrary();
      if (isPremium) loadMyImages();
    }
  }, [open]);

  useEffect(() => {
    if (open && tab === "library") loadLibrary();
    if (open && tab === "upload") loadMyImages();
  }, [tab, selectedCategory]);

  // Focus label input when image is selected
  useEffect(() => {
    if (selectedImage && labelInputRef.current) {
      labelInputRef.current.focus();
    }
  }, [selectedImage]);

  const loadLibrary = async () => {
    setLoading(true);
    try {
      const url = selectedCategory
        ? `/api/images/library?category=${encodeURIComponent(selectedCategory)}`
        : "/api/images/library";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setImages(data.images || []);
        setCategories(data.categories || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const loadMyImages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/images");
      const data = await res.json();
      if (res.ok) setMyImages(data.images || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/images/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || "Upload failed");
        return;
      }
      const newImg: ImageItem = {
        imageId: data.imageId,
        imageUrl: data.imageUrl,
        thumbnailUrl: data.thumbnailUrl,
        filename: file.name,
      };
      setMyImages((prev) => [newImg, ...prev]);
      setSelectedImage(newImg);
    } catch {
      setUploadError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedImage) return;
    onPick(selectedImage.imageId, selectedImage.imageUrl, label.trim());
  };

  const displayImages = tab === "library" ? images : myImages;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Pick an Image</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Selected image preview + label */}
        {selectedImage && (
          <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-3">
            <img
              src={selectedImage.thumbnailUrl || selectedImage.imageUrl}
              alt=""
              className="w-12 h-12 rounded-lg object-cover border border-blue-200"
            />
            <div className="flex-1 min-w-0">
              <input
                ref={labelInputRef}
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Add a label (optional)"
                className="w-full px-3 py-2 text-sm bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] outline-none"
                onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
              />
            </div>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-[#007AFF] text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap"
            >
              Add
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="px-5 pt-3 flex gap-2">
          <button
            onClick={() => setTab("library")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              tab === "library"
                ? "bg-[#007AFF] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Clip Art
          </button>
          {isPremium && (
            <button
              onClick={() => setTab("upload")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === "upload"
                  ? "bg-[#007AFF] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              My Uploads
            </button>
          )}
        </div>

        {/* Category pills (library tab) */}
        {tab === "library" && categories.length > 0 && (
          <div className="px-5 pt-2 flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedCategory("")}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                !selectedCategory
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs font-semibold rounded-full capitalize transition-all ${
                  selectedCategory === cat
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Upload zone (upload tab) */}
        {tab === "upload" && isPremium && (
          <div className="px-5 pt-3">
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${
                uploading ? "border-gray-200 bg-gray-50" : "border-gray-300 hover:border-[#007AFF] hover:bg-blue-50/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
                className="hidden"
              />
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-[#007AFF] rounded-full animate-spin" />
                  <span className="text-sm">Uploading...</span>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Click to upload an image</p>
              )}
            </div>
            {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
          </div>
        )}

        {/* Image grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-[#007AFF] rounded-full animate-spin" />
            </div>
          ) : displayImages.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">
              {tab === "library" ? "No clip art available yet" : "No uploads yet — upload your first image above"}
            </p>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
              {displayImages.map((img) => (
                <button
                  key={img.imageId}
                  onClick={() => setSelectedImage(img)}
                  className={`aspect-square rounded-xl border-2 overflow-hidden transition-all hover:scale-105 ${
                    selectedImage?.imageId === img.imageId
                      ? "border-[#007AFF] ring-2 ring-[#007AFF]/30 scale-105"
                      : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <img
                    src={img.thumbnailUrl || img.imageUrl}
                    alt={img.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
