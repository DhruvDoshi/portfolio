'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp } from 'lucide-react';

interface StockSuggestion {
  symbol: string;
  name: string;
  exchange: string;
  market: 'US' | 'CA' | 'IN';
  typeDisp?: string;
}

interface StockAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: StockSuggestion) => void;
  placeholder?: string;
  className?: string;
}

export default function StockAutocomplete({ 
  value, 
  onChange, 
  onSelect, 
  placeholder = "Search for stocks & ETFs...",
  className = ""
}: StockAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLLIElement | null)[]>([]);
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (value.length >= 1) {
        searchStocks(value);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [value]);
  
  const searchStocks = async (query: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/stock-search?q=${encodeURIComponent(query)}&count=10`);
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error searching stocks:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  };
  
  const handleSuggestionClick = (suggestion: StockSuggestion) => {
    onChange(suggestion.symbol);
    onSelect(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };
  
  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);
  
  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const getMarketBadgeColor = (market: string) => {
    switch (market) {
      case 'US': return 'bg-blue-100 text-blue-800';
      case 'CA': return 'bg-red-100 text-red-800';
      case 'IN': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getTypeBadgeColor = (typeDisp: string) => {
    switch (typeDisp?.toLowerCase()) {
      case 'etf': return 'bg-green-100 text-green-800';
      case 'equity': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length >= 1 && suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <ul className="py-1">
            {suggestions.map((suggestion, index) => (
              <li
                key={`${suggestion.symbol}-${suggestion.exchange}`}
                ref={el => { suggestionRefs.current[index] = el; }}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                  index === selectedIndex 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {suggestion.symbol}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getMarketBadgeColor(suggestion.market)}`}>
                        {suggestion.market}
                      </span>
                      {suggestion.typeDisp && (
                        <span className={`text-xs px-2 py-1 rounded-full ${getTypeBadgeColor(suggestion.typeDisp)}`}>
                          {suggestion.typeDisp.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1 truncate">
                      {suggestion.name}
                    </div>
                    {suggestion.exchange && (
                      <div className="text-xs text-gray-600 mt-1">
                        {suggestion.exchange}
                      </div>
                    )}
                  </div>
                  <TrendingUp className="w-4 h-4 text-gray-500" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {showSuggestions && suggestions.length === 0 && !loading && value.length >= 1 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="px-4 py-3 text-gray-600 text-sm">
            No stocks or ETFs found for "{value}"
          </div>
        </div>
      )}
    </div>
  );
}
