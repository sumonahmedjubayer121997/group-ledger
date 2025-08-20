import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Bug } from "lucide-react";

interface DebugPanelProps {
  title: string;
  data: any;
  isOpen?: boolean;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  title,
  data,
  isOpen = false,
}) => {
  const [open, setOpen] = React.useState(isOpen);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    alert("Debug data copied to clipboard!");
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center justify-between w-full p-0"
            >
              <CardTitle className="flex items-center space-x-2 text-orange-700">
                <Bug className="w-4 h-4" />
                <span>🐛 Debug: {title}</span>
              </CardTitle>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  open ? "transform rotate-180" : ""
                }`}
              />
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <Button
                onClick={copyToClipboard}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                Copy Data
              </Button>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
