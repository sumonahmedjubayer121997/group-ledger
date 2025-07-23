
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
      <div className="container mx-auto px-4 py-8">
        <Button
          onClick={onBack}
          variant="outline"
          className="mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Landing
        </Button>
        
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <AuthForm />
          </div>
        </div>
      </div>
    </div>
  );
};
