"use client";

import { useState, useEffect, useRef } from "react";
import { trackClientActivity } from "@/lib/activity-client";
import { compressImage } from "@/lib/compress-image";

interface UploadedImage {
  imageId: string;
  imageUrl: string;
  thumbnailUrl: string;
  filename: string;
  width: number;
  height: number;
  size: number;
  createdAt: string;
}

interface LibraryImage {
  imageId: string;
  imageUrl: string;
  thumbnailUrl: string;
  filename: string;
  category: string;
}

interface ImageLibraryPanelProps {
  disabled?: boolean;
  onSelectImage: (imageId: string, imageUrl: string) => void;
  /** Currently selected cell index, or null if none */
  selectedCellIndex: number | null;
  /** Whether the user can upload custom images */
  isPremium?: boolean;
}

export default function ImageLibraryPanel({
  disabled = false,
  onSelectImage,
  selectedCellIndex,
  isPremium = false,
}: ImageLibraryPanelProps) {
  const [tab, setTab] = useState<"my" | "library">("my");
  const [myImages, setMyImages] = useState<UploadedImage[]>([]);
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [usage, setUsage] = useState({ count: 0, limit: 0, canUpload: false });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [loadingMy, setLoadingMy] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user images
  useEffect(() => {
    if (tab === "my") {
      loadMyImages();
    }
  }, [tab]);

  // Load library images
  useEffect(() => {
    if (tab === "library") {
      loadLibraryImages();
    }
  }, [tab, selectedCategory]);

  const loadMyImages = async () => {
    setLoadingMy(true);
    try {
      const res = await fetch("/api/images");
      const data = await res.json();
      if (res.ok) {
        setMyImages(data.images || []);
        setUsage(data.usage || { count: 0, limit: 0, canUpload: false });
      }
    } catch (e) {
      console.error("Failed to load images:", e);
    } finally {
      setLoadingMy(false);
    }
  };

  const loadLibraryImages = async () => {
    setLoadingLibrary(true);
    try {
      const url = selectedCategory
        ? `/api/images/library?category=${encodeURIComponent(selectedCategory)}`
        : "/api/images/library";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setLibraryImages(data.images || []);
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error("Failed to load library:", e);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError("");
    const fileType = file.type;
    let fileSizeKb = Math.round(file.size / 1024);

    try {
      const compressed = await compressImage(file);
      fileSizeKb = Math.round(compressed.size / 1024);
      const formData = new FormData();
      formData.append("image", compressed);

      const res = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error || "Upload failed";
        setUploadError(errorMsg);
        trackClientActivity("image_upload_failed", {
          context: "cell_image",
          error: errorMsg,
          file_size_kb: fileSizeKb,
          file_type: fileType,
        });
        return;
      }

      // Refresh the list
      await loadMyImages();

      trackClientActivity("image_uploaded", {
        context: "cell_image",
        file_size_kb: fileSizeKb,
        file_type: fileType,
        ...(selectedCellIndex != null ? { cell_index: selectedCellIndex } : {}),
      });

      // Auto-select if a cell is targeted
      if (selectedCellIndex !== null) {
        onSelectImage(data.imageId, data.imageUrl);
      }
    } catch (e) {
      setUploadError("Upload failed. Please try again.");
      trackClientActivity("image_upload_failed", {
        context: "cell_image",
        error: "Upload failed. Please try again.",
        file_size_kb: fileSizeKb,
        file_type: fileType,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleUpload(file);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      const res = await fetch(`/api/images?imageId=${imageId}`, { method: "DELETE" });
      if (res.ok) {
        setMyImages((prev) => prev.filter((img) => img.imageId !== imageId));
        setUsage((prev) => ({ ...prev, count: prev.count - 1 }));
      }
    } catch (e) {
      console.error("Failed to delete image:", e);
    }
  };

  const images = tab === "my" ? myImages : libraryImages;
  const loading = tab === "my" ? loadingMy : loadingLibrary;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </span>
        Image Library
        {!isPremium && (
          <span className="ml-auto text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">PREMIUM</span>
        )}
      </h2>

      {!isPremium ? (
        <div className="text-center py-6">
          <div className="w-14 h-14 mx-auto mb-3 bg-purple-50 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-gray-900 mb-1">Picture Bingo is Premium</h3>
          <p className="text-xs text-gray-500 mb-4 max-w-[220px] mx-auto">
            Add images to your bingo cells, Loteria-style. Upload your own or use our clip-art library.
          </p>
          <a
            href="/pricing"
            className="inline-block px-5 py-2.5 bg-[#007AFF] text-white text-sm font-bold rounded-xl hover:shadow-md transition-all"
          >
            Start 3-Day Trial for $7.99/mo
          </a>
          <p className="mt-2 text-[10px] text-gray-400">Cancel anytime</p>
        </div>
      ) : selectedCellIndex !== null ? (
        <p className="text-xs text-[#007AFF] font-medium mb-3">
          Click an image to place it in cell {selectedCellIndex + 1}
        </p>
      ) : (
        <p className="text-xs text-gray-500 mb-3">
          Click a cell first, then pick an image
        </p>
      )}

      {isPremium && (<>
      {/* Tabs */}
      <div className="flex gap-1 bg-[#f2f2f7] rounded-lg p-0.5 mb-4">
        <button
          onClick={() => setTab("my")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
            tab === "my"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          My Images
        </button>
        <button
          onClick={() => setTab("library")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
            tab === "library"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Clip Art
        </button>
      </div>

      {/* Upload zone (My Images tab only) */}
      {tab === "my" && (
        <div className="mb-4">
          {usage.canUpload ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                uploading
                  ? "border-gray-200 bg-gray-50"
                  : "border-gray-300 hover:border-[#007AFF] hover:bg-blue-50/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-[#007AFF] rounded-full animate-spin" />
                  <span className="text-xs">Uploading...</span>
                </div>
              ) : (
                <>
                  <svg className="w-6 h-6 mx-auto mb-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <p className="text-xs text-gray-500">
                    Drop image or click to upload
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {usage.count}/{usage.limit} used
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-xs text-amber-700 font-medium">
                Custom image uploads are not available on this plan
              </p>
              <a
                href="/pricing"
                className="text-[10px] text-[#007AFF] font-semibold underline mt-1 inline-block"
              >
                See plan options
              </a>
            </div>
          )}

          {uploadError && (
            <p className="mt-2 text-xs text-red-600">{uploadError}</p>
          )}
        </div>
      )}

      {/* Category filter (Library tab only) */}
      {tab === "library" && categories.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedCategory("")}
            className={`px-2 py-1 text-[10px] font-semibold rounded-full transition-all ${
              !selectedCategory
                ? "bg-[#007AFF] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-1 text-[10px] font-semibold rounded-full capitalize transition-all ${
                selectedCategory === cat
                  ? "bg-[#007AFF] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Image grid */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-[#007AFF] rounded-full animate-spin" />
        </div>
      ) : images.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">
          {tab === "my" ? "No images uploaded yet" : "No clip art available yet"}
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
          {images.map((img) => (
            <button
              key={img.imageId}
              onClick={() => {
                if (selectedCellIndex !== null) {
                  onSelectImage(img.imageId, img.imageUrl);
                }
              }}
              disabled={disabled || selectedCellIndex === null}
              className={`relative aspect-square rounded-lg border overflow-hidden transition-all group ${
                selectedCellIndex !== null
                  ? "hover:ring-2 hover:ring-[#007AFF] cursor-pointer border-gray-200"
                  : "border-gray-100 opacity-60 cursor-not-allowed"
              }`}
            >
              <img
                src={img.thumbnailUrl}
                alt={img.filename}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* Delete button (my images only) */}
              {tab === "my" && "size" in img && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteImage(img.imageId);
                  }}
                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] font-bold hidden group-hover:flex items-center justify-center"
                >
                  X
                </button>
              )}
            </button>
          ))}
        </div>
      )}
      </>)}
    </div>
  );
}
