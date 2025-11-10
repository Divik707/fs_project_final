import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Image {
  id: string;
  original_filename: string;
  original_path: string;
  width: number;
  height: number;
  created_at: string;
  thumbnails: Thumbnail[];
}

interface Thumbnail {
  id: string;
  size_type: string;
  path: string;
  width: number;
  height: number;
  overlay_text: string;
}

interface ImageGalleryProps {
  refreshTrigger: number;
}

export const ImageGallery = ({ refreshTrigger }: ImageGalleryProps) => {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});

  const fetchImages = async () => {
    try {
      const { data: imagesData, error: imagesError } = await supabase
        .from("images")
        .select(`
          *,
          thumbnails (*)
        `)
        .order("created_at", { ascending: false });

      if (imagesError) throw imagesError;
      setImages(imagesData || []);

      const urls: Record<string, string> = {};
      for (const image of imagesData || []) {
        for (const thumbnail of image.thumbnails) {
          const { data } = await supabase.storage
            .from("thumbnails")
            .createSignedUrl(thumbnail.path, 3600);
          if (data?.signedUrl) urls[thumbnail.id] = data.signedUrl;
        }
      }
      setThumbnailUrls(urls);
    } catch (error: any) {
      console.error("Error fetching images:", error);
      toast.error("Failed to load images");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [refreshTrigger]);

  const downloadThumbnail = async (path: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("thumbnails")
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Downloaded successfully!");
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error("Failed to download");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <Card className="p-12 text-center bg-[#0f0f0f]/80 border border-zinc-800 text-gray-300 shadow-inner">
        <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No images yet</h3>
        <p className="text-muted-foreground">
          Upload your first image to get started
        </p>
      </Card>
    );
  }

  const sizeOrder = { small: 1, medium: 2, large: 3 };

  return (
    <div className="space-y-8">
      {images.map((image, index) => (
        <motion.div
          key={image.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.4 }}
        >
          <Card className="bg-[#111]/90 backdrop-blur-md border border-zinc-800 shadow-xl hover:shadow-[#0ff]/20 transition-all duration-300">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg text-gray-100 tracking-wide">
                    {image.original_filename}
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    {image.width} × {image.height} •{" "}
                    {new Date(image.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-zinc-800 text-gray-200 border border-zinc-700"
                >
                  {image.thumbnails.length} variants
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {image.thumbnails
                  .sort(
                    (a, b) =>
                      sizeOrder[a.size_type as keyof typeof sizeOrder] -
                      sizeOrder[b.size_type as keyof typeof sizeOrder]
                  )
                  .map((thumbnail, i) => (
                    <motion.div
                      key={thumbnail.id}
                      className="relative group rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900/50 hover:border-[#0ff]/40 transition-all duration-300"
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                    >
                      {thumbnailUrls[thumbnail.id] ? (
                        <motion.img
                          src={thumbnailUrls[thumbnail.id]}
                          alt={`${thumbnail.size_type} thumbnail`}
                          className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-110"
                          whileHover={{ scale: 1.05 }}
                        />
                      ) : (
                        <div className="w-full h-56 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-4">
                        <div className="w-full">
                          <p className="text-white text-sm font-medium mb-2 tracking-wide">
                            {thumbnail.size_type.toUpperCase()} •{" "}
                            {thumbnail.width}×{thumbnail.height}
                          </p>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full bg-[#0ff]/10 hover:bg-[#0ff]/20 border border-[#0ff]/30 text-[#0ff] transition-all"
                            onClick={() =>
                              downloadThumbnail(
                                thumbnail.path,
                                `${image.original_filename.split(".")[0]}_${
                                  thumbnail.size_type
                                }.png`
                              )
                            }
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
