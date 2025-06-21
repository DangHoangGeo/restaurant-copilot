'use client'

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ImageIcon, 
  Upload, 
  Trash2, 
  Star,
  Edit,
  Loader2,
  AlertCircle,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";

interface GalleryImage {
  id: string;
  url: string;
  alt_text: string;
  is_hero: boolean;
  display_order: number;
  created_at: string;
}

interface GalleryManagerProps {
  locale: string;
}

export function GalleryManager({ }: GalleryManagerProps) {
  const t = useTranslations("owner.homepage.gallery");
  const tCommon = useTranslations("common");
  
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [editAltText, setEditAltText] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // Load gallery images
  const loadGallery = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/v1/restaurant/gallery');
      if (!response.ok) throw new Error('Failed to load gallery');
      
      const data = await response.json();
      setImages(data.images || []);
    } catch (error) {
      console.error('Error loading gallery:', error);
      toast.error(t('errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(files);
    }
  };

  const uploadImages = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    try {
      setIsUploading(true);
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('image', file);
        formData.append('alt_text', file.name.replace(/\.[^/.]+$/, ""));
        formData.append('display_order', String(images.length + i + 1));

        const response = await fetch('/api/v1/restaurant/gallery', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      toast.success(t('upload.success'));
      setSelectedFiles(null);
      setShowUploadDialog(false);
      await loadGallery();
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error(t('upload.error'));
    } finally {
      setIsUploading(false);
    }
  };

  const deleteImage = async (imageId: string) => {
    try {
      const response = await fetch(`/api/v1/restaurant/gallery/${imageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete image');

      toast.success(t('delete.success'));
      await loadGallery();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error(t('delete.error'));
    }
  };

  const updateImage = async (imageId: string, updates: Partial<GalleryImage>) => {
    try {
      const response = await fetch(`/api/v1/restaurant/gallery/${imageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update image');

      toast.success(t('update.success'));
      setEditingImage(null);
      await loadGallery();
    } catch (error) {
      console.error('Error updating image:', error);
      toast.error(t('update.error'));
    }
  };

  const setHeroImage = async (imageId: string) => {
    try {
      // First, remove hero status from all images
      const heroImage = images.find(img => img.is_hero);
      if (heroImage) {
        await updateImage(heroImage.id, { is_hero: false });
      }
      
      // Then set the new hero image
      await updateImage(imageId, { is_hero: true });
    } catch (error) {
      console.error('Error setting hero image:', error);
      toast.error(t('hero.error'));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              {t('title')}
            </CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                {t('buttons.upload')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('upload.title')}</DialogTitle>
                <DialogDescription>{t('upload.description')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="image-upload">{t('upload.selectFiles')}</Label>
                  <Input
                    id="image-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="mt-1"
                  />
                </div>
                {selectedFiles && selectedFiles.length > 0 && (
                  <div className="text-sm text-gray-600">
                    {t('upload.selectedCount', { count: selectedFiles.length })}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUploadDialog(false);
                    setSelectedFiles(null);
                  }}
                >
                  {tCommon('buttons.cancel')}
                </Button>
                <Button
                  onClick={uploadImages}
                  disabled={!selectedFiles || selectedFiles.length === 0 || isUploading}
                >
                  {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('buttons.upload')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {images.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-semibold text-gray-800 dark:text-gray-200">
              {t('empty.title')}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {t('empty.description')}
            </p>
            <Button
              className="mt-4"
              onClick={() => setShowUploadDialog(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              {t('buttons.uploadFirst')}
            </Button>
          </div>
        ) : (
          <>
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('info.heroImage')}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image) => (
                <Card key={image.id} className="overflow-hidden">
                  <div className="relative aspect-video">
                    <Image
                      src={image.url}
                      alt={image.alt_text}
                      fill
                      className="object-cover"
                    />
                    {image.is_hero && (
                      <div className="absolute top-2 left-2 bg-yellow-500 text-yellow-50 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {t('hero.label')}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium truncate">{image.alt_text}</p>
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingImage(image);
                            setEditAltText(image.alt_text);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteImage(image.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!image.is_hero && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setHeroImage(image.id)}
                          className="flex-1"
                        >
                          <Star className="mr-1 h-3 w-3" />
                          {t('buttons.setHero')}
                        </Button>
                      )}
                      {image.is_hero && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="flex-1"
                        >
                          <Check className="mr-1 h-3 w-3" />
                          {t('hero.current')}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Edit Image Dialog */}
        <Dialog open={!!editingImage} onOpenChange={() => setEditingImage(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('edit.title')}</DialogTitle>
              <DialogDescription>{t('edit.description')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="alt-text">{t('edit.altText')}</Label>
                <Input
                  id="alt-text"
                  value={editAltText}
                  onChange={(e) => setEditAltText(e.target.value)}
                  placeholder={t('edit.altTextPlaceholder')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingImage(null)}>
                {tCommon('buttons.cancel')}
              </Button>
              <Button
                onClick={() => {
                  if (editingImage) {
                    updateImage(editingImage.id, { alt_text: editAltText });
                  }
                }}
              >
                {tCommon('buttons.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
