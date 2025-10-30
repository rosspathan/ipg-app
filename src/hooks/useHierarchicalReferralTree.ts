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
  const { data: downlineData, isLoading, error, refetch } = useDownlineTree();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['virtual-root']));
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVIPOnly, setFilterVIPOnly] = useState(false);
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [orphanCount, setOrphanCount] = useState(0);

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

    // Build parent-child relationships using direct_sponsor_id
    const orphans: TreeNode[] = [];
    
    downlineData.members.forEach(member => {
      const node = nodeMap.get(member.user_id);
      if (!node) return;

      // Use direct_sponsor_id to find the actual parent in the tree
      if (member.direct_sponsor_id) {
        const parent = nodeMap.get(member.direct_sponsor_id);
        if (parent) {
          // Parent exists in our downline tree
          parent.children.push(node);
          node.parentId = parent.userId;
        } else if (member.level > 1) {
          // Level > 1 but parent not found = orphan
          orphans.push(node);
        }
        // If level === 1 and parent not in nodeMap, parent is the viewer (expected)
      }
    });

    // Sort children by join date, then username for stable ordering
    const sortChildren = (node: TreeNode) => {
      node.children.sort((a, b) => {
        const dateA = a.joinedAt || '';
        const dateB = b.joinedAt || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return a.username.localeCompare(b.username);
      });
      node.children.forEach(sortChildren);
    };

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

    // Find root nodes: ONLY Level 1 members (direct referrals of viewer)
    const rootNodes: TreeNode[] = [];
    downlineData.members.forEach(member => {
      const node = nodeMap.get(member.user_id);
      if (!node) return;
      
      // Strict rule: root nodes are ONLY level === 1
      if (member.level === 1 && node.parentId === null) {
        rootNodes.push(node);
      }
    });

    // Sort and calculate stats for all root nodes
    rootNodes.forEach(node => {
      sortChildren(node);
      calculateSubTreeStats(node);
    });
    
    // Track orphan count
    setOrphanCount(orphans.length);
    
    // Log diagnostics for violations
    if (orphans.length > 0) {
      console.warn(`[Tree Health] Found ${orphans.length} orphaned nodes (level > 1 without parent in dataset)`);
    }

    // Create virtual root representing the viewer
    // Add orphans as a special collapsed branch if any exist
    const allChildren = [...rootNodes];
    
    if (orphans.length > 0) {
      const orphanBranch: TreeNode = {
        id: 'orphaned-members',
        userId: 'orphaned-members',
        displayName: `Unlinked members (${orphans.length})`,
        username: 'orphans',
        badgeName: null,
        level: 0,
        generatedAmount: 0,
        joinedAt: '',
        isActive: false,
        children: orphans,
        directReferralsCount: orphans.length,
        subTreeSize: orphans.length,
        subTreeVIPCount: 0,
        subTreeBSK: 0,
        subTreeDepth: 0,
        isExpanded: false,
        parentId: null,
      };
      allChildren.push(orphanBranch);
    }
    
    const virtualRoot: TreeNode = {
      id: 'virtual-root',
      userId: 'virtual-root',
      displayName: 'You',
      username: 'you',
      badgeName: null,
      level: 0,
      generatedAmount: 0,
      joinedAt: '',
      isActive: true,
      children: allChildren,
      directReferralsCount: 0,
      subTreeSize: 0,
      subTreeVIPCount: 0,
      subTreeBSK: 0,
      subTreeDepth: 0,
      isExpanded: true,
      parentId: null,
    };
    
    // Aggregate stats from children for the virtual root
    calculateSubTreeStats(virtualRoot);

    return {
      rootNode: virtualRoot,
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
    refetch,
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
    orphanCount,
  };
}
