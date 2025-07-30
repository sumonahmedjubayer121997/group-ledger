import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import SplitWizeAIChat from "@/components/SplitWizeAIChat";

const AIAssistantPage = () => {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="h-[calc(100vh-3rem)]"
        >
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-9 px-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-foreground">SplitWize AI Assistant</h1>
          </div>
          
          <div className="h-[calc(100%-4rem)] bg-card rounded-lg border border-border">
            <SplitWizeAIChat />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AIAssistantPage;