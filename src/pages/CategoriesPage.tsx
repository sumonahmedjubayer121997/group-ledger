import { useState } from "react";
import { CategoryManagement } from "@/components/CategoryManagement";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const CategoriesPage = () => {
  const navigate = useNavigate();
  const [isOpen] = useState(true);

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
            <h1 className="text-2xl font-bold text-foreground">Category Management</h1>
          </div>
          
          <CategoryManagement
            isOpen={isOpen}
            onClose={handleClose}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default CategoriesPage;