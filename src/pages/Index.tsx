import { useState } from "react";
import { CheckAnswers } from "@/components/CheckAnswers";
import { UploadKey } from "@/components/UploadKey";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const Index = () => {
  const [activeTab, setActiveTab] = useState("upload");
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");

  const handleUploadSuccess = (keyId: string) => {
    setSelectedKeyId(keyId);
    setActiveTab("check");
    toast.success("Answer key uploaded! Switch to Check Answers tab.");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Study Spark
          </h1>
          <p className="text-muted-foreground">
            hey champ ready for practice
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Key</TabsTrigger>
            <TabsTrigger value="check">Check Answers</TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="mt-6">
            <UploadKey onUploadSuccess={handleUploadSuccess} />
          </TabsContent>
          <TabsContent value="check" className="mt-6">
            <CheckAnswers selectedKeyId={selectedKeyId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
