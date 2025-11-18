import { useState, useEffect } from "react";
import { Category } from "../types/business";
import { getCategories } from "../utils/api";
import { 
  Wrench, User, Car, Truck, Wind, Settings, Hammer, 
  Home, Package, Calculator, Heart, Camera, Trash2, 
  Map, Scale, Megaphone, GraduationCap, Scissors, 
  Paintbrush, Droplet, TreePine, Fence, Code, PawPrint, 
  Bug, Zap, Briefcase, Baby, Waves, Monitor, Music, 
  Pizza, Palette, LucideIcon, ChevronDown, Loader2, TrendingUp, SortAsc
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

const categoryIcons: Record<string, LucideIcon> = {
  "Locksmith": Wrench,
  "Handyman": Hammer,
  "Driving instructor/school": GraduationCap,
  "Taxi/Transfer": Car,
  "Car Rental / Car Sharing": Car,
  "Heavy lifting/Furniture Removal": Package,
  "HVAC": Wind,
  "Auto Mechanic": Settings,
  "Builder/Contractor": Home,
  "Appliance Repair and Installation": Settings,
  "Moving": Truck,
  "Delivery/Shopping/Pickup": Package,
  "Accounting/Bookkeeping/Tax Prepare": Calculator,
  "Fitness Coach/Nutritionist": Heart,
  "Car Washing/Detailing/Wrapping": Car,
  "Photographer/Videographer": Camera,
  "Junk Removal": Trash2,
  "Tours/Guides": Map,
  "Lawyer/Attorney": Scale,
  "Marketing / Content Creation": Megaphone,
  "Teacher/Tutor": GraduationCap,
  "Sewing/Seamstress/Tailoring": Scissors,
  "Auto Body / Collision Shop": Car,
  "Hair /Nails /Brows /Lips": Scissors,
  "Windshield Replacement": Car,
  "House Remodeling/Renovation": Home,
  "Pool Services": Waves,
  "Electronic / Computer Repair": Monitor,
  "Wedding Planner /DJ /Event": Music,
  "Babysitter / Nanny": Baby,
  "Lawn Care / Tree / Landscaping": TreePine,
  "Fence Installation & Services": Fence,
  "Software/Apps/Website/Design": Code,
  "Uncategorized Section": Briefcase,
  "Pet Care / Dog Walking / Grooming": PawPrint,
  "Roadside Assistance": Truck,
  "Pest Control": Bug,
  "AI Development & Integration": Code,
  "Electrician": Zap,
  "Plumber": Droplet,
  "Housekeeper": Home,
  "Cook": Pizza,
  "Painter": Paintbrush,
  "Plasterer": Palette,
  "Decorator": Palette,
  "Carpenter": Hammer,
};

interface CategoryGridProps {
  onCategoryClick: (category: string) => void;
}

export function CategoryGrid({ onCategoryClick }: CategoryGridProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [sortByPopularity, setSortByPopularity] = useState(true);
  const [clickedCategory, setClickedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, [sortByPopularity]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      
      // Add timeout to prevent hanging forever
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('⏱️ TIMEOUT: Query took too long. This usually means the "categories" table does not exist or RLS policies are not set up. Go to Supabase Dashboard → SQL Editor and run /COMPLETE_FRESH_SETUP.sql')), 15000)
      );
      
      const data = await Promise.race([
        getCategories(sortByPopularity),
        timeout
      ]) as Category[];
      
      setCategories(data);
    } catch (error: any) {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const displayedCategories = showAll ? categories : categories.slice(0, 10);
  
  // Calculate total businesses across all categories
  const totalBusinesses = categories.reduce((sum, cat) => sum + (cat.business_count || 0), 0);

  if (loading) {
    return (
      <div className="py-16 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="mb-2">Browse by Category</h2>
            <p className="text-muted-foreground">Loading categories...</p>
            <p className="text-xs text-gray-400 mt-2">Check browser console (F12) for errors if this takes too long</p>
          </div>
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  // Don't show anything if no categories - let the page work without them
  if (!loading && categories.length === 0) {
    return null;
  }

  return (
    <div className="py-16 px-4 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
           {sortByPopularity && totalBusinesses > 0 && (
            <div className="mt-4 flex justify-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-gray-600">
                  <span className="font-semibold text-blue-600">{categories.length}</span> Categories
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-gray-600">
                  <span className="font-semibold text-purple-600">{totalBusinesses}</span> Businesses
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sort Toggle */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="inline-flex gap-2 bg-white rounded-lg p-1 shadow-md">
            <Button
              size="sm"
              variant={sortByPopularity ? "default" : "ghost"}
              onClick={() => setSortByPopularity(true)}
              className="gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Most Popular
            </Button>
            <Button
              size="sm"
              variant={!sortByPopularity ? "default" : "ghost"}
              onClick={() => setSortByPopularity(false)}
              className="gap-2"
            >
              <SortAsc className="w-4 h-4" />
              A-Z
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-in fade-in duration-500">
          {displayedCategories.map((category, index) => {
            const Icon = categoryIcons[category.name] || Briefcase;
            const hasCount = typeof category.business_count === 'number';
            const isTopCategory = sortByPopularity && hasCount && index < 5 && category.business_count! > 0;
            const isClicked = clickedCategory === category.name;
            return (
              <button
                key={category.id}
                onClick={() => {
                  setClickedCategory(category.name);
                  onCategoryClick(category.id);
                }}
                disabled={clickedCategory !== null}
                style={{ animationDelay: `${index * 30}ms` }}
                className={`group relative bg-white rounded-xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden animate-in fade-in slide-in-from-bottom-4 ${
                  isTopCategory ? 'border-2 border-blue-200' : 'border border-gray-100'
                } ${clickedCategory !== null && !isClicked ? 'opacity-50 cursor-not-allowed' : ''} ${isClicked ? 'scale-95' : ''}`}
              >
                {/* 3D Background Effect */}
                <div className={`absolute inset-0 transition-opacity duration-300 ${
                  isTopCategory 
                    ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-100 group-hover:opacity-80' 
                    : 'bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100'
                }`} />
                
                {/* Trending Badge for Top 5 */}
                {isTopCategory && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full shadow-md">
                    <TrendingUp className="w-3 h-3" />
                    <span>Hot</span>
                  </div>
                )}
                
                {/* Business Count Badge */}
                {hasCount && category.business_count! > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 right-2 text-xs bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 border-0 shadow-sm"
                  >
                    {category.business_count}
                  </Badge>
                )}
                
                <div className="relative">
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg ${
                    isTopCategory 
                      ? 'bg-gradient-to-br from-blue-200 to-indigo-200' 
                      : 'bg-gradient-to-br from-blue-100 to-indigo-100'
                  }`}>
                    {isClicked ? (
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    ) : (
                      <Icon className={`w-6 h-6 ${isTopCategory ? 'text-blue-700' : 'text-blue-600'}`} />
                    )}
                  </div>
                  <p className={`text-sm text-center transition-colors duration-300 ${
                    isTopCategory 
                      ? 'text-gray-800 group-hover:text-blue-700' 
                      : 'text-gray-700 group-hover:text-blue-600'
                  }`}>
                    {category.name}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {!showAll && (
          <div className="text-center mt-8">
            <Button
              onClick={() => setShowAll(true)}
              variant="outline"
              className="bg-white hover:bg-blue-50 hover:text-blue-600 shadow-md hover:shadow-lg transition-all duration-300"
            >
              Show All Categories
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
