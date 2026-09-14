import React, { useState } from 'react';

interface MarkdownMediaHelperProps {
  onInsert: (text: string) => void;
  onUploadingStateChange?: (uploading: boolean) => void;
}

export function MarkdownMediaHelper({ 
  onInsert, 
  onUploadingStateChange 
}: MarkdownMediaHelperProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    onUploadingStateChange?.(true);
    setProgressMsg(`Uploading ${e.target.files.length} images...`);

    try {
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        // Convert file to Base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const dataUrl = await base64Promise;

        // Upload to Cloudinary via the existing `/api/upload-cloudinary` endpoint
        const res = await fetch('/api/upload-cloudinary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl })
        });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        if (data.url) {
          // Insert as markdown image
          onInsert(`\n![Image](${data.url})\n`);
        }
      }
      setProgressMsg("Upload complete!");
      setTimeout(() => setProgressMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setProgressMsg("Error uploading images.");
    } finally {
      setIsUploading(false);
      onUploadingStateChange?.(false);
    }
  };

  const insertVideo = () => {
    if (!videoUrl.trim()) return;
    let embedUrl = videoUrl.trim();
    // Convert YouTube watch URL to embed URL if needed
    if (embedUrl.includes('youtube.com/watch?v=')) {
      const vidId = embedUrl.split('watch?v=')[1]?.split('&')[0];
      if (vidId) embedUrl = `https://www.youtube.com/embed/${vidId}`;
    } else if (embedUrl.includes('youtu.be/')) {
      const vidId = embedUrl.split('youtu.be/')[1]?.split('?')[0];
      if (vidId) embedUrl = `https://www.youtube.com/embed/${vidId}`;
    }
    
    const videoMd = `\n<iframe width="100%" height="400" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>\n`;
    onInsert(videoMd);
    setVideoUrl('');
  };

  return (
    <div className="bg-paper p-3 border border-ink/40 rounded-sm mb-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 pb-2">
        <span className="text-[10px] font-mono uppercase font-black tracking-wider text-brand-orange">
          ⚡ Markdown Media Assistant (Images / Videos)
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Image upload */}
        <div>
          <label className="block text-[8px] font-mono uppercase tracking-wider text-ink/60 mb-1">
            Upload Images to Cloudinary (Single or Multiple)
          </label>
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            className="w-full text-xs font-mono bg-white p-1 border border-ink/30 cursor-pointer"
            onChange={handleUpload}
            disabled={isUploading}
          />
          {progressMsg && (
            <span className="text-[10px] text-brand-orange tracking-tight block mt-1 animate-pulse font-mono">
              {progressMsg}
            </span>
          )}
        </div>

        {/* Video Embedding */}
        <div>
          <label className="block text-[8px] font-mono uppercase tracking-wider text-ink/60 mb-1">
            Embed Video Links (YouTube, Vimeo, Cloudinary, etc.)
          </label>
          <div className="flex gap-1.5">
            <input 
              type="text" 
              placeholder="e.g. YouTube watch links or direct stream links..." 
              className="flex-1 text-xs font-mono p-1 border border-ink/30 focus:outline-none"
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
            />
            <button 
              type="button" 
              onClick={insertVideo}
              className="px-2.5 py-1 bg-brand-blue text-white text-[10px] font-mono uppercase font-black hover:bg-ink hover:text-white"
            >
              Insert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
