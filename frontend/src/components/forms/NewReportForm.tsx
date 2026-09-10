import React, { useState } from 'react';
import { X, Loader2, Building2, UserCheck, MapPin, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createIncident } from '../../services/api';
import type { IncidentCreate } from '../../types';
import { useUIStore } from '../../store/uiStore';

interface NewReportFormProps {
  onClose: () => void;
}

export function NewReportForm({ onClose }: NewReportFormProps) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);

  const [formData, setFormData] = useState({
    report_type: 'near_miss',
    report_date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    site_id: '',
    site_name: '',
    region: '',
    location: '',
    department: '',
    reporter_emp_id: '',
    reporter_name: '',
    activity: '',
    description: '',
    source: 'OIL_HSE_PLATFORM',
  });

  const mutation = useMutation({
    mutationFn: createIncident,
    onSuccess: (data) => {
      addToast(`Incident report created successfully (${data.id || data.report_id})`, 'success');
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    onError: (err) => {
      console.error(err);
      addToast('Failed to create report', 'error');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: IncidentCreate = {
      report_type: formData.report_type,
      report_date: formData.report_date,
      time: formData.time,
      site: {
        site_id: formData.site_id,
        site_name: formData.site_name,
        region: formData.region,
      },
      site_id: formData.site_id,
      site_name: formData.site_name,
      region: formData.region,
      location: formData.location,
      department: formData.department,
      reported_by: [
        {
          emp_id: formData.reporter_emp_id,
          name: formData.reporter_name,
        },
      ],
      primary_reporter_id: formData.reporter_emp_id,
      activity: formData.activity,
      description: formData.description,
      source: formData.source || 'OIL_HSE_PLATFORM',
    };

    mutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center backdrop-blur-sm p-4">
      <div className="bg-canvas w-full max-w-2xl rounded-lg shadow-2xl flex flex-col max-h-[92vh] border border-hairline overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline bg-canvas">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <h2 className="text-lg font-bold text-ink">New Incident Report</h2>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-mute hover:text-ink p-1 rounded hover:bg-soft-cloud transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <form id="new-report-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Section 1: Classification & Timing */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-mute uppercase tracking-wider">
                <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
                <span>Classification & Timing</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">Report Type *</label>
                  <select
                    name="report_type"
                    value={formData.report_type}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 text-sm border border-hairline rounded bg-soft-cloud focus:bg-canvas focus:outline-none focus:ring-1 focus:ring-ink"
                  >
                    <option value="near_miss">Near Miss (Precursor)</option>
                    <option value="unsafe_act">Unsafe Act</option>
                    <option value="unsafe_condition">Unsafe Condition</option>
                    <option value="incident">Incident</option>
                    <option value="hazard_observation">Hazard Observation</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">Date & Time *</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      name="report_date"
                      value={formData.report_date}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 text-sm border border-hairline rounded bg-soft-cloud focus:bg-canvas focus:outline-none focus:ring-1 focus:ring-ink"
                    />
                    <input
                      type="time"
                      name="time"
                      value={formData.time}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 text-sm border border-hairline rounded bg-soft-cloud focus:bg-canvas focus:outline-none focus:ring-1 focus:ring-ink"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Site Information */}
            <div className="space-y-3 pt-2 border-t border-hairline">
              <div className="flex items-center gap-2 text-xs font-bold text-mute uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Site Information</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">Site ID</label>
                  <input
                    type="text"
                    name="site_id"
                    value={formData.site_id}
                    onChange={handleChange}
                    placeholder="Enter site ID"
                    className="w-full px-3 py-2 text-sm border border-hairline rounded bg-soft-cloud focus:bg-canvas focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">Site Name</label>
                  <input
                    type="text"
                    name="site_name"
                    value={formData.site_name}
                    onChange={handleChange}
                    placeholder="Enter site name"
                    className="w-full px-3 py-2 text-sm border border-hairline rounded bg-soft-cloud focus:bg-canvas focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">Region</label>
                  <input
                    type="text"
                    name="region"
                    value={formData.region}
                    onChange={handleChange}
                    placeholder="Enter region"
                    className="w-full px-3 py-2 text-sm border border-hairline rounded bg-soft-cloud focus:bg-canvas focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Enter location"
                    className="w-full px-3 py-2 text-sm border border-hairline rounded bg-soft-cloud focus:bg-canvas focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="Enter department"
                    className="w-full px-3 py-2 text-sm border border-hairline rounded bg-soft-cloud focus:bg-canvas focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Reported By */}
            <div className="space-y-3 pt-2 border-t border-hairline">
              <div className="flex items-center gap-2 text-xs font-bold text-mute uppercase tracking-wider">
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Reported By</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">Employee ID</label>
                  <input
                    type="text"
                    name="reporter_emp_id"
                    value={formData.reporter_emp_id}
                    onChange={handleChange}
                    placeholder="Enter employee ID"
                    className="w-full px-3 py-2 text-sm border border-hairline rounded bg-soft-cloud focus:bg-canvas focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">Reporter Name</label>
                  <input
                    type="text"
                    name="reporter_name"
                    value={formData.reporter_name}
                    onChange={handleChange}
                    placeholder="Enter reporter name"
                    className="w-full px-3 py-2 text-sm border border-hairline rounded bg-soft-cloud focus:bg-canvas focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Operation & Description */}
            <div className="space-y-3 pt-2 border-t border-hairline">
              <div className="flex items-center gap-2 text-xs font-bold text-mute uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                <span>Operation & Description</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">Activity</label>
                  <input
                    type="text"
                    name="activity"
                    value={formData.activity}
                    onChange={handleChange}
                    placeholder="Enter activity being performed"
                    className="w-full px-3 py-2 text-sm border border-hairline rounded bg-soft-cloud focus:bg-canvas focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">Source</label>
                  <input
                    type="text"
                    name="source"
                    value={formData.source}
                    onChange={handleChange}
                    placeholder="Enter source"
                    className="w-full px-3 py-2 text-sm border border-hairline rounded bg-soft-cloud focus:bg-canvas focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder="Describe the incident narrative..."
                  className="w-full px-3 py-2 text-sm border border-hairline rounded bg-soft-cloud focus:bg-canvas focus:outline-none focus:ring-1 focus:ring-ink resize-none"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-hairline flex justify-end gap-3 bg-soft-cloud/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-mute hover:text-ink transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-report-form"
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-6 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              'Submit Report'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
