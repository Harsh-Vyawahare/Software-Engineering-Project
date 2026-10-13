import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { MapPin, Navigation, Edit2, CheckCircle2, X } from 'lucide-react';

export const AdminClassroomsPage: React.FC = () => {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRoom, setEditRoom] = useState<any | null>(null);
  const [lat, setLat] = useState<number>(19.1232);
  const [lon, setLon] = useState<number>(72.8363);
  const [radius, setRadius] = useState<number>(100);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchClassrooms = async () => {
    try {
      const res = await apiRequest('/admin/classrooms');
      setClassrooms(res.classrooms || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleOpenEdit = (room: any) => {
    setEditRoom(room);
    setLat(room.latitude);
    setLon(room.longitude);
    setRadius(room.allowedRadiusM || 100);
    setMsg(null);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(Math.round(pos.coords.latitude * 1000000) / 1000000);
        setLon(Math.round(pos.coords.longitude * 1000000) / 1000000);
        setMsg('Coordinates acquired from device GPS!');
      },
      (err) => {
        alert(`Location acquisition failed: ${err.message}`);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSaveCoordinates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRoom) return;
    setSaving(true);

    try {
      await apiRequest(`/admin/classrooms/${editRoom.id}/gps`, {
        method: 'PATCH',
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          allowedRadiusM: radius,
        }),
      });
      setEditRoom(null);
      fetchClassrooms();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-spit-maroon-700 dark:text-rose-400" />
          <span>Classrooms & Campus Geofencing (FR-CRS-03, BR-11)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure exact GPS boundaries and allowable verification radius for each venue.
        </p>
      </div>

      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px]">
              <tr>
                <th className="py-2.5 px-3 rounded-l-xl">Room No.</th>
                <th className="py-2.5 px-3">Latitude</th>
                <th className="py-2.5 px-3">Longitude</th>
                <th className="py-2.5 px-3">Allowed Radius</th>
                <th className="py-2.5 px-3 rounded-r-xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {classrooms.map((rm) => (
                <tr key={rm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">
                    Room {rm.name}
                  </td>
                  <td className="py-3 px-3 font-mono">{rm.latitude.toFixed(6)}° N</td>
                  <td className="py-3 px-3 font-mono">{rm.longitude.toFixed(6)}° E</td>
                  <td className="py-3 px-3 font-bold text-emerald-600">{rm.allowedRadiusM} meters</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleOpenEdit(rm)}
                      className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1 ml-auto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit GPS</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GPS Coordinate Edit Modal */}
      {editRoom && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-spit-maroon-700" />
                <span>Configure GPS for Room {editRoom.name}</span>
              </h3>
              <button onClick={() => setEditRoom(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {msg && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{msg}</span>
              </div>
            )}

            <form onSubmit={handleSaveCoordinates} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={lon}
                  onChange={(e) => setLon(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Allowed Verification Radius (meters)</label>
                <input
                  type="number"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="w-full py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold flex items-center justify-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Use My Current Device Location</span>
              </button>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditRoom(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-spit-maroon-700 hover:bg-spit-maroon-800 text-white font-bold shadow-md disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Geofence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
