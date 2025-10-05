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
  
  // Weekly sessions from database
  const [weeklySessions, setWeeklySessions] = useState<{
    id: string;
    project: string;
    location: string;
    role: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    status: 'draft' | 'submitted' | 'approved' | 'rejected';
    weekEndingDate?: Date;
    employeeInitials?: string;
    submittedAt?: Date;
    approvedBy?: string;
    approvedAt?: Date;
    adminNotes?: string;
  }[]>([])
  
  // Common landscaping roles
  const commonRoles = [
    'Skid steer',
    'Truck',
    'Labor',
    'Tractor',
    'Straw blower',
    'Hydromulcher',
    'Mini skid steer',
    'Mini excavator'
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

  // Timesheet submission state
  const [employeeInitials, setEmployeeInitials] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Admin timesheet management state
  const [pendingTimesheets, setPendingTimesheets] = useState<any[]>([])
  const [timesheetFilter, setTimesheetFilter] = useState<'submitted' | 'approved' | 'rejected' | 'all'>('submitted')
  const [selectedTimesheet, setSelectedTimesheet] = useState<any | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [isProcessingTimesheet, setIsProcessingTimesheet] = useState(false)

  // Session editing state
  const [editingSession, setEditingSession] = useState<any | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

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
      
      // Set loading false FIRST, then load role in background
      setLoading(false)
      
      // Load user role if logged in (don't await - let it run async)
      if (session?.user) {
        loadUserRole(session.user.id, session.user.email!)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      // Load user role if logged in (don't await - let it run async)
      if (session?.user) {
        loadUserRole(session.user.id, session.user.email!)
      } else {
        setUserRole(null)
      }
      
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Load user role from database - WITH TIMEOUT
  const loadUserRole = async (userId: string, email: string) => {
    try {
      console.log('Loading user role for:', email)
      
      // Add a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 3000)
      })
      
      // Race the query against the timeout
      const queryPromise = supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any
      
      console.log('Supabase client response:', { data, error })
      
      if (error) {
        console.error('Error loading user role:', error)
        setUserRole('user')
        return
      }
      
      if (data) {
        console.log('Setting role:', data.role)
        setUserRole(data.role)
      } else {
        // No role exists - default to user (unapproved)
        console.log('No role found, defaulting to user')
        setUserRole('user')
      }
    } catch (error) {
      console.error('Error loading user role (caught):', error)
      // If it times out or errors, just set to user and continue
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

  // Auto-switch admin users to admin tab on login
  useEffect(() => {
    if (userRole === 'admin' && activeTab === 'clock') {
      setActiveTab('admin')
    }
  }, [userRole])

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

  // Load weekly sessions from database
  useEffect(() => {
    const loadWeeklySessions = async () => {
      if (!user) return
      
      try {
        // Get the start of this week (Sunday)
        const now = new Date()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay()) // Go to Sunday
        startOfWeek.setHours(0, 0, 0, 0)
        
        const { data, error } = await supabase
          .from('work_sessions')
          .select('*')
          .eq('user_id', user.id)
          .gte('start_time', startOfWeek.toISOString())
          .order('start_time', { ascending: false })
        
        if (error) {
          console.error('Error loading weekly sessions:', error)
        } else {
          const sessions = (data || []).map((session: any) => ({
            id: session.id,
            project: session.project,
            location: session.location,
            role: session.role,
            startTime: new Date(session.start_time),
            endTime: new Date(session.end_time),
            duration: session.duration,
            status: session.status,
            weekEndingDate: session.week_ending_date ? new Date(session.week_ending_date) : undefined,
            employeeInitials: session.employee_initials,
            submittedAt: session.submitted_at ? new Date(session.submitted_at) : undefined,
            approvedBy: session.approved_by,
            approvedAt: session.approved_at ? new Date(session.approved_at) : undefined,
            adminNotes: session.admin_notes
          }))
          setWeeklySessions(sessions)
          
          // Debug: log first session details
          if (sessions.length > 0) {
            console.log('First session:', {
              startTime: sessions[0].startTime,
              startTimeString: sessions[0].startTime.toDateString(),
              duration: sessions[0].duration,
              endTime: sessions[0].endTime,
              project: sessions[0].project
            })
          }
        }
      } catch (error) {
        console.error('Database error loading sessions:', error)
      }
    }
    
    loadWeeklySessions()
    
    // Reload sessions when we switch to the hours tab
    const interval = setInterval(() => {
      if (activeTab === 'hours') {
        loadWeeklySessions()
      }
    }, 10000) // Refresh every 10 seconds when on hours tab
    
    return () => clearInterval(interval)
  }, [user, activeTab])

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
    if (!user) {
      console.error('No authenticated user - cannot save session')
      return
    }

    try {
      const { data, error } = await supabase
        .from('work_sessions')
        .insert({
          user_id: user.id,
          project: sessionData.project,
          location: sessionData.location,
          role: sessionData.role,
          start_time: sessionData.startTime.toISOString(),
          end_time: sessionData.endTime.toISOString(),
          duration: sessionData.duration,
          status: 'draft' // New sessions start as draft
        })
        .select()
      
      if (error) {
        console.error('Error saving work session:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        alert(`Failed to save work session: ${error.message || 'Unknown error'}`)
      } else {
        console.log('Work session saved successfully!', data)
        // Reload weekly sessions to include the new one
        const startOfWeek = new Date()
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        
        const { data: updatedSessions } = await supabase
          .from('work_sessions')
          .select('*')
          .eq('user_id', user.id)
          .gte('start_time', startOfWeek.toISOString())
          .order('start_time', { ascending: false })
        
        if (updatedSessions) {
          const sessions = updatedSessions.map((session: any) => ({
            id: session.id,
            project: session.project,
            location: session.location,
            role: session.role,
            startTime: new Date(session.start_time),
            endTime: new Date(session.end_time),
            duration: session.duration,
            status: session.status,
            weekEndingDate: session.week_ending_date ? new Date(session.week_ending_date) : undefined,
            employeeInitials: session.employee_initials,
            submittedAt: session.submitted_at ? new Date(session.submitted_at) : undefined,
            approvedBy: session.approved_by,
            approvedAt: session.approved_at ? new Date(session.approved_at) : undefined,
            adminNotes: session.admin_notes
          }))
          setWeeklySessions(sessions)
        }
      }
    } catch (error) {
      console.error('Database error:', error)
    }
  }

  // Submit timesheet for the week
  const submitTimesheet = async () => {
    if (!user) return
    if (!employeeInitials.trim()) {
      showToast('Please enter your initials to submit', 'error')
      return
    }
    
    const initials = employeeInitials.trim().toUpperCase()
    
    // Validate initials (2-3 characters)
    if (initials.length < 2 || initials.length > 3) {
      showToast('Initials should be 2-3 characters', 'error')
      return
    }
    
    try {
      setIsSubmitting(true)
      
      // Get all draft sessions for this week
      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      
      // Calculate week ending date (Saturday)
      const weekEndingDate = new Date(startOfWeek)
      weekEndingDate.setDate(startOfWeek.getDate() + 6) // Saturday
      
      const { error } = await supabase
        .from('work_sessions')
        .update({
          status: 'submitted',
          employee_initials: initials,
          submitted_at: new Date().toISOString(),
          week_ending_date: weekEndingDate.toISOString()
        })
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .gte('start_time', startOfWeek.toISOString())
      
      if (error) {
        console.error('Error submitting timesheet:', error)
        showToast('Failed to submit timesheet. Please try again.', 'error')
      } else {
        showToast('Timesheet submitted successfully! Waiting for admin approval.', 'success')
        setEmployeeInitials('')
        
        // Reload sessions to show updated status
        const { data: updatedSessions } = await supabase
          .from('work_sessions')
          .select('*')
          .eq('user_id', user.id)
          .gte('start_time', startOfWeek.toISOString())
          .order('start_time', { ascending: false })
        
        if (updatedSessions) {
          const sessions = updatedSessions.map((session: any) => ({
            id: session.id,
            project: session.project,
            location: session.location,
            role: session.role,
            startTime: new Date(session.start_time),
            endTime: new Date(session.end_time),
            duration: session.duration,
            status: session.status,
            weekEndingDate: session.week_ending_date ? new Date(session.week_ending_date) : undefined,
            employeeInitials: session.employee_initials,
            submittedAt: session.submitted_at ? new Date(session.submitted_at) : undefined,
            approvedBy: session.approved_by,
            approvedAt: session.approved_at ? new Date(session.approved_at) : undefined,
            adminNotes: session.admin_notes
          }))
          setWeeklySessions(sessions)
        }
      }
    } catch (error) {
      console.error('Error submitting timesheet:', error)
      showToast('An error occurred. Please try again.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Load pending timesheets (admin only)
  const loadPendingTimesheets = async () => {
    if (!user || userRole !== 'admin') return

    try {
      console.log('Loading timesheets with filter:', timesheetFilter)
      
      const { data, error } = await supabase
        .from('work_sessions')
        .select('*')
        .in('status', timesheetFilter === 'all' 
          ? ['draft', 'submitted', 'approved', 'rejected'] 
          : [timesheetFilter])
        .order('submitted_at', { ascending: false })

      if (error) {
        console.error('Error loading timesheets:', error)
        showToast('Failed to load timesheets', 'error')
        return
      }
      
      console.log('Raw timesheet data:', data)

      if (!data || data.length === 0) {
        console.log('No timesheets found with filter:', timesheetFilter)
        setPendingTimesheets([])
        return
      }

      // Get user names from user_roles table
      const userIds = [...new Set(data.map((s: any) => s.user_id))]
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, full_name, email')
        .in('user_id', userIds)
      
      // Create a map of user_id -> full_name
      const userNameMap = new Map()
      if (userRoles) {
        userRoles.forEach((u: any) => {
          userNameMap.set(u.user_id, u.full_name || u.email)
        })
      }

      // Group by user and week_ending_date
      const grouped = (data || []).reduce((acc: any, session: any) => {
        const key = `${session.user_id}-${session.week_ending_date || 'no-week'}`
        if (!acc[key]) {
          acc[key] = {
            userId: session.user_id,
            userName: userNameMap.get(session.user_id) || 'Unknown User',
            weekEndingDate: session.week_ending_date,
            status: session.status,
            employeeInitials: session.employee_initials,
            submittedAt: session.submitted_at,
            sessions: [],
            totalMinutes: 0
          }
        }
        acc[key].sessions.push(session)
        acc[key].totalMinutes += session.duration || 0
        return acc
      }, {})

      const timesheets = Object.values(grouped)
      console.log('Grouped timesheets:', timesheets)
      setPendingTimesheets(timesheets)
    } catch (error) {
      console.error('Error loading timesheets:', error)
      showToast('An error occurred while loading timesheets', 'error')
    }
  }

  // Approve timesheet
  const approveTimesheet = async (timesheet: any) => {
    if (!user || userRole !== 'admin') return

    try {
      setIsProcessingTimesheet(true)
      
      const sessionIds = timesheet.sessions.map((s: any) => s.id)
      
      const { error } = await supabase
        .from('work_sessions')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          admin_notes: adminNotes || null
        })
        .in('id', sessionIds)

      if (error) {
        console.error('Error approving timesheet:', error)
        showToast('Failed to approve timesheet', 'error')
      } else {
        showToast(`Approved timesheet for ${timesheet.userName}`, 'success')
        setAdminNotes('')
        setSelectedTimesheet(null)
        loadPendingTimesheets()
      }
    } catch (error) {
      console.error('Error approving timesheet:', error)
      showToast('An error occurred', 'error')
    } finally {
      setIsProcessingTimesheet(false)
    }
  }

  // Reject timesheet
  const rejectTimesheet = async (timesheet: any) => {
    if (!user || userRole !== 'admin') return
    if (!adminNotes.trim()) {
      showToast('Please provide a reason for rejection', 'warning')
      return
    }

    try {
      setIsProcessingTimesheet(true)
      
      const sessionIds = timesheet.sessions.map((s: any) => s.id)
      
      const { error } = await supabase
        .from('work_sessions')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          admin_notes: adminNotes
        })
        .in('id', sessionIds)

      if (error) {
        console.error('Error rejecting timesheet:', error)
        showToast('Failed to reject timesheet', 'error')
      } else {
        showToast(`Rejected timesheet for ${timesheet.userName}`, 'success')
        setAdminNotes('')
        setSelectedTimesheet(null)
        loadPendingTimesheets()
      }
    } catch (error) {
      console.error('Error rejecting timesheet:', error)
      showToast('An error occurred', 'error')
    } finally {
      setIsProcessingTimesheet(false)
    }
  }

  // Edit session (employee can edit draft, admin can edit any)
  const updateSession = async (sessionId: string, updates: any) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('work_sessions')
        .update(updates)
        .eq('id', sessionId)

      if (error) {
        console.error('Error updating session:', error)
        showToast('Failed to update session', 'error')
        return false
      } else {
        showToast('Session updated successfully', 'success')
        setShowEditModal(false)
        setEditingSession(null)
        
        // Reload sessions
        if (userRole === 'admin') {
          loadPendingTimesheets()
        }
        
        // Reload weekly sessions for employee
        const startOfWeek = new Date()
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        
        const { data: updatedSessions } = await supabase
          .from('work_sessions')
          .select('*')
          .eq('user_id', user.id)
          .gte('start_time', startOfWeek.toISOString())
          .order('start_time', { ascending: false })
        
        if (updatedSessions) {
          const sessions = updatedSessions.map((session: any) => ({
            id: session.id,
            project: session.project,
            location: session.location,
            role: session.role,
            startTime: new Date(session.start_time),
            endTime: new Date(session.end_time),
            duration: session.duration,
            status: session.status,
            weekEndingDate: session.week_ending_date ? new Date(session.week_ending_date) : undefined,
            employeeInitials: session.employee_initials,
            submittedAt: session.submitted_at ? new Date(session.submitted_at) : undefined,
            approvedBy: session.approved_by,
            approvedAt: session.approved_at ? new Date(session.approved_at) : undefined,
            adminNotes: session.admin_notes
          }))
          setWeeklySessions(sessions)
        }
        
        return true
      }
    } catch (error) {
      console.error('Error updating session:', error)
      showToast('An error occurred', 'error')
      return false
    }
  }

  // Delete session
  const deleteSession = async (sessionId: string) => {
    if (!user) return
    if (!confirm('Are you sure you want to delete this session?')) return

    try {
      const { error } = await supabase
        .from('work_sessions')
        .delete()
        .eq('id', sessionId)

      if (error) {
        console.error('Error deleting session:', error)
        showToast('Failed to delete session', 'error')
      } else {
        showToast('Session deleted successfully', 'success')
        setShowEditModal(false)
        setEditingSession(null)
        
        // Reload sessions
        if (userRole === 'admin') {
          loadPendingTimesheets()
        }
        
        // Reload weekly sessions for employee
        const startOfWeek = new Date()
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        
        const { data: updatedSessions } = await supabase
          .from('work_sessions')
          .select('*')
          .eq('user_id', user.id)
          .gte('start_time', startOfWeek.toISOString())
          .order('start_time', { ascending: false })
        
        if (updatedSessions) {
          const sessions = updatedSessions.map((session: any) => ({
            id: session.id,
            project: session.project,
            location: session.location,
            role: session.role,
            startTime: new Date(session.start_time),
            endTime: new Date(session.end_time),
            duration: session.duration,
            status: session.status,
            weekEndingDate: session.week_ending_date ? new Date(session.week_ending_date) : undefined,
            employeeInitials: session.employee_initials,
            submittedAt: session.submitted_at ? new Date(session.submitted_at) : undefined,
            approvedBy: session.approved_by,
            approvedAt: session.approved_at ? new Date(session.approved_at) : undefined,
            adminNotes: session.admin_notes
          }))
          setWeeklySessions(sessions)
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error)
      showToast('An error occurred', 'error')
    }
  }

  // Load timesheets when admin tab is active
  useEffect(() => {
    if (userRole === 'admin' && activeTab === 'admin') {
      loadPendingTimesheets()
    }
  }, [userRole, activeTab, timesheetFilter])

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
                    <div className="summary-title-group">
                      <h4>Today's Sessions</h4>
                      <p className="summary-subtitle">✓ Auto-saved to your timesheet</p>
                    </div>
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
        // Combine in-memory and database sessions
        const allSessions = [
          ...todaysSessions.filter(s => s.duration).map(s => ({
            ...s,
            id: 'temp-' + Math.random(),
            status: 'draft' as const
          })),
          ...weeklySessions
        ]
        
        // Calculate week totals (all completed sessions)
        const completedSessions = allSessions.filter(s => s.duration)
        
        // Create Monday through Sunday breakdown
        const startOfWeek = new Date()
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()) // Go to Sunday
        startOfWeek.setHours(0, 0, 0, 0)
        
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const weekDays = daysOfWeek.map((dayName, index) => {
          const dayDate = new Date(startOfWeek)
          dayDate.setDate(startOfWeek.getDate() + index)
          
          const daySessions = completedSessions.filter(session => 
            session.startTime.toDateString() === dayDate.toDateString()
          )
          
          const totalMinutes = daySessions.reduce((total, session) => total + (session.duration || 0), 0)
          
          return {
            name: dayName,
            date: dayDate,
            sessions: daySessions,
            totalMinutes,
            isToday: dayDate.toDateString() === new Date().toDateString()
          }
        })

        return (
          <div className="tab-content">
            <div className="hours-container">
              <h2>Time Tracking</h2>

              {/* Monday through Sunday Breakdown */}
              <div className="weekly-breakdown">
                <div className="weekly-list">
                  {weekDays.map((day) => {
                    const hours = Math.floor(day.totalMinutes / 60)
                    const minutes = day.totalMinutes % 60
                    
                    // Use day.sessions which already has the sessions for this day
                    // Filter to only show sessions with duration (completed sessions)
                    const daySessions = day.sessions.filter(s => s.duration !== undefined && s.endTime !== undefined)
                    
                    return (
                      <div key={day.name} className={`weekly-day-item ${day.isToday ? 'today' : ''} ${day.sessions.length === 0 ? 'empty-day' : ''}`}>
                        <div className="weekly-day-header">
                          <div className="weekly-day-name">
                            {day.name} {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {day.isToday && <span className="today-badge">Today</span>}
                          </div>
                          <div className="weekly-day-time">
                            {day.sessions.length > 0 ? `${hours}h ${minutes}m` : '—'}
                          </div>
                        </div>
                        
                        {/* Show individual sessions for this day */}
                        {daySessions.length > 0 && (
                          <div className="day-sessions-list">
                            {daySessions.map((session) => (
                              <div key={session.id} className={`day-session-card status-${session.status}`}>
                                <div className="session-time-range">
                                  {session.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {session.endTime?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                                <div className="session-project-role">
                                  <strong>{session.project}</strong> • {session.role}
                                </div>
                                <div className="session-duration-status">
                                  <span className="session-duration">{Math.floor((session.duration || 0) / 60)}h {(session.duration || 0) % 60}m</span>
                                  <span className={`session-status-badge ${session.status}`}>
                                    {session.status === 'draft' ? '✏️ Draft' : 
                                     session.status === 'submitted' ? '⏳ Submitted' : 
                                     session.status === 'approved' ? '✅ Approved' : 
                                     '❌ Rejected'}
                                  </span>
                                </div>
                                
                                {/* Edit/Delete buttons only for draft sessions */}
                                {session.status === 'draft' && (
                                  <div className="session-actions">
                                    <button
                                      className="edit-session-btn"
                                      onClick={() => {
                                        setEditingSession(session)
                                        setShowEditModal(true)
                                      }}
                                      title="Edit Session"
                                    >
                                      <Edit2 size={14} /> Edit
                                    </button>
                                    <button
                                      className="delete-session-btn"
                                      onClick={() => deleteSession(session.id)}
                                      title="Delete Session"
                                    >
                                      <Trash2 size={14} /> Delete
                                    </button>
                                  </div>
                                )}
                                
                                {/* Show admin notes for rejected sessions */}
                                {session.status === 'rejected' && session.adminNotes && (
                                  <div className="session-admin-notes">
                                    <AlertCircle size={14} />
                                    <span><strong>Admin:</strong> {session.adminNotes}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Timesheet Submission */}
              {weeklySessions.length > 0 && (
                <div className="timesheet-submission">
                  <h3>Weekly Timesheet Submission</h3>
                  
                  {/* Show status badges */}
                  <div className="status-summary">
                    {weeklySessions.filter(s => s.status === 'draft').length > 0 && (
                      <div className="status-badge draft">
                        {weeklySessions.filter(s => s.status === 'draft').length} sessions pending submission
                      </div>
                    )}
                    {weeklySessions.filter(s => s.status === 'submitted').length > 0 && (
                      <div className="status-badge submitted">
                        {weeklySessions.filter(s => s.status === 'submitted').length} sessions awaiting approval
                      </div>
                    )}
                    {weeklySessions.filter(s => s.status === 'approved').length > 0 && (
                      <div className="status-badge approved">
                        {weeklySessions.filter(s => s.status === 'approved').length} sessions approved
                      </div>
                    )}
                    {weeklySessions.filter(s => s.status === 'rejected').length > 0 && (
                      <div className="status-badge rejected">
                        {weeklySessions.filter(s => s.status === 'rejected').length} sessions rejected
                      </div>
                    )}
                  </div>
                  
                  {/* Submission form - only show if there are draft sessions */}
                  {weeklySessions.filter(s => s.status === 'draft').length > 0 && (
                    <div className="submission-form">
                      <p className="submission-instructions">
                        Review your hours for the entire week above, then submit your timesheet for admin approval.
                        All sessions will be submitted together. Your initials will be recorded with this submission.
                      </p>
                      <div className="initials-input-group">
                        <label htmlFor="initials">Your Initials:</label>
                        <input
                          id="initials"
                          type="text"
                          value={employeeInitials}
                          onChange={(e) => setEmployeeInitials(e.target.value.toUpperCase())}
                          placeholder="e.g. JP"
                          maxLength={3}
                          className="initials-input"
                          disabled={isSubmitting}
                        />
                        <button
                          onClick={submitTimesheet}
                          disabled={isSubmitting || !employeeInitials.trim()}
                          className="submit-timesheet-btn"
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit Weekly Timesheet'}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Show message if all submitted/approved */}
                  {weeklySessions.filter(s => s.status === 'draft').length === 0 && (
                    <div className="submission-complete">
                      <CheckCircle size={24} />
                      <p>All sessions for this week have been submitted or approved.</p>
                    </div>
                  )}
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
              
              {/* Timesheet Management Section */}
              <div className="admin-section timesheets-section">
                <h3>
                  <Calendar size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  Timesheet Management
                </h3>
                
                {/* Filter Buttons */}
                <div className="timesheet-filters">
                  <button 
                    className={`filter-btn ${timesheetFilter === 'submitted' ? 'active' : ''}`}
                    onClick={() => setTimesheetFilter('submitted')}
                  >
                    Pending Approval ({pendingTimesheets.filter((t: any) => t.status === 'submitted').length})
                  </button>
                  <button 
                    className={`filter-btn ${timesheetFilter === 'approved' ? 'active' : ''}`}
                    onClick={() => setTimesheetFilter('approved')}
                  >
                    Approved ({pendingTimesheets.filter((t: any) => t.status === 'approved').length})
                  </button>
                  <button 
                    className={`filter-btn ${timesheetFilter === 'rejected' ? 'active' : ''}`}
                    onClick={() => setTimesheetFilter('rejected')}
                  >
                    Rejected ({pendingTimesheets.filter((t: any) => t.status === 'rejected').length})
                  </button>
                  <button 
                    className={`filter-btn ${timesheetFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setTimesheetFilter('all')}
                  >
                    All ({pendingTimesheets.length})
                  </button>
                </div>

                {/* Timesheets List */}
                {pendingTimesheets.length > 0 ? (
                  <div className="timesheets-list">
                    {pendingTimesheets.map((timesheet: any, index: number) => {
                      const hours = Math.floor(timesheet.totalMinutes / 60)
                      const minutes = timesheet.totalMinutes % 60
                      const isSelected = selectedTimesheet === timesheet
                      
                      return (
                        <div key={index} className={`timesheet-card ${timesheet.status}`}>
                          <div className="timesheet-header" onClick={() => setSelectedTimesheet(isSelected ? null : timesheet)}>
                            <div className="timesheet-user">
                              <div className="timesheet-name">{timesheet.userName}</div>
                              <div className="timesheet-initials">Initials: {timesheet.employeeInitials || 'N/A'}</div>
                            </div>
                            <div className="timesheet-details">
                              <div className="timesheet-hours">{hours}h {minutes}m</div>
                              <div className="timesheet-week">
                                Week ending: {timesheet.weekEndingDate ? new Date(timesheet.weekEndingDate).toLocaleDateString() : 'N/A'}
                              </div>
                              {timesheet.submittedAt && (
                                <div className="timesheet-submitted">
                                  Submitted: {new Date(timesheet.submittedAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                            <div className={`timesheet-status-badge ${timesheet.status}`}>
                              {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isSelected && (
                            <div className="timesheet-expanded">
                              <h4>Session Details</h4>
                              <div className="sessions-detail-list">
                                {timesheet.sessions.map((session: any) => (
                                  <div key={session.id} className="session-detail-item">
                                    <div className="session-detail-row">
                                      <div className="session-detail-field">
                                        <strong>Date:</strong> {new Date(session.start_time).toLocaleDateString()}
                                      </div>
                                      <div className="session-detail-field">
                                        <strong>Time:</strong> {new Date(session.start_time).toLocaleTimeString()} - {new Date(session.end_time).toLocaleTimeString()}
                                      </div>
                                      <div className="session-detail-field">
                                        <strong>Duration:</strong> {Math.floor(session.duration / 60)}h {session.duration % 60}m
                                      </div>
                                    </div>
                                    <div className="session-detail-row">
                                      <div className="session-detail-field">
                                        <strong>Project:</strong> {session.project}
                                      </div>
                                      <div className="session-detail-field">
                                        <strong>Role:</strong> {session.role}
                                      </div>
                                      <div className="session-detail-field">
                                        <strong>Location:</strong> {session.location}
                                      </div>
                                    </div>
                                    <div className="session-actions">
                                      <button 
                                        className="edit-session-btn"
                                        onClick={() => {
                                          setEditingSession(session)
                                          setShowEditModal(true)
                                        }}
                                      >
                                        <Edit2 size={14} /> Edit
                                      </button>
                                      <button 
                                        className="delete-session-btn"
                                        onClick={() => deleteSession(session.id)}
                                      >
                                        <Trash2 size={14} /> Delete
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Admin Actions */}
                              {timesheet.status === 'submitted' && (
                                <div className="admin-actions">
                                  <div className="admin-notes-input">
                                    <label>Admin Notes (optional for approval, required for rejection):</label>
                                    <textarea
                                      value={adminNotes}
                                      onChange={(e) => setAdminNotes(e.target.value)}
                                      placeholder="Add notes about this timesheet..."
                                      rows={3}
                                    />
                                  </div>
                                  <div className="action-buttons">
                                    <button
                                      className="approve-timesheet-btn"
                                      onClick={() => approveTimesheet(timesheet)}
                                      disabled={isProcessingTimesheet}
                                    >
                                      <CheckCircle size={16} />
                                      {isProcessingTimesheet ? 'Processing...' : 'Approve Timesheet'}
                                    </button>
                                    <button
                                      className="reject-timesheet-btn"
                                      onClick={() => rejectTimesheet(timesheet)}
                                      disabled={isProcessingTimesheet || !adminNotes.trim()}
                                    >
                                      <XCircle size={16} />
                                      {isProcessingTimesheet ? 'Processing...' : 'Reject Timesheet'}
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Show admin notes for approved/rejected */}
                              {(timesheet.status === 'approved' || timesheet.status === 'rejected') && timesheet.sessions[0]?.admin_notes && (
                                <div className="admin-notes-display">
                                  <strong>Admin Notes:</strong>
                                  <p>{timesheet.sessions[0].admin_notes}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="empty-timesheets">
                    <p>No {timesheetFilter !== 'all' ? timesheetFilter : ''} timesheets to display.</p>
                  </div>
                )}
              </div>
              
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
        {userRole === 'admin' ? (
          // Admin-only navigation: Projects, History, Admin
          <>
            <button 
              className={`nav-item ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('projects')}
            >
              <Calendar size={24} />
              <span>Projects</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <History size={24} />
              <span>History</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <Shield size={24} />
              <span>Admin</span>
            </button>
          </>
        ) : (
          // Employee navigation: Clock and My Hours (timesheet)
          <>
            <button 
              className={`nav-item ${activeTab === 'clock' ? 'active' : ''}`}
              onClick={() => setActiveTab('clock')}
            >
              <Clock size={24} />
              <span>Clock</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'hours' ? 'active' : ''}`}
              onClick={() => setActiveTab('hours')}
            >
              <BarChart3 size={24} />
              <span>My Hours</span>
            </button>
          </>
        )}
      </nav>

      {/* Edit Session Modal */}
      {showEditModal && editingSession && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Session</h3>
            <div className="edit-session-form">
              <div className="form-group">
                <label>Project:</label>
                <select
                  value={editingSession.project}
                  onChange={(e) => setEditingSession({...editingSession, project: e.target.value})}
                >
                  <option value="The Shop">The Shop</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Role:</label>
                <select
                  value={editingSession.role}
                  onChange={(e) => setEditingSession({...editingSession, role: e.target.value})}
                >
                  {commonRoles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time:</label>
                  <input
                    type="time"
                    value={editingSession.start_time ? new Date(editingSession.start_time).toTimeString().slice(0, 5) : ''}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':')
                      const newStart = new Date(editingSession.start_time)
                      newStart.setHours(parseInt(hours), parseInt(minutes))
                      setEditingSession({...editingSession, start_time: newStart.toISOString()})
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>End Time:</label>
                  <input
                    type="time"
                    value={editingSession.end_time ? new Date(editingSession.end_time).toTimeString().slice(0, 5) : ''}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':')
                      const newEnd = new Date(editingSession.end_time)
                      newEnd.setHours(parseInt(hours), parseInt(minutes))
                      const newDuration = Math.round((newEnd.getTime() - new Date(editingSession.start_time).getTime()) / (1000 * 60))
                      setEditingSession({...editingSession, end_time: newEnd.toISOString(), duration: newDuration})
                    }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Duration: {Math.floor(editingSession.duration / 60)}h {editingSession.duration % 60}m</label>
              </div>

              <div className="modal-actions">
                <button
                  className="save-btn"
                  onClick={() => updateSession(editingSession.id, {
                    project: editingSession.project,
                    role: editingSession.role,
                    start_time: editingSession.start_time,
                    end_time: editingSession.end_time,
                    duration: editingSession.duration
                  })}
                >
                  Save Changes
                </button>
                <button
                  className="cancel-btn"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' && <CheckCircle size={20} />}
          {toast.type === 'error' && <XCircle size={20} />}
          {toast.type === 'warning' && <AlertCircle size={20} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}

export default App
