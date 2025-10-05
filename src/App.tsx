import { useState, useEffect } from 'react'
import { Clock, Calendar, BarChart3, History, CheckCircle, XCircle, AlertCircle, Edit2, Trash2, LogOut, User, Shield, UserCheck, UserX } from 'lucide-react'
import { supabase, type Project, type UserRole, supabaseOperations } from './lib/supabase'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import AccessDenied from './components/AccessDenied'
import './App.css'

type TabType = 'clock' | 'projects' | 'hours' | 'history' | 'admin'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('clock')
  const [selectedProject, setSelectedProject] = useState('The Shop')
  const [selectedRole, setSelectedRole] = useState('')
  const [currentLocation, setCurrentLocation] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<string | null>(null)
  const [isWorking, setIsWorking] = useState(false)
  const [workStartTime, setWorkStartTime] = useState<Date | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [historyFilter, setHistoryFilter] = useState('this-week')
  const [todaysSessions, setTodaysSessions] = useState<{
    project: string;
    location: string;
    role: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
  }[]>([])
  
  // Common landscaping roles
  const commonRoles = [
    'General Labor',
    'Excavator Operator',
    'Hydro Mulch Machine Operator',
    'Skid Steer Operator',
    'Truck Driver',
    'Crew Leader',
    'Irrigation Tech',
    'Tree Care Specialist',
    'Hardscape Installer',
    'Landscape Foreman'
  ]
  
  // Base locations (always available)

  
  // Projects (loaded from database)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Project management state
  const [showAddProject, setShowAddProject] = useState(false)
  const [projectFilter, setProjectFilter] = useState<'all' | 'active' | 'pending'>('all')
  const [newProject, setNewProject] = useState({
    name: '',
    type: '',
    location: '',
    status: 'pending' as 'active' | 'pending'
  })
  
  // Edit project state
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [showEditProject, setShowEditProject] = useState(false)
  
  // Toast notification state
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'warning'
    show: boolean
  }>({ message: '', type: 'success', show: false })

  // Authentication state
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'user' | 'approved' | 'admin' | null>(null)
  const [allUsers, setAllUsers] = useState<UserRole[]>([])

  // Toast notification function
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type, show: true })
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }))
    }, 4000)
  }

  // Authentication effects
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      // Load user role if logged in
      if (session?.user) {
        await loadUserRole(session.user.id, session.user.email!)
      }
      
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      // Load user role if logged in
      if (session?.user) {
        await loadUserRole(session.user.id, session.user.email!)
      } else {
        setUserRole(null)
      }
      
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Load user role from database
  const loadUserRole = async (userId: string, email: string) => {
    try {
      console.log('Loading user role for:', email)
      
      // WORKAROUND: Supabase queries hang in auth flow, so use fetch API directly
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${userId}&select=*`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      )
      
      const data = await response.json()
      console.log('Fetch API response:', data)
      
      if (data && data.length > 0) {
        const role = data[0]
        console.log('Setting role from fetch:', role.role)
        setUserRole(role.role)
      } else {
        // No role exists - default to user (unapproved)
        console.log('No role found, defaulting to user')
        setUserRole('user')
      }
    } catch (error) {
      console.error('Error loading user role:', error)
      setUserRole('user')
    }
  }

  // Load all users (for admin)
  const loadAllUsers = async () => {
    if (userRole !== 'admin') return
    
    try {
      const users = await supabaseOperations.getAllUserRoles()
      setAllUsers(users || [])
    } catch (error) {
      console.error('Error loading users:', error)
      showToast('Error loading users', 'error')
    }
  }

  // Load all users when admin tab is accessed
  useEffect(() => {
    if (activeTab === 'admin' && userRole === 'admin') {
      loadAllUsers()
    }
  }, [activeTab, userRole])

  // Sign in with Google function
  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    })
    
    if (error) {
      showToast('Error signing in with Google', 'error')
      console.error('Google sign-in error:', error)
    }
  }

  // Sign out function
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      showToast('Error signing out', 'error')
    } else {
      showToast('Signed out successfully', 'success')
    }
  }

  // Load projects from database on app start
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('status', 'active')
          .order('name')
        
        if (error) {
          console.error('Error loading projects:', error)
          // Start with empty projects array - let admins add their own
          setProjects([])
        } else {
          setProjects(data || [])
        }
      } catch (error) {
        console.error('Database connection error:', error)
        // Start with empty projects array - let admins add their own
        setProjects([])
      } finally {
        setIsLoading(false)
      }
    }
    
    loadProjects()
  }, [])

  // Project management functions
  const addNewProject = async () => {
    console.log('addNewProject called with:', newProject)
    
    if (!newProject.name.trim() || !newProject.type.trim() || !newProject.location.trim()) {
      console.log('Validation failed - missing required fields')
      showToast('Please fill in all required fields (Name, Type, and Location)', 'error')
      return
    }

    try {
      const projectData = {
        name: newProject.name.trim(),
        type: newProject.type.trim(),
        location: newProject.location.trim(),
        status: newProject.status,
        created_at: new Date().toISOString()
      }

      console.log('Sending project data to Supabase:', projectData)

      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single()

      console.log('Supabase response - data:', data, 'error:', error)

      if (error) {
        console.error('Supabase error adding project:', error)
        showToast(`Failed to add project: ${error.message}`, 'error')
        return
      }

      console.log('Project added successfully:', data)

      // Add to local state
      setProjects(prev => [...prev, data])
      
      // Reset form
      setNewProject({
        name: '',
        type: '',
        location: '',
        status: 'pending'
      })
      setShowAddProject(false)
      
      showToast('Project added successfully!', 'success')
      
    } catch (err) {
      console.error('Unexpected error adding project:', err)
      showToast(`Failed to add project: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) {
        console.error('Error deleting project:', error)
        showToast(`Failed to delete project: ${error.message}`, 'error')
        return
      }

      // Remove from local state
      setProjects(prev => prev.filter(p => p.id !== projectId))
      showToast('Project deleted successfully!', 'success')
      
    } catch (err) {
      console.error('Unexpected error deleting project:', err)
      showToast(`Failed to delete project: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
    }
  }

  const startEditProject = (project: Project) => {
    setEditingProject(project)
    setShowEditProject(true)
  }

  const updateProject = async () => {
    if (!editingProject || !editingProject.name.trim() || !editingProject.type.trim() || !editingProject.location.trim()) {
      showToast('Please fill in all required fields (Name, Type, and Location)', 'error')
      return
    }

    try {
      const projectData = {
        name: editingProject.name.trim(),
        type: editingProject.type.trim(),
        location: editingProject.location.trim(),
        status: editingProject.status
      }

      const { data, error } = await supabase
        .from('projects')
        .update(projectData)
        .eq('id', editingProject.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating project:', error)
        showToast(`Failed to update project: ${error.message}`, 'error')
        return
      }

      // Update local state
      setProjects(prev => prev.map(p => p.id === editingProject.id ? data : p))
      setShowEditProject(false)
      setEditingProject(null)
      showToast('Project updated successfully!', 'success')
      
    } catch (err) {
      console.error('Unexpected error updating project:', err)
      showToast(`Failed to update project: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
    }
  }

  const updateProjectStatus = async (projectId: string, newStatus: 'active' | 'pending') => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', projectId)

      if (error) {
        console.error('Error updating project status:', error)
        alert('Failed to update project status')
        return
      }

      // Update local state
      setProjects(prev => 
        prev.map(project => 
          project.id === projectId 
            ? { ...project, status: newStatus }
            : project
        )
      )
    } catch (err) {
      console.error('Error updating project status:', err)
      alert('Failed to update project status')
    }
  }

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])
  


  const getLocationFromProject = (projectName: string) => {
    if (projectName === 'The Shop') return 'The Shop'
    const project = projects.find(p => p.name === projectName)
    return project?.location || 'Unknown Location'
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const calculateDuration = (start: Date, end: Date) => {
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60)) // minutes
  }

  const saveWorkSession = async (sessionData: {
    project: string;
    location: string;
    role: string;
    startTime: Date;
    endTime: Date;
    duration: number;
  }) => {
    try {
      // For now, we'll save without user_id since we don't have authentication yet
      // When Google OAuth is implemented, we'll use the actual user_id
      const { error } = await supabase
        .from('work_sessions')
        .insert({
          user_id: null, // Will be set when authentication is implemented
          project: sessionData.project,
          location: sessionData.location,
          role: sessionData.role,
          start_time: sessionData.startTime.toISOString(),
          end_time: sessionData.endTime.toISOString(),
          duration: sessionData.duration
        })
      
      if (error) {
        console.error('Error saving work session:', error)
      } else {
        console.log('Work session saved successfully!')
      }
    } catch (error) {
      console.error('Database error:', error)
    }
  }

  const handleClockAction = async () => {
    const newLocation = getLocationFromProject(selectedProject)
    const now = new Date()
    
    if (!isWorking) {
      // Start work - require role selection
      if (!selectedRole) {
        alert('Please select your role before clocking in.')
        return
      }
      setIsWorking(true)
      setCurrentLocation(newLocation)
      setCurrentRole(selectedRole)
      setWorkStartTime(now)
    } else if (newLocation !== currentLocation || selectedRole !== currentRole) {
      // Transfer to new location/role - end current session and start new one
      if (workStartTime && currentRole) {
        const duration = calculateDuration(workStartTime, now)
        const sessionData = {
          project: currentLocation === 'The Shop' ? 'The Shop' : 
            projects.find(p => p.location === currentLocation)?.name || 'Unknown',
          location: currentLocation!,
          role: currentRole,
          startTime: workStartTime,
          endTime: now,
          duration
        }
        
        // Save to local state
        setTodaysSessions(prev => [...prev, sessionData])
        
        // Save to database
        await saveWorkSession(sessionData)
      }
      // Start new session
      if (!selectedRole) {
        alert('Please select your role before transferring.')
        return
      }
      setCurrentLocation(newLocation)
      setCurrentRole(selectedRole)
      setWorkStartTime(now)
    } else {
      // End work day
      if (workStartTime && currentRole) {
        const duration = calculateDuration(workStartTime, now)
        const sessionData = {
          project: currentLocation === 'The Shop' ? 'The Shop' : 
            projects.find(p => p.location === currentLocation)?.name || 'Unknown',
          location: currentLocation!,
          role: currentRole,
          startTime: workStartTime,
          endTime: now,
          duration
        }
        
        // Save to local state
        setTodaysSessions(prev => [...prev, sessionData])
        
        // Save to database
        await saveWorkSession(sessionData)
      }
      setIsWorking(false)
      setCurrentLocation(null)
      setCurrentRole(null)
      setWorkStartTime(null)
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'clock':
        return (
          <div className="tab-content">
            <div className="clock-container">
              <div className="current-time">
                <div className="time-display">{formatTime(currentTime)}</div>
                <div className="date-display">
                  {currentTime.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>

                            <div className="project-selector">
                <label>Select Project:</label>
                <select 
                  value={selectedProject} 
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="dropdown"
                  disabled={isLoading}
                >
                  <option value="The Shop">The Shop</option>
                  {isLoading ? (
                    <option disabled>Loading projects...</option>
                  ) : (
                    projects.map(project => (
                      <option key={project.id} value={project.name}>
                        {project.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="role-selector">
                <label>Your Role/Task:</label>
                <select 
                  value={selectedRole} 
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="dropdown"
                >
                  <option value="">Choose your role...</option>
                  {commonRoles.map(role => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="combined-status">
                {currentLocation ? (
                  <div className="currently-working">
                    <div className="status-indicator">Currently Working at {currentLocation}</div>
                    {currentRole && <div className="role-indicator">Role: {currentRole}</div>}
                    {workStartTime && (
                      <div className="work-duration">
                        Started at {formatTime(workStartTime)} 
                        ({calculateDuration(workStartTime, currentTime)} minutes)
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="ready-status">
                    <div className="status-indicator">Ready to clock in at {getLocationFromProject(selectedProject)}</div>
                    {selectedRole && <div className="role-indicator">As: {selectedRole}</div>}
                  </div>
                )}
              </div>
              
              <div className="work-actions">
                <div className="action-container">
                  <button 
                    className="main-action-btn"
                    onClick={handleClockAction}
                  >
                    {!isWorking 
                      ? 'Clock In' 
                      : (getLocationFromProject(selectedProject) !== currentLocation || selectedRole !== currentRole)
                        ? `Transfer to ${selectedProject}${selectedRole ? ` (${selectedRole})` : ''}`
                        : 'End Work Day'
                    }
                  </button>
                </div>
              </div>

              {todaysSessions.length > 0 && (
                <div className="todays-summary">
                  <div className="summary-header">
                    <h4>Today's Work</h4>
                    <button 
                      className="clear-sessions-btn"
                      onClick={() => {
                        setTodaysSessions([])
                        setIsWorking(false)
                        setCurrentLocation(null)
                        setCurrentRole(null)
                        setWorkStartTime(null)
                        setSelectedRole('')
                      }}
                      title="Clear all sessions for testing"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="session-list">
                    {todaysSessions.map((session, index) => (
                      <div key={index} className="session-item">
                        <div className="session-project">{session.project}</div>
                        <div className="session-role">Role: {session.role}</div>
                        <div className="session-time">
                          {formatTime(session.startTime)} - 
                          {session.endTime ? formatTime(session.endTime) : 'Ongoing'}
                          {session.duration && ` (${session.duration} min)`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      case 'projects':
        const filteredProjects = projects.filter(project => {
          if (projectFilter === 'all') return true
          return project.status === projectFilter
        })
        
        return (
          <div className="tab-content">
            <div className="projects-container">
              <div className="projects-header">
                <h2>Project Management</h2>
                
                {/* Filter buttons */}
                <div className="project-filters">
                  <button 
                    className={`filter-btn ${projectFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setProjectFilter('all')}
                  >
                    All ({projects.length})
                  </button>
                  <button 
                    className={`filter-btn ${projectFilter === 'active' ? 'active' : ''}`}
                    onClick={() => setProjectFilter('active')}
                  >
                    Active ({projects.filter(p => p.status === 'active').length})
                  </button>
                  <button 
                    className={`filter-btn ${projectFilter === 'pending' ? 'active' : ''}`}
                    onClick={() => setProjectFilter('pending')}
                  >
                    Pending ({projects.filter(p => p.status === 'pending').length})
                  </button>
                </div>
              </div>
              
              {/* Add new project form */}
              {showAddProject && (
                <div className="add-project-form">
                  <h3>Add New Project</h3>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Project Name *"
                      value={newProject.name}
                      onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <select
                      value={newProject.type}
                      onChange={(e) => setNewProject(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="" disabled>Project Type *</option>
                      <option value="Landscape Installation">Landscape Installation</option>
                      <option value="Weekly Maintenance">Weekly Maintenance</option>
                      <option value="Commercial Maintenance">Commercial Maintenance</option>
                      <option value="Hardscaping">Hardscaping</option>
                      <option value="Irrigation">Irrigation</option>
                      <option value="Tree Service">Tree Service</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Location/Address *"
                      value={newProject.location}
                      onChange={(e) => setNewProject(prev => ({ ...prev, location: e.target.value }))}
                    />
                    <select
                      value={newProject.status}
                      onChange={(e) => setNewProject(prev => ({ ...prev, status: e.target.value as 'active' | 'pending' }))}
                    >
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                    </select>
                  </div>
                  <div className="form-actions">
                    <button className="save-btn" onClick={addNewProject}>
                      Save Project
                    </button>
                    <button 
                      className="cancel-btn" 
                      onClick={() => {
                        setShowAddProject(false)
                        setNewProject({
                          name: '',
                          type: '',
                          location: '',
                          status: 'pending'
                        })
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {/* Edit Project Form */}
              {showEditProject && editingProject && (
                <div className="add-project-form">
                  <h3>Edit Project</h3>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Project Name"
                      value={editingProject.name}
                      onChange={(e) => setEditingProject(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                    <select
                      value={editingProject.type}
                      onChange={(e) => setEditingProject(prev => prev ? { ...prev, type: e.target.value } : null)}
                    >
                      <option value="">Select Project Type</option>
                      <option value="Landscape Installation">Landscape Installation</option>
                      <option value="Hardscape">Hardscape</option>
                      <option value="Irrigation">Irrigation</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Tree Services">Tree Services</option>
                      <option value="Lawn Care">Lawn Care</option>
                      <option value="Snow Removal">Snow Removal</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Project Location"
                      value={editingProject.location}
                      onChange={(e) => setEditingProject(prev => prev ? { ...prev, location: e.target.value } : null)}
                    />
                    <div>
                      <label>Status:</label>
                      <select
                        value={editingProject.status}
                        onChange={(e) => setEditingProject(prev => prev ? { ...prev, status: e.target.value as 'active' | 'pending' } : null)}
                      >
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button className="save-btn" onClick={updateProject}>
                      Update Project
                    </button>
                    <button 
                      className="cancel-btn" 
                      onClick={() => {
                        setShowEditProject(false)
                        setEditingProject(null)
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {/* Project list */}
              <div className="project-list">
                {filteredProjects.map((project) => (
                  <div key={project.id} className="project-card">
                    <div className="project-header">
                      <h3>{project.name}</h3>
                      <div className="project-actions">
                        <button
                          className="edit-btn"
                          onClick={() => startEditProject(project)}
                          title="Edit Project"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => project.id && deleteProject(project.id)}
                          title="Delete Project"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="project-details">
                      <p className="project-type"><strong>Type:</strong> {project.type}</p>
                      <p className="project-location"><strong>Location:</strong> {project.location}</p>
                    </div>
                    <div className="project-status-section">
                      <div className="project-status-controls">
                        <label>Status:</label>
                        <select
                          value={project.status}
                          onChange={(e) => {
                            const newStatus = e.target.value as 'active' | 'pending'
                            if (project.id) {
                              updateProjectStatus(project.id, newStatus)
                            }
                          }}
                          className={`status-select ${project.status}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="active">Active</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredProjects.length === 0 && (
                  <div className="no-projects">
                    <p>No {projectFilter === 'all' ? '' : projectFilter} projects found.</p>
                    {!showAddProject && (
                      <button 
                        className="add-project-btn"
                        onClick={() => setShowAddProject(true)}
                      >
                        + Add First Project
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Add project button */}
              {!showAddProject && filteredProjects.length > 0 && (
                <div className="add-project-section">
                  <button 
                    className="add-project-btn"
                    onClick={() => setShowAddProject(true)}
                  >
                    + Add New Project
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      case 'hours':
        const totalTodayMinutes = todaysSessions
          .filter(session => session.duration)
          .reduce((total, session) => total + (session.duration || 0), 0)
        
        const totalTodayHours = Math.floor(totalTodayMinutes / 60)
        const remainingMinutes = totalTodayMinutes % 60
        
        // Calculate week totals (only real sessions)
        const completedSessions = todaysSessions.filter(s => s.duration)
        const totalWeekMinutes = completedSessions.reduce((total, session) => total + (session.duration || 0), 0)
        const totalWeekHours = Math.floor(totalWeekMinutes / 60)
        const weekRemainingMinutes = totalWeekMinutes % 60
        
        // Group sessions by project for breakdown
        const projectBreakdown = todaysSessions
          .filter(session => session.duration)
          .reduce((breakdown, session) => {
            const key = `${session.project} - ${session.role}`
            if (!breakdown[key]) {
              breakdown[key] = {
                project: session.project,
                role: session.role,
                location: session.location,
                totalMinutes: 0,
                sessions: []
              }
            }
            breakdown[key].totalMinutes += session.duration || 0
            breakdown[key].sessions.push(session)
            return breakdown
          }, {} as Record<string, any>)

        // Group real sessions by day
        const weeklyBreakdown = completedSessions.reduce((breakdown, session) => {
          const dayKey = session.startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
          if (!breakdown[dayKey]) {
            breakdown[dayKey] = {
              date: session.startTime,
              totalMinutes: 0,
              sessions: []
            }
          }
          breakdown[dayKey].totalMinutes += session.duration || 0
          breakdown[dayKey].sessions.push(session)
          return breakdown
        }, {} as Record<string, any>)

        return (
          <div className="tab-content">
            <div className="hours-container">
              <h2>Time Tracking</h2>
              
              {/* Weekly Summary */}
              <div className="hours-summary">
                <div className="hours-card">
                  <h3>Today's Total</h3>
                  <p className="hours-number">
                    {totalTodayHours}h {remainingMinutes}m
                  </p>
                  <p className="hours-subtitle">
                    {todaysSessions.filter(s => s.duration).length} sessions completed
                  </p>
                </div>
                
                <div className="hours-card">
                  <h3>This Week</h3>
                  <p className="hours-number">
                    {totalWeekHours}h {weekRemainingMinutes}m
                  </p>
                                    <p className="hours-subtitle">
                    {completedSessions.length} total sessions
                  </p>
                </div>
              </div>

              {/* Weekly Breakdown */}
              <div className="weekly-breakdown">
                <h3>This Week's Daily Breakdown</h3>
                <div className="weekly-list">
                  {Object.entries(weeklyBreakdown)
                    .sort(([, a], [, b]) => (a as any).date.getTime() - (b as any).date.getTime())
                    .map(([day, data]: [string, any]) => {
                      const hours = Math.floor(data.totalMinutes / 60)
                      const minutes = data.totalMinutes % 60
                      const isToday = data.date.toDateString() === new Date().toDateString()
                      
                      return (
                        <div key={day} className={`weekly-day-item ${isToday ? 'today' : ''}`}>
                          <div className="weekly-day-header">
                            <div className="weekly-day-name">
                              {day} {isToday && <span className="today-badge">Today</span>}
                            </div>
                            <div className="weekly-day-time">{hours}h {minutes}m</div>
                          </div>
                          <div className="weekly-day-projects">
                            {data.sessions.reduce((projects: any[], session: any) => {
                              const existing = projects.find(p => p.project === session.project && p.role === session.role)
                              if (existing) {
                                existing.duration += session.duration
                              } else {
                                projects.push({
                                  project: session.project,
                                  role: session.role,
                                  duration: session.duration
                                })
                              }
                              return projects
                            }, []).map((proj: any, idx: number) => (
                              <div key={idx} className="weekly-project-tag">
                                {proj.project} ({proj.role}) - {Math.floor(proj.duration / 60)}h {proj.duration % 60}m
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* Today's Project Breakdown (if any) */}
              {Object.keys(projectBreakdown).length > 0 && (
                <div className="project-breakdown">
                  <h3>Today's Project Breakdown</h3>
                  <div className="breakdown-list">
                    {Object.values(projectBreakdown).map((item: any, index) => {
                      const hours = Math.floor(item.totalMinutes / 60)
                      const minutes = item.totalMinutes % 60
                      return (
                        <div key={index} className="breakdown-item">
                          <div className="breakdown-header">
                            <div className="breakdown-project">{item.project}</div>
                            <div className="breakdown-time">{hours}h {minutes}m</div>
                          </div>
                          <div className="breakdown-details">
                            <div className="breakdown-role">Role: {item.role}</div>
                            <div className="breakdown-location">Location: {item.location}</div>
                            <div className="breakdown-sessions">{item.sessions.length} session{item.sessions.length !== 1 ? 's' : ''}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Current Status */}
              <div className="current-status-card">
                <h3>Current Status</h3>
                <div className="status-content">
                  <div className="status-indicator-large">
                    {isWorking ? 'Currently Working' : 'Off Clock'}
                  </div>
                  {isWorking && currentLocation && (
                    <div className="status-details">
                      <div>Location: {currentLocation}</div>
                      {currentRole && <div>Role: {currentRole}</div>}
                      {workStartTime && (
                        <div>Started: {formatTime(workStartTime)} ({Math.floor((new Date().getTime() - workStartTime.getTime()) / 1000 / 60)} minutes ago)</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Empty State for Today */}
              {todaysSessions.filter(s => s.duration).length === 0 && (
                <div className="empty-hours">
                  <div className="empty-message">
                    <h3>No completed sessions today</h3>
                    <p>Clock in on the Clock tab to start tracking your time!</p>
                    <p className="demo-note">📊 The data above shows sample week data for demonstration</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      case 'history':
        // Filter data based on selected time range
        const getFilteredSessions = () => {
          const now = new Date()
          const allSessions = [...todaysSessions.filter(s => s.duration)]
          
          switch (historyFilter) {
            case 'this-week':
              const weekStart = new Date(now)
              weekStart.setDate(now.getDate() - now.getDay())
              weekStart.setHours(0, 0, 0, 0)
              return allSessions.filter(s => new Date(s.startTime) >= weekStart)
              
            case 'last-week':
              const lastWeekStart = new Date(now)
              lastWeekStart.setDate(now.getDate() - now.getDay() - 7)
              lastWeekStart.setHours(0, 0, 0, 0)
              const lastWeekEnd = new Date(lastWeekStart)
              lastWeekEnd.setDate(lastWeekStart.getDate() + 6)
              lastWeekEnd.setHours(23, 59, 59, 999)
              return allSessions.filter(s => {
                const sessionDate = new Date(s.startTime)
                return sessionDate >= lastWeekStart && sessionDate <= lastWeekEnd
              })
              
            case 'this-month':
              const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
              return allSessions.filter(s => new Date(s.startTime) >= monthStart)
              
            case 'last-month':
              const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
              const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
              lastMonthEnd.setHours(23, 59, 59, 999)
              return allSessions.filter(s => {
                const sessionDate = new Date(s.startTime)
                return sessionDate >= lastMonthStart && sessionDate <= lastMonthEnd
              })
              
            case 'all-time':
            default:
              return allSessions
          }
        }
        
        const filteredSessions = getFilteredSessions()
        const totalFilteredMinutes = filteredSessions.reduce((total, session) => total + (session.duration || 0), 0)
        const totalFilteredHours = Math.floor(totalFilteredMinutes / 60)
        const filteredRemainingMinutes = totalFilteredMinutes % 60
        
        // Group by date for chronological display
        const sessionsByDate = filteredSessions.reduce((groups, session) => {
          const dateKey = session.startTime.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
          if (!groups[dateKey]) {
            groups[dateKey] = {
              date: session.startTime,
              sessions: [],
              totalMinutes: 0
            }
          }
          groups[dateKey].sessions.push(session)
          groups[dateKey].totalMinutes += session.duration || 0
          return groups
        }, {} as Record<string, any>)
        
        const getFilterLabel = () => {
          switch (historyFilter) {
            case 'this-week': return 'This Week'
            case 'last-week': return 'Last Week'
            case 'this-month': return 'This Month'
            case 'last-month': return 'Last Month'
            case 'all-time': return 'All Time'
            default: return 'This Week'
          }
        }

        return (
          <div className="tab-content">
            <div className="history-container">
              <h2>Work History</h2>
              
              {/* Time Range Filter */}
              <div className="history-filter">
                <label>Time Range:</label>
                <select 
                  value={historyFilter} 
                  onChange={(e) => setHistoryFilter(e.target.value)}
                  className="dropdown"
                >
                  <option value="this-week">This Week</option>
                  <option value="last-week">Last Week</option>
                  <option value="this-month">This Month</option>
                  <option value="last-month">Last Month</option>
                  <option value="all-time">All Time</option>
                </select>
              </div>
              
              {/* Summary for Selected Period */}
              <div className="history-summary">
                <div className="history-summary-card">
                  <h3>{getFilterLabel()} Summary</h3>
                  <div className="summary-stats">
                    <div className="stat-item">
                      <div className="stat-label">Total Hours</div>
                      <div className="stat-value">{totalFilteredHours}h {filteredRemainingMinutes}m</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">Work Days</div>
                      <div className="stat-value">{Object.keys(sessionsByDate).length}</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">Total Sessions</div>
                      <div className="stat-value">{filteredSessions.length}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Daily Breakdown */}
              {Object.keys(sessionsByDate).length > 0 ? (
                <div className="history-breakdown">
                  <h3>Daily Breakdown</h3>
                  <div className="history-days">
                    {Object.entries(sessionsByDate)
                      .sort(([, a], [, b]) => (b as any).date.getTime() - (a as any).date.getTime())
                      .map(([dateString, dayData]: [string, any]) => {
                        const dayHours = Math.floor(dayData.totalMinutes / 60)
                        const dayMinutes = dayData.totalMinutes % 60
                        
                        return (
                          <div key={dateString} className="history-day">
                            <div className="history-day-header">
                              <div className="history-date">{dateString}</div>
                              <div className="history-day-total">{dayHours}h {dayMinutes}m</div>
                            </div>
                            <div className="history-sessions">
                              {dayData.sessions
                                .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                                .map((session: any, idx: number) => (
                                  <div key={idx} className="history-session">
                                    <div className="session-time-range">
                                      {formatTime(new Date(session.startTime))} - {formatTime(new Date(session.endTime!))}
                                    </div>
                                    <div className="session-details">
                                      <div className="session-project-name">{session.project}</div>
                                      <div className="session-role-name">{session.role}</div>
                                      <div className="session-duration">{Math.floor((session.duration || 0) / 60)}h {(session.duration || 0) % 60}m</div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              ) : (
                <div className="empty-history">
                  <div className="empty-message">
                    <h3>No work history found</h3>
                    <p>No completed sessions found for {getFilterLabel().toLowerCase()}.</p>
                    <p>Try selecting a different time range or start tracking time on the Clock tab.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      case 'admin':
        if (userRole !== 'admin') {
          return (
            <div className="tab-content">
              <div className="admin-container">
                <div className="access-denied-message">
                  <AlertCircle size={48} color="#f59e0b" />
                  <h2>Access Denied</h2>
                  <p>You do not have permission to access this page.</p>
                </div>
              </div>
            </div>
          )
        }

        // Separate users by role
        const pendingUsers = allUsers.filter(u => u.role === 'user')
        const approvedUsers = allUsers.filter(u => u.role === 'approved')
        const adminUsers = allUsers.filter(u => u.role === 'admin')

        return (
          <div className="tab-content">
            <div className="admin-container">
              <h2>Admin Panel</h2>
              
              {/* Pending Approvals Section */}
              {pendingUsers.length > 0 && (
                <div className="admin-section pending-section">
                  <h3>
                    <AlertCircle size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Pending Approvals ({pendingUsers.length})
                  </h3>
                  <div className="users-list">
                    {pendingUsers.map((userItem) => (
                      <div key={userItem.id} className="user-card pending-user">
                        <div className="user-info">
                          <div className="user-name">{userItem.full_name}</div>
                          <div className="user-email">{userItem.email}</div>
                          <div className="user-meta">
                            Signed up: {new Date(userItem.created_at!).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="user-actions">
                          <button
                            className="approve-btn"
                            onClick={async () => {
                              try {
                                await supabaseOperations.updateUserRole(userItem.user_id, 'approved')
                                showToast(`Approved ${userItem.full_name}`, 'success')
                                await loadAllUsers()
                              } catch (error) {
                                console.error('Error approving user:', error)
                                showToast('Failed to approve user', 'error')
                              }
                            }}
                          >
                            <UserCheck size={16} />
                            Approve
                          </button>
                          <button
                            className="deny-btn"
                            onClick={() => {
                              showToast('User remains unapproved', 'warning')
                            }}
                          >
                            <UserX size={16} />
                            Deny
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Approved Users Section */}
              <div className="admin-section">
                <h3>Approved Users ({approvedUsers.length + adminUsers.length})</h3>
                <div className="users-list">
                  {[...adminUsers, ...approvedUsers].map((userItem) => (
                    <div key={userItem.id} className="user-card">
                      <div className="user-details-admin">
                        <div className="user-name">{userItem.full_name}</div>
                        <div className="user-email">{userItem.email}</div>
                        {userItem.approved_at && (
                          <div className="user-meta">
                            Approved: {new Date(userItem.approved_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="user-role-selector">
                        <select
                          value={userItem.role}
                          onChange={async (e) => {
                            const newRole = e.target.value as 'user' | 'approved' | 'admin'
                            
                            // Prevent demoting yourself
                            if (userItem.user_id === user?.id && newRole !== 'admin') {
                              showToast('You cannot demote yourself!', 'error')
                              return
                            }
                            
                            try {
                              await supabaseOperations.updateUserRole(userItem.user_id, newRole)
                              const roleLabels = {
                                user: 'Unapproved',
                                approved: 'Approved',
                                admin: 'Admin'
                              }
                              showToast(`Updated ${userItem.full_name}'s role to ${roleLabels[newRole]}`, 'success')
                              await loadAllUsers()
                            } catch (error) {
                              console.error('Error updating role:', error)
                              showToast('Failed to update role', 'error')
                            }
                          }}
                          className={`role-dropdown role-${userItem.role}`}
                        >
                          <option value="user">Unapproved</option>
                          <option value="approved">Approved</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                  ))}
                  {approvedUsers.length === 0 && adminUsers.length === 0 && (
                    <div className="no-users">
                      <p>No approved users yet.</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Stats Section */}
              <div className="admin-section">
                <h3>System Statistics</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-number">{allUsers.length}</div>
                    <div className="stat-label">Total Users</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">{pendingUsers.length}</div>
                    <div className="stat-label">Pending Approval</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">{approvedUsers.length}</div>
                    <div className="stat-label">Approved Users</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">{adminUsers.length}</div>
                    <div className="stat-label">Admins</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  // Show loading screen
  if (loading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-content">
            <img 
              src="/pleasant-knoll-logo.jpg" 
              alt="Pleasant Knoll Landscaping" 
              className="loading-logo"
            />
            <div className="loading-spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show login screen if not authenticated
  if (!session) {
    return (
      <div className="app">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <img 
                src="/pleasant-knoll-logo.jpg" 
                alt="Pleasant Knoll Landscaping" 
                className="auth-logo"
              />
              <h2>Employee Clock-In System</h2>
              <p>Sign in with your Google account to continue</p>
            </div>
            <div className="auth-form">
              <button 
                className="google-signin-btn"
                onClick={handleGoogleSignIn}
              >
                <svg className="google-icon" width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show Access Denied screen for unapproved users
  if (session && user && userRole === 'user') {
    return <AccessDenied user={user} onSignOut={handleSignOut} />
  }

  return (
    <div className="app">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast toast-${toast.type}`}>
          <div className="toast-icon">
            {toast.type === 'success' && <CheckCircle size={20} />}
            {toast.type === 'error' && <XCircle size={20} />}
            {toast.type === 'warning' && <AlertCircle size={20} />}
          </div>
          <span className="toast-message">{toast.message}</span>
        </div>
      )}
      
      {/* Main Content */}
      <main className="main-content">
        <div className="app-header">
          <div className="logo-container">
            <img 
              src="/pleasant-knoll-logo.jpg" 
              alt="Pleasant Knoll Landscaping" 
              className="company-logo"
            />
          </div>
          <div className="user-info">
            <div className="user-details">
              <div className="user-avatar">
                <User size={20} />
              </div>
              <div className="user-text">
                <span className="user-name">{user?.user_metadata?.full_name || user?.email}</span>
                <span className="user-email">{user?.email}</span>
              </div>
            </div>
            <button 
              className="logout-btn"
              onClick={handleSignOut}
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
        {renderTabContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'clock' ? 'active' : ''}`}
          onClick={() => setActiveTab('clock')}
        >
          <Clock size={24} />
          <span>Clock</span>
        </button>
        {userRole === 'admin' && (
          <button 
            className={`nav-item ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            <Calendar size={24} />
            <span>Projects</span>
          </button>
        )}
        <button 
          className={`nav-item ${activeTab === 'hours' ? 'active' : ''}`}
          onClick={() => setActiveTab('hours')}
        >
          <BarChart3 size={24} />
          <span>Hours</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={24} />
          <span>History</span>
        </button>
        {userRole === 'admin' && (
          <button 
            className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <Shield size={24} />
            <span>Admin</span>
          </button>
        )}
      </nav>
    </div>
  )
}

export default App
