import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api.js';
import {
  Users,
  UserPlus,
  Camera,
  Shield,
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Search,
} from 'lucide-react';

export const AdminStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [photoRequests, setPhotoRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'STUDENTS' | 'PHOTO_REQUESTS'>('STUDENTS');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add Student Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addUid, setAddUid] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addBatch, setAddBatch] = useState('D1');
  const [addMdmElective, setAddMdmElective] = useState<string>('');
  const [addMdmBatch, setAddMdmBatch] = useState<string>('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Auto-Enrollment Preview & Clash Detection (Section 5.4)
  const [previewSections, setPreviewSections] = useState<any[]>([]);
  const [previewClashes, setPreviewClashes] = useState<any[]>([]);

  const fetchStudents = async () => {
    try {
      const res = await apiRequest('/admin/students');
      setStudents(res.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotoRequests = async () => {
    try {
      const res = await apiRequest('/admin/photo-requests');
      setPhotoRequests(res.requests || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchPhotoRequests();
  }, []);

  // Live auto-enrollment preview whenever batch or elective changes
  useEffect(() => {
    if (isAddModalOpen && addBatch) {
      apiRequest('/admin/students/preview-enrollment', {
        method: 'POST',
        body: JSON.stringify({
          batchName: addBatch,
          mdmElective: addMdmElective || undefined,
          mdmBatchName: addMdmBatch || undefined,
        }),
      })
        .then((res) => {
          setPreviewSections(res.sections || []);
          setPreviewClashes(res.clashes || []);
        })
        .catch(console.error);
    }
  }, [isAddModalOpen, addBatch, addMdmElective, addMdmBatch]);

  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (previewClashes.length > 0) {
      if (!window.confirm('Schedule clashes were detected! Proceed anyway?')) return;
    }
    setAddSubmitting(true);
    setAddError(null);

    try {
      await apiRequest('/admin/students', {
        method: 'POST',
        body: JSON.stringify({
          name: addName,
          uid: addUid,
          email: addEmail || `${addUid}@spit.edu.in`,
          batchName: addBatch,
          mdmElective: addMdmElective || null,
          mdmBatchName: addMdmBatch || null,
        }),
      });
      setIsAddModalOpen(false);
      setAddName('');
      setAddUid('');
      setAddEmail('');
      fetchStudents();
    } catch (err: any) {
      setAddError(err.message || 'Failed to add student');
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleUpdateStatus = async (studentId: string, status: string) => {
    if (!window.confirm(`Set student account to ${status}? (Deactivation deletes reference photo per PRIV-02).`)) return;
    try {
      await apiRequest(`/admin/students/${studentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      fetchStudents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetDevice = async (studentId: string) => {
    try {
      await apiRequest(`/admin/students/${studentId}/reset-device`, { method: 'POST' });
      alert('Device fingerprint binding cleared. Student can log in from a new device.');
      fetchStudents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReviewPhoto = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await apiRequest(`/admin/photo-requests/${requestId}/review`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      fetchPhotoRequests();
      fetchStudents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.user.name.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNumber.includes(search)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-spit-maroon-700 dark:text-rose-400" />
            <span>Student Management (TE BTech Division D)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-derived enrollments, biometric status, device binding, and account lifecycle.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-spit-maroon-700 hover:bg-spit-maroon-800 text-white font-bold text-xs shadow-md"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Student</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('STUDENTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'STUDENTS'
              ? 'bg-spit-maroon-700 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
          }`}
        >
          All Enrolled Students ({students.length})
        </button>

        <button
          onClick={() => setActiveTab('PHOTO_REQUESTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'PHOTO_REQUESTS'
              ? 'bg-spit-maroon-700 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
          }`}
        >
          <span>Photo Approval Requests</span>
          {photoRequests.filter((r) => r.status === 'PENDING').length > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-black">
              {photoRequests.filter((r) => r.status === 'PENDING').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'STUDENTS' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name or UID..."
              className="w-full px-3 py-2 pl-9 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-xl">UID</th>
                  <th className="py-2.5 px-3">Name & Email</th>
                  <th className="py-2.5 px-3">Class & Batch</th>
                  <th className="py-2.5 px-3">MDM-II Elective</th>
                  <th className="py-2.5 px-3">Biometrics</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono font-bold">{st.rollNumber}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{st.user.name}</div>
                      <div className="text-[10px] text-slate-400">{st.user.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-spit-maroon-700 dark:text-rose-400">
                        {st.division.name} · Batch {st.batch.name}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {st.mdmElective ? `${st.mdmElective} (${st.mdmBatch?.name || 'Core'})` : 'Not Opted'}
                    </td>
                    <td className="py-3 px-3">
                      {st.referencePhotoUrl ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Enrolled
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Pending Setup
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          st.user.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : st.user.status === 'SUSPENDED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {st.user.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1">
                      <button
                        onClick={() => handleResetDevice(st.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        title="Reset Anti-proxy Device Binding"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() =>
                          handleUpdateStatus(st.id, st.user.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE')
                        }
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                          st.user.status === 'ACTIVE'
                            ? 'text-rose-600 hover:bg-rose-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {st.user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Photo Approval Requests Tab (FR-AUTH-05) */}
      {activeTab === 'PHOTO_REQUESTS' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Pending Photo Replacements (FR-AUTH-05)
          </h2>

          {photoRequests.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">No photo requests found.</div>
          ) : (
            <div className="space-y-3">
              {photoRequests.map((req) => (
                <div key={req.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <img src={req.photoUrl} alt="Candidate" className="w-14 h-14 rounded-xl object-cover border" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {req.student.user.name} ({req.student.rollNumber})
                      </div>
                      <div className="text-slate-500">Reason: {req.reason || 'None provided'}</div>
                    </div>
                  </div>

                  {req.status === 'PENDING' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReviewPhoto(req.id, 'APPROVED')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReviewPhoto(req.id, 'REJECTED')}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="font-bold uppercase text-[10px]">{req.status}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Student Modal with Live Auto-Enrollment Preview & Clash Detection (Section 5.4, FR-CRS-01..02) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-spit-maroon-700" />
                <span>Add Student & Auto-Enrollment Engine (FR-AUTH-01, FR-CRS-04)</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddStudentSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold mb-1">Student Full Name</label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">SPIT UID / Roll Number</label>
                  <input
                    type="text"
                    value={addUid}
                    onChange={(e) => setAddUid(e.target.value)}
                    placeholder="e.g. 2024300299"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="Optional (defaults to <uid>@spit.edu.in)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Class & Lab Batch</label>
                  <select
                    value={addBatch}
                    onChange={(e) => setAddBatch(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-bold text-spit-maroon-700"
                  >
                    <option value="D1">TE D · Batch D1</option>
                    <option value="D2">TE D · Batch D2</option>
                    <option value="D3">TE D · Batch D3</option>
                    <option value="D4">TE D · Batch D4</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">MDM-II Elective</label>
                  <select
                    value={addMdmElective}
                    onChange={(e) => setAddMdmElective(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="">None / Not Opted</option>
                    <option value="DSA">DSA (Data Structures & Algorithms)</option>
                    <option value="IOT">IOT (Internet of Things)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">MDM Batch</label>
                  <select
                    value={addMdmBatch}
                    onChange={(e) => setAddMdmBatch(e.target.value)}
                    disabled={!addMdmElective}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-40"
                  >
                    <option value="">Select MDM Batch</option>
                    <option value="MDM Batch 1">MDM Batch 1 (Mon Lab)</option>
                    <option value="MDM Batch 2">MDM Batch 2 (Tue Lab)</option>
                    <option value="MDM Batch 3">MDM Batch 3 (Wed Lab)</option>
                  </select>
                </div>
              </div>

              {/* Clash Detection Warning Banner (FR-CRS-02) */}
              {previewClashes.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 space-y-1.5 animate-in fade-in">
                  <div className="font-black flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Schedule Clashes Detected (FR-CRS-02)!</span>
                  </div>
                  {previewClashes.map((c, i) => (
                    <div key={i} className="pl-5 text-[11px]">• {c.reason}</div>
                  ))}
                </div>
              )}

              {/* Live Auto-Enrollment Preview (Section 5.4) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex justify-between items-center">
                  <span>Auto-Enrollment Preview ({previewSections.length} Sections)</span>
                  <span className="text-[10px] text-slate-400">Division Lectures + Batch Labs</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {previewSections.map((sec) => (
                    <div key={sec.id} className="flex justify-between items-center p-1.5 bg-white dark:bg-slate-900 rounded-lg text-[11px]">
                      <div>
                        <strong>{sec.subject.name}</strong> ({sec.type}) · {sec.audienceRef}
                      </div>
                      <div className="text-slate-500">
                        {sec.dayOfWeek} {sec.startTime} (Room {sec.classroom.name})
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-spit-maroon-700 hover:bg-spit-maroon-800 text-white text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {addSubmitting ? 'Enrolling...' : 'Save & Auto-Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
