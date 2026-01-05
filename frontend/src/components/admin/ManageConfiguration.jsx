import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { useToast } from '../../hooks/use-toast';
import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/api';
import { 
  Settings,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Save,
  Key,
  Loader2,
  AlertCircle,
  X // <-- FIX: Added the 'X' icon import
} from 'lucide-react';

// Proof of loading
console.log("--- LOADING ManageConfiguration V4 (Fix 'X' import) ---");

// Helper function to group flat config array by category
const groupConfigsByCategory = (configs = []) => {
  return configs.reduce((acc, config) => {
    const category = config.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(config);
    return acc;
  }, {});
};

const ManageConfiguration = () => {
  const { toast } = useToast();

  // Data States
  const [configurations, setConfigurations] = useState({}); // Grouped configs
  const [categories, setCategories] = useState([]);
  
  // UI States
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showSecrets, setShowSecrets] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editedValue, setEditedValue] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newConfig, setNewConfig] = useState({
    category: '',
    key: '', // Match API/DB
    value: '', // Match API/DB
    description: '',
    isSecret: false
  });

  // Loading/Error States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // For actions
  const [error, setError] = useState(null);


  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet('/api/configurations');

      if (result.success && result.data && result.categories) {
        setConfigurations(result.data); // Use the 'data' object directly
        const categoryKeys = result.categories.sort(); // Use the 'categories' array
        setCategories(categoryKeys);

        if (categoryKeys.length > 0) {
          setSelectedCategory(prev => categoryKeys.includes(prev) ? prev : categoryKeys[0]);
        } else {
          setSelectedCategory('');
        }
      } else {
        throw new Error(result.error || 'Failed to fetch configurations.');
      }
    } catch (err) {
      console.error("Error fetching configurations:", err);
      setError(err.message);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Action Handlers ---

  const handleEdit = (config) => {
    setEditingId(config.id);
    setEditedValue(config.value); 
  };

  const handleSave = async (id) => {
    setIsSubmitting(true);
    try {
      const result = await apiPut(`/api/configurations/${id}`, { value: editedValue });
      if (!result.success) throw new Error(result.error || 'Update failed.');

      toast({ title: "Configuration Updated", description: "Value saved successfully.", variant: "success" });
      setEditingId(null);
      fetchData(); 
    } catch (err) {
      console.error("Update config error:", err);
      toast({ title: "Error", description: `Could not save: ${err.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, keyName) => {
     if (!window.confirm(`Are you sure you want to delete "${keyName}"? This cannot be undone.`)) return;

    setIsSubmitting(true);
    try {
        const result = await apiDelete(`/api/configurations/${id}`);
        if (!result.success) throw new Error(result.error || 'Delete failed.');

        toast({ title: "Configuration Deleted", description: `"${keyName}" removed.`, variant: "success" });
        fetchData(); // Refetch
    } catch (err) {
        console.error("Delete config error:", err);
        toast({ title: "Error", description: `Could not delete: ${err.message}`, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleAddNew = async () => {
    if (!newConfig.category || !newConfig.key || !newConfig.value) {
      toast({ title: "Missing Information", description: "Category, Key, and Value are required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
        const payload = {
            ...newConfig,
            isSecret: newConfig.isSecret ? 1 : 0 
        };
        const result = await apiPost('/api/configurations', payload);
        if (!result.success) throw new Error(result.error || 'Create failed.');

        toast({ title: "Configuration Added", description: "New configuration saved.", variant: "success" });
        setNewConfig({ category: '', key: '', value: '', description: '', isSecret: false });
        setIsAddingNew(false);
        fetchData(); // Refetch
    } catch (err) {
        console.error("Add config error:", err);
        toast({ title: "Error", description: `Could not add: ${err.message}`, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const toggleSecretVisibility = (id) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- Render Functions ---

  const renderValue = (config) => {
    if (editingId === config.id) {
      return (
        <div className="flex items-center gap-2">
          <Input
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
            className="h-8"
            type={!!config.isSecret && !showSecrets[config.id] ? 'password' : 'text'}
            disabled={isSubmitting}
          />
          <Button size="sm" onClick={() => handleSave(config.id)} className="h-8" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          </Button>
           <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8" disabled={isSubmitting}>
            <X className="h-3 w-3" /> {/* <-- This was the broken part */}
          </Button>
        </div>
      );
    }

    if (!!config.isSecret && !showSecrets[config.id]) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-gray-600">••••••••••••</span>
          <Button variant="ghost" size="sm" onClick={() => toggleSecretVisibility(config.id)} className="h-6 w-6 p-0">
            <Eye className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 max-w-xs truncate">
        <span className="truncate">{config.value}</span> 
        {!!config.isSecret && (
          <Button variant="ghost" size="sm" onClick={() => toggleSecretVisibility(config.id)} className="h-6 w-6 p-0">
            <EyeOff className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading configurations...</span>
      </div>
    );
  }

  if (error) {
     return (
       <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-medium">Failed to load configurations</p>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <Button onClick={fetchData}>Try Again</Button>
        </div>
     );
  }

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex justify-between items-start">
         <div>
          {/* <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />
            System Configuration
          </h1> */}
          <p className="text-slate-600 text-sm mt-1">
            Manage application settings, API keys, and system configurations
          </p>
          <p className="text-xs text-red-600 mt-1 font-medium">
            ⚠️ Changes to these settings affect the entire application and may require a restart
          </p>
        </div>
        <Dialog open={isAddingNew} onOpenChange={setIsAddingNew}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Configuration
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Configuration</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={newConfig.category} onValueChange={(value) => setNewConfig({ ...newConfig, category: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select existing category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Or type a new category"
                  value={newConfig.category}
                  onChange={(e) => setNewConfig({ ...newConfig, category: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Key</label>
                <Input
                  value={newConfig.key}
                  onChange={(e) => setNewConfig({ ...newConfig, key: e.target.value })}
                  placeholder="e.g., smtp_host"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Value</label>
                <Input
                  value={newConfig.value}
                  onChange={(e) => setNewConfig({ ...newConfig, value: e.target.value })}
                  placeholder="Configuration value"
                  className="mt-1"
                  type={newConfig.isSecret ? 'password' : 'text'}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newConfig.description}
                  onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                  placeholder="Optional description"
                  className="mt-1"
                  rows={2}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isSecret"
                  checked={newConfig.isSecret}
                  onCheckedChange={(checked) => setNewConfig({ ...newConfig, isSecret: !!checked })}
                />
                <label htmlFor="isSecret" className="text-sm">Mark as secret (password/API key)</label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddingNew(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                   {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Add Configuration
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 flex-wrap border-b pb-2">
        {categories.map(category => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className={selectedCategory === category ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            {category}
            <Badge variant="secondary" className="ml-2">
              {configurations[category]?.length || 0}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Configuration Table */}
      {selectedCategory && configurations[selectedCategory] && (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium text-gray-700 w-[25%]">Key</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700 w-[30%]">Value</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700 w-[30%]">Description</th>
                    <th className="text-center p-3 text-sm font-medium text-gray-700 w-[15%]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {configurations[selectedCategory].map(config => (
                    <tr key={config.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 align-top">
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {config.key}
                          </code>
                          {!!config.isSecret && ( // Use boolean
                            <Badge variant="secondary" className="text-xs">
                              <Key className="h-3 w-3 mr-1" />
                              Secret
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3 align-top">
                        {renderValue(config)}
                      </td>
                      <td className="p-3 text-sm text-gray-600 align-top">
                        {config.description}
                      </td>
                      <td className="p-3 align-top">
                        <div className="flex justify-center gap-2">
                          {editingId !== config.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(config)}
                              disabled={isSubmitting}
                            >
                              Edit
                            </Button>
                          )}
                          <Button
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(config.id, config.key)}
                            className="text-red-600 hover:bg-red-100"
                            disabled={isSubmitting}
                            aria-label={`Delete ${config.key}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManageConfiguration;