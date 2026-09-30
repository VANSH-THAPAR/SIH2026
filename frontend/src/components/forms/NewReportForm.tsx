import React, { useState } from 'react';
import { X, Loader2, Building2, UserCheck, MapPin, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createIncident } from '../../services/api';
import type { IncidentCreate } from '../../types';
import { useUIStore } from '../../store/uiStore';
import clsx from 'clsx';

interface NewReportFormProps {
  onClose: () => void;
  isModal?: boolean;
}

export function NewReportForm({ onClose, isModal = true }: NewReportFormProps) {
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
      addToast(`Incident report created successfully (${data.id || (data as any).report_id})`, 'success');
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (isModal) onClose();
      // If it's not a modal, we might want to clear the form here
      if (!isModal) {
         setFormData({
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
      }
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

  const inputCls = 'w-full px-3 py-2 text-[12.5px] border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] transition-colors';
  const labelCls = 'text-[11px] font-semibold text-[var(--color-text-secondary)] block mb-1.5';
  const sectionHeaderCls = 'flex items-center gap-2 text-[10.5px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mt-6 mb-4 pb-2 border-b border-[var(--color-border)]';

  const formContent = (
    <div className={clsx('bg-white w-full max-w-2xl flex flex-col', isModal ? 'rounded-2xl shadow-xl max-h-[90vh] border border-[var(--color-border)] overflow-hidden' : 'h-full')}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)] bg-white">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
            <h2 className="text-[16px] font-bold text-[var(--color-text-primary)]">New Incident Report</h2>
          </div>
          {isModal && (
            <button
              type="button"
              onClick={onClose}
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] p-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 pb-8">
          <form id="new-report-form" onSubmit={handleSubmit} className="space-y-2">

            {/* Section 1: Classification & Timing */}
            <div className={sectionHeaderCls}>
              <AlertCircle className="w-3.5 h-3.5" style={{ color: 'var(--color-critical)' }} />
              <span>Classification & Timing</span>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>Report Type *</label>
                <select
                  name="report_type"
                  value={formData.report_type}
                  onChange={handleChange}
                  required
                  className={inputCls}
                >
                  <option value="near_miss">Near Miss (Precursor)</option>
                  <option value="unsafe_act">Unsafe Act</option>
                  <option value="unsafe_condition">Unsafe Condition</option>
                  <option value="incident">Incident</option>
                  <option value="hazard_observation">Hazard Observation</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Date & Time *</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    name="report_date"
                    value={formData.report_date}
                    onChange={handleChange}
                    required
                    className={inputCls}
                  />
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    required
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Site Information */}
            <div className={sectionHeaderCls}>
              <Building2 className="w-3.5 h-3.5" style={{ color: 'var(--color-info)' }} />
              <span>Site Information</span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className={labelCls}>Site ID</label>
                <input
                  type="text"
                  name="site_id"
                  value={formData.site_id}
                  onChange={handleChange}
                  placeholder="Enter site ID"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Site Name</label>
                <input
                  type="text"
                  name="site_name"
                  value={formData.site_name}
                  onChange={handleChange}
                  placeholder="Enter site name"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Region</label>
                <input
                  type="text"
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  placeholder="Enter region"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Enter location"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="Enter department"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Section 3: Reported By */}
            <div className={sectionHeaderCls}>
              <UserCheck className="w-3.5 h-3.5" style={{ color: 'var(--color-low)' }} />
              <span>Reported By</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Employee ID</label>
                <input
                  type="text"
                  name="reporter_emp_id"
                  value={formData.reporter_emp_id}
                  onChange={handleChange}
                  placeholder="Enter employee ID"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Reporter Name</label>
                <input
                  type="text"
                  name="reporter_name"
                  value={formData.reporter_name}
                  onChange={handleChange}
                  placeholder="Enter reporter name"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Section 4: Operation & Description */}
            <div className={sectionHeaderCls}>
              <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--color-high)' }} />
              <span>Operation & Description</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelCls}>Activity</label>
                <input
                  type="text"
                  name="activity"
                  value={formData.activity}
                  onChange={handleChange}
                  placeholder="Enter activity being performed"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Source</label>
                <input
                  type="text"
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  placeholder="Enter source"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Describe the incident narrative..."
                className={clsx(inputCls, 'resize-none')}
              />
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-3 bg-[var(--color-surface)]">
          {isModal && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] hover:bg-white hover:text-[var(--color-text-primary)] rounded-lg border border-[var(--color-border)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            form="new-report-form"
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-6 py-2 text-[12px] font-semibold text-white rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            style={{ background: 'var(--color-primary)' }}
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
  );
  if (!isModal) {
    return formContent;
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center backdrop-blur-sm p-4">
      {formContent}
    </div>
  );
}
