import { Search, MapPin, Loader2 } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useState } from 'react';

interface SearchHeroProps {
  onSearch: (service: string, location: string) => void;
  isSearching?: boolean;
}

export function SearchHero({ onSearch, isSearching = false }: SearchHeroProps) {
  const [service, setService] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(service, location);
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 pt-8 pb-12 px-4">
      {/* 3D Background Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Heading */}
        <h1 className="text-3xl md:text-6xl mb-4 text-white drop-shadow-lg">
          Find Local Businesses
        </h1>
        <p className="text-base md:text-2xl text-white/90 mb-12">
          Connect with trusted service providers in your area
        </p>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-3 flex flex-col md:flex-row gap-3">
            {/* Service Input */}
            <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl">
              <Search className="w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="What service do you need?"
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            {/* Location Input */}
            <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl">
              <MapPin className="w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="City or ZIP code"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            {/* Search Button */}
            <Button
              type="submit"
              size="lg"
              disabled={isSearching}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Popular Searches */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <span className="text-white/80 text-sm">Popular:</span>
          {['Plumber', 'Electrician', 'Handyman', 'Locksmith', 'HVAC'].map((term) => (
            <button
              key={term}
              onClick={() => {
                setService(term);
                onSearch(term, location);
              }}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full text-sm backdrop-blur-sm transition-all hover:scale-105"
            >
              {term}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
