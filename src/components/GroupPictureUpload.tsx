import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, Upload, Link, User, Sparkles } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

interface GroupPictureUploadProps {
  currentPhotoURL?: string;
  onPhotoChange?: (url: string) => void;
  type?: 'photo' | 'coverImage'; // Add type to distinguish between photo and coverImage
}

const defaultMaleAvatars = [
  'photo-1581090464777-f3220bbe1b8b',
  'photo-1581092795360-fd1ca04f0952',
  'photo-1485827404703-89b55fcc595e',
  'photo-1488590528505-98d2b5aba04b'
];

const defaultFemaleAvatars = [
  'photo-1649972904349-6e44c42644a7',
  'photo-1582562124811-c09040d0a901',
  'photo-1535268647677-3057x4585',
  'photo-1517022812141-23620dba5c23'
];

const aestheticImages = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108755-2616c64ca3b8?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=150&h=150&fit=crop&crop=face'
];

// ...existing imports...

export const GroupPictureUpload: React.FC<GroupPictureUploadProps> = ({
  currentPhotoURL,
  onPhotoChange,
  type = 'photo'
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(currentPhotoURL || '');
  const [urlInput, setUrlInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  // Reset preview and selection when dialog opens
  const handleDialogOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setPreviewUrl('');
      setSelectedImage(currentPhotoURL || '');
      setUrlInput('');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const folder = type === 'coverImage' ? 'group-cover-images' : 'group-photos';
      const storageRef = ref(storage, `${folder}/${user.uid}/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      setSelectedImage(downloadURL);
      setPreviewUrl(downloadURL);

      toast({
        title: "Success",
        description: "Image uploaded successfully"
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // URL preview and selection
  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      setPreviewUrl(urlInput.trim());
      setSelectedImage(urlInput.trim());
      setUrlInput('');
    }
  };

  const handleDefaultSelect = (imageId: string) => {
    const url = `https://images.unsplash.com/${imageId}?w=150&h=150&fit=crop&crop=face`;
    setSelectedImage(url);
    setPreviewUrl(url);
  };

  const handleAestheticSelect = (url: string) => {
    setSelectedImage(url);
    setPreviewUrl(url);
  };

  const handleSave = async () => {
    if (!selectedImage) {
      toast({
        title: "Error",
        description: "Please select or upload an image.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      onPhotoChange?.(selectedImage);
      setIsOpen(false);
      toast({
        title: "Success",
        description: "Group image updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update group image",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-full">
          <Camera className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {type === 'coverImage' ? 'Update Cover Image' : 'Update Group Photo'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Preview */}
          <div className="flex justify-center">
            <Avatar className="h-24 w-24">
              <AvatarImage src={previewUrl || selectedImage || currentPhotoURL} />
              <AvatarFallback className="text-2xl">
                {user?.displayName ? getInitials(user.displayName) : 'G'}
              </AvatarFallback>
            </Avatar>
          </div>

          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="upload" className="flex items-center gap-1">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Upload</span>
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center gap-1">
                <Link className="h-4 w-4" />
                <span className="hidden sm:inline">URL</span>
              </TabsTrigger>
              <TabsTrigger value="default" className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Default</span>
              </TabsTrigger>
              <TabsTrigger value="aesthetic" className="flex items-center gap-1">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Curated</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="picture">Upload Image</Label>
                <Input
                  id="picture"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum file size: 5MB. Supported formats: JPG, PNG, WebP
                </p>
              </div>
            </TabsContent>

            <TabsContent value="url" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                  />
                  <Button onClick={handleUrlSubmit} variant="outline" disabled={!urlInput.trim()}>
                    Preview
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="default" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Male Avatars</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {defaultMaleAvatars.map((imageId) => (
                      <button
                        key={imageId}
                        type="button"
                        onClick={() => handleDefaultSelect(imageId)}
                        className={`rounded-full border-2 transition-all ${
                          selectedImage === `https://images.unsplash.com/${imageId}?w=150&h=150&fit=crop&crop=face`
                            ? 'border-primary'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={`https://images.unsplash.com/${imageId}?w=150&h=150&fit=crop&crop=face`} />
                        </Avatar>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Female Avatars</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {defaultFemaleAvatars.map((imageId) => (
                      <button
                        key={imageId}
                        type="button"
                        onClick={() => handleDefaultSelect(imageId)}
                        className={`rounded-full border-2 transition-all ${
                          selectedImage === `https://images.unsplash.com/${imageId}?w=150&h=150&fit=crop&crop=face`
                            ? 'border-primary'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={`https://images.unsplash.com/${imageId}?w=150&h=150&fit=crop&crop=face`} />
                        </Avatar>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="aesthetic" className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Curated Collection</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {aestheticImages.map((url, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleAestheticSelect(url)}
                      className={`rounded-full border-2 transition-all ${
                        selectedImage === url
                          ? 'border-primary'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={url} />
                      </Avatar>
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || !selectedImage}
            >
              {isLoading ? 'Saving...' : 'Save Picture'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};