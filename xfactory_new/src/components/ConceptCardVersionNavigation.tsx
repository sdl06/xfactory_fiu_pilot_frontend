import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Version {
  id: number;
  version: number;
  is_latest: boolean;
  created_at: string;
  [key: string]: any;
}

interface ConceptCardVersionNavigationProps {
  versions: Version[];
  currentVersion: number;
  onVersionChange: (version: number) => void;
}

export const ConceptCardVersionNavigation: React.FC<ConceptCardVersionNavigationProps> = ({
  versions,
  currentVersion,
  onVersionChange,
}) => {
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);
  const currentIndex = sortedVersions.findIndex(v => v.version === currentVersion);
  const currentVersionData = sortedVersions[currentIndex];
  const hasPrevious = currentIndex < sortedVersions.length - 1;
  const hasNext = currentIndex > 0;

  const handlePrevious = () => {
    if (hasPrevious) {
      onVersionChange(sortedVersions[currentIndex + 1].version);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onVersionChange(sortedVersions[currentIndex - 1].version);
    }
  };

  // Show arrows even for single version, but disabled
  const showArrows = versions.length >= 1;

  return (
    <div className="flex items-center justify-center gap-3 p-3 bg-muted/30 rounded-lg">
      {showArrows && (
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={!hasPrevious || versions.length === 1}
          className="h-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      
      <div className="flex flex-col items-center gap-1">
        <div className="text-sm font-medium">Version {currentVersionData?.version || currentVersion}</div>
        {sortedVersions.length > 1 && (
          <div className="text-xs text-muted-foreground">
            {currentVersionData?.is_latest && <span className="text-green-600">Latest</span>}
            {!currentVersionData?.is_latest && `of ${sortedVersions.length} versions`}
          </div>
        )}
      </div>
      
      {showArrows && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={!hasNext || versions.length === 1}
          className="h-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

