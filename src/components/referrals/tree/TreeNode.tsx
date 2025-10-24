import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { TreeNode as TreeNodeType } from '@/hooks/useHierarchicalReferralTree';
import { TreeNodeCard } from './TreeNodeCard';
import { TreeConnector } from './TreeConnector';
import { Button } from '@/components/ui/button';

interface TreeNodeProps {
  node: TreeNodeType;
  onToggle: (nodeId: string) => void;
  onNodeClick: (node: TreeNodeType) => void;
  highlightedPath?: Set<string>;
  depth?: number;
}

export function TreeNode({ 
  node, 
  onToggle, 
  onNodeClick, 
  highlightedPath,
  depth = 0 
}: TreeNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const hasChildren = node.children.length > 0;
  const isExpanded = node.isExpanded;
  const isHighlighted = highlightedPath?.has(node.id);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggle(node.id);
    }
  };

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Node Card with Expand Button */}
      <div className="flex items-start gap-2">
        {/* Expand/Collapse Button */}
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            className="h-8 w-8 p-0 mt-2"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}
        {!hasChildren && <div className="w-8" />}

        {/* Card */}
        <div className="flex-1 min-w-0">
          <TreeNodeCard 
            node={node} 
            onClick={() => onNodeClick(node)}
            isHighlighted={isHighlighted}
          />

          {/* Sub-tree stats tooltip */}
          {hasChildren && isHovered && (
            <div className="mt-1 p-2 bg-popover border rounded-md text-xs text-muted-foreground animate-fade-in">
              <div className="grid grid-cols-2 gap-2">
                <div>Sub-tree: {node.subTreeSize} members</div>
                <div>Depth: {node.subTreeDepth} levels</div>
                <div>VIPs: {node.subTreeVIPCount}</div>
                <div>Total BSK: {node.subTreeBSK.toFixed(0)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="ml-10 mt-4 space-y-4 relative">
          {/* Connector line */}
          <TreeConnector childrenCount={node.children.length} />
          
          {/* Child nodes */}
          {node.children.map((child, index) => (
            <div key={child.id} className="relative">
              {/* Horizontal connector */}
              <div className="absolute left-0 top-6 w-6 h-px bg-border" />
              
              <TreeNode
                node={child}
                onToggle={onToggle}
                onNodeClick={onNodeClick}
                highlightedPath={highlightedPath}
                depth={depth + 1}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
