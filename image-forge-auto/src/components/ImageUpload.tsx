import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ImageUploadProps {
  onUploadComplete: () => void;
}

export const ImageUpload = ({ onUploadComplete }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [overlayText, setOverlayText] = useState("Sample Text");

  const processImage = async (file: File, userId: string) => {
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    const img = new Image();
    const imageUrl = URL.createObjectURL(file);
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = imageUrl;
    });

    const { data: imageData, error: insertError } = await supabase
      .from("images")
      .insert({
        user_id: userId,
        original_filename: file.name,
        original_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        width: img.width,
        height: img.height,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const { data, error: functionError } = await supabase.functions.invoke(
      "process-image",
      {
        body: {
          imageId: imageData.id,
          storagePath: filePath,
          overlayText: overlayText,
        },
      }
    );
    if (functionError) throw functionError;

    return data;
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);
      setProgress(0);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const totalFiles = acceptedFiles.length;

        for (let i = 0; i < totalFiles; i++) {
          const file = acceptedFiles[i];
          await processImage(file, user.id);
          setProgress(((i + 1) / totalFiles) * 100);
        }

        toast.success(
          `Successfully processed ${totalFiles} image${totalFiles > 1 ? "s" : ""}!`
        );
        onUploadComplete();
      } catch (error: any) {
        console.error("Upload error:", error);
        toast.error(error.message || "Failed to upload image");
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [overlayText, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    multiple: true,
    disabled: uploading,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card className="p-8 bg-[#0f0f0f]/90 border border-zinc-800 shadow-xl backdrop-blur-md text-gray-200 rounded-2xl hover:shadow-[#0ff]/20 transition-shadow duration-500">
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {/* Overlay Text Input */}
          <div className="space-y-2">
            <Label
              htmlFor="overlayText"
              className="text-gray-300 font-semibold tracking-wide"
            >
              Thumbnail Overlay Text
            </Label>
            <Input
              id="overlayText"
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
              placeholder="Enter text to overlay on thumbnails"
              disabled={uploading}
              className="bg-zinc-900 border-zinc-700 focus:ring-[#0ff]/50 focus:border-[#0ff]/50 text-gray-100"
            />
          </div>

          {/* Dropzone */}
          <motion.div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-xl p-14 text-center cursor-pointer
              transition-all duration-500 ease-out
              ${
                isDragActive
                  ? "border-[#0ff] bg-[#0ff]/10 scale-[1.02]"
                  : "border-zinc-700 hover:border-[#0ff]/40 hover:bg-zinc-900/60"
              }
              ${uploading ? "opacity-50 cursor-not-allowed" : ""}
            `}
            whileHover={!uploading ? { scale: 1.02 } : {}}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-5">
              {uploading ? (
                <Loader2 className="h-12 w-12 text-[#0ff] animate-spin" />
              ) : isDragActive ? (
                <Upload className="h-12 w-12 text-[#0ff]" />
              ) : (
                <ImageIcon className="h-12 w-12 text-zinc-500" />
              )}

              <div>
                <p className="text-lg font-medium text-gray-200 tracking-wide">
                  {uploading
                    ? "Processing images..."
                    : isDragActive
                    ? "Drop images here"
                    : "Drag & drop images here"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to select files (PNG, JPG, WEBP)
                </p>
              </div>

              {!uploading && (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3 bg-[#0ff]/10 hover:bg-[#0ff]/20 text-[#0ff] border border-[#0ff]/30"
                >
                  Select Images
                </Button>
              )}
            </div>
          </motion.div>

          {/* Progress Bar */}
          {uploading && (
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Processing...</span>
                <span className="font-semibold text-[#0ff]">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress
                value={progress}
                className="h-2 bg-zinc-800 [&>div]:bg-[#0ff]"
              />
            </motion.div>
          )}
        </motion.div>
      </Card>
    </motion.div>
  );
};
