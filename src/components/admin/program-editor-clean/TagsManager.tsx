import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface TagsManagerProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagsManager({ tags, onChange }: TagsManagerProps) {
  const [inputValue, setInputValue] = useState("");

  const handleAddTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Tags</label>
      
      <div className="flex gap-2">
        <Input
          placeholder="Add a tag..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={handleAddTag}
          disabled={!inputValue.trim()}
          className="px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="pl-3 pr-1 py-1 gap-1"
          >
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        
        {tags.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No tags added yet. Press Enter to add tags.
          </p>
        )}
      </div>
    </div>
  );
}
