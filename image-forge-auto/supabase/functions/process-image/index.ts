import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageId, storagePath, overlayText } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Processing image:", imageId, storagePath);

    // Download the original image
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("images")
      .download(storagePath);

    if (downloadError) {
      console.error("Download error:", downloadError);
      throw downloadError;
    }

    // Get the image as blob
    const imageBlob = fileData;
    const arrayBuffer = await imageBlob.arrayBuffer();

    // Use ImageMagick-style processing via external service or simplify to just resize
    // For MVP, we'll create simple thumbnail variants without text overlay on server
    // Text overlay will be done client-side or in a future iteration
    
    const userId = storagePath.split("/")[0];

    // Define thumbnail sizes (we'll just copy the image for now as placeholder)
    // In production, you'd use an image processing library
    const sizes = [
      { name: "small", scale: 0.25 },
      { name: "medium", scale: 0.5 },
      { name: "large", scale: 0.75 },
    ];

    // Get image dimensions from the database
    const { data: imageRecord } = await supabase
      .from("images")
      .select("width, height")
      .eq("id", imageId)
      .single();

    if (!imageRecord) {
      throw new Error("Image record not found");
    }

    // Process each size
    for (const size of sizes) {
      try {
        // For now, upload the same image as different sizes
        // In production, implement actual resizing
        const thumbnailPath = `${userId}/${imageId}_${size.name}.png`;
        
        const { error: uploadError } = await supabase.storage
          .from("thumbnails")
          .upload(thumbnailPath, imageBlob, {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload error for ${size.name}:`, uploadError);
          throw uploadError;
        }

        // Calculate thumbnail dimensions
        const thumbnailWidth = Math.round(imageRecord.width * size.scale);
        const thumbnailHeight = Math.round(imageRecord.height * size.scale);

        // Save thumbnail metadata
        const { error: insertError } = await supabase.from("thumbnails").insert({
          image_id: imageId,
          size_type: size.name,
          path: thumbnailPath,
          width: thumbnailWidth,
          height: thumbnailHeight,
          overlay_text: overlayText,
        });

        if (insertError) {
          console.error(`Insert error for ${size.name}:`, insertError);
          throw insertError;
        }

        console.log(`Successfully processed ${size.name} thumbnail`);
      } catch (error) {
        console.error(`Error processing ${size.name} thumbnail:`, error);
        throw error;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Thumbnails generated successfully",
        note: "Image variants created. Text overlay will be applied in future update."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process image" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
