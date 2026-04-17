'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, ArrowLeft, X, Camera, Image as ImageIcon, User } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import type { MediaUploadStepProps } from "../types";

export function MediaUploadStep({ data, onUpdate, onNext, onBack }: MediaUploadStepProps) {
  const t = useTranslations('owner.onboarding.steps.media');
  
  const [logoPreview, setLogoPreview] = useState<string | null>(data.logo_url || null);
  const [ownerPhotoPreview, setOwnerPhotoPreview] = useState<string | null>(data.owner_photo_url || null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>(data.gallery_images || []);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (file: File, type: 'logo' | 'owner-photo' | 'gallery'): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await fetch('/api/v1/upload/media', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const result = await response.json();
    return result.url;
  };

  const handleLogoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('errors.invalidFileType'));
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('errors.fileTooLarge'));
      return;
    }

    setIsUploading(true);
    try {
      // Create preview
      const preview = URL.createObjectURL(file);
      setLogoPreview(preview);

      // Upload file
      const url = await uploadFile(file, 'logo');
      onUpdate({ logo_url: url });
      
      toast.success(t('upload.logoSuccess'));
    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error(t('upload.logoError'));
      setLogoPreview(null);
    } finally {
      setIsUploading(false);
    }
  }, [onUpdate, t]);

  const handleOwnerPhotoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('errors.invalidFileType'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('errors.fileTooLarge'));
      return;
    }

    setIsUploading(true);
    try {
      const preview = URL.createObjectURL(file);
      setOwnerPhotoPreview(preview);

      const url = await uploadFile(file, 'owner-photo');
      onUpdate({ owner_photo_url: url });
      
      toast.success(t('upload.ownerPhotoSuccess'));
    } catch (error) {
      console.error('Owner photo upload error:', error);
      toast.error(t('upload.ownerPhotoError'));
      setOwnerPhotoPreview(null);
    } finally {
      setIsUploading(false);
    }
  }, [onUpdate, t]);

  const handleGalleryUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate files
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name}: ${t('errors.invalidFileType')}`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: ${t('errors.fileTooLarge')}`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = validFiles.map(async (file) => {
        const preview = URL.createObjectURL(file);
        const url = await uploadFile(file, 'gallery');
        return { preview, url };
      });

      const results = await Promise.all(uploadPromises);
      const newPreviews = results.map(r => r.preview);
      const newUrls = results.map(r => r.url);

      setGalleryPreviews(prev => [...prev, ...newPreviews]);
      onUpdate({ 
        gallery_images: [...(data.gallery_images || []), ...newUrls]
      });
      
      toast.success(t('upload.gallerySuccess', { count: validFiles.length }));
    } catch (error) {
      console.error('Gallery upload error:', error);
      toast.error(t('upload.galleryError'));
    } finally {
      setIsUploading(false);
    }
  }, [data.gallery_images, onUpdate, t]);

  const removeGalleryImage = useCallback((index: number) => {
    const newPreviews = galleryPreviews.filter((_, i) => i !== index);
    const newUrls = (data.gallery_images || []).filter((_, i) => i !== index);
    
    setGalleryPreviews(newPreviews);
    onUpdate({ gallery_images: newUrls });
  }, [galleryPreviews, data.gallery_images, onUpdate]);

  const removeLogo = useCallback(() => {
    setLogoPreview(null);
    onUpdate({ logo_url: undefined });
  }, [onUpdate]);

  const removeOwnerPhoto = useCallback(() => {
    setOwnerPhotoPreview(null);
    onUpdate({ owner_photo_url: undefined });
  }, [onUpdate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-6 w-6 text-green-600" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Logo Upload */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-blue-600" />
            <Label className="text-lg font-semibold">{t('sections.logo.title')}</Label>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('sections.logo.description')}
          </p>
          
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <div className="relative">
                <Image
                  src={logoPreview}
                  alt="Logo preview"
                  width={96}
                  height={96}
                  className="w-24 h-24 object-contain border rounded-lg bg-white"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  onClick={removeLogo}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
            
            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={isUploading}
                className="mb-2"
              />
              <p className="text-xs text-gray-500">
                {t('sections.logo.requirements')}
              </p>
            </div>
          </div>
        </div>

        {/* Owner Photo Upload */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-purple-600" />
            <Label className="text-lg font-semibold">{t('sections.ownerPhoto.title')}</Label>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('sections.ownerPhoto.description')}
          </p>
          
          <div className="flex items-center gap-4">
            {ownerPhotoPreview ? (
              <div className="relative">
                <Image
                  src={ownerPhotoPreview}
                  alt="Owner photo preview"
                  width={96}
                  height={96}
                  className="w-24 h-24 object-cover border rounded-full"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  onClick={removeOwnerPhoto}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-gray-400" />
              </div>
            )}
            
            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={handleOwnerPhotoUpload}
                disabled={isUploading}
                className="mb-2"
              />
              <p className="text-xs text-gray-500">
                {t('sections.ownerPhoto.requirements')}
              </p>
            </div>
          </div>
        </div>

        {/* Gallery Upload */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-green-600" />
            <Label className="text-lg font-semibold">{t('sections.gallery.title')}</Label>
            <span className="text-sm text-gray-500">({t('sections.gallery.optional')})</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('sections.gallery.description')}
          </p>
          
          <div>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handleGalleryUpload}
              disabled={isUploading}
              className="mb-4"
            />
            <p className="text-xs text-gray-500 mb-4">
              {t('sections.gallery.requirements')}
            </p>
            
            {galleryPreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {galleryPreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <Image
                      src={preview}
                      alt={`Gallery preview ${index + 1}`}
                      width={200}
                      height={96}
                      className="w-full h-24 object-cover border rounded-lg"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => removeGalleryImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onBack} disabled={isUploading}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('buttons.back')}
          </Button>
          
          <Button onClick={onNext} disabled={isUploading}>
            {t('buttons.continue')}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
