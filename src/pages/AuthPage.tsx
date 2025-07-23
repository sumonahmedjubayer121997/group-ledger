
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthForm } from "@/components/AuthForm";

interface AuthPageProps {
  onBack: () => void;
}

export const AuthPage = ({ onBack }: AuthPageProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <Button
          onClick={onBack}
          variant="outline"
          className="mb-6 sm:mb-8 text-xs sm:text-sm"
          size="sm"
        >
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          Back to Landing
        </Button>
        
        <div className="flex items-center justify-center">
          <div className="w-full max-w-sm sm:max-w-md">
            <AuthForm />
          </div>
        </div>
      </div>
    </div>
  );
};
