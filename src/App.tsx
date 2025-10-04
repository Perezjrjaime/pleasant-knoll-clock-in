import { useState, useEffect } from 'react'
import { Clock, Calendar, BarChart3, History } from 'lucide-react'
import { supabase, type Project } from './lib/supabase'
import './App.css'

type TabType = 'clock' | 'projects' | 'hours' | 'history'

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
  
  // Sample week data for demonstration
  const [weekSessions] = useState(() => {
    const today = new Date()
    const sampleSessions = []
    
    // Generate last 5 days of sample data
    for (let dayOffset = 5; dayOffset >= 1; dayOffset--) {
      const workDay = new Date(today)
      workDay.setDate(today.getDate() - dayOffset)
      
      // Morning session
      const morningStart = new Date(workDay)
      morningStart.setHours(8, 0, 0, 0)
      const morningEnd = new Date(morningStart)
      morningEnd.setHours(12, 0, 0, 0)
      
      sampleSessions.push({
        project: dayOffset === 5 ? 'Johnson Residence' : dayOffset === 4 ? 'City Park' : dayOffset === 3 ? 'Shopping Mall Landscaping' : dayOffset === 2 ? 'Office Complex' : 'Elementary School',
        location: dayOffset === 5 ? 'Johnson Residence' : dayOffset === 4 ? 'City Park' : dayOffset === 3 ? 'Shopping Mall' : dayOffset === 2 ? 'Office Complex' : 'Elementary School',
        role: dayOffset === 5 ? 'Excavator Operator' : dayOffset === 4 ? 'General Labor' : dayOffset === 3 ? 'Hydro Mulch Machine Operator' : dayOffset === 2 ? 'Crew Leader' : 'Irrigation Tech',
        startTime: morningStart,
        endTime: morningEnd,
        duration: 240 // 4 hours
      })
      
      // Afternoon session
      const afternoonStart = new Date(workDay)
      afternoonStart.setHours(13, 0, 0, 0)
      const afternoonEnd = new Date(afternoonStart)
      afternoonEnd.setHours(17, 30, 0, 0)
      
      sampleSessions.push({
        project: dayOffset === 5 ? 'Johnson Residence' : dayOffset === 4 ? 'Riverside Apartments' : dayOffset === 3 ? 'The Shop' : dayOffset === 2 ? 'St. Mary\'s Church' : 'City Park',
        location: dayOffset === 5 ? 'Johnson Residence' : dayOffset === 4 ? 'Riverside Apartments' : dayOffset === 3 ? 'The Shop' : dayOffset === 2 ? 'St. Mary\'s Church' : 'City Park',
        role: dayOffset === 5 ? 'General Labor' : dayOffset === 4 ? 'Landscape Foreman' : dayOffset === 3 ? 'General Labor' : dayOffset === 2 ? 'Tree Care Specialist' : 'Skid Steer Operator',
        startTime: afternoonStart,
        endTime: afternoonEnd,
        duration: 270 // 4.5 hours
      })
    }
    
    return sampleSessions
  })
  
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
          // Fall back to sample data if database fails
          setProjects([
            { id: 'johnson', name: 'Johnson Residence', type: 'Landscape Installation', status: 'active', location: 'Johnson Residence' },
            { id: 'park', name: 'City Park', type: 'Weekly Maintenance', status: 'active', location: 'City Park' },
            { id: 'mall', name: 'Shopping Mall Landscaping', type: 'Commercial Maintenance', status: 'active', location: 'Shopping Mall' }
          ] as Project[])
        } else {
          setProjects(data || [])
        }
      } catch (error) {
        console.error('Database connection error:', error)
        // Fall back to sample data
        setProjects([
          { id: 'johnson', name: 'Johnson Residence', type: 'Landscape Installation', status: 'active', location: 'Johnson Residence' },
          { id: 'park', name: 'City Park', type: 'Weekly Maintenance', status: 'active', location: 'City Park' },
          { id: 'mall', name: 'Shopping Mall Landscaping', type: 'Commercial Maintenance', status: 'active', location: 'Shopping Mall' }
        ] as Project[])
      } finally {
        setIsLoading(false)
      }
    }
    
    loadProjects()
  }, [])

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
        return (
          <div className="tab-content">
            <div className="projects-container">
              <h2>Active Projects</h2>
              <p>Select a project to work on today</p>
              
              <div className="project-list">
                {projects.filter(project => project.status === 'active').map((project) => (
                  <div key={project.id} className="project-card">
                    <div className="project-header">
                      <h3>{project.name}</h3>
                      <span className="project-status active">Active</span>
                    </div>
                    <p className="project-type">{project.type}</p>
                    <div className="project-actions">
                      <button className="project-details-btn">
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="add-project-section">
                <button className="add-project-btn">
                  + Add New Project
                </button>
              </div>
            </div>
          </div>
        )
      case 'hours':
        const totalTodayMinutes = todaysSessions
          .filter(session => session.duration)
          .reduce((total, session) => total + (session.duration || 0), 0)
        
        const totalTodayHours = Math.floor(totalTodayMinutes / 60)
        const remainingMinutes = totalTodayMinutes % 60
        
        // Calculate week totals (including sample data)
        const allWeekSessions = [...weekSessions, ...todaysSessions.filter(s => s.duration)]
        const totalWeekMinutes = allWeekSessions.reduce((total, session) => total + (session.duration || 0), 0)
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

        // Group week sessions by day
        const weeklyBreakdown = allWeekSessions.reduce((breakdown, session) => {
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
                    {allWeekSessions.length} total sessions
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
          const allSessions = [...weekSessions, ...todaysSessions.filter(s => s.duration)]
          
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
      default:
        return null
    }
  }

  return (
    <div className="app">
      {/* Main Content */}
      <main className="main-content">
        <div className="logo-container">
          <img 
            src="/Pleasant Knoll Logo.jpg" 
            alt="Pleasant Knoll Landscaping" 
            className="company-logo"
          />
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
        <button 
          className={`nav-item ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          <Calendar size={24} />
          <span>Projects</span>
        </button>
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
      </nav>
    </div>
  )
}

export default App
