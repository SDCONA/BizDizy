import { ArrowLeft, MapPin, Star } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Business } from '../types/business';

interface SearchResultsProps {
  businesses: Business[];
  searchQuery: string;
  searchLocation: string;
  onBusinessClick: (business: Business) => void;
  onBackToHome: () => void;
}

export function SearchResults({
  businesses,
  searchQuery,
  searchLocation,
  onBusinessClick,
  onBackToHome,
}: SearchResultsProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <Button onClick={onBackToHome} variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl mb-2">Search Results</h1>
          <p className="text-gray-600">
            {searchQuery && `"${searchQuery}"`}
            {searchQuery && searchLocation && ' in '}
            {searchLocation && searchLocation}
          </p>
          <p className="text-gray-500 mt-2">
            {businesses.length} {businesses.length === 1 ? 'result' : 'results'} found
          </p>
        </div>

        {businesses.length === 0 ? (
          <Card className="p-12 text-center">
            <h3 className="text-2xl mb-2">No businesses found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search criteria
            </p>
            <Button onClick={onBackToHome}>
              Back to Home
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businesses.map((business) => (
              <div
                key={business.id}
                className="group relative cursor-pointer"
                onClick={() => onBusinessClick(business)}
              >
                {/* 3D Card Effect */}
                <div className="relative bg-gradient-to-br from-white via-white to-gray-50 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                  {/* Gradient Accent Bar */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-t-2xl z-10" />
                  
                  {/* Verified Badge */}
                  {business.verified && (
                    <div className="absolute top-2 right-2 z-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1.5 rounded-full text-xs shadow-lg flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      Verified
                    </div>
                  )}

                  {/* Main Image */}
                  {business.portfolio && business.portfolio.length > 0 ? (
                    <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100">
                      <img
                        src={business.portfolio[0]}
                        alt={business.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    </div>
                  ) : (
                    <div className="relative h-48 w-full bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-2 bg-white/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                          <MapPin className="w-8 h-8 text-blue-600" />
                        </div>
                        <p className="text-sm text-gray-600">No image available</p>
                      </div>
                    </div>
                  )}

                  {/* Business Info */}
                  <div className="p-6">
                    <h3 className="text-xl mb-2 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                      {business.name}
                    </h3>
                    
                    {/* Rating */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm text-gray-700">
                        {business.rating.toFixed(1)} • {business.review_count || 0} {business.review_count === 1 ? 'review' : 'reviews'}
                      </span>
                    </div>
                    
                    <div className="inline-block mb-3 px-3 py-1 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full">
                      <p className="text-xs text-gray-700">
                        {business.category?.name || 'Uncategorized'}
                      </p>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                      {business.description}
                    </p>

                    {/* Location */}
                    {business.city && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4 bg-gray-50 rounded-lg px-3 py-2">
                        <div className="p-1 bg-gradient-to-br from-blue-100 to-purple-100 rounded-md">
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <span>{business.city}</span>
                      </div>
                    )}
                  </div>

                  {/* Hover Glow Effect */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}