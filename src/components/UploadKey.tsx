import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle } from "lucide-react";

interface UploadKeyProps {
  onUploadSuccess: () => void;
}

export const UploadKey = ({ onUploadSuccess }: UploadKeyProps) => {
  const [keyName, setKeyName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPG, PNG)");
      return;
    }

    setSelectedFile(file);
    
    // Auto-fill key name from filename if empty
    if (!keyName) {
      const name = file.name.replace(/\.[^/.]+$/, "");
      setKeyName(name);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleStartProcessing = async () => {
    if (!selectedFile || !keyName.trim()) {
      toast.error("Please provide a key name and select an image");
      return;
    }

    setIsProcessing(true);
    setUploadProgress(10);

    try {
      // Upload image to storage
      setUploadProgress(20);
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `public/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('answer-keys')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('answer-keys')
        .getPublicUrl(fileName);

      setUploadProgress(40);

      // Convert image to base64 for AI processing
      const base64Image = await convertToBase64(selectedFile);
      
      setUploadProgress(50);
      
      // Call edge function to process with AI
      const { data, error } = await supabase.functions.invoke("process-answer-key", {
        body: { imageBase64: base64Image },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to process answer key");
      }

      setUploadProgress(80);

      if (!data?.questions) {
        throw new Error("No questions extracted from image");
      }

      // Save to database with image URL (user_id is now nullable)
      const { error: dbError } = await supabase.from("answer_keys").insert({
        key_name: keyName,
        questions: data.questions,
        image_url: publicUrl,
      });

      if (dbError) throw dbError;

      setUploadProgress(100);
      toast.success(`Successfully processed ${data.questions.length} questions!`);
      
      // Reset form
      setKeyName("");
      setSelectedFile(null);
      setUploadProgress(0);
      
      // Notify parent and switch to check answers view
      onUploadSuccess();
      
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to process answer key");
      setUploadProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Answer Key</CardTitle>
          <CardDescription>
            Upload an image of your answer key for AI processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="key-name">Key Name</Label>
            <Input
              id="key-name"
              type="text"
              placeholder="e.g., Practice Set 1"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-upload">Answer Key Image</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isProcessing}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {selectedFile ? (
                  <>
                    <CheckCircle className="h-12 w-12 text-accent" />
                    <p className="font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <p className="font-medium text-foreground">Click to upload or drag and drop</p>
                    <p className="text-sm text-muted-foreground">JPG, PNG (max 10MB)</p>
                  </>
                )}
              </label>
            </div>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Processing with AI... {uploadProgress}%
              </p>
            </div>
          )}

          <Button
            onClick={handleStartProcessing}
            disabled={!selectedFile || !keyName.trim() || isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Start Processing
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};