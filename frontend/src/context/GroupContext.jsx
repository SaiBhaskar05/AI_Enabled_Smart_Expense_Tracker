import { createContext, useContext, useState, useEffect } from 'react';
import { groupsAPI } from '../services/api';
import { useAuth } from './AuthContext';

const GroupContext = createContext(null);

export const GroupProvider = ({ children }) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(() => {
    try {
      const stored = localStorage.getItem('activeGroup');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [workspaceMode, setWorkspaceMode] = useState(() => {
    return localStorage.getItem('workspaceMode') || 'personal';
  });
  const [showWorkspacePrompt, setShowWorkspacePrompt] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchGroups = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await groupsAPI.getAll();
      const list = res.data?.data?.groups || [];
      setGroups(list);
      // Sync active group if already selected
      if (activeGroup) {
        const found = list.find(g => g._id === activeGroup._id);
        if (found) {
          setActiveGroup(found);
          localStorage.setItem('activeGroup', JSON.stringify(found));
        }
      }
    } catch (err) {
      console.error('Failed to fetch groups in GroupContext:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchGroups();
    } else {
      setGroups([]);
      setActiveGroup(null);
    }
  }, [user]);

  const selectGroup = (group) => {
    setActiveGroup(group);
    setWorkspaceMode('group');
    localStorage.setItem('activeGroup', JSON.stringify(group));
    localStorage.setItem('workspaceMode', 'group');
  };

  const switchToPersonal = () => {
    setActiveGroup(null);
    setWorkspaceMode('personal');
    localStorage.removeItem('activeGroup');
    localStorage.setItem('workspaceMode', 'personal');
  };

  return (
    <GroupContext.Provider value={{
      groups,
      activeGroup,
      workspaceMode,
      loading,
      showWorkspacePrompt,
      setShowWorkspacePrompt,
      fetchGroups,
      selectGroup,
      switchToPersonal,
      setWorkspaceMode
    }}>
      {children}
    </GroupContext.Provider>
  );
};

export const useGroup = () => {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error('useGroup must be used within GroupProvider');
  return ctx;
};
