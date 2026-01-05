import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Bell, Loader2, AlertCircle, CheckCircle, XCircle, Clock, Eye, FileText } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { apiGet, apiPut } from '../../utils/api';

const Notifications = () => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [newStatus, setNewStatus] = useState('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMessageExpanded, setIsMessageExpanded] = useState(false);
  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch project access requests from project_access_requests table
      // Pass status filter to backend if not 'all'
      const endpoint = statusFilter === 'all' 
        ? '/api/project-access-requests'
        : `/api/project-access-requests?status=${statusFilter}`;
      
      const result = await apiGet(endpoint);
      
      if (result.success && Array.isArray(result.data)) {
        setRequests(result.data);
      } else {
        throw new Error(result.error || 'Could not load project access requests.');
      }
    } catch (err) {
      console.error("Error fetching project access requests:", err);
      setError(err.message || 'Failed to load project access requests.');
      toast({ 
        title: "Error", 
        description: err.message || 'Failed to load project access requests.', 
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleStatusChange = (newFilter) => {
    setStatusFilter(newFilter);
  };

  const handleViewClick = async (request) => {
    setSelectedRequest(request);
    setIsMessageExpanded(false); // Reset expanded state when opening new request
    setViewDialogOpen(true);
  };

  const handleApproveClick = (request) => {
    setSelectedRequest(request);
    setAdminResponse(request.adminResponse || '');
    setNewStatus('approved');
    setResponseDialogOpen(true);
  };

  const handleRejectClick = (request) => {
    setSelectedRequest(request);
    setAdminResponse(request.adminResponse || '');
    setNewStatus('rejected');
    setResponseDialogOpen(true);
  };

  const handleRespondClick = (request) => {
    setSelectedRequest(request);
    setAdminResponse(request.adminResponse || '');
    setNewStatus(request.status);
    setResponseDialogOpen(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedRequest) return;

    setIsSubmitting(true);
    try {
      // Use the request ID to update the request in project_access_requests table
      const result = await apiPut(`/api/project-access-requests/${selectedRequest.id}`, {
        status: newStatus,
        adminResponse: adminResponse.trim() || null
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update request.');
      }

      toast({ 
        title: "Request Updated", 
        description: `Request ${newStatus === 'approved' ? 'approved' : newStatus === 'rejected' ? 'rejected' : 'updated'} successfully.`,
        variant: "success"
      });

      setResponseDialogOpen(false);
      setViewDialogOpen(false);
      setSelectedRequest(null);
      setAdminResponse('');
      // Refresh the requests list
      await fetchRequests();
    } catch (err) {
      console.error("Update request error:", err);
      toast({ 
        title: "Error", 
        description: `Could not update request: ${err.message}`, 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusDot = (status) => {
    const colors = {
      pending: 'bg-yellow-500',
      approved: 'bg-green-500',
      rejected: 'bg-red-500',
      completed: 'bg-blue-500'
    };
    return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || colors.pending} mr-2`} />;
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      completed: 'Completed'
    };
    return labels[status] || 'Pending';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserRole = (request) => {
    if (request.userIsAdmin) return 'Administrator';
    if (request.userIsProjectManager) return 'Project Manager';
    return 'Employee';
  };

  const getRoleIcon = (request) => {
    if (request.userIsAdmin) {
      return <span className="inline-block w-3 h-3 bg-purple-500 rounded-sm mr-1.5" />;
    }
    if (request.userIsProjectManager) {
      return <span className="inline-block w-3 h-3 bg-blue-500 rounded-sm mr-1.5" />;
    }
    return <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1.5" />;
  };

  const generateRequestId = (id) => {
    // Generate a short ID like PR-1021 from the UUID
    const hash = id.split('-')[0].substring(0, 4).toUpperCase();
    const num = parseInt(hash, 16) % 10000;
    return `PR-${String(num).padStart(4, '0')}`;
  };

  const truncateMessage = (message) => {
    if (!message) return '-';
    
    const messageLength = message.length;
    
    // If message is 50 characters or less, show in full
    if (messageLength <= 50) {
      return message;
    }
    
    // If message exceeds 50 characters, show first 50 characters with ellipsis
    return message.substring(0, 50) + '...';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-slate-600">Loading notifications...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700 font-medium">Failed to load notifications</p>
        <p className="text-red-600 text-sm mb-3">{error}</p>
        <Button onClick={fetchRequests} variant="outline" size="sm">Retry</Button>
      </div>
    );
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Project Access Requests</h1>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {pendingCount} Pending
            </Badge>
          )}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Filter:</label>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                {/* <SelectItem value="completed">Completed</SelectItem> */}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-2 text-xs font-semibold text-gray-700">Request ID</th>
                  <th className="text-left p-2 text-xs font-semibold text-gray-700">Requester Name</th>
                  <th className="text-left p-2 text-xs font-semibold text-gray-700">Role</th>
                  <th className="text-left p-2 text-xs font-semibold text-gray-700" style={{ maxWidth: '300px' }}>Request Message</th>
                  <th className="text-left p-2 text-xs font-semibold text-gray-700">Requested On</th>
                  <th className="text-left p-2 text-xs font-semibold text-gray-700">Status</th>
                  <th className="text-center p-2 text-xs font-semibold text-gray-700">View</th>
                  <th className="text-right p-2 text-xs font-semibold text-gray-700">
                    <div className="flex items-center justify-end gap-1">
                      <FileText className="h-3 w-3" />
                      Actions
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-gray-500 text-sm">
                      No project access requests found
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-2 text-sm text-gray-900 font-medium">
                        {generateRequestId(request.id)}
                      </td>
                      <td className="p-2 text-sm text-gray-900">
                        {request.userName}
                      </td>
                      <td className="p-2 text-sm text-gray-900">
                        <div className="flex items-center">
                          {getRoleIcon(request)}
                          {getUserRole(request)}
                        </div>
                      </td>
                      <td className="p-2 text-sm text-gray-900" style={{ maxWidth: '300px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        <div className="break-words" style={{ overflowWrap: 'anywhere' }}>
                          {truncateMessage(request.requestMessage)}
                        </div>
                      </td>
                      <td className="p-2 text-sm text-gray-600">
                        {formatDate(request.createdAt)}
                      </td>
                      <td className="p-2 text-sm">
                        <div className="flex items-center">
                          {getStatusDot(request.status)}
                          <span className="text-gray-900">{getStatusLabel(request.status)}</span>
                        </div>
                      </td>
                      {/* View Column */}
                      <td className="p-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewClick(request)}
                          className="h-7 w-7 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                      {/* Actions Column */}
                      <td className="p-2">
                        {request.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveClick(request)}
                              className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRejectClick(request)}
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end">
                            <span className="text-xs text-gray-400">—</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Access Request Details</DialogTitle>
            <DialogDescription>
              View full details of the project access request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Request ID:</span>
                  <p className="text-gray-900">{generateRequestId(selectedRequest.id)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <p className="text-gray-900 flex items-center">
                    {getStatusDot(selectedRequest.status)}
                    {getStatusLabel(selectedRequest.status)}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Requester:</span>
                  <p className="text-gray-900">{selectedRequest.userName}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Role:</span>
                  <p className="text-gray-900 flex items-center">
                    {getRoleIcon(selectedRequest)}
                    {getUserRole(selectedRequest)}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Employee ID:</span>
                  <p className="text-gray-900">{selectedRequest.userEmployeeId || '-'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <p className="text-gray-900">{selectedRequest.userEmail}</p>
                </div>
                <div className="col-span-2">
                  <span className="font-medium text-gray-700">Requested On:</span>
                  <p className="text-gray-900">{formatDate(selectedRequest.createdAt)}</p>
                </div>
              </div>
              
              <div>
                <span className="font-medium text-gray-700 block mb-2">Request Message:</span>
                <div className="bg-gray-50 rounded p-3 text-sm text-gray-900 w-full overflow-x-hidden">
                  <p className="break-words overflow-wrap-anywhere whitespace-pre-wrap m-0" style={{ wordBreak: 'break-word' }}>
                    {selectedRequest.requestMessage && selectedRequest.requestMessage.length > 50 ? (
                      <>
                        {isMessageExpanded 
                          ? selectedRequest.requestMessage 
                          : truncateMessage(selectedRequest.requestMessage)}
                        <button
                          onClick={() => setIsMessageExpanded(!isMessageExpanded)}
                          className="text-black hover:underline ml-1 font-medium cursor-pointer"
                          style={{ color: 'black' }}
                        >
                          {isMessageExpanded ? 'Read less' : 'Read more'}
                        </button>
                      </>
                    ) : (
                      selectedRequest.requestMessage || '-'
                    )}
                  </p>
                </div>
              </div>

              {selectedRequest.adminResponse && (
                <div>
                  <span className="font-medium text-gray-700 block mb-2">Admin Response:</span>
                  <div className="bg-blue-50 rounded p-3 text-sm text-gray-900 whitespace-pre-wrap">
                    {selectedRequest.adminResponse}
                  </div>
                  {selectedRequest.responderName && (
                    <p className="text-xs text-gray-500 mt-1">
                      Responded by {selectedRequest.responderName} on {formatDate(selectedRequest.respondedAt)}
                    </p>
                  )}
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewDialogOpen(false);
                      handleApproveClick(selectedRequest);
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewDialogOpen(false);
                      handleRejectClick(selectedRequest);
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {newStatus === 'approved' ? 'Approve' : newStatus === 'rejected' ? 'Reject' : 'Respond to'} Project Access Request
            </DialogTitle>
            <DialogDescription>
              {newStatus === 'approved' 
                ? 'Approve this request and optionally provide a response.'
                : newStatus === 'rejected'
                ? 'Reject this request and optionally provide a reason.'
                : 'Update the status and provide a response for this project access request.'}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-700 mb-1">Request from: {selectedRequest.userName}</p>
                <p className="text-gray-600 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  {truncateMessage(selectedRequest.requestMessage)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Status
                </label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  {newStatus === 'rejected' ? 'Rejection Reason' : 'Response'} (Optional)
                </label>
                <Textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder={newStatus === 'rejected' 
                    ? "Provide a reason for rejection..."
                    : "Provide any additional information or instructions..."}
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setResponseDialogOpen(false);
                    setSelectedRequest(null);
                    setAdminResponse('');
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitResponse}
                  disabled={isSubmitting}
                  className={newStatus === 'approved' 
                    ? "bg-green-600 hover:bg-green-700"
                    : newStatus === 'rejected'
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    newStatus === 'approved' ? 'Approve' : newStatus === 'rejected' ? 'Reject' : 'Update Request'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Notifications;
