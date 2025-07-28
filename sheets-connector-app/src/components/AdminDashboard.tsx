import React, { useEffect, useState } from 'react';

const AdminDashboard: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all monitoring jobs
  const fetchJobs = async () => {
    setLoading(true);
    setError('');
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/monitoring-jobs', {
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': authToken || ''
        }
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setJobs(data);
      } else {
        setError(data.error || 'Failed to fetch jobs');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Stop selected job
  const stopJob = async (jobId: string) => {
    const authToken = localStorage.getItem('authToken');
    try {
      const response = await fetch(`/api/monitoring/stop/${jobId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': authToken || ''
        }
      });
      const data = await response.json();
      if (data.success) {
        alert('✅ Job stopped');
        fetchJobs();
      } else {
        alert(`❌ Failed to stop job: ${data.error}`);
      }
    } catch (err) {
      alert('❌ Network error');
    }
  };

  // Stop all jobs
  const stopAllJobs = async () => {
    const authToken = localStorage.getItem('authToken');
    try {
      const response = await fetch('/api/monitoring/stop-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': authToken || ''
        }
      });
      const data = await response.json();
      if (data.success) {
        alert(`✅ Stopped ${data.stoppedCount || 'all'} jobs.`);
        fetchJobs();
      } else {
        alert(`❌ Failed to stop all jobs: ${data.error}`);
      }
    } catch (err) {
      alert('❌ Network error');
    }
  };

  return (
    <div className="admin-dashboard">
      <h2>Admin: Current Monitoring Jobs</h2>
      {loading ? <p>Loading...</p> : null}
      {error ? <p style={{color:'red'}}>{error}</p> : null}
      <button className="btn-danger" onClick={stopAllJobs} style={{marginBottom:'1rem'}}>🛑 Stop All Jobs</button>
      <table style={{width:'100%',marginBottom:'2rem'}}>
        <thead>
          <tr>
            <th>Job ID</th>
            <th>Sheet</th>
            <th>Range</th>
            <th>User</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job:any) => (
            <tr key={job.id}>
              <td>{job.id}</td>
              <td>{job.spreadsheetName}</td>
              <td>{job.range}</td>
              <td>{job.userEmail}</td>
              <td>{job.status}</td>
              <td>
                <button className="btn-danger" onClick={() => stopJob(job.id)}>🛑 Stop</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboard;
