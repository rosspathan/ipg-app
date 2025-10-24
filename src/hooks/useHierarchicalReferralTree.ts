import { useMemo, useState } from 'react';
import { useDownlineTree } from './useDownlineTree';

export interface TreeNode {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  badgeName: string | null;
  level: number;
  generatedAmount: number;
  joinedAt: string;
  isActive: boolean;
  children: TreeNode[];
  directReferralsCount: number;
  subTreeSize: number;
  subTreeVIPCount: number;
  subTreeBSK: number;
  subTreeDepth: number;
  isExpanded: boolean;
  parentId: string | null;
}

export interface HierarchicalTreeData {
  rootNode: TreeNode | null;
  flatMap: Map<string, TreeNode>;
  maxDepth: number;
  totalNodes: number;
}

export function useHierarchicalReferralTree() {
  const { data: downlineData, isLoading, error } = useDownlineTree();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVIPOnly, setFilterVIPOnly] = useState(false);
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);

  const hierarchicalData = useMemo((): HierarchicalTreeData => {
    if (!downlineData || downlineData.members.length === 0) {
      return { rootNode: null, flatMap: new Map(), maxDepth: 0, totalNodes: 0 };
    }

    // Build node map
    const nodeMap = new Map<string, TreeNode>();
    
    // Create nodes for all members
    downlineData.members.forEach(member => {
      nodeMap.set(member.user_id, {
        id: member.user_id,
        userId: member.user_id,
        displayName: member.display_name,
        username: member.username,
        badgeName: member.current_badge,
        level: member.level,
        generatedAmount: member.total_generated,
        joinedAt: member.join_date || '',
        isActive: member.total_generated > 0,
        children: [],
        directReferralsCount: 0,
        subTreeSize: 0,
        subTreeVIPCount: 0,
        subTreeBSK: 0,
        subTreeDepth: 0,
        isExpanded: expandedNodes.has(member.user_id),
        parentId: null,
      });
    });

    // Build parent-child relationships
    // Sort by level to ensure parents are processed first
    const sortedMembers = [...downlineData.members].sort((a, b) => a.level - b.level);
    
    sortedMembers.forEach(member => {
      const node = nodeMap.get(member.user_id);
      if (!node) return;

      // Find parent (member at level - 1 who referred this user)
      if (member.level > 1) {
        const potentialParents = sortedMembers.filter(m => m.level === member.level - 1);
        // In the data structure, we need to infer relationships
        // For now, we'll build a linear chain based on level ordering
        if (potentialParents.length > 0) {
          const parent = nodeMap.get(potentialParents[potentialParents.length - 1].user_id);
          if (parent) {
            parent.children.push(node);
            node.parentId = parent.userId;
          }
        }
      }
    });

    // Calculate sub-tree statistics recursively
    const calculateSubTreeStats = (node: TreeNode): void => {
      node.directReferralsCount = node.children.length;
      node.subTreeSize = node.children.length;
      node.subTreeBSK = node.generatedAmount;
      node.subTreeVIPCount = node.badgeName?.toLowerCase().includes('vip') ? 1 : 0;
      node.subTreeDepth = 0;

      node.children.forEach(child => {
        calculateSubTreeStats(child);
        node.subTreeSize += child.subTreeSize;
        node.subTreeBSK += child.subTreeBSK;
        node.subTreeVIPCount += child.subTreeVIPCount;
        node.subTreeDepth = Math.max(node.subTreeDepth, child.subTreeDepth + 1);
      });
    };

    // Find root (level 1 member)
    const rootMember = downlineData.members.find(m => m.level === 1);
    const rootNode = rootMember ? nodeMap.get(rootMember.user_id) : null;

    if (rootNode) {
      calculateSubTreeStats(rootNode);
    }

    return {
      rootNode,
      flatMap: nodeMap,
      maxDepth: downlineData.deepestLevel,
      totalNodes: downlineData.members.length,
    };
  }, [downlineData, expandedNodes]);

  const filteredTree = useMemo((): TreeNode | null => {
    if (!hierarchicalData.rootNode) return null;

    const filterNode = (node: TreeNode): TreeNode | null => {
      // Apply filters
      if (filterVIPOnly && !node.badgeName?.toLowerCase().includes('vip')) {
        return null;
      }
      if (filterActiveOnly && !node.isActive) {
        return null;
      }
      if (searchQuery && !node.displayName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !node.username.toLowerCase().includes(searchQuery.toLowerCase())) {
        return null;
      }

      // Recursively filter children
      const filteredChildren = node.children
        .map(child => filterNode(child))
        .filter((child): child is TreeNode => child !== null);

      // If node passes filter OR has filtered children, include it
      if (filteredChildren.length > 0 || !searchQuery) {
        return { ...node, children: filteredChildren };
      }

      return node;
    };

    return filterNode(hierarchicalData.rootNode);
  }, [hierarchicalData, searchQuery, filterVIPOnly, filterActiveOnly]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allIds = Array.from(hierarchicalData.flatMap.keys());
    setExpandedNodes(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const expandToLevel = (level: number) => {
    const nodesToExpand = Array.from(hierarchicalData.flatMap.values())
      .filter(node => node.level <= level)
      .map(node => node.id);
    setExpandedNodes(new Set(nodesToExpand));
  };

  return {
    data: filteredTree,
    rawData: hierarchicalData,
    isLoading,
    error,
    toggleNode,
    expandAll,
    collapseAll,
    expandToLevel,
    searchQuery,
    setSearchQuery,
    filterVIPOnly,
    setFilterVIPOnly,
    filterActiveOnly,
    setFilterActiveOnly,
    expandedNodes,
  };
}
