import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Upload, X, Image as ImageIcon, Check, ChevronsUpDown, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Switch } from './ui/switch';
import { Business, CATEGORIES } from '../types/business';
import { AuthUser } from '../types/user';
import { toast } from 'sonner@2.0.3';
import { createBusiness, updateBusiness, getCategories } from '../utils/api';
import { uploadMultipleImages } from '../utils/supabase/storage';

interface BusinessRegistrationProps {
  currentUser: AuthUser;
  businessToEdit: Business | null;
  onCancel: () => void;
  onSave: () => void;
}

export function BusinessRegistration({ 
  currentUser, 
  businessToEdit, 
  onCancel, 
  onSave 
}: BusinessRegistrationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  
  // Form fields
  const [name, setName] = useState(businessToEdit?.name || '');
  const [description, setDescription] = useState(businessToEdit?.description || '');
  const [categoryId, setCategoryId] = useState(businessToEdit?.category_id || '');
  const [phone, setPhone] = useState(businessToEdit?.phone || '');
  const [email, setEmail] = useState(businessToEdit?.email || '');
  const [website, setWebsite] = useState(businessToEdit?.website || '');
  const [address, setAddress] = useState(businessToEdit?.address || '');
  const [city, setCity] = useState(businessToEdit?.city || '');
  const [zipCode, setZipCode] = useState(businessToEdit?.zip_code || '');
  const [serviceArea, setServiceArea] = useState(businessToEdit?.service_area || '');
  
  // Privacy settings
  const [showPhone, setShowPhone] = useState(businessToEdit?.show_phone ?? true);
  const [showEmail, setShowEmail] = useState(businessToEdit?.show_email ?? true);
  
  // Social media
  const [facebook, setFacebook] = useState(businessToEdit?.facebook_url || '');
  const [instagram, setInstagram] = useState(businessToEdit?.instagram_url || '');
  const [twitter, setTwitter] = useState(businessToEdit?.twitter_url || '');
  const [linkedin, setLinkedin] = useState(businessToEdit?.linkedin_url || '');
  
  // Portfolio
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>(businessToEdit?.portfolio || []);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      toast.error('Failed to load categories');
    }
  }

  function handlePortfolioFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    
    // Validate file types and sizes
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      
      // Check file size
      if (file.size > MAX_SIZE) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        toast.error(`${file.name} is too large (${sizeMB}MB). Maximum size is 5MB. The image will be automatically compressed.`);
        // Still allow the file - it will be compressed during upload
        return true;
      }
      
      return true;
    });
    
    // Limit to 10 images total
    const currentTotal = portfolioFiles.length + portfolioUrls.length;
    const remaining = 10 - currentTotal;
    
    if (validFiles.length > remaining) {
      toast.error(`You can only upload ${remaining} more image(s). Maximum 10 images total.`);
      setPortfolioFiles([...portfolioFiles, ...validFiles.slice(0, remaining)]);
    } else {
      setPortfolioFiles([...portfolioFiles, ...validFiles]);
    }
    
    // Reset input
    e.target.value = '';
  }
  
  function removePortfolioFile(index: number) {
    setPortfolioFiles(portfolioFiles.filter((_, i) => i !== index));
  }
  
  function removePortfolioUrl(index: number) {
    setPortfolioUrls(portfolioUrls.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let finalPortfolioUrls = [...portfolioUrls];
      let createdBusinessId: string | null = null;
      
      // Upload new portfolio images if any
      if (portfolioFiles.length > 0) {
        setIsUploadingImages(true);
        toast.info('Uploading portfolio images...');
        
        // Create or update the business first to get an ID
        let businessId = businessToEdit?.id;
        
        if (!businessId) {
          // For new businesses, we need to create it first with basic data
          const tempBusinessData: Partial<Business> = {
            name,
            description,
            category_id: categoryId || null,
            phone: phone || null,
            email: email || null,
            website: website || null,
            address: address || null,
            city: city || null,
            zip_code: zipCode || null,
            service_area: serviceArea || null,
            show_phone: showPhone,
            show_email: showEmail,
            facebook_url: facebook || null,
            instagram_url: instagram || null,
            twitter_url: twitter || null,
            linkedin_url: linkedin || null,
            owner_id: currentUser.id,
            portfolio: [],
            hours: null,
            rating: 0,
            is_active: true,
            is_featured: false,
            verified: false,
          };
          
          const newBusiness = await createBusiness(tempBusinessData);
          businessId = newBusiness.id;
          createdBusinessId = businessId; // Track that we created the business
        }
        
        // Upload images
        const uploadedUrls = await uploadMultipleImages(portfolioFiles, businessId);
        finalPortfolioUrls = [...finalPortfolioUrls, ...uploadedUrls];
        setIsUploadingImages(false);
      }
      
      const businessData: Partial<Business> = {
        name,
        description,
        category_id: categoryId || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        address: address || null,
        city: city || null,
        zip_code: zipCode || null,
        service_area: serviceArea || null,
        show_phone: showPhone,
        show_email: showEmail,
        facebook_url: facebook || null,
        instagram_url: instagram || null,
        twitter_url: twitter || null,
        linkedin_url: linkedin || null,
        owner_id: currentUser.id,
        portfolio: finalPortfolioUrls,
        hours: null,
        rating: 0,
        is_active: true,
        is_featured: false,
        verified: false,
      };

      if (businessToEdit) {
        await updateBusiness(businessToEdit.id, businessData);
        toast.success('Business updated successfully!');
      } else if (createdBusinessId) {
        // Business was already created for image uploads, just update with final data
        await updateBusiness(createdBusinessId, businessData);
        toast.success('Business registered successfully!');
      } else {
        // Create new business (no portfolio images were uploaded)
        await createBusiness(businessData);
        toast.success('Business registered successfully!');
      }

      onSave();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save business');
    } finally {
      setIsSubmitting(false);
      setIsUploadingImages(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <Button
          onClick={onCancel}
          variant="ghost"
          className="mb-6 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cancel
        </Button>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-8">
            <h1 className="text-3xl mb-2">
              {businessToEdit ? 'Edit Business' : 'Register Your Business'}
            </h1>
            <p className="text-gray-600">
              {businessToEdit ? 'Update your business information' : 'Fill in your business details to get listed'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-xl">Basic Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="name">Business Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="ABC Plumbing"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Popover open={categoryOpen} onOpenChange={(businessToEdit && currentUser.user_metadata?.role !== 'admin') ? undefined : setCategoryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={categoryOpen}
                      className="w-full justify-between"
                      disabled={businessToEdit && currentUser.user_metadata?.role !== 'admin'}
                    >
                      {categoryId
                        ? categories.find((cat) => cat.id === categoryId)?.name
                        : "Select a category"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search categories..." />
                      <CommandList>
                        <CommandEmpty>No category found.</CommandEmpty>
                        <CommandGroup>
                          {categories.map((cat) => (
                            <CommandItem
                              key={cat.id}
                              value={cat.name}
                              onSelect={() => {
                                setCategoryId(cat.id);
                                setCategoryOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  categoryId === cat.id ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {cat.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {businessToEdit && currentUser.user_metadata?.role !== 'admin' && (
                  <p className="text-sm text-muted-foreground">Category cannot be changed after registration</p>
                )}
                {businessToEdit && currentUser.user_metadata?.role === 'admin' && (
                  <p className="text-sm text-blue-600">✓ As an admin, you can change the business category</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description * <span className="text-gray-500 text-xs">({description.length}/500)</span></Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 500) {
                      setDescription(value);
                    }
                  }}
                  required
                  placeholder="Describe your business and services..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500">Maximum 500 characters</p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="text-xl">Contact Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="(123) 456-7890"
                  />
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      {showPhone ? (
                        <Eye className="w-4 h-4 text-green-600" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-700">
                        {showPhone ? 'Visible on business page' : 'Hidden on business page'}
                      </span>
                    </div>
                    <Switch
                      checked={showPhone}
                      onCheckedChange={setShowPhone}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@business.com"
                  />
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      {showEmail ? (
                        <Eye className="w-4 h-4 text-green-600" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-700">
                        {showEmail ? 'Visible on business page' : 'Hidden on business page'}
                      </span>
                    </div>
                    <Switch
                      checked={showEmail}
                      onCheckedChange={setShowEmail}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://www.business.com"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-xl">Location</h3>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    placeholder="New York"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="10001"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceArea">Service Area</Label>
                <Input
                  id="serviceArea"
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  placeholder="Manhattan, Brooklyn, Queens"
                />
              </div>
            </div>

            {/* Portfolio */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xl">Portfolio Images (Optional)</h3>
                <p className="text-sm text-gray-500 mt-1">Upload up to 10 images showcasing your work</p>
              </div>
              
              {/* File Upload */}
              <div>
                <Label 
                  htmlFor="portfolio-upload"
                  className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Click to upload portfolio images
                    </span>
                    <span className="text-xs text-gray-400">
                      PNG, JPG, WebP, GIF up to 5MB each
                    </span>
                    <span className="text-xs text-gray-500">
                      Large images will be automatically compressed
                    </span>
                  </div>
                </Label>
                <Input
                  id="portfolio-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePortfolioFilesChange}
                  className="hidden"
                  disabled={portfolioFiles.length + portfolioUrls.length >= 10}
                />
              </div>
              
              {/* Image Previews */}
              {(portfolioFiles.length > 0 || portfolioUrls.length > 0) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Existing URLs */}
                  {portfolioUrls.map((url, index) => (
                    <div key={`url-${index}`} className="relative group">
                      <img
                        src={url}
                        alt={`Portfolio ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 shadow-md group-hover:shadow-xl transition-shadow"
                      />
                      <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removePortfolioUrl(index);
                        }}
                        className="absolute top-2 right-2 z-10 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all hover:scale-110"
                        title="Delete image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {/* New Files */}
                  {portfolioFiles.map((file, index) => {
                    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
                    const isLarge = file.size > 2 * 1024 * 1024; // > 2MB
                    return (
                      <div key={`file-${index}`} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-32 object-cover rounded-lg border-2 border-blue-400 shadow-md group-hover:shadow-xl transition-shadow"
                        />
                        <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removePortfolioFile(index);
                          }}
                          className="absolute top-2 right-2 z-10 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all hover:scale-110"
                          title="Delete image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2 left-2 z-10 flex gap-1.5 pointer-events-none">
                          <div className="px-2 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs rounded shadow-lg">
                            New
                          </div>
                          <div className={`px-2 py-1 text-white text-xs rounded shadow-lg ${
                            isLarge ? 'bg-orange-500' : 'bg-gray-600'
                          }`} title={isLarge ? 'Will be compressed during upload' : 'File size'}>
                            {sizeMB}MB
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {(portfolioFiles.length > 0 || portfolioUrls.length > 0) && (
                <p className="text-sm text-gray-500">
                  {portfolioFiles.length + portfolioUrls.length} / 10 images
                </p>
              )}
            </div>

            {/* Social Media */}
            <div className="space-y-4">
              <h3 className="text-xl">Social Media (Optional)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    placeholder="https://facebook.com/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="https://instagram.com/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter</Label>
                  <Input
                    id="twitter"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="https://twitter.com/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/..."
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-6">
              <Button
                type="button"
                onClick={onCancel}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isUploadingImages}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isUploadingImages ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Uploading Images...
                  </>
                ) : isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  businessToEdit ? 'Update Business' : 'Register Business'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}