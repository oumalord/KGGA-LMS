import { useEffect, useRef, useState } from "react";
import { Link2, Loader2, Plus, Trash2, Upload, Video } from "lucide-react";
import { api } from "../lib/neonClient";
import type { KGGAVideo, Profile } from "../types";

export default function KGGAVideos({ profile }: { profile: Profile }) {
  const [videos, setVideos] = useState<KGGAVideo[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<"link" | "upload">("link");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    api.get("/api/videos").then((r) => setVideos(r.data.videos ?? [])).catch(() => setError("Unable to load videos."));
  }

  useEffect(load, []);

  async function addVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Add a title for the video.");
    setSaving(true);
    setError("");
    try {
      if (mode === "link") {
        if (!videoUrl.trim()) return setError("Add a video link.");
        await api.post("/api/videos", { title: title.trim(), description: description.trim(), videoUrl: videoUrl.trim() });
      } else {
        const file = fileRef.current?.files?.[0];
        if (!file) return setError("Choose a video from your device.");
        if (!file.type.startsWith("video/")) return setError("Choose a video file.");
        const base64 = await readFile(file);
        await api.post("/api/videos/upload", { title: title.trim(), description: description.trim(), contentBase64: base64, contentType: file.type });
      }
      setTitle("");
      setDescription("");
      setVideoUrl("");
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch {
      setError("The video could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function removeVideo(id: string) {
    await api.delete(`/api/videos/${id}`);
    load();
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-[#0057B8] flex items-center justify-center"><Video size={19} className="text-white" /></div>
        <div><h1 className="text-2xl font-extrabold text-gray-900">KGGA Videos</h1><p className="text-gray-500 text-sm">Share KGGA stories, training sessions and community highlights.</p></div>
      </div>

      <form onSubmit={addVideo} className="bg-white rounded-2xl border border-gray-50 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4"><p className="font-bold text-gray-900">Add a video</p><div className="flex gap-2"><button type="button" onClick={() => setMode("link")} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold ${mode === "link" ? "bg-[#FFD700] text-[#0057B8]" : "bg-gray-50 text-gray-500"}`}><Link2 size={14} /> Video link</button><button type="button" onClick={() => setMode("upload")} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold ${mode === "upload" ? "bg-[#FFD700] text-[#0057B8]" : "bg-gray-50 text-gray-500"}`}><Upload size={14} /> Upload file</button></div></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-xs font-semibold text-gray-500">Title<input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="e.g. KGGA Leadership Camp" /></label>
          <label className="text-xs font-semibold text-gray-500">Description <span className="font-normal">(optional)</span><input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="A short description" /></label>
        </div>
        {mode === "link" ? <label className="block text-xs font-semibold text-gray-500 mt-4">Video URL<input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="https://www.youtube.com/watch?v=..." /></label> : <label className="flex items-center gap-2 mt-4 border border-dashed border-gray-300 rounded-xl px-4 py-4 text-sm text-gray-600 cursor-pointer hover:bg-gray-50"><Upload size={16} className="text-[#0057B8]" />{fileName || "Choose a video file from your device"}<input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name || "")} /></label>}
        {error && <p className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={saving} className="mt-5 flex items-center gap-2 bg-[#0057B8] text-white px-4 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60"><Plus size={16} />{saving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : "Add Video"}</button>
      </form>

      {videos.length === 0 ? <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-sm text-gray-400">No KGGA videos have been added yet.</div> : <div className="grid sm:grid-cols-2 gap-5">{videos.map((video) => <div key={video.id} className="bg-white rounded-2xl border border-gray-50 shadow-sm overflow-hidden"><VideoPreview video={video} /><div className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-gray-900 text-sm">{video.title}</p><p className="text-xs text-gray-500 mt-1">{video.description || "KGGA video"}</p></div><button onClick={() => removeVideo(video.id)} className="text-gray-300 hover:text-red-500" aria-label={`Delete ${video.title}`}><Trash2 size={15} /></button></div><p className="text-[11px] text-gray-400 mt-3">Added by {video.uploadedBy}</p></div></div>)}</div>}
    </div>
  );
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve((reader.result as string).split(",")[1]); reader.onerror = reject; reader.readAsDataURL(file); });
}

export function VideoPreview({ video }: { video: KGGAVideo }) {
  const youtubeId = video.videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/]+)/)?.[1];
  if (youtubeId) return <iframe title={video.title} src={`https://www.youtube.com/embed/${youtubeId}`} className="w-full aspect-video bg-gray-900" allowFullScreen />;
  return <video src={video.videoUrl} controls className="w-full aspect-video bg-gray-900" />;
}
