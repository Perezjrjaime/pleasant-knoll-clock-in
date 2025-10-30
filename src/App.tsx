import { useState, useEffect } from 'react'
import { Clock, Calendar, BarChart3, History, CheckCircle, XCircle, AlertCircle, Edit2, Trash2, LogOut, User, Shield, UserCheck, UserX, Plus, Package } from 'lucide-react'
import { supabase, type Project, type UserRole, supabaseOperations } from './lib/supabase'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import AccessDenied from './components/AccessDenied'
import './App.css'

type TabType = 'clock' | 'projects' | 'hours' | 'my-materials' | 'history' | 'admin' | 'materials'

function App() {
  // Initialize activeTab from localStorage, or default to 'clock'
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const savedTab = localStorage.getItem('activeTab')
    return (savedTab as TabType) || 'clock'
  })
  
  const [selectedProject, setSelectedProject] = useState('The Shop')
  const [selectedRole, setSelectedRole] = useState('')
  const [sessionNotes, setSessionNotes] = useState('')
  const [currentLocation, setCurrentLocation] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<string | null>(null)
  const [isWorking, setIsWorking] = useState(false)
  const [workStartTime, setWorkStartTime] = useState<Date | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
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
    notes?: string;
    status: 'draft' | 'submitted' | 'approved' | 'rejected';
    weekEndingDate?: Date;
    employeeInitials?: string;
    submittedAt?: Date;
    approvedBy?: string;
    approvedAt?: Date;
    adminNotes?: string;
  }[]>([])
  
  // Track recent modifications to prevent premature reloading
  const [lastModificationTime, setLastModificationTime] = useState<number>(0)
  
  // Common landscaping roles
  const commonRoles = [
    'Skid steer',
    'Truck',
    'Labor',
    'Tractor',
    'Straw blower',
    'Hydromulcher',
    'Mini skid steer',
    'Mini excavator',
    'Compactor',
    'Chain Saw Labor',
    'Wood Chipper',
    'Snow Pusher',
    'Snow Blower',
    'Plow Truck',
    'Salter',
    'Large Post Driver'
  ]
  
  // Base locations (always available)

  
  // Projects (loaded from database)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Project management state
  const [showAddProject, setShowAddProject] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    type: '',
    location: '',
    status: 'pending' as 'active' | 'pending'
  })
  
  // Edit project state (currently unused - kept for future features)
  // const [editingProject, setEditingProject] = useState<Project | null>(null)
  
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
  
  // Add session state
  const [showAddSessionModal, setShowAddSessionModal] = useState(false)
  const [newSessionData, setNewSessionData] = useState({
    project: 'The Shop',
    role: '',
    date: new Date().toISOString().split('T')[0], // Today's date
    startTime: '08:00',
    endTime: '17:00'
  })

  // Materials state
  const [materials, setMaterials] = useState<any[]>([])
  const [showAddMaterial, setShowAddMaterial] = useState(false)
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    unit: 'SY',
    description: '',
    status: 'active' as 'active' | 'inactive'
  })
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null)
  const [showEditMaterial, setShowEditMaterial] = useState(false)
  
  // Session materials state (for adding materials to sessions)
  const [showAddSessionMaterial, setShowAddSessionMaterial] = useState(false)
  const [selectedSessionForMaterials, setSelectedSessionForMaterials] = useState<any | null>(null)
  const [sessionMaterials, setSessionMaterials] = useState<any[]>([]) // Materials for the selected session
  const [newSessionMaterial, setNewSessionMaterial] = useState({
    materialId: '',
    quantity: '',
    notes: '',
    project: '',
    date: new Date().toISOString().split('T')[0]
  })

  // Project tracking state (for live project stats)
  const [selectedProjectForStats, setSelectedProjectForStats] = useState<Project | null>(null)
  const [projectStats, setProjectStats] = useState<any>(null)
  // const [loadingProjectStats, setLoadingProjectStats] = useState(false)  // Unused for now
  const [showCompleteConfirmation, setShowCompleteConfirmation] = useState(false)
  const [projectToComplete, setProjectToComplete] = useState<Project | null>(null)

  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'Confirm',
    cancelText: 'Cancel'
  })

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

  // Confirmation modal helper
  const showConfirmation = (title: string, message: string, onConfirm: () => void, confirmText = 'Confirm', cancelText = 'Cancel') => {
    setConfirmationModal({
      show: true,
      title,
      message,
      onConfirm,
      confirmText,
      cancelText
    })
  }

  // Authentication effects
  useEffect(() => {
    // Fallback timeout - if loading takes more than 5 seconds, force it to finish
    const fallbackTimeout = setTimeout(() => {
      console.warn('Loading timeout - forcing app to load')
      setLoading(false)
    }, 5000)

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      // Set loading false FIRST, then load role in background
      setLoading(false)
      clearTimeout(fallbackTimeout)
      
      // Load user role if logged in (don't await - let it run async)
      if (session?.user) {
        loadUserRole(session.user.id, session.user.email!)
      }
    }).catch((error) => {
      console.error('Error getting session:', error)
      setLoading(false)
      clearTimeout(fallbackTimeout)
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
      clearTimeout(fallbackTimeout)
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

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab)
  }, [activeTab])

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

  // Shared function to load all projects
  const loadAllProjects = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .in('status', ['active', 'pending', 'completed'])
        .order('name')
      
      if (error) {
        console.error('Error loading projects:', error)
        setProjects([])
      } else {
        setProjects(data || [])
      }
    } catch (error) {
      console.error('Database connection error:', error)
      setProjects([])
    } finally {
      setIsLoading(false)
    }
  }

  // Load projects from database on app start
  useEffect(() => {
    loadAllProjects()
  }, [])

  // Load weekly sessions from database
  useEffect(() => {
    const loadWeeklySessions = async () => {
      if (!user) return
      
      try {
        // Get the start of this week (Monday)
        const now = new Date()
        const startOfWeek = new Date(now)
        const dayOfWeek = now.getDay()
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // If Sunday, go back 6 days, otherwise go to Monday
        startOfWeek.setDate(now.getDate() + diff)
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
            notes: session.notes,
            status: session.status,
            weekEndingDate: session.week_ending_date ? new Date(session.week_ending_date) : undefined,
            employeeInitials: session.employee_initials,
            submittedAt: session.submitted_at ? new Date(session.submitted_at) : undefined,
            approvedBy: session.approved_by,
            approvedAt: session.approved_at ? new Date(session.approved_at) : undefined,
            adminNotes: session.admin_notes
          }))
          setWeeklySessions(sessions)
          
          // Debug: log sessions
          console.log('📊 Loaded weekly sessions:', sessions.length)
          if (sessions.length > 0) {
            console.log('First session:', {
              startTime: sessions[0].startTime,
              startTimeString: sessions[0].startTime.toDateString(),
              duration: sessions[0].duration,
              endTime: sessions[0].endTime,
              project: sessions[0].project,
              role: sessions[0].role
            })
          } else {
            console.log('⚠️ No sessions found for this week')
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
        // Don't reload if we just modified data (within last 3 seconds)
        const timeSinceModification = Date.now() - lastModificationTime
        if (timeSinceModification > 3000) {
          loadWeeklySessions()
        } else {
          console.log('⏸️ Skipping reload - recent modification')
        }
      }
    }, 10000) // Refresh every 10 seconds when on hours tab
    
    return () => clearInterval(interval)
  }, [user, activeTab, lastModificationTime])

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

  // Removed unused project management functions
  // (kept for reference if needed later)
  /*
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
        showToast('Failed to update project status', 'error')
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
      showToast('Failed to update project status', 'error')
    }
  }
  */

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])
  


  const getLocationFromProject = (projectName: string) => {
    if (projectName === 'The Shop') return 'The Shop'
    if (projectName === 'Lunch') return 'Lunch'
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
    notes?: string;
  }) => {
    if (!user) {
      console.error('No authenticated user - cannot save session')
      return
    }

    console.log('💾 Saving work session:', sessionData)

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
          notes: sessionData.notes || null,
          status: 'draft' // New sessions start as draft
        })
        .select()
      
      if (error) {
        console.error('❌ Error saving work session:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        showToast(`Failed to save work session: ${error.message || 'Unknown error'}`, 'error')
      } else {
        console.log('✅ Work session saved successfully!', data)
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
            notes: session.notes,
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
            notes: session.notes,
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

      // Load materials for all sessions
      const sessionIds = data.map((s: any) => s.id)
      const { data: sessionMaterialsData } = await supabase
        .from('session_materials')
        .select(`
          *,
          materials (name, unit)
        `)
        .in('session_id', sessionIds)
      
      // Create a map of session_id -> materials array
      const materialsMap = new Map()
      if (sessionMaterialsData) {
        sessionMaterialsData.forEach((sm: any) => {
          if (!materialsMap.has(sm.session_id)) {
            materialsMap.set(sm.session_id, [])
          }
          materialsMap.get(sm.session_id).push(sm)
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
        // Add materials to session
        const sessionWithMaterials = {
          ...session,
          materials: materialsMap.get(session.id) || []
        }
        acc[key].sessions.push(sessionWithMaterials)
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
            notes: session.notes,
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

    console.log('🗑️ Delete button clicked for session:', sessionId)
    
    // Find the session to see its status
    const sessionToDelete = weeklySessions.find(s => s.id === sessionId)
    console.log('Session to delete:', sessionToDelete)
    console.log('Session status:', sessionToDelete?.status)

    showConfirmation(
      'Delete Session',
      'Are you sure you want to delete this session? This action cannot be undone.',
      async () => {
        console.log('✅ User confirmed deletion')
        try {
          console.log('Deleting from database...')
          console.log('Session ID to delete:', sessionId)
          console.log('User ID:', user.id)
          
          const { data, error } = await supabase
            .from('work_sessions')
            .delete()
            .eq('id', sessionId)
            .select() // Return the deleted row to confirm

          console.log('Delete response:', { data, error })

          if (error) {
            console.error('❌ Error deleting session:', error)
            showToast('Failed to delete session: ' + error.message, 'error')
          } else {
            console.log('✅ Deleted from database successfully')
            console.log('Deleted row:', data)
            // Mark modification time to prevent premature reload
            setLastModificationTime(Date.now())
            // Remove from local state immediately
            setWeeklySessions(prev => {
              const filtered = prev.filter(s => s.id !== sessionId)
              console.log('🗑️ Removed session. Count:', prev.length, '→', filtered.length)
              return filtered
            })
            showToast('Session deleted successfully', 'success')
            setShowEditModal(false)
            setEditingSession(null)
            
            // Reload sessions if admin (for pending timesheets view)
            if (userRole === 'admin') {
              loadPendingTimesheets()
            }
          }
        } catch (error) {
          console.error('Error deleting session:', error)
          showToast('An error occurred', 'error')
        }
      },
      'Delete',
      'Cancel'
    )
  }

  // Add manual session
  const addManualSession = async () => {
    if (!user) return
    if (!newSessionData.role) {
      showToast('Please select a role', 'error')
      return
    }

    try {
      // Create date objects for start and end times
      const [startHours, startMinutes] = newSessionData.startTime.split(':')
      const [endHours, endMinutes] = newSessionData.endTime.split(':')
      
      const startDateTime = new Date(newSessionData.date)
      startDateTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0)
      
      const endDateTime = new Date(newSessionData.date)
      endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0)
      
      // Calculate duration
      const duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60))
      
      if (duration <= 0) {
        showToast('End time must be after start time', 'error')
        return
      }
      
      // Get location from project
      const location = getLocationFromProject(newSessionData.project)
      
      // Save to database
      const sessionData = {
        project: newSessionData.project,
        location: location,
        role: newSessionData.role,
        startTime: startDateTime,
        endTime: endDateTime,
        duration: duration
      }
      
      await saveWorkSession(sessionData)
      
      // Reset form
      setNewSessionData({
        project: 'The Shop',
        role: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '08:00',
        endTime: '17:00'
      })
      
      setShowAddSessionModal(false)
      showToast('Session added successfully!', 'success')
      
    } catch (error) {
      console.error('Error adding manual session:', error)
      showToast('Failed to add session', 'error')
    }
  }

  // Load timesheets when admin tab is active
  useEffect(() => {
    if (userRole === 'admin' && activeTab === 'admin') {
      loadPendingTimesheets()
    }
  }, [userRole, activeTab, timesheetFilter])

  // Materials Management Functions
  
  // Load materials from database
  useEffect(() => {
    const loadMaterials = async () => {
      if (!user) return
      
      try {
        const { data, error } = await supabase
          .from('materials')
          .select('*')
          .order('name')
        
        if (error) {
          console.error('Error loading materials:', error)
        } else {
          setMaterials(data || [])
        }
      } catch (error) {
        console.error('Error loading materials:', error)
      }
    }
    
    if (activeTab === 'materials' || activeTab === 'hours' || activeTab === 'my-materials') {
      loadMaterials()
    }
  }, [user, activeTab])

  // Load employee materials when Materials tab is active
  useEffect(() => {
    if (activeTab === 'my-materials' && user) {
      loadEmployeeMaterials()
    }
  }, [activeTab, user])

  // Add new material (admin only)
  const addNewMaterial = async () => {
    if (!newMaterial.name.trim() || !newMaterial.unit.trim()) {
      showToast('Please fill in name and unit', 'error')
      return
    }

    try {
      const { data, error } = await supabase
        .from('materials')
        .insert([{
          name: newMaterial.name.trim(),
          unit: newMaterial.unit.trim(),
          description: newMaterial.description.trim(),
          status: newMaterial.status,
          created_by: user?.id
        }])
        .select()
        .single()

      if (error) {
        showToast(`Failed to add material: ${error.message}`, 'error')
        return
      }

      setMaterials(prev => [...prev, data])
      setNewMaterial({ name: '', unit: 'SY', description: '', status: 'active' })
      setShowAddMaterial(false)
      showToast('Material added successfully!', 'success')
    } catch (err) {
      console.error('Error adding material:', err)
      showToast('Failed to add material', 'error')
    }
  }

  // Update existing material (admin only)
  const updateMaterial = async () => {
    if (!editingMaterial) return

    try {
      const { error } = await supabase
        .from('materials')
        .update({
          name: editingMaterial.name,
          unit: editingMaterial.unit,
          description: editingMaterial.description,
          status: editingMaterial.status
        })
        .eq('id', editingMaterial.id)

      if (error) {
        showToast(`Failed to update material: ${error.message}`, 'error')
        return
      }

      setMaterials(prev => prev.map(m => m.id === editingMaterial.id ? editingMaterial : m))
      setEditingMaterial(null)
      setShowEditMaterial(false)
      showToast('Material updated successfully!', 'success')
    } catch (err) {
      console.error('Error updating material:', err)
      showToast('Failed to update material', 'error')
    }
  }

  // Delete material (admin only)
  const deleteMaterial = async (id: string) => {
    showConfirmation(
      'Delete Material',
      'Are you sure you want to delete this material from the catalog?',
      async () => {
        try {
          const { error } = await supabase
            .from('materials')
            .delete()
            .eq('id', id)

          if (error) {
            showToast(`Failed to delete material: ${error.message}`, 'error')
            return
          }

          setMaterials(prev => prev.filter(m => m.id !== id))
          showToast('Material deleted successfully!', 'success')
        } catch (err) {
          console.error('Error deleting material:', err)
          showToast('Failed to delete material', 'error')
        }
      },
      'Delete',
      'Cancel'
    )
  }

  // Session Materials Functions
  
  // Load materials for a specific session (currently unused - kept for potential future use)
  // const loadSessionMaterials = async (sessionId: string) => {
  //   try {
  //     const { data, error } = await supabase
  //       .from('session_materials')
  //       .select(`
  //         *,
  //         materials (name, unit)
  //       `)
  //       .eq('session_id', sessionId)

  //     if (error) {
  //       console.error('Error loading session materials:', error)
  //     } else {
  //       setSessionMaterials(data || [])
  //     }
  //   } catch (error) {
  //     console.error('Error loading session materials:', error)
  //   }
  // }

  // Load all materials for current employee
  const loadEmployeeMaterials = async () => {
    if (!user?.id) return
    
    try {
      const { data, error } = await supabase
        .from('session_materials')
        .select(`
          *,
          materials (name, unit)
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading employee materials:', error)
      } else {
        setSessionMaterials(data || [])
      }
    } catch (error) {
      console.error('Error loading employee materials:', error)
    }
  }

  // Add material to session
  const addSessionMaterial = async () => {
    // Validation for standalone mode (no session)
    if (!selectedSessionForMaterials) {
      if (!newSessionMaterial.materialId || !newSessionMaterial.quantity || !newSessionMaterial.project || !newSessionMaterial.date) {
        showToast('Please fill in all required fields', 'error')
        return
      }
      
      // Create a standalone material entry (not tied to a session)
      try {
        const { data, error } = await supabase
          .from('session_materials')
          .insert([{
            session_id: null, // Standalone material entry
            material_id: newSessionMaterial.materialId,
            quantity: parseFloat(newSessionMaterial.quantity),
            notes: newSessionMaterial.notes,
            project: newSessionMaterial.project,
            created_by: user?.id,
            created_at: new Date(newSessionMaterial.date).toISOString()
          }])
          .select(`
            *,
            materials (name, unit)
          `)
          .single()

        if (error) {
          showToast(`Failed to add material: ${error.message}`, 'error')
          return
        }

        setSessionMaterials(prev => [...prev, data])
        setNewSessionMaterial({ materialId: '', quantity: '', notes: '', project: '', date: new Date().toISOString().split('T')[0] })
        showToast('Material added successfully!', 'success')
        
        // Reload materials for the tab
        loadEmployeeMaterials()
      } catch (err) {
        console.error('Error adding material:', err)
        showToast('Failed to add material', 'error')
      }
      return
    }
    
    // Existing validation for session-based materials
    if (!newSessionMaterial.materialId || !newSessionMaterial.quantity) {
      showToast('Please select material and enter quantity', 'error')
      return
    }

    try {
      const { data, error } = await supabase
        .from('session_materials')
        .insert([{
          session_id: selectedSessionForMaterials.id,
          material_id: newSessionMaterial.materialId,
          quantity: parseFloat(newSessionMaterial.quantity),
          notes: newSessionMaterial.notes,
          created_by: user?.id
        }])
        .select(`
          *,
          materials (name, unit)
        `)
        .single()

      if (error) {
        if (error.code === '23505') {
          showToast('This material has already been added to this session', 'error')
        } else {
          showToast(`Failed to add material: ${error.message}`, 'error')
        }
        return
      }

      setSessionMaterials(prev => [...prev, data])
      setNewSessionMaterial({ materialId: '', quantity: '', notes: '', project: '', date: new Date().toISOString().split('T')[0] })
      showToast('Material added to session!', 'success')
    } catch (err) {
      console.error('Error adding session material:', err)
      showToast('Failed to add material', 'error')
    }
  }

  // Delete material from session
  const deleteSessionMaterial = async (id: string) => {
    showConfirmation(
      'Remove Material',
      'Remove this material from the session?',
      async () => {
        try {
          const { error} = await supabase
            .from('session_materials')
            .delete()
            .eq('id', id)

          if (error) {
            showToast(`Failed to remove material: ${error.message}`, 'error')
            return
          }

          setSessionMaterials(prev => prev.filter(m => m.id !== id))
          showToast('Material removed from session', 'success')
        } catch (err) {
          console.error('Error deleting session material:', err)
          showToast('Failed to remove material', 'error')
        }
      },
      'Remove',
      'Cancel'
    )
  }

  // Project Tracking Functions
  
  // Load statistics for a specific project
  const loadProjectStats = async (project: Project) => {
    // setLoadingProjectStats(true)
    setSelectedProjectForStats(project)
    
    try {
      // Get all approved sessions for this project
      const { data: sessions, error } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('project', project.name)
        .eq('status', 'approved')
        .order('start_time', { ascending: true })
      
      if (error) {
        console.error('Error loading project sessions:', error)
        showToast('Failed to load project stats', 'error')
        return
      }

      // Get materials for these sessions
      const sessionIds = (sessions || []).map(s => s.id)
      let materialsData: any[] = []
      
      if (sessionIds.length > 0) {
        const { data: materials } = await supabase
          .from('session_materials')
          .select(`
            *,
            materials (name, unit)
          `)
          .in('session_id', sessionIds)
        
        materialsData = materials || []
      }

      // Also get standalone materials for this project (not tied to sessions)
      const { data: standaloneMaterials } = await supabase
        .from('session_materials')
        .select(`
          *,
          materials (name, unit)
        `)
        .eq('project', project.name)
        .is('session_id', null)
      
      if (standaloneMaterials) {
        materialsData = [...materialsData, ...standaloneMaterials]
      }

      // Calculate hours by role
      const hoursByRole: Record<string, number> = {}
      const employeeHours: Record<string, number> = {}
      let totalMinutes = 0
      let firstDate: Date | null = null
      let lastDate: Date | null = null

      // Get user names
      const userIds = [...new Set((sessions || []).map(s => s.user_id))]
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, full_name, email')
        .in('user_id', userIds)
      
      const userNameMap = new Map()
      if (userRoles) {
        userRoles.forEach((u: any) => {
          userNameMap.set(u.user_id, u.full_name || u.email)
        })
      }

      (sessions || []).forEach((session: any) => {
        const duration = session.duration || 0
        totalMinutes += duration
        
        // Track by role
        hoursByRole[session.role] = (hoursByRole[session.role] || 0) + duration
        
        // Track by employee
        const userName = userNameMap.get(session.user_id) || 'Unknown'
        employeeHours[userName] = (employeeHours[userName] || 0) + duration
        
        // Track date range
        const sessionDate = new Date(session.start_time)
        if (!firstDate || sessionDate < firstDate) firstDate = sessionDate
        if (!lastDate || sessionDate > lastDate) lastDate = sessionDate
      })

      // Calculate materials totals
      const materialTotals: Record<string, { quantity: number, unit: string }> = {}
      materialsData.forEach((sm: any) => {
        const key = sm.materials.name
        if (!materialTotals[key]) {
          materialTotals[key] = { quantity: 0, unit: sm.materials.unit }
        }
        materialTotals[key].quantity += parseFloat(sm.quantity)
      })

      setProjectStats({
        project,
        sessions: sessions || [],
        totalMinutes,
        hoursByRole,
        employeeHours,
        materialTotals,
        firstDate,
        lastDate,
        sessionCount: (sessions || []).length
      })
    } catch (error) {
      console.error('Error calculating project stats:', error)
      showToast('Error calculating project statistics', 'error')
    } finally {
      // setLoadingProjectStats(false)
    }
  }

  // Mark project as complete
  const markProjectComplete = async (project: Project) => {
    if (!project.id) return
    
    try {
      // Update project status to 'completed' and set completed_at timestamp
      const { error } = await supabase
        .from('projects')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', project.id)
      
      if (error) {
        showToast(`Failed to complete project: ${error.message}`, 'error')
        return
      }

      // Load final stats for the project
      await loadProjectStats(project)
      
      // Refresh projects list
      await loadAllProjects()
      
      showToast(`Project "${project.name}" marked as complete!`, 'success')
      setShowCompleteConfirmation(false)
      setProjectToComplete(null)
    } catch (error) {
      console.error('Error completing project:', error)
      showToast('Error completing project', 'error')
    }
  }

  const reactivateProject = async (project: Project) => {
    if (!project.id) return
    
    try {
      // Update project status back to 'active' and clear completed_at timestamp
      const { error } = await supabase
        .from('projects')
        .update({ 
          status: 'active',
          completed_at: null
        })
        .eq('id', project.id)
      
      if (error) {
        showToast(`Failed to reactivate project: ${error.message}`, 'error')
        return
      }
      
      // Refresh projects list
      await loadAllProjects()
      
      showToast(`Project "${project.name}" reactivated!`, 'success')
    } catch (error) {
      console.error('Error reactivating project:', error)
      showToast('Error reactivating project', 'error')
    }
  }

  const handleClockAction = async () => {
    const newLocation = getLocationFromProject(selectedProject)
    const now = new Date()
    
    if (!isWorking) {
      // Start work - require role selection
      if (!selectedRole) {
        showToast('Please select your role before clocking in', 'warning')
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
        
        // Check minimum duration (1 minute)
        if (duration < 1) {
          showToast('You must work for at least 1 minute before transferring', 'warning')
          return
        }
        
        const sessionData = {
          project: currentLocation === 'The Shop' ? 'The Shop' : 
            currentLocation === 'Lunch' ? 'Lunch' :
            projects.find(p => p.location === currentLocation)?.name || 'Unknown',
          location: currentLocation!,
          role: currentRole,
          startTime: workStartTime,
          endTime: now,
          duration,
          notes: sessionNotes
        }
        
        // Save to local state
        setTodaysSessions(prev => [...prev, sessionData])
        
        // Save to database
        await saveWorkSession(sessionData)
      }
      // Start new session
      if (!selectedRole) {
        showToast('Please select your role before transferring', 'warning')
        return
      }
      setCurrentLocation(newLocation)
      setCurrentRole(selectedRole)
      setWorkStartTime(now)
      setSessionNotes('') // Clear notes for new session
    } else {
      // End work day
      if (workStartTime && currentRole) {
        const duration = calculateDuration(workStartTime, now)
        
        // Check minimum duration (1 minute)
        if (duration < 1) {
          showToast('You must work for at least 1 minute before clocking out', 'warning')
          return
        }
        
        const sessionData = {
          project: currentLocation === 'The Shop' ? 'The Shop' : 
            currentLocation === 'Lunch' ? 'Lunch' :
            projects.find(p => p.location === currentLocation)?.name || 'Unknown',
          location: currentLocation!,
          role: currentRole,
          startTime: workStartTime,
          endTime: now,
          duration,
          notes: sessionNotes
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
      setSessionNotes('') // Clear notes when clocking out
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
                  <option value="Lunch">Lunch</option>
                  {isLoading ? (
                    <option disabled>Loading projects...</option>
                  ) : (
                    projects
                      .filter(project => project.status !== 'completed')
                      .map(project => (
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

              {isWorking && (
                <div className="notes-input-container">
                  <label>Session Notes (Optional):</label>
                  <textarea
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder="Add notes about this work session... (e.g., tasks completed, issues encountered, etc.)"
                    className="session-notes-textarea"
                    rows={3}
                  />
                  <p className="notes-hint">💡 Notes will be saved when you transfer or clock out</p>
                </div>
              )}

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
        const activeProjects = projects.filter(p => p.status === 'active')
        
        return (
          <div className="tab-content">
            <div className="live-projects-container">
              <div className="live-projects-header">
                <h2>Live Project Tracker</h2>
                <p className="tracker-subtitle">Real-time hours and materials by project</p>
              </div>

              {activeProjects.length === 0 ? (
                <div className="no-active-projects">
                  <p>No active projects. Start a project to track hours and materials live!</p>
                  <button 
                    className="manage-projects-btn"
                    onClick={() => setShowAddProject(true)}
                  >
                    + Create Project
                  </button>
                </div>
              ) : (
                <div className="live-projects-grid">
                  {activeProjects.map(project => (
                    <div key={project.id} className="live-project-card">
                      <div className="live-project-header">
                        <div className="project-title-area">
                          <h3>{project.name}</h3>
                          <span className="project-type-badge">{project.type}</span>
                        </div>
                        <button
                          className="view-stats-btn"
                          onClick={() => loadProjectStats(project)}
                        >
                          View Live Stats
                        </button>
                      </div>
                      <div className="project-quick-info">
                        <p className="project-location">{project.location}</p>
                      </div>
                      <div className="project-actions-footer">
                        <button
                          className="mark-complete-btn"
                          onClick={() => {
                            setProjectToComplete(project)
                            setShowCompleteConfirmation(true)
                          }}
                        >
                          Mark Complete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!showAddProject && activeProjects.length > 0 && (
                <div className="manage-projects-section">
                  <button 
                    className="manage-projects-btn"
                    onClick={() => setShowAddProject(true)}
                  >
                    + Add New Project
                  </button>
                </div>
              )}

              {/* Add Project Form */}
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
            </div>
          </div>
        )
      case 'hours':
        // Use only database sessions (they're already saved when clocking out)
        const allSessions = weeklySessions
        
        // Calculate week totals (all completed sessions)
        const completedSessions = allSessions.filter(s => s.duration)
        
        // Create Monday through Sunday breakdown
        const startOfWeek = new Date()
        const dayOfWeek = startOfWeek.getDay()
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // If Sunday, go back 6 days, otherwise go to Monday
        startOfWeek.setDate(startOfWeek.getDate() + diff)
        startOfWeek.setHours(0, 0, 0, 0)
        
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
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
              <div className="hours-header">
                <h2>Time Tracking</h2>
                <button
                  className="add-session-icon-btn"
                  onClick={() => setShowAddSessionModal(true)}
                  title="Add Session Manually"
                >
                  <Plus size={24} />
                </button>
              </div>

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
                                {session.notes && (
                                  <div className="session-notes-display">
                                    📝 {session.notes}
                                  </div>
                                )}
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
                    {weeklySessions.filter(s => s.status === 'draft' && s.duration && s.endTime).length > 0 && (
                      <div className="status-badge draft">
                        {weeklySessions.filter(s => s.status === 'draft' && s.duration && s.endTime).length} sessions pending submission
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
                  {weeklySessions.filter(s => s.status === 'draft' && s.duration && s.endTime).length > 0 && (
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
      case 'materials':
        // Admin-only Materials tab
        if (userRole !== 'admin') {
          return null
        }

        const activeMaterials = materials.filter(m => m.status === 'active')
        const inactiveMaterials = materials.filter(m => m.status === 'inactive')

        return (
          <div className="tab-content">
            <div className="materials-container">
              <div className="materials-header">
                <h2>Materials Management</h2>
                <button 
                  className="btn-primary"
                  onClick={() => setShowAddMaterial(true)}
                >
                  <Plus size={20} /> Add Material
                </button>
              </div>

              {/* Active Materials */}
              <div className="materials-section">
                <h3>Active Materials ({activeMaterials.length})</h3>
                {activeMaterials.length === 0 ? (
                  <p className="empty-state">No active materials. Add one to get started!</p>
                ) : (
                  <div className="materials-list">
                    {activeMaterials.map(material => (
                      <div key={material.id} className="material-card">
                        <div className="material-info">
                          <div className="material-name">{material.name}</div>
                          <div className="material-unit">Unit: {material.unit}</div>
                          {material.description && (
                            <div className="material-description">{material.description}</div>
                          )}
                        </div>
                        <div className="material-actions">
                          <button
                            className="icon-btn"
                            onClick={() => {
                              setEditingMaterial(material)
                              setShowEditMaterial(true)
                            }}
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            className="icon-btn delete"
                            onClick={() => deleteMaterial(material.id)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inactive Materials */}
              {inactiveMaterials.length > 0 && (
                <div className="materials-section">
                  <h3>Inactive Materials ({inactiveMaterials.length})</h3>
                  <div className="materials-list">
                    {inactiveMaterials.map(material => (
                      <div key={material.id} className="material-card inactive">
                        <div className="material-info">
                          <div className="material-name">{material.name}</div>
                          <div className="material-unit">Unit: {material.unit}</div>
                          {material.description && (
                            <div className="material-description">{material.description}</div>
                          )}
                        </div>
                        <div className="material-actions">
                          <button
                            className="icon-btn"
                            onClick={() => {
                              setEditingMaterial(material)
                              setShowEditMaterial(true)
                            }}
                          >
                            <Edit2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Material Modal */}
              {showAddMaterial && (
                <div className="modal-overlay" onClick={() => setShowAddMaterial(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <h3>Add New Material</h3>
                    <div className="form-group">
                      <label>Material Name *</label>
                      <input
                        type="text"
                        value={newMaterial.name}
                        onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                        placeholder="e.g., Single Net Straw"
                      />
                    </div>
                    <div className="form-group">
                      <label>Unit *</label>
                      <select
                        value={newMaterial.unit}
                        onChange={(e) => setNewMaterial({...newMaterial, unit: e.target.value})}
                      >
                        <option value="SY">SY (Square Yards)</option>
                        <option value="SF">SF (Square Feet)</option>
                        <option value="CY">CY (Cubic Yards)</option>
                        <option value="YD">YD (Yards)</option>
                        <option value="LBS">LBS (Pounds)</option>
                        <option value="TON">TON (Tons)</option>
                        <option value="GAL">GAL (Gallons)</option>
                        <option value="EA">EA (Each)</option>
                        <option value="FT">FT (Feet)</option>
                        <option value="LF">LF (Linear Feet)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={newMaterial.description}
                        onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
                        placeholder="Optional description"
                        rows={3}
                      />
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select
                        value={newMaterial.status}
                        onChange={(e) => setNewMaterial({...newMaterial, status: e.target.value as 'active' | 'inactive'})}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="modal-actions">
                      <button className="btn-secondary" onClick={() => setShowAddMaterial(false)}>
                        Cancel
                      </button>
                      <button className="btn-primary" onClick={addNewMaterial}>
                        Add Material
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Material Modal */}
              {showEditMaterial && editingMaterial && (
                <div className="modal-overlay" onClick={() => setShowEditMaterial(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <h3>Edit Material</h3>
                    <div className="form-group">
                      <label>Material Name *</label>
                      <input
                        type="text"
                        value={editingMaterial.name}
                        onChange={(e) => setEditingMaterial({...editingMaterial, name: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Unit *</label>
                      <select
                        value={editingMaterial.unit}
                        onChange={(e) => setEditingMaterial({...editingMaterial, unit: e.target.value})}
                      >
                        <option value="SY">SY (Square Yards)</option>
                        <option value="SF">SF (Square Feet)</option>
                        <option value="CY">CY (Cubic Yards)</option>
                        <option value="YD">YD (Yards)</option>
                        <option value="LBS">LBS (Pounds)</option>
                        <option value="TON">TON (Tons)</option>
                        <option value="GAL">GAL (Gallons)</option>
                        <option value="EA">EA (Each)</option>
                        <option value="FT">FT (Feet)</option>
                        <option value="LF">LF (Linear Feet)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={editingMaterial.description || ''}
                        onChange={(e) => setEditingMaterial({...editingMaterial, description: e.target.value})}
                        rows={3}
                      />
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select
                        value={editingMaterial.status}
                        onChange={(e) => setEditingMaterial({...editingMaterial, status: e.target.value})}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="modal-actions">
                      <button className="btn-secondary" onClick={() => setShowEditMaterial(false)}>
                        Cancel
                      </button>
                      <button className="btn-primary" onClick={updateMaterial}>
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      case 'my-materials':
        // Employee Materials Tracker
        return (
          <div className="tab-content">
            <div className="materials-tracker-container">
              <div className="materials-tracker-header">
                <h2>My Materials</h2>
                <button
                  className="add-material-entry-btn"
                  onClick={() => setShowAddSessionMaterial(true)}
                >
                  <Plus size={20} /> Add Materials Used
                </button>
              </div>

              <div className="materials-tracker-content">
                {sessionMaterials.length === 0 ? (
                  <div className="empty-state">
                    <Package size={48} />
                    <p>No materials recorded yet</p>
                    <p className="empty-state-subtitle">Track materials you use on projects</p>
                  </div>
                ) : (
                  <div className="materials-entries-list">
                    {sessionMaterials.map((material) => (
                      <div key={material.id} className="material-entry-card">
                        <div className="material-entry-header">
                          <h3>{material.materials?.name || 'Unknown Material'}</h3>
                          <span className="material-quantity">{material.quantity} {material.materials?.unit || ''}</span>
                        </div>
                        <div className="material-entry-details">
                          {material.project && <p><strong>Project:</strong> {material.project}</p>}
                          <p><strong>Date:</strong> {new Date(material.created_at).toLocaleDateString()}</p>
                          {material.notes && <p><strong>Notes:</strong> {material.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      case 'history':
        // Admin-only History tab - Show completed projects
        if (userRole !== 'admin') {
          return null // History tab is admin-only
        }

        const completedProjects = projects.filter(p => p.status === 'completed')

        return (
          <div className="tab-content">
            <div className="live-projects-container">
              <div className="live-projects-header">
                <h2>Completed Projects</h2>
                <p className="tracker-subtitle">View final stats and reactivate projects if needed</p>
              </div>

              {completedProjects.length === 0 ? (
                <div className="no-active-projects">
                  <p>No completed projects yet.</p>
                </div>
              ) : (
                <div className="live-projects-grid">
                  {completedProjects.map(project => (
                    <div key={project.id} className="live-project-card">
                      <div className="live-project-header">
                        <div className="project-title-area">
                          <h3>{project.name}</h3>
                          <span className="project-type-badge">{project.type}</span>
                          <span className="completed-badge">✓ Completed</span>
                        </div>
                        <button
                          className="view-stats-btn"
                          onClick={() => loadProjectStats(project)}
                        >
                          View Final Stats
                        </button>
                      </div>
                      <div className="project-quick-info">
                        <p className="project-location">{project.location}</p>
                        {project.completed_at && (
                          <p className="completion-date">
                            Completed: {new Date(project.completed_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="project-actions-footer">
                        <button
                          className="reactivate-btn"
                          onClick={() => reactivateProject(project)}
                        >
                          Reactivate Project
                        </button>
                      </div>
                    </div>
                  ))}
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
                                    {/* Materials used in this session */}
                                    {session.materials && session.materials.length > 0 && (
                                      <div className="session-materials-used">
                                        <strong>Materials Used:</strong>
                                        <div className="materials-used-list">
                                          {session.materials.map((m: any) => (
                                            <div key={m.id} className="material-used-item">
                                              <span className="material-used-name">{m.materials.name}</span>
                                              <span className="material-used-qty">{m.quantity} {m.materials.unit}</span>
                                              {m.notes && <span className="material-used-notes">({m.notes})</span>}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
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
          <div className="logo-container">
            <img 
              src="/pleasant-knoll-logo.jpg" 
              alt="Pleasant Knoll Landscaping" 
              className="company-logo"
            />
          </div>
        </div>
        {renderTabContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        {userRole === 'admin' ? (
          // Admin-only navigation: Admin, Projects, Materials, History
          <>
            <button 
              className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <Shield size={24} />
              <span>Admin</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('projects')}
            >
              <Calendar size={24} />
              <span>Projects</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'materials' ? 'active' : ''}`}
              onClick={() => setActiveTab('materials')}
            >
              <Package size={24} />
              <span>Materials</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <History size={24} />
              <span>History</span>
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
            <button 
              className={`nav-item ${activeTab === 'my-materials' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-materials')}
            >
              <Package size={24} />
              <span>Materials</span>
            </button>
          </>
        )}
      </nav>

      {/* Project Stats Modal */}
      {selectedProjectForStats && projectStats && (
        <div className="modal-overlay" onClick={() => setSelectedProjectForStats(null)}>
          <div className="modal-content project-stats-modal" onClick={(e) => e.stopPropagation()}>
            <div className="project-stats-header">
              <div>
                <h2>{projectStats.project.name}</h2>
                <p className="stats-project-type">{projectStats.project.type}</p>
                <p className="stats-project-location">{projectStats.project.location}</p>
              </div>
              <button 
                className="modal-close-btn" 
                onClick={() => setSelectedProjectForStats(null)}
              >
                ×
              </button>
            </div>

            <div className="project-stats-summary">
              <div className="stat-box">
                <h4>Total Hours</h4>
                <p className="stat-value">{Math.round(projectStats.totalMinutes / 60 * 10) / 10}h</p>
              </div>
              <div className="stat-box">
                <h4>Sessions</h4>
                <p className="stat-value">{projectStats.sessionCount}</p>
              </div>
              <div className="stat-box">
                <h4>Workers</h4>
                <p className="stat-value">{Object.keys(projectStats.employeeHours).length}</p>
              </div>
              <div className="stat-box">
                <h4>Date Range</h4>
                <p className="stat-value-small">
                  {projectStats.firstDate?.toLocaleDateString()} - {projectStats.lastDate?.toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="project-stats-section">
              <h3>Hours by Equipment/Role</h3>
              {Object.keys(projectStats.hoursByRole).length > 0 ? (
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>Role/Equipment</th>
                      <th>Hours</th>
                      <th>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(projectStats.hoursByRole)
                      .sort((a, b) => (b[1] as number) - (a[1] as number))
                      .map(([role, minutes]) => {
                        const mins = minutes as number
                        const hours = Math.round(mins / 60 * 10) / 10
                        const percentage = Math.round((mins / projectStats.totalMinutes) * 100)
                        return (
                          <tr key={role}>
                            <td><strong>{role}</strong></td>
                            <td>{hours}h</td>
                            <td>{percentage}%</td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              ) : (
                <p className="no-data">No hours recorded yet</p>
              )}
            </div>

            <div className="project-stats-section">
              <h3>Materials Used</h3>
              {Object.keys(projectStats.materialTotals).length > 0 ? (
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(projectStats.materialTotals)
                      .sort((a, b) => (b[1] as any).quantity - (a[1] as any).quantity)
                      .map(([material, data]) => {
                        const materialData = data as { quantity: number; unit: string }
                        return (
                          <tr key={material}>
                            <td><strong>{material}</strong></td>
                            <td>{materialData.quantity} {materialData.unit}</td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              ) : (
                <p className="no-data">No materials recorded yet</p>
              )}
            </div>

            <div className="project-stats-section">
              <h3>Hours by Employee</h3>
              {Object.keys(projectStats.employeeHours).length > 0 ? (
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(projectStats.employeeHours)
                      .sort((a, b) => (b[1] as number) - (a[1] as number))
                      .map(([employee, minutes]) => {
                        const mins = minutes as number
                        const hours = Math.round(mins / 60 * 10) / 10
                        return (
                          <tr key={employee}>
                            <td><strong>{employee}</strong></td>
                            <td>{hours}h</td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              ) : (
                <p className="no-data">No employee hours recorded yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Complete Project Confirmation Modal */}
      {showCompleteConfirmation && projectToComplete && (
        <div className="modal-overlay" onClick={() => setShowCompleteConfirmation(false)}>
          <div className="modal-content complete-confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Mark Project Complete?</h3>
            <p className="confirm-message">
              Are you sure you want to mark "<strong>{projectToComplete.name}</strong>" as complete?
            </p>
            <p className="confirm-details">
              This will:
            </p>
            <ul className="confirm-list">
              <li>Move the project to "Completed" status</li>
              <li>Preserve all hours and materials data</li>
              <li>Generate a final project report</li>
              <li>Remove it from active tracking</li>
            </ul>
            <div className="confirm-actions">
              <button 
                className="confirm-complete-btn"
                onClick={() => markProjectComplete(projectToComplete)}
              >
                Yes, Mark Complete
              </button>
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowCompleteConfirmation(false)
                  setProjectToComplete(null)
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <option value="Lunch">Lunch</option>
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
                    value={editingSession.startTime ? new Date(editingSession.startTime).toTimeString().slice(0, 5) : ''}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':')
                      const newStart = new Date(editingSession.startTime)
                      newStart.setHours(parseInt(hours), parseInt(minutes))
                      
                      // Recalculate duration when start time changes
                      const endTime = editingSession.endTime ? new Date(editingSession.endTime) : newStart
                      const newDuration = Math.round((endTime.getTime() - newStart.getTime()) / (1000 * 60))
                      
                      setEditingSession({
                        ...editingSession, 
                        startTime: newStart,
                        start_time: newStart.toISOString(),
                        duration: newDuration
                      })
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>End Time:</label>
                  <input
                    type="time"
                    value={editingSession.endTime ? new Date(editingSession.endTime).toTimeString().slice(0, 5) : ''}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':')
                      const newEnd = new Date(editingSession.endTime)
                      newEnd.setHours(parseInt(hours), parseInt(minutes))
                      
                      // Recalculate duration when end time changes
                      const startTime = editingSession.startTime ? new Date(editingSession.startTime) : newEnd
                      const newDuration = Math.round((newEnd.getTime() - startTime.getTime()) / (1000 * 60))
                      
                      setEditingSession({
                        ...editingSession, 
                        endTime: newEnd,
                        end_time: newEnd.toISOString(), 
                        duration: newDuration
                      })
                    }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Duration: {Math.floor(editingSession.duration / 60)}h {editingSession.duration % 60}m</label>
              </div>

              <div className="form-group">
                <label>Notes (Optional):</label>
                <textarea
                  value={editingSession.notes || ''}
                  onChange={(e) => setEditingSession({...editingSession, notes: e.target.value})}
                  placeholder="Add notes about this work session..."
                  className="session-notes-textarea"
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button
                  className="save-btn"
                  onClick={() => updateSession(editingSession.id, {
                    project: editingSession.project,
                    role: editingSession.role,
                    start_time: editingSession.start_time,
                    end_time: editingSession.end_time,
                    duration: editingSession.duration,
                    notes: editingSession.notes
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

      {/* Add Session Modal */}
      {showAddSessionModal && (
        <div className="modal-overlay" onClick={() => setShowAddSessionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Session Manually</h3>
            <div className="edit-session-form">
              <div className="form-group">
                <label>Date:</label>
                <input
                  type="date"
                  value={newSessionData.date}
                  onChange={(e) => setNewSessionData({...newSessionData, date: e.target.value})}
                  max={new Date().toISOString().split('T')[0]} // Can't add future sessions
                />
              </div>

              <div className="form-group">
                <label>Project:</label>
                <select
                  value={newSessionData.project}
                  onChange={(e) => setNewSessionData({...newSessionData, project: e.target.value})}
                >
                  <option value="The Shop">The Shop</option>
                  <option value="Lunch">Lunch</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Role:</label>
                <select
                  value={newSessionData.role}
                  onChange={(e) => setNewSessionData({...newSessionData, role: e.target.value})}
                >
                  <option value="">Choose your role...</option>
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
                    value={newSessionData.startTime}
                    onChange={(e) => setNewSessionData({...newSessionData, startTime: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>End Time:</label>
                  <input
                    type="time"
                    value={newSessionData.endTime}
                    onChange={(e) => setNewSessionData({...newSessionData, endTime: e.target.value})}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="save-btn"
                  onClick={addManualSession}
                >
                  Add Session
                </button>
                <button
                  className="cancel-btn"
                  onClick={() => {
                    setShowAddSessionModal(false)
                    setNewSessionData({
                      project: 'The Shop',
                      role: '',
                      date: new Date().toISOString().split('T')[0],
                      startTime: '08:00',
                      endTime: '17:00'
                    })
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Materials Modal */}
      {showAddSessionMaterial && (
        <div className="modal-overlay" onClick={() => {
          setShowAddSessionMaterial(false)
          setSelectedSessionForMaterials(null)
          setSessionMaterials([])
          setNewSessionMaterial({ materialId: '', quantity: '', notes: '', project: '', date: new Date().toISOString().split('T')[0] })
        }}>
          <div className="modal-content wide-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{selectedSessionForMaterials ? 'Materials for Session' : 'Add Materials Used'}</h3>
            
            {selectedSessionForMaterials ? (
              <div className="session-info-box">
                <div><strong>Project:</strong> {selectedSessionForMaterials.project}</div>
                <div><strong>Role:</strong> {selectedSessionForMaterials.role}</div>
                <div><strong>Date:</strong> {selectedSessionForMaterials.startTime.toLocaleDateString()}</div>
              </div>
            ) : (
              <div className="standalone-material-selectors">
                <div className="form-group">
                  <label>Date:</label>
                  <input
                    type="date"
                    value={newSessionMaterial.date}
                    onChange={(e) => setNewSessionMaterial({...newSessionMaterial, date: e.target.value})}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="form-group">
                  <label>Project:</label>
                  <select
                    value={newSessionMaterial.project}
                    onChange={(e) => setNewSessionMaterial({...newSessionMaterial, project: e.target.value})}
                  >
                    <option value="">Select project...</option>
                    <option value="The Shop">The Shop</option>
                    <option value="Lunch">Lunch</option>
                    {projects
                      .filter(p => p.status !== 'completed')
                      .map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {/* Existing materials for this session */}
            {sessionMaterials.length > 0 && (
              <div className="session-materials-list">
                <h4>Added Materials</h4>
                {sessionMaterials.map((sm: any) => (
                  <div key={sm.id} className="session-material-item">
                    <div className="material-details">
                      <strong>{sm.materials.name}</strong>
                      <span>{sm.quantity} {sm.materials.unit}</span>
                      {sm.notes && <div className="material-notes">{sm.notes}</div>}
                    </div>
                    <button
                      className="icon-btn delete"
                      onClick={() => deleteSessionMaterial(sm.id)}
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new material form */}
            <div className="add-material-form">
              <h4>Add Material</h4>
              <div className="form-group">
                <label>Material:</label>
                <select
                  value={newSessionMaterial.materialId}
                  onChange={(e) => setNewSessionMaterial({...newSessionMaterial, materialId: e.target.value})}
                >
                  <option value="">Select material...</option>
                  {materials
                    .filter(m => m.status === 'active')
                    .map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.unit})
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newSessionMaterial.quantity}
                    onChange={(e) => setNewSessionMaterial({...newSessionMaterial, quantity: e.target.value})}
                    placeholder="e.g., 1500"
                  />
                </div>

                <div className="form-group flex-2">
                  <label>Notes (optional):</label>
                  <input
                    type="text"
                    value={newSessionMaterial.notes}
                    onChange={(e) => setNewSessionMaterial({...newSessionMaterial, notes: e.target.value})}
                    placeholder="e.g., North slope area"
                  />
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={addSessionMaterial}
                disabled={!newSessionMaterial.materialId || !newSessionMaterial.quantity}
              >
                <Plus size={18} /> Add Material to Session
              </button>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowAddSessionMaterial(false)
                  setSelectedSessionForMaterials(null)
                  setSessionMaterials([])
                  setNewSessionMaterial({ materialId: '', quantity: '', notes: '', project: '', date: new Date().toISOString().split('T')[0] })
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmationModal.show && (
        <div className="modal-overlay" onClick={() => setConfirmationModal({ ...confirmationModal, show: false })}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmationModal.title}</h3>
            <p>{confirmationModal.message}</p>
            <div className="modal-actions">
              <button
                className="confirm-btn"
                onClick={() => {
                  confirmationModal.onConfirm()
                  setConfirmationModal({ ...confirmationModal, show: false })
                }}
              >
                {confirmationModal.confirmText}
              </button>
              <button
                className="cancel-btn"
                onClick={() => setConfirmationModal({ ...confirmationModal, show: false })}
              >
                {confirmationModal.cancelText}
              </button>
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
