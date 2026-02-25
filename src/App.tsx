import { useState, useEffect } from 'react'
import { Clock, Calendar, BarChart3, History, CheckCircle, XCircle, AlertCircle, Edit2, Trash2, LogOut, User, Shield, UserCheck, UserX, Plus, Package, Check, X, Users, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase, type Project, type UserRole, supabaseOperations } from './lib/supabase'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import AccessDenied from './components/AccessDenied'
import './App.css'

type TabType = 'clock' | 'projects' | 'hours' | 'my-materials' | 'history' | 'admin' | 'materials' | 'roles' | 'timesheet'

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
  
  // Week navigation state (0 = current week, -1 = last week, -2 = 2 weeks ago)
  const [weekOffset, setWeekOffset] = useState<number>(0)
  
  // Common landscaping roles
  // Base locations (always available)

  
  // Projects (loaded from database)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Roles management state
  const [roles, setRoles] = useState<any[]>([])
  const [showAddRole, setShowAddRole] = useState(false)
  const [newRole, setNewRole] = useState({
    role_name: '',
    hourly_rate: '',
    status: 'active'
  })
  const [editingRole, setEditingRole] = useState<any | null>(null)
  const [showEditRole, setShowEditRole] = useState(false)
  
  // Project management state
  const [showAddProject, setShowAddProject] = useState(false)
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
  const [allTimesheets, setAllTimesheets] = useState<any[]>([]) // For accurate counts
  const [timesheetFilter, setTimesheetFilter] = useState<'submitted' | 'approved' | 'rejected' | 'all'>('submitted')
  const [employeeFilter, setEmployeeFilter] = useState<string>('all') // Filter by employee
  const [selectedTimesheet, setSelectedTimesheet] = useState<any | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [isProcessingTimesheet, setIsProcessingTimesheet] = useState(false)
  
  // Timesheet date filtering and pagination
  const [timesheetDateFilter, setTimesheetDateFilter] = useState<'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom'>('thisWeek')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

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
  const [editingSessionMaterial, setEditingSessionMaterial] = useState<any>(null)

  // Project tracking state (for live project stats)
  const [selectedProjectForStats, setSelectedProjectForStats] = useState<Project | null>(null)
  const [projectStats, setProjectStats] = useState<any>(null)
  // const [loadingProjectStats, setLoadingProjectStats] = useState(false)  // Unused for now
  const [showCompleteConfirmation, setShowCompleteConfirmation] = useState(false)
  const [projectToComplete, setProjectToComplete] = useState<Project | null>(null)

  // Project notes state
  const [showProjectNotes, setShowProjectNotes] = useState(false)
  const [selectedProjectForNotes, setSelectedProjectForNotes] = useState<Project | null>(null)
  const [projectNotes, setProjectNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [projectModalTab, setProjectModalTab] = useState<'notes' | 'materials'>('notes')

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

  // Print modal state
  const [showPrintProjectReport, setShowPrintProjectReport] = useState(false)
  const [showPrintAdminTimesheet, setShowPrintAdminTimesheet] = useState(false)
  const [timesheetToPrint, setTimesheetToPrint] = useState<any>(null)

  // Authentication state
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'user' | 'approved' | 'admin' | 'super_admin' | null>(null)
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

  // Load all users (for admin and super admin)
  const loadAllUsers = async () => {
    if (userRole !== 'admin' && userRole !== 'super_admin') return
    
    try {
      const users = await supabaseOperations.getAllUserRoles()
      setAllUsers(users || [])
    } catch (error) {
      console.error('Error loading users:', error)
      showToast('Error loading users', 'error')
    }
  }

  // Note: Admins and super admins can now use the Clock tab (removed auto-redirect)
  // They need to clock in/out like employees do

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab)
  }, [activeTab])

  // Load all users when admin tab is accessed
  useEffect(() => {
    if (activeTab === 'admin' && (userRole === 'admin' || userRole === 'super_admin')) {
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
    try {
      // Clear active work session from localStorage
      localStorage.removeItem('activeWorkSession')
      
      // Clear all Supabase auth data from storage
      localStorage.removeItem('sb-eujcsdpckcaqayabtnsh-auth-token')
      sessionStorage.clear()
      
      // Try to sign out from Supabase
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('Supabase signOut error (non-critical):', err)
    }
    
    // Wait a moment to ensure session is cleared, then redirect to login
    setTimeout(() => {
      window.location.href = window.location.origin
    }, 100)
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

  // Load all roles from database
  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('role_name')
      
      if (error) {
        console.error('Error loading roles:', error)
        showToast('Failed to load roles', 'error')
        return
      }
      
      setRoles(data || [])
    } catch (error) {
      console.error('Error loading roles:', error)
      showToast('An error occurred while loading roles', 'error')
    }
  }

  // Add new role
  const addRole = async () => {
    if (!newRole.role_name.trim()) {
      showToast('Please enter a role name', 'error')
      return
    }

    try {
      const { data, error } = await supabase
        .from('roles')
        .insert([{
          role_name: newRole.role_name,
          hourly_rate: newRole.hourly_rate ? parseFloat(newRole.hourly_rate) : null,
          status: newRole.status
        }])
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          showToast('A role with this name already exists', 'error')
        } else {
          showToast(`Failed to add role: ${error.message}`, 'error')
        }
        return
      }

      setRoles(prev => [...prev, data])
      setNewRole({ role_name: '', hourly_rate: '', status: 'active' })
      setShowAddRole(false)
      showToast('Role added successfully!', 'success')
    } catch (err) {
      console.error('Error adding role:', err)
      showToast('Failed to add role', 'error')
    }
  }

  // Update existing role
  const updateRole = async () => {
    if (!editingRole || !editingRole.role_name.trim()) {
      showToast('Please enter a role name', 'error')
      return
    }

    try {
      const { data, error } = await supabase
        .from('roles')
        .update({
          role_name: editingRole.role_name,
          hourly_rate: editingRole.hourly_rate ? parseFloat(editingRole.hourly_rate) : null,
          status: editingRole.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingRole.id)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          showToast('A role with this name already exists', 'error')
        } else {
          showToast(`Failed to update role: ${error.message}`, 'error')
        }
        return
      }

      setRoles(prev => prev.map(r => r.id === data.id ? data : r))
      setEditingRole(null)
      setShowEditRole(false)
      showToast('Role updated successfully!', 'success')
    } catch (err) {
      console.error('Error updating role:', err)
      showToast('Failed to update role', 'error')
    }
  }

  // Delete role
  const deleteRole = async (roleId: string) => {
    showConfirmation(
      'Delete Role',
      'Are you sure you want to delete this role? This action cannot be undone.',
      async () => {
        try {
          const { error } = await supabase
            .from('roles')
            .delete()
            .eq('id', roleId)

          if (error) {
            showToast(`Failed to delete role: ${error.message}`, 'error')
            return
          }

          setRoles(prev => prev.filter(r => r.id !== roleId))
          showToast('Role deleted successfully', 'success')
        } catch (err) {
          console.error('Error deleting role:', err)
          showToast('Failed to delete role', 'error')
        }
      },
      'Delete',
      'Cancel'
    )
  }

  // Load projects from database on app start
  useEffect(() => {
    loadAllProjects()
  }, [])

  // Load roles for all authenticated users (employees need it for clock-in dropdown)
  useEffect(() => {
    if (user) {
      loadRoles()
    }
  }, [user])

  // Load weekly sessions from database
  const loadWeeklySessions = async (weekOffsetParam?: number) => {
    if (!user) return
    
    const offset = weekOffsetParam !== undefined ? weekOffsetParam : weekOffset
    
    try {
      // Calculate the start of the target week based on offset
      const now = new Date()
      const startOfWeek = new Date(now)
      const dayOfWeek = now.getDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // If Sunday, go back 6 days, otherwise go to Monday
      startOfWeek.setDate(now.getDate() + diff)
      startOfWeek.setDate(startOfWeek.getDate() + (offset * 7)) // Apply week offset
      startOfWeek.setHours(0, 0, 0, 0)
      
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 7) // End of week (next Monday)
      endOfWeek.setHours(0, 0, 0, 0)
      
      console.log('📅 Loading sessions for week:', {
        offset,
        startOfWeek: startOfWeek.toDateString(),
        endOfWeek: endOfWeek.toDateString()
      })
      
      const { data, error } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', startOfWeek.toISOString())
        .lt('start_time', endOfWeek.toISOString())
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
        console.log(`✅ Loaded ${sessions.length} sessions for week offset ${offset}`)
        if (sessions.length > 0) {
          console.log('First session:', {
            startTime: sessions[0].startTime,
            startTimeString: sessions[0].startTime.toDateString(),
            duration: sessions[0].duration,
            endTime: sessions[0].endTime,
            project: sessions[0].project,
            role: sessions[0].role,
            status: sessions[0].status
          })
          console.log('All sessions with status:', sessions.map(s => ({
            date: s.startTime.toDateString(),
            project: s.project,
            duration: s.duration,
            status: s.status
          })))
        } else {
          console.log('⚠️ No sessions found for this week')
        }
      }
    } catch (error) {
      console.error('Database error loading sessions:', error)
    }
  }

  useEffect(() => {
    loadWeeklySessions()
    
    // Reload sessions when we switch to the hours or timesheet tab
    const interval = setInterval(() => {
      if (activeTab === 'hours' || activeTab === 'timesheet') {
        // Don't reload if we just modified data (within last 3 seconds)
        const timeSinceModification = Date.now() - lastModificationTime
        if (timeSinceModification > 3000) {
          loadWeeklySessions()
        } else {
          console.log('⏸️ Skipping reload - recent modification')
        }
      }
    }, 10000) // Refresh every 10 seconds when on hours or timesheet tab
    
    return () => clearInterval(interval)
  }, [user, activeTab, lastModificationTime, weekOffset])

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

  const updateProject = async () => {
    if (!editingProject) return

    if (!editingProject.name.trim() || !editingProject.type.trim() || !editingProject.location.trim()) {
      showToast('Please fill in all required fields (Name, Type, and Location)', 'error')
      return
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .update({
          name: editingProject.name.trim(),
          type: editingProject.type.trim(),
          location: editingProject.location.trim(),
          status: editingProject.status
        })
        .eq('id', editingProject.id)
        .select()
        .single()

      if (error) {
        showToast(`Failed to update project: ${error.message}`, 'error')
        return
      }

      // Update local state
      setProjects(prev => prev.map(p => p.id === data.id ? data : p))
      
      // Close modal
      setShowEditProject(false)
      setEditingProject(null)
      
      showToast('Project updated successfully!', 'success')
      
    } catch (err) {
      showToast(`Failed to update project: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
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
  
  // Persist and restore active work session
  useEffect(() => {
    if (isWorking && workStartTime && currentLocation && currentRole) {
      // Save active session to localStorage
      const activeSession = {
        isWorking: true,
        workStartTime: workStartTime.toISOString(),
        currentLocation,
        currentRole,
        sessionNotes
      }
      localStorage.setItem('activeWorkSession', JSON.stringify(activeSession))
      console.log('💾 Saved active session to localStorage:', activeSession)
    }
    // Note: Don't automatically clear here - let the clock out handle it
  }, [isWorking, workStartTime, currentLocation, currentRole, sessionNotes])

  // Restore active session on page load
  useEffect(() => {
    console.log('🔄 Checking for saved session...')
    const savedSession = localStorage.getItem('activeWorkSession')
    console.log('Saved session data:', savedSession)
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession)
        console.log('Parsed session:', session)
        if (session.isWorking) {
          setIsWorking(true)
          setWorkStartTime(new Date(session.workStartTime))
          setCurrentLocation(session.currentLocation)
          setCurrentRole(session.currentRole)
          setSessionNotes(session.sessionNotes || '')
          console.log('✅ Restored active work session from localStorage')
        }
      } catch (error) {
        console.error('❌ Error restoring session:', error)
        localStorage.removeItem('activeWorkSession')
      }
    } else {
      console.log('ℹ️ No saved session found')
    }
  }, []) // Run once on mount
  


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
      
      // Calculate the week to submit based on current weekOffset
      const now = new Date()
      const startOfWeek = new Date(now)
      const dayOfWeek = startOfWeek.getDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      startOfWeek.setDate(now.getDate() + diff)
      startOfWeek.setDate(startOfWeek.getDate() + (weekOffset * 7)) // Apply week offset
      startOfWeek.setHours(0, 0, 0, 0)
      
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 7)
      endOfWeek.setHours(0, 0, 0, 0)
      
      // Calculate week ending date (Saturday)
      const weekEndingDate = new Date(startOfWeek)
      weekEndingDate.setDate(startOfWeek.getDate() + 5) // Saturday
      
      // Update ALL sessions for this week (draft AND approved) to submitted status
      // This ensures that if you add/edit after approval, everything goes back for re-review
      console.log('📝 Submitting timesheet with params:', {
        userId: user.id,
        weekOffset,
        startOfWeek: startOfWeek.toISOString(),
        endOfWeek: endOfWeek.toISOString(),
        initials
      })
      
      const { data: updateResult, error } = await supabase
        .from('work_sessions')
        .update({
          status: 'submitted',
          employee_initials: initials,
          submitted_at: new Date().toISOString(),
          week_ending_date: weekEndingDate.toISOString(),
          // Clear previous approval when re-submitting
          approved_by: null,
          approved_at: null,
          admin_notes: null
        })
        .eq('user_id', user.id)
        .in('status', ['draft', 'approved'])
        .gte('start_time', startOfWeek.toISOString())
        .lt('start_time', endOfWeek.toISOString())
        .select()
      
      console.log('📤 Update result:', { updated: updateResult?.length || 0, error })
      
      if (error) {
        console.error('Error submitting timesheet:', error)
        showToast('Failed to submit timesheet. Please try again.', 'error')
      } else {
        const weekLabel = weekOffset === 0 ? 'this week' : weekOffset === -1 ? 'last week' : 'that week'
        showToast(`Timesheet for ${weekLabel} submitted successfully! Waiting for admin approval.`, 'success')
        setEmployeeInitials('')
        
        // Reload the currently selected week's sessions
        await loadWeeklySessions()
        
        // If user is admin/super admin, also reload the admin timesheets
        if (userRole === 'admin' || userRole === 'super_admin') {
          console.log('🔄 Reloading admin timesheets after submission')
          loadPendingTimesheets()
        }
      }
    } catch (error) {
      console.error('Error submitting timesheet:', error)
      showToast('An error occurred. Please try again.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Convert rejected sessions back to draft for re-submission
  const convertRejectedToDraft = async () => {
    if (!user) return
    
    try {
      const rejectedSessions = weeklySessions.filter(s => s.status === 'rejected')
      console.log('🔄 Converting rejected sessions:', rejectedSessions.length)
      console.log('Session IDs:', rejectedSessions.map(s => s.id))
      console.log('Before conversion - weeklySessions:', weeklySessions.map(s => ({ id: s.id, status: s.status, duration: s.duration, endTime: s.endTime })))
      
      if (rejectedSessions.length === 0) {
        showToast('No rejected sessions to convert', 'warning')
        return
      }
      
      const { data: updateResult, error } = await supabase
        .from('work_sessions')
        .update({ 
          status: 'draft',
          approved_by: null,
          approved_at: null,
          admin_notes: null
        })
        .in('id', rejectedSessions.map(s => s.id))
        .select()
      
      if (error) {
        console.error('Error converting sessions:', error)
        showToast('Failed to convert sessions to draft', 'error')
      } else {
        console.log('✅ Database update result:', updateResult)
        console.log('Updated sessions:', updateResult?.map(s => ({ id: s.id, status: s.status })))
        showToast(`${rejectedSessions.length} rejected session(s) converted to draft. Edit and re-submit when ready.`, 'success')
        // Wait a moment for database to commit, then reload
        setTimeout(async () => {
          console.log('🔄 Now reloading weekly sessions...')
          await loadWeeklySessions()
          console.log('After reload - weeklySessions:', weeklySessions.map(s => ({ id: s.id, status: s.status, duration: s.duration, endTime: s.endTime })))
        }, 300)
      }
    } catch (error) {
      console.error('Error converting rejected sessions:', error)
      showToast('An error occurred', 'error')
    }
  }

  // Load project notes
  const loadProjectNotes = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('project_notes')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading project notes:', error)
        showToast('Failed to load notes', 'error')
        return
      }

      setProjectNotes(data || [])
    } catch (error) {
      console.error('Error loading project notes:', error)
      showToast('An error occurred while loading notes', 'error')
    }
  }

  // Add a new project note
  const addProjectNote = async () => {
    if (!user || !selectedProjectForNotes || !newNote.trim()) return

    setIsAddingNote(true)
    try {
      // Get user's full name
      const { data: userRoleData } = await supabase
        .from('user_roles')
        .select('full_name, email')
        .eq('user_id', user.id)
        .single()

      const userName = userRoleData?.full_name || userRoleData?.email || 'Unknown User'

      const { data, error } = await supabase
        .from('project_notes')
        .insert([{
          project_id: selectedProjectForNotes.id,
          user_id: user.id,
          user_name: userName,
          note_text: newNote.trim()
        }])
        .select()
        .single()

      if (error) {
        console.error('Error adding note:', error)
        showToast('Failed to add note', 'error')
        return
      }

      setProjectNotes([data, ...projectNotes])
      setNewNote('')
      showToast('Note added successfully!', 'success')
    } catch (error) {
      console.error('Error adding note:', error)
      showToast('An error occurred while adding note', 'error')
    } finally {
      setIsAddingNote(false)
    }
  }

  // Delete a project note
  const deleteProjectNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('project_notes')
        .delete()
        .eq('id', noteId)

      if (error) {
        console.error('Error deleting note:', error)
        showToast('Failed to delete note', 'error')
        return
      }

      setProjectNotes(projectNotes.filter(note => note.id !== noteId))
      showToast('Note deleted successfully!', 'success')
    } catch (error) {
      console.error('Error deleting note:', error)
      showToast('An error occurred while deleting note', 'error')
    }
  }

  // Load project materials (for project modal)
  const loadProjectMaterials = async (projectName: string) => {
    try {
      const { data, error } = await supabase
        .from('session_materials')
        .select(`
          *,
          materials (name, unit)
        `)
        .eq('project', projectName)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading project materials:', error)
        showToast('Failed to load materials', 'error')
        return
      }

      setSessionMaterials(data || [])
    } catch (error) {
      console.error('Error loading project materials:', error)
      showToast('An error occurred while loading materials', 'error')
    }
  }

  // Helper function to get date range based on filter
  const getDateRange = () => {
    const now = new Date()
    let startDate = new Date()
    let endDate = new Date()
    
    switch (timesheetDateFilter) {
      case 'thisWeek':
        // Monday of this week
        const dayOfWeek = now.getDay()
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        startDate.setDate(now.getDate() + diff)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date()
        endDate.setHours(23, 59, 59, 999)
        break
        
      case 'lastWeek':
        // Monday of last week
        const lastWeekDay = now.getDay()
        const lastWeekDiff = lastWeekDay === 0 ? -6 : 1 - lastWeekDay
        startDate.setDate(now.getDate() + lastWeekDiff - 7)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 6)
        endDate.setHours(23, 59, 59, 999)
        break
        
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        break
        
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
        break
        
      case 'custom':
        if (customStartDate) {
          startDate = new Date(customStartDate)
          startDate.setHours(0, 0, 0, 0)
        }
        if (customEndDate) {
          endDate = new Date(customEndDate)
          endDate.setHours(23, 59, 59, 999)
        }
        break
    }
    
    return { startDate, endDate }
  }

  // Load pending timesheets (admin and super admin)
  const loadPendingTimesheets = async () => {
    console.log('loadPendingTimesheets called - user:', user, 'userRole:', userRole)
    if (!user || (userRole !== 'admin' && userRole !== 'super_admin')) return

    try {
      console.log('Loading timesheets with filter:', timesheetFilter)
      
      // Get date range
      const { startDate, endDate } = getDateRange()
      
      // Load filtered timesheets for display with date range
      let query = supabase
        .from('work_sessions')
        .select('*')
        .in('status', timesheetFilter === 'all' 
          ? ['draft', 'submitted', 'approved', 'rejected'] 
          : [timesheetFilter])
      
      // Apply date filtering by submitted_at (when employee submitted, not when sessions happened)
      // This ensures "This Week" means "submitted this week" which is what admins expect
      if (timesheetDateFilter !== 'custom' || (customStartDate && customEndDate)) {
        query = query
          .gte('submitted_at', startDate.toISOString())
          .lte('submitted_at', endDate.toISOString())
      }
      
      query = query.order('submitted_at', { ascending: false })
      
      const { data, error } = await query

      // Also load all timesheets for accurate counts (with same date filter)
      let allQuery = supabase
        .from('work_sessions')
        .select('*')
        .in('status', ['draft', 'submitted', 'approved', 'rejected'])
      
      if (timesheetDateFilter !== 'custom' || (customStartDate && customEndDate)) {
        allQuery = allQuery
          .gte('submitted_at', startDate.toISOString())
          .lte('submitted_at', endDate.toISOString())
      }
      
      const { data: allData, error: allDataError } = await allQuery

      console.log('allData query result:', { allData, allDataError })

      if (error) {
        console.error('Error loading timesheets:', error)
        showToast('Failed to load timesheets', 'error')
        return
      }
      
      console.log('Raw timesheet data:', data)

      // Process filtered timesheets
      if (!data || data.length === 0) {
        console.log('No timesheets found with filter:', timesheetFilter)
        // Timesheets will be displayed using allTimesheets with filtering in the render
      } else {
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
        // Timesheets will be displayed using allTimesheets with filtering in the render
      }

      // Process all timesheets for display and counts
      if (allData && allData.length > 0) {
        // Filter by employee if specified
        let filteredData = allData
        if (employeeFilter !== 'all') {
          filteredData = allData.filter((s: any) => s.user_id === employeeFilter)
        }
        
        // Get user names for all timesheets
        const originalUserIds = [...new Set(allData.map((s: any) => s.user_id))]
        const { data: allUserRoles } = await supabase
          .from('user_roles')
          .select('user_id, full_name, email')
          .in('user_id', originalUserIds)
        
        const allUserNameMap = new Map()
        if (allUserRoles) {
          allUserRoles.forEach((u: any) => {
            allUserNameMap.set(u.user_id, u.full_name || u.email)
          })
        }

        // Load materials for all sessions
        const allSessionIds = filteredData.map((s: any) => s.id)
        const { data: allSessionMaterialsData } = await supabase
          .from('session_materials')
          .select(`
            *,
            materials (name, unit)
          `)
          .in('session_id', allSessionIds)
        
        const allMaterialsMap = new Map()
        if (allSessionMaterialsData) {
          allSessionMaterialsData.forEach((sm: any) => {
            if (!allMaterialsMap.has(sm.session_id)) {
              allMaterialsMap.set(sm.session_id, [])
            }
            allMaterialsMap.get(sm.session_id).push(sm)
          })
        }

        const allGrouped = (filteredData || []).reduce((acc: any, session: any) => {
          const key = `${session.user_id}-${session.week_ending_date || 'no-week'}`
          if (!acc[key]) {
            acc[key] = {
              userId: session.user_id,
              userName: allUserNameMap.get(session.user_id) || 'Unknown User',
              weekEndingDate: session.week_ending_date,
              status: session.status, // Will be updated to the most common status
              employeeInitials: session.employee_initials,
              submittedAt: session.submitted_at,
              sessions: [],
              totalMinutes: 0
            }
          }
          const sessionWithMaterials = {
            ...session,
            materials: allMaterialsMap.get(session.id) || []
          }
          acc[key].sessions.push(sessionWithMaterials)
          acc[key].totalMinutes += session.duration || 0
          return acc
        }, {})
        
        // Update group status to reflect the actual status of sessions
        // Use the most common status, prioritizing: approved > submitted > rejected > draft
        Object.values(allGrouped).forEach((group: any) => {
          const statuses = group.sessions.map((s: any) => s.status)
          if (statuses.every((s: string) => s === 'approved')) group.status = 'approved'
          else if (statuses.some((s: string) => s === 'submitted')) group.status = 'submitted'
          else if (statuses.some((s: string) => s === 'rejected')) group.status = 'rejected'
          else group.status = 'draft'
        })
        
        console.log('Setting allTimesheets with:', Object.values(allGrouped))
        setAllTimesheets(Object.values(allGrouped))
      } else {
        console.log('No allData, setting allTimesheets to []')
        setAllTimesheets([])
      }
    } catch (error) {
      console.error('Error loading timesheets:', error)
      showToast('An error occurred while loading timesheets', 'error')
    }
  }

  // Approve timesheet
  const approveTimesheet = async (timesheet: any) => {
    if (!user || (userRole !== 'admin' && userRole !== 'super_admin')) return

    // Admins cannot approve their own timesheets - only super admins can
    if (userRole === 'admin' && timesheet.userId === user.id) {
      showToast('You cannot approve your own timesheet. Only super admins can approve admin timesheets.', 'warning')
      return
    }

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
    if (!user || (userRole !== 'admin' && userRole !== 'super_admin')) return
    
    // Admins cannot reject their own timesheets - only super admins can
    if (userRole === 'admin' && timesheet.userId === user.id) {
      showToast('You cannot reject your own timesheet. Only super admins can manage admin timesheets.', 'warning')
      return
    }
    
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
        if (userRole === 'admin' || userRole === 'super_admin') {
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
            
            // Reload sessions if admin or super admin (for pending timesheets view)
            if (userRole === 'admin' || userRole === 'super_admin') {
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
      
      // Parse date as local time, not UTC
      const [year, month, day] = newSessionData.date.split('-').map(Number)
      const startDateTime = new Date(year, month - 1, day, parseInt(startHours), parseInt(startMinutes), 0, 0)
      const endDateTime = new Date(year, month - 1, day, parseInt(endHours), parseInt(endMinutes), 0, 0)
      
      console.log('🗓️ Creating session for:', {
        inputDate: newSessionData.date,
        startDateTime: startDateTime.toISOString(),
        startDateString: startDateTime.toDateString(),
        localTime: startDateTime.toLocaleString()
      })
      
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
      
      // Reload the currently selected week's sessions
      await loadWeeklySessions()
      
    } catch (error) {
      console.error('Error adding manual session:', error)
      showToast('Failed to add session', 'error')
    }
  }

  // Load timesheets when admin tab is active
  useEffect(() => {
    console.log('useEffect triggered - userRole:', userRole, 'activeTab:', activeTab, 'timesheetFilter:', timesheetFilter)
    if ((userRole === 'admin' || userRole === 'super_admin') && activeTab === 'admin') {
      console.log('Calling loadPendingTimesheets()')
      loadPendingTimesheets()
      setCurrentPage(1) // Reset to first page when filters change
    }
  }, [userRole, activeTab, timesheetFilter, timesheetDateFilter, customStartDate, customEndDate, employeeFilter])

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
    
    if (activeTab === 'materials' || activeTab === 'hours' || activeTab === 'my-materials' || activeTab === 'projects' || activeTab === 'admin' || activeTab === 'timesheet') {
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
          
          // Reload materials if we're in the project modal or employee materials
          if (selectedProjectForNotes) {
            loadProjectMaterials(selectedProjectForNotes.name)
          } else {
            loadEmployeeMaterials()
          }
        } catch (err) {
          console.error('Error deleting session material:', err)
          showToast('Failed to remove material', 'error')
        }
      },
      'Remove',
      'Cancel'
    )
  }

  const updateSessionMaterial = async (material: any) => {
    try {
      const { error } = await supabase
        .from('session_materials')
        .update({
          quantity: parseFloat(material.quantity),
          notes: material.notes
        })
        .eq('id', material.id)

      if (error) {
        showToast(`Failed to update material: ${error.message}`, 'error')
        return
      }

      setEditingSessionMaterial(null)
      showToast('Material updated successfully!', 'success')
      
      // Reload materials for this project or employee materials
      if (selectedProjectForNotes) {
        loadProjectMaterials(selectedProjectForNotes.name)
      } else {
        loadEmployeeMaterials()
      }
    } catch (err) {
      console.error('Error updating material:', err)
      showToast('Failed to update material', 'error')
    }
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

      // Calculate lunch minutes from total
      const lunchMinutes = (sessions || [])
        .filter((s: any) => s.project === 'Lunch')
        .reduce((total: number, s: any) => total + (s.duration || 0), 0)
      const workMinutes = totalMinutes - lunchMinutes

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
        lunchMinutes,
        workMinutes,
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

  // Print Functions
  
  const handlePrintProjectReport = () => {
    setShowPrintProjectReport(true)
    // Small delay to let the modal render, then trigger print
    setTimeout(() => {
      window.print()
      setShowPrintProjectReport(false)
    }, 100)
  }

  const formatDateForPrint = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const handlePrintAdminTimesheet = (timesheet: any) => {
    setTimesheetToPrint(timesheet)
    setShowPrintAdminTimesheet(true)
    // Delay to let the content render before opening print dialog
    setTimeout(() => {
      window.print()
      // Wait a bit before hiding to ensure print dialog has opened
      setTimeout(() => {
        setShowPrintAdminTimesheet(false)
        setTimesheetToPrint(null)
      }, 500)
    }, 300)
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
        
        console.log(`🔄 Transfer #${todaysSessions.length + 1}: Ending session at ${currentLocation} (${currentRole}), duration: ${duration} min`)
        
        // Save to local state
        setTodaysSessions(prev => {
          const updated = [...prev, sessionData]
          console.log(`📝 Today's sessions count: ${updated.length}`)
          return updated
        })
        
        // Save to database with error handling
        try {
          await saveWorkSession(sessionData)
          console.log('✅ Transfer session saved to database')
          // Reload weekly sessions to ensure data is fresh
          await loadWeeklySessions()
        } catch (error) {
          console.error('❌ Failed to save transfer session:', error)
          showToast('Warning: Session may not have saved. Please check your timesheet.', 'warning')
        }
      }
      // Start new session
      if (!selectedRole) {
        showToast('Please select your role before transferring', 'warning')
        return
      }
      console.log(`🔄 Starting new session at ${newLocation} (${selectedRole})`)
      setCurrentLocation(newLocation)
      setCurrentRole(selectedRole)
      setWorkStartTime(now)
      setSessionNotes('') // Clear notes for new session
    }
    // Note: "End Work Day" is now handled by a separate button
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
                  {roles
                    .filter(role => role.status === 'active')
                    .map(role => (
                      <option key={role.id} value={role.role_name}>
                        {role.role_name}
                      </option>
                    ))
                  }
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
                  {!isWorking ? (
                    <button 
                      className="main-action-btn"
                      onClick={handleClockAction}
                    >
                      Clock In
                    </button>
                  ) : (
                    <>
                      {(getLocationFromProject(selectedProject) !== currentLocation || selectedRole !== currentRole) && (
                        <button 
                          className="main-action-btn transfer-btn"
                          onClick={handleClockAction}
                        >
                          Transfer to {selectedProject}{selectedRole ? ` (${selectedRole})` : ''}
                        </button>
                      )}
                      <button 
                        className="main-action-btn end-day-btn"
                        onClick={async () => {
                          const now = new Date()
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
                          // Clear active session from localStorage
                          localStorage.removeItem('activeWorkSession')
                          console.log('🗑️ Cleared active session - clocked out')
                          
                          setIsWorking(false)
                          setCurrentLocation(null)
                          setCurrentRole(null)
                          setWorkStartTime(null)
                          setSessionNotes('')
                        }}
                      >
                        End Work Day
                      </button>
                    </>
                  )}
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
        
        // Employee view - Read-only project list
        if (userRole !== 'admin' && userRole !== 'super_admin') {
          return (
            <div className="tab-content">
              <div className="live-projects-container">
                <div className="live-projects-header">
                  <h2>Active Projects</h2>
                  <p className="tracker-subtitle">View current project details</p>
                </div>

                {activeProjects.length === 0 ? (
                  <div className="no-active-projects">
                    <p>No active projects at this time.</p>
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
                        </div>
                        <div className="project-quick-info">
                          <p className="project-location">📍 {project.location}</p>
                        </div>
                        <div className="project-actions-footer">
                          <button
                            className="view-stats-btn"
                            onClick={() => {
                              setSelectedProjectForNotes(project)
                              setShowProjectNotes(true)
                              setProjectModalTab('notes')
                              if (project.id) loadProjectNotes(project.id)
                              loadProjectMaterials(project.name)
                            }}
                          >
                            View Project
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        }
        
        // Admin view - Full management capabilities
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
                          className="icon-btn"
                          onClick={() => {
                            console.log('Edit button clicked for project:', project)
                            setEditingProject(project)
                            setShowEditProject(true)
                          }}
                          title="Edit Project"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          className="view-stats-btn"
                          onClick={() => {
                            setSelectedProjectForNotes(project)
                            setShowProjectNotes(true)
                            setProjectModalTab('notes')
                            if (project.id) loadProjectNotes(project.id)
                            loadProjectMaterials(project.name)
                            // Initialize the add material form with this project
                            setNewSessionMaterial({
                              materialId: '',
                              quantity: '',
                              notes: '',
                              project: project.name,
                              date: new Date().toISOString().split('T')[0]
                            })
                          }}
                        >
                          View Project
                        </button>
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
                    <input
                      type="text"
                      placeholder="Project Type *"
                      value={newProject.type}
                      onChange={(e) => setNewProject(prev => ({ ...prev, type: e.target.value }))}
                    />
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

              {/* Edit Project Modal */}
              {showEditProject && editingProject && (
                <div className="modal-overlay" onClick={() => setShowEditProject(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <h3>Edit Project</h3>
                    <div className="form-group">
                      <label>Project Name *</label>
                      <input
                        type="text"
                        value={editingProject.name}
                        onChange={(e) => setEditingProject({...editingProject, name: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Project Type *</label>
                      <input
                        type="text"
                        value={editingProject.type}
                        onChange={(e) => setEditingProject({...editingProject, type: e.target.value})}
                        placeholder="e.g., Landscape Installation, Weekly Maintenance"
                      />
                    </div>
                    <div className="form-group">
                      <label>Location/Address *</label>
                      <input
                        type="text"
                        value={editingProject.location}
                        onChange={(e) => setEditingProject({...editingProject, location: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select
                        value={editingProject.status}
                        onChange={(e) => setEditingProject({...editingProject, status: e.target.value as 'active' | 'pending'})}
                      >
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                      </select>
                    </div>
                    <div className="modal-actions">
                      <button className="btn-secondary" onClick={() => {
                        setShowEditProject(false)
                        setEditingProject(null)
                      }}>
                        Cancel
                      </button>
                      <button className="btn-primary" onClick={updateProject}>
                        Save Changes
                      </button>
                    </div>
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
        
        // Create Monday through Sunday breakdown based on current week offset
        const now = new Date()
        const startOfWeek = new Date(now)
        const dayOfWeek = startOfWeek.getDay()
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // If Sunday, go back 6 days, otherwise go to Monday
        startOfWeek.setDate(now.getDate() + diff)
        startOfWeek.setDate(startOfWeek.getDate() + (weekOffset * 7)) // Apply week offset
        startOfWeek.setHours(0, 0, 0, 0)
        
        // Calculate end of week for display
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6) // Saturday
        
        // Helper function to get week label
        const getWeekLabel = () => {
          if (weekOffset === 0) return 'This Week'
          if (weekOffset === -1) return 'Last Week'
          if (weekOffset === -2) return 'Two Weeks Ago'
          return `${Math.abs(weekOffset)} Weeks Ago`
        }
        
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        const weekDays = daysOfWeek.map((dayName, index) => {
          const dayDate = new Date(startOfWeek)
          dayDate.setDate(startOfWeek.getDate() + index)
          
          const daySessions = completedSessions.filter(session => 
            session.startTime.toDateString() === dayDate.toDateString()
          )
          
          const totalMinutes = daySessions.reduce((total, session) => total + (session.duration || 0), 0)
          const lunchMinutes = daySessions.filter(s => s.project === 'Lunch').reduce((total, session) => total + (session.duration || 0), 0)
          const workMinutes = totalMinutes - lunchMinutes
          
          return {
            name: dayName,
            date: dayDate,
            sessions: daySessions,
            totalMinutes,
            lunchMinutes,
            workMinutes,
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

              {/* Week Navigation */}
              <div className="week-navigation">
                <button
                  className="week-nav-btn"
                  onClick={() => setWeekOffset(weekOffset - 1)}
                  disabled={weekOffset <= -2}
                  title="Go to previous week"
                >
                  <ChevronLeft size={20} />
                  Previous
                </button>
                <div className="week-label">
                  <div className="week-label-text">{getWeekLabel()}</div>
                  <div className="week-date-range">
                    {startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <button
                  className="week-nav-btn"
                  onClick={() => setWeekOffset(weekOffset + 1)}
                  disabled={weekOffset >= 0}
                  title="Go to next week"
                >
                  Next
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Monday through Sunday Breakdown */}
              <div className="weekly-breakdown">
                <div className="weekly-list">
                  {weekDays.map((day) => {
                    const lunchHours = Math.floor(day.lunchMinutes / 60)
                    const lunchMins = day.lunchMinutes % 60
                    const workHours = Math.floor(day.workMinutes / 60)
                    const workMins = day.workMinutes % 60
                    
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
                            {day.sessions.length > 0 ? (
                              <>
                                <span className="work-time">{workHours}h {workMins}m</span>
                                {day.lunchMinutes > 0 && (
                                  <span className="lunch-time" style={{fontSize: '0.85em', color: '#666', marginLeft: '4px'}}>
                                    (+{lunchHours > 0 ? `${lunchHours}h ` : ''}{lunchMins}m lunch)
                                  </span>
                                )}
                              </>
                            ) : '—'}
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
                                
                                {/* Edit/Delete buttons for draft and rejected sessions */}
                                {(session.status === 'draft' || session.status === 'rejected') && (
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
                        {weeklySessions.filter(s => s.status === 'rejected').length} sessions rejected <button className="convert-to-draft-btn" onClick={convertRejectedToDraft} style={{ marginLeft: '10px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }} title="Convert all rejected sessions to draft status so you can edit and re-submit them">Make Changes</button></div>
                    )}
                  </div>
                  
                  {/* Submission form - only show if there are draft sessions */}
                  {weeklySessions.filter(s => s.status === 'draft' && s.duration && s.endTime).length > 0 && (
                    <div className="submission-form">
                      <p className="submission-instructions">
                        By providing your initials below, you certify that the dates, times, and hours worked recorded above are accurate and complete. All sessions for the week will be submitted together for approval.
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
        // Admin and Super Admin Materials tab
        if (userRole !== 'admin' && userRole !== 'super_admin') {
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
                          {editingSessionMaterial?.id === material.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="number"
                                step="0.01"
                                value={editingSessionMaterial.quantity}
                                onChange={(e) => setEditingSessionMaterial({...editingSessionMaterial, quantity: e.target.value})}
                                style={{ width: '80px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd' }}
                              />
                              <span>{material.materials?.unit || ''}</span>
                            </div>
                          ) : (
                            <span className="material-quantity">{material.quantity} {material.materials?.unit || ''}</span>
                          )}
                        </div>
                        <div className="material-entry-details">
                          {material.project && <p><strong>Project:</strong> {material.project}</p>}
                          <p><strong>Date:</strong> {new Date(material.created_at).toLocaleDateString()}</p>
                          {editingSessionMaterial?.id === material.id ? (
                            <p>
                              <strong>Notes:</strong>
                              <input
                                type="text"
                                value={editingSessionMaterial.notes || ''}
                                onChange={(e) => setEditingSessionMaterial({...editingSessionMaterial, notes: e.target.value})}
                                placeholder="Optional notes..."
                                style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd', width: '200px' }}
                              />
                            </p>
                          ) : (
                            material.notes && <p><strong>Notes:</strong> {material.notes}</p>
                          )}
                        </div>
                        <div className="material-actions" style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                          {editingSessionMaterial?.id === material.id ? (
                            <>
                              <button
                                className="icon-btn save"
                                onClick={() => updateSessionMaterial(editingSessionMaterial)}
                                title="Save changes"
                                style={{ background: '#22c55e', color: 'white', border: 'none' }}
                              >
                                <Check size={16} />
                              </button>
                              <button
                                className="icon-btn cancel"
                                onClick={() => setEditingSessionMaterial(null)}
                                title="Cancel"
                                style={{ background: '#6b7280', color: 'white', border: 'none' }}
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="icon-btn edit"
                                onClick={() => setEditingSessionMaterial({
                                  id: material.id,
                                  quantity: material.quantity.toString(),
                                  notes: material.notes || ''
                                })}
                                title="Edit material"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                className="icon-btn delete"
                                onClick={() => deleteSessionMaterial(material.id)}
                                title="Delete material"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
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
        // Admin and Super Admin History tab - Show completed projects
        if (userRole !== 'admin' && userRole !== 'super_admin') {
          return null // History tab is admin and super admin only
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
        if (userRole !== 'admin' && userRole !== 'super_admin') {
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
        const superAdminUsers = allUsers.filter(u => u.role === 'super_admin')

        // Filter timesheets based on role
        // Super admin sees ALL timesheets (employees + admins)
        // Regular admin only sees employee timesheets (approved users only)
        const filteredTimesheets = userRole === 'super_admin'
          ? allTimesheets // Super admin sees everything
          : allTimesheets.filter((t: any) => {
              // Regular admin: find the user and check if they're an employee (approved role)
              const timesheetUser = allUsers.find(u => u.user_id === t.userId)
              return timesheetUser && timesheetUser.role === 'approved'
            })

        // Apply status filter on the filtered timesheets
        const displayTimesheets = timesheetFilter === 'all'
          ? filteredTimesheets
          : filteredTimesheets.filter((t: any) => t.status === timesheetFilter)

        return (
          <div className="tab-content">
            <div className="admin-container">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>Admin Panel</h2>
                <button
                  onClick={() => {
                    console.log('🔄 Manual refresh triggered')
                    loadPendingTimesheets()
                  }}
                  style={{ 
                    padding: '8px 16px', 
                    fontSize: '14px',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    backgroundColor: '#fff',
                    color: '#333',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5'
                    e.currentTarget.style.borderColor = '#ccc'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff'
                    e.currentTarget.style.borderColor = '#e0e0e0'
                  }}
                  title="Refresh timesheet data"
                >
                  <span style={{ fontSize: '16px' }}>🔄</span>
                  <span>Refresh</span>
                </button>
              </div>
              
              {/* Timesheet Management Section */}
              <div className="admin-section timesheets-section">
                <h3>
                  <Calendar size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  Timesheet Management
                </h3>
                
                {/* Compact Filter Row */}
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {/* Status Filter Buttons */}
                  <div className="timesheet-filters" style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className={`filter-btn ${timesheetFilter === 'submitted' ? 'active' : ''}`}
                      onClick={() => setTimesheetFilter('submitted')}
                    >
                      Pending Approval ({filteredTimesheets.filter((t: any) => t.status === 'submitted').length})
                    </button>
                    <button 
                      className={`filter-btn ${timesheetFilter === 'approved' ? 'active' : ''}`}
                      onClick={() => setTimesheetFilter('approved')}
                    >
                      Approved ({filteredTimesheets.filter((t: any) => t.status === 'approved').length})
                    </button>
                    <button 
                      className={`filter-btn ${timesheetFilter === 'rejected' ? 'active' : ''}`}
                      onClick={() => setTimesheetFilter('rejected')}
                    >
                      Rejected ({filteredTimesheets.filter((t: any) => t.status === 'rejected').length})
                    </button>
                    <button 
                      className={`filter-btn ${timesheetFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setTimesheetFilter('all')}
                    >
                      All ({filteredTimesheets.length})
                    </button>
                  </div>

                  {/* Employee Filter */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#666', whiteSpace: 'nowrap' }}>Employee:</label>
                    <select
                      value={employeeFilter}
                      onChange={(e) => { 
                        setEmployeeFilter(e.target.value); 
                        setCurrentPage(1); 
                      }}
                      style={{ 
                        padding: '8px 12px', 
                        borderRadius: '6px', 
                        border: '1px solid #ddd',
                        fontSize: '14px',
                        cursor: 'pointer',
                        backgroundColor: 'white',
                        minWidth: '180px'
                      }}
                    >
                      <option value="all">All Employees</option>
                      {allUsers.map(user => (
                        <option key={user.user_id} value={user.user_id}>
                          {user.full_name || user.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Range Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#666', whiteSpace: 'nowrap', minWidth: '85px' }}>Date Range:</label>
                      <select
                        value={timesheetDateFilter}
                        onChange={(e) => { 
                          setTimesheetDateFilter(e.target.value as any); 
                          setCurrentPage(1); 
                        }}
                        style={{ 
                          padding: '8px 12px', 
                          borderRadius: '6px', 
                          border: '1px solid #ddd',
                          fontSize: '14px',
                          cursor: 'pointer',
                          backgroundColor: 'white',
                          minWidth: '150px'
                        }}
                      >
                        <option value="thisWeek">This Week</option>
                        <option value="lastWeek">Last Week</option>
                        <option value="thisMonth">This Month</option>
                        <option value="lastMonth">Last Month</option>
                        <option value="custom">Custom Range</option>
                      </select>
                    </div>
                    
                    {/* Custom Date Range Inputs */}
                    {timesheetDateFilter === 'custom' && (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: '0px' }}>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          style={{ 
                            padding: '8px 12px', 
                            borderRadius: '6px', 
                            border: '1px solid #ddd', 
                            fontSize: '14px'
                          }}
                        />
                        <span style={{ color: '#666', fontWeight: '500' }}>to</span>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          style={{ 
                            padding: '8px 12px', 
                            borderRadius: '6px', 
                            border: '1px solid #ddd', 
                            fontSize: '14px'
                          }}
                        />
                        <button 
                          className="filter-btn"
                          onClick={() => { setCurrentPage(1); loadPendingTimesheets(); }}
                          disabled={!customStartDate || !customEndDate}
                          style={{ 
                            opacity: (!customStartDate || !customEndDate) ? 0.5 : 1,
                            cursor: (!customStartDate || !customEndDate) ? 'not-allowed' : 'pointer',
                            padding: '8px 16px'
                          }}
                        >
                          Apply
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timesheets List */}
                {displayTimesheets.length > 0 ? (
                  <>
                    {/* Pagination Info */}
                    <div style={{ marginBottom: '15px', fontSize: '14px', color: '#666' }}>
                      Showing {Math.min((currentPage - 1) * itemsPerPage + 1, displayTimesheets.length)} - {Math.min(currentPage * itemsPerPage, displayTimesheets.length)} of {displayTimesheets.length} timesheets
                    </div>
                    
                    <div className="timesheets-list">
                    {displayTimesheets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((timesheet: any, index: number) => {
                      const totalMinutes = timesheet.totalMinutes
                      const lunchMinutes = timesheet.sessions.filter((s: any) => s.project === 'Lunch').reduce((sum: number, s: any) => sum + (s.duration || 0), 0)
                      const workMinutes = totalMinutes - lunchMinutes
                      
                      const workHours = Math.floor(workMinutes / 60)
                      const workMins = workMinutes % 60
                      const lunchHours = Math.floor(lunchMinutes / 60)
                      const lunchMins = lunchMinutes % 60
                      
                      const isSelected = selectedTimesheet === timesheet
                      
                      // Get the user's role for display (only for super admin)
                      const timesheetUser = allUsers.find(u => u.user_id === timesheet.userId)
                      const userRoleBadge = timesheetUser?.role === 'admin' ? '(Admin)' : timesheetUser?.role === 'super_admin' ? '(Super Admin)' : ''
                      
                      return (
                        <div key={index} className={`timesheet-card ${timesheet.status}`}>
                          <div className="timesheet-header" onClick={() => setSelectedTimesheet(isSelected ? null : timesheet)}>
                            <div className="timesheet-user">
                              <div className="timesheet-name">
                                {timesheet.userName} {userRole === 'super_admin' && userRoleBadge && <span style={{ color: '#3b82f6', fontWeight: 600 }}>{userRoleBadge}</span>}
                              </div>
                              <div className="timesheet-initials">Initials: {timesheet.employeeInitials || 'N/A'}</div>
                            </div>
                            <div className="timesheet-details">
                              <div className="timesheet-hours">
                                {workHours}h {workMins}m
                                {lunchMinutes > 0 && (
                                  <span style={{fontSize: '0.85em', color: '#666', marginLeft: '4px'}}>
                                    (+{lunchHours > 0 ? `${lunchHours}h ` : ''}{lunchMins}m lunch)
                                  </span>
                                )}
                              </div>
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
                            {/* Print button for approved timesheets */}
                            {timesheet.status === 'approved' && (
                              <button
                                className="print-btn"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handlePrintAdminTimesheet(timesheet)
                                }}
                                title="Print Approved Timesheet"
                                style={{ marginLeft: '10px' }}
                              >
                                <FileText size={16} />
                                Print
                              </button>
                            )}
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
                                <>
                                  {/* Admins cannot approve/reject their own timesheets */}
                                  {userRole === 'admin' && timesheet.userId === user?.id ? (
                                    <div className="self-approval-notice">
                                      <AlertCircle size={16} />
                                      <p>You cannot approve your own timesheet. A super admin must review this.</p>
                                    </div>
                                  ) : (
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
                                </>
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
                  
                  {/* Pagination Controls */}
                  {displayTimesheets.length > itemsPerPage && (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      gap: '10px',
                      marginTop: '20px',
                      paddingTop: '20px',
                      borderTop: '1px solid #e0e0e0'
                    }}>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: '1px solid #ddd',
                          backgroundColor: currentPage === 1 ? '#f5f5f5' : '#fff',
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          opacity: currentPage === 1 ? 0.5 : 1
                        }}
                      >
                        Previous
                      </button>
                      
                      <span style={{ fontSize: '14px', color: '#666' }}>
                        Page {currentPage} of {Math.ceil(displayTimesheets.length / itemsPerPage)}
                      </span>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(displayTimesheets.length / itemsPerPage), prev + 1))}
                        disabled={currentPage >= Math.ceil(displayTimesheets.length / itemsPerPage)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: '1px solid #ddd',
                          backgroundColor: currentPage >= Math.ceil(displayTimesheets.length / itemsPerPage) ? '#f5f5f5' : '#fff',
                          cursor: currentPage >= Math.ceil(displayTimesheets.length / itemsPerPage) ? 'not-allowed' : 'pointer',
                          opacity: currentPage >= Math.ceil(displayTimesheets.length / itemsPerPage) ? 0.5 : 1
                        }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                  </>
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
                <h3>Approved Users ({approvedUsers.length + adminUsers.length + superAdminUsers.length})</h3>
                <div className="users-list">
                  {[...superAdminUsers, ...adminUsers, ...approvedUsers].map((userItem) => (
                    <div key={userItem.id} className="user-card">
                      <div className="user-details-admin">
                        <div className="user-name">{userItem.full_name}</div>
                        <div className="user-email">{userItem.email}</div>
                        {userItem.approved_at && (
                          <div className="user-meta">
                            Approved: {new Date(userItem.approved_at).toLocaleDateString()}
                          </div>
                        )}
                        {userRole === 'super_admin' && (
                          <div className="user-meta" style={{ marginTop: '8px' }}>
                            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
                              Employee Pay Rate ($/hr):
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Hourly Rate"
                              value={userItem.employee_hourly_rate || ''}
                              onChange={async (e) => {
                                const rate = e.target.value
                                try {
                                  await supabaseOperations.updateEmployeeHourlyRate(userItem.user_id, rate || null)
                                  showToast(`Updated ${userItem.full_name}'s pay rate`, 'success')
                                  await loadAllUsers()
                                } catch (error) {
                                  console.error('Error updating pay rate:', error)
                                  showToast('Failed to update pay rate', 'error')
                                }
                              }}
                              style={{
                                width: '120px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #ddd',
                                fontSize: '13px'
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="user-role-selector">
                        <select
                          value={userItem.role}
                          onChange={async (e) => {
                            const newRole = e.target.value as 'user' | 'approved' | 'admin' | 'super_admin'
                            
                            // Prevent demoting yourself
                            if (userItem.user_id === user?.id && (newRole !== 'admin' && newRole !== 'super_admin')) {
                              showToast('You cannot demote yourself!', 'error')
                              return
                            }
                            
                            // Only super admin can promote to super_admin
                            if (newRole === 'super_admin' && userRole !== 'super_admin') {
                              showToast('Only Super Admins can promote users to Super Admin', 'error')
                              return
                            }
                            
                            try {
                              await supabaseOperations.updateUserRole(userItem.user_id, newRole)
                              const roleLabels = {
                                user: 'Unapproved',
                                approved: 'Approved',
                                admin: 'Admin',
                                super_admin: 'Super Admin'
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
                          {userRole === 'super_admin' && <option value="super_admin">Super Admin</option>}
                        </select>
                      </div>
                    </div>
                  ))}
                  {approvedUsers.length === 0 && adminUsers.length === 0 && superAdminUsers.length === 0 && (
                    <div className="no-users">
                      <p>No approved users yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      case 'roles':
        // Admin and Super Admin Roles tab
        if (userRole !== 'admin' && userRole !== 'super_admin') {
          return null
        }

        const activeRoles = roles.filter(r => r.status === 'active')
        const inactiveRoles = roles.filter(r => r.status === 'inactive')

        return (
          <div className="tab-content">
            <div className="roles-container">
              <div className="roles-header">
                <h2>Roles Management</h2>
                <button 
                  className="btn-primary"
                  onClick={() => setShowAddRole(true)}
                >
                  <Plus size={20} /> Add Role
                </button>
              </div>

              {/* Active Roles */}
              <div className="roles-section">
                <h3>Active Roles ({activeRoles.length})</h3>
                {activeRoles.length === 0 ? (
                  <p className="empty-state">No active roles. Add one to get started!</p>
                ) : (
                  <div className="roles-list">
                    {activeRoles.map(role => (
                      <div key={role.id} className="role-card">
                        <div className="role-info">
                          <div className="role-name">{role.role_name}</div>
                          {userRole === 'super_admin' && role.hourly_rate && (
                            <div className="role-detail">Billing Rate: ${role.hourly_rate}/hr</div>
                          )}
                        </div>
                        <div className="role-actions">
                          <button
                            className="icon-btn"
                            onClick={() => {
                              setEditingRole(role)
                              setShowEditRole(true)
                            }}
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            className="icon-btn delete"
                            onClick={() => deleteRole(role.id)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inactive Roles */}
              {inactiveRoles.length > 0 && (
                <div className="roles-section">
                  <h3>Inactive Roles ({inactiveRoles.length})</h3>
                  <div className="roles-list">
                    {inactiveRoles.map(role => (
                      <div key={role.id} className="role-card inactive">
                        <div className="role-info">
                          <div className="role-name">{role.role_name}</div>
                          {userRole === 'super_admin' && role.hourly_rate && (
                            <div className="role-detail">Billing Rate: ${role.hourly_rate}/hr</div>
                          )}
                        </div>
                        <div className="role-actions">
                          <button
                            className="icon-btn"
                            onClick={() => {
                              setEditingRole(role)
                              setShowEditRole(true)
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

              {/* Add Role Modal */}
              {showAddRole && (
                <div className="modal-overlay" onClick={() => setShowAddRole(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <h3>Add New Role</h3>
                    <div className="form-group">
                      <label>Role Name *</label>
                      <input
                        type="text"
                        value={newRole.role_name}
                        onChange={(e) => setNewRole({...newRole, role_name: e.target.value})}
                        placeholder="e.g., Laborer, Foreman"
                      />
                    </div>
                    <div className="form-group">
                      <label>Customer Billing Rate {userRole === 'super_admin' ? '($/hr)' : ''}</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newRole.hourly_rate}
                        onChange={(e) => setNewRole({...newRole, hourly_rate: e.target.value})}
                        placeholder={userRole === 'super_admin' ? 'e.g. 45.00' : 'Super admin only'}
                        disabled={userRole !== 'super_admin'}
                        style={userRole !== 'super_admin' ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                      />
                      {userRole === 'super_admin' ? (
                        <small className="form-hint">Rate charged to customers for this role</small>
                      ) : (
                        <small className="form-hint">Only super admins can set billing rates</small>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select
                        value={newRole.status}
                        onChange={(e) => setNewRole({...newRole, status: e.target.value as 'active' | 'inactive'})}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="modal-actions">
                      <button 
                        className="btn-secondary"
                        onClick={() => setShowAddRole(false)}
                      >
                        Cancel
                      </button>
                      <button 
                        className="btn-primary"
                        onClick={addRole}
                      >
                        Add Role
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Role Modal */}
              {showEditRole && editingRole && (
                <div className="modal-overlay" onClick={() => setShowEditRole(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <h3>Edit Role</h3>
                    <div className="form-group">
                      <label>Role Name *</label>
                      <input
                        type="text"
                        value={editingRole.role_name}
                        onChange={(e) => setEditingRole({...editingRole, role_name: e.target.value})}
                        placeholder="e.g., Laborer, Foreman"
                      />
                    </div>
                    <div className="form-group">
                      <label>Customer Billing Rate {userRole === 'super_admin' ? '($/hr)' : ''}</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingRole.hourly_rate || ''}
                        onChange={(e) => setEditingRole({...editingRole, hourly_rate: e.target.value})}
                        placeholder={userRole === 'super_admin' ? 'e.g. 45.00' : 'Super admin only'}
                        disabled={userRole !== 'super_admin'}
                        style={userRole !== 'super_admin' ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                      />
                      {userRole === 'super_admin' ? (
                        <small className="form-hint">Rate charged to customers for this role</small>
                      ) : (
                        <small className="form-hint">Only super admins can set billing rates</small>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select
                        value={editingRole.status}
                        onChange={(e) => setEditingRole({...editingRole, status: e.target.value as 'active' | 'inactive'})}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="modal-actions">
                      <button 
                        className="btn-secondary"
                        onClick={() => setShowEditRole(false)}
                      >
                        Cancel
                      </button>
                      <button 
                        className="btn-primary"
                        onClick={updateRole}
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      case 'timesheet':
        // My Hours view for admins/super admins - same as employee hours view
        // Use only database sessions (they're already saved when clocking out)
        const myAllSessions = weeklySessions
        
        // Calculate week totals (all completed sessions)
        const myCompletedSessions = myAllSessions.filter(s => s.duration)
        
        // Create Monday through Sunday breakdown based on current week offset
        const now2 = new Date()
        const myStartOfWeek = new Date(now2)
        const myDayOfWeek = myStartOfWeek.getDay()
        const myDiff = myDayOfWeek === 0 ? -6 : 1 - myDayOfWeek // If Sunday, go back 6 days, otherwise go to Monday
        myStartOfWeek.setDate(now2.getDate() + myDiff)
        myStartOfWeek.setDate(myStartOfWeek.getDate() + (weekOffset * 7)) // Apply week offset
        myStartOfWeek.setHours(0, 0, 0, 0)
        
        // Calculate end of week for display
        const myEndOfWeek = new Date(myStartOfWeek)
        myEndOfWeek.setDate(myStartOfWeek.getDate() + 6) // Saturday
        
        // Helper function to get week label for timesheet
        const getMyWeekLabel = () => {
          if (weekOffset === 0) return 'This Week'
          if (weekOffset === -1) return 'Last Week'
          if (weekOffset === -2) return 'Two Weeks Ago'
          return `${Math.abs(weekOffset)} Weeks Ago`
        }
        
        const myDaysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        const myWeekDays = myDaysOfWeek.map((dayName, index) => {
          const dayDate = new Date(myStartOfWeek)
          dayDate.setDate(myStartOfWeek.getDate() + index)
          
          const daySessions = myCompletedSessions.filter(session => 
            session.startTime.toDateString() === dayDate.toDateString()
          )
          
          const totalMinutes = daySessions.reduce((total, session) => total + (session.duration || 0), 0)
          const lunchMinutes = daySessions.filter(s => s.project === 'Lunch').reduce((total, session) => total + (session.duration || 0), 0)
          const workMinutes = totalMinutes - lunchMinutes
          
          return {
            name: dayName,
            date: dayDate,
            sessions: daySessions,
            totalMinutes,
            lunchMinutes,
            workMinutes,
            isToday: dayDate.toDateString() === new Date().toDateString()
          }
        })

        return (
          <div className="tab-content">
            <div className="hours-container">
              <div className="hours-header">
                <h2>My Time Tracking</h2>
                <div className="header-actions">
                  <button
                    className="add-session-icon-btn"
                    onClick={() => setShowAddSessionModal(true)}
                    title="Add Session Manually"
                  >
                    <Plus size={24} />
                  </button>
                </div>
              </div>

              {/* Week Navigation */}
              <div className="week-navigation">
                <button
                  className="week-nav-btn"
                  onClick={() => setWeekOffset(weekOffset - 1)}
                  disabled={weekOffset <= -2}
                  title="Go to previous week"
                >
                  <ChevronLeft size={20} />
                  Previous
                </button>
                <div className="week-label">
                  <div className="week-label-text">{getMyWeekLabel()}</div>
                  <div className="week-date-range">
                    {myStartOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {myEndOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <button
                  className="week-nav-btn"
                  onClick={() => setWeekOffset(weekOffset + 1)}
                  disabled={weekOffset >= 0}
                  title="Go to next week"
                >
                  Next
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Monday through Sunday Breakdown */}
              <div className="weekly-breakdown">
                <div className="weekly-list">
                  {myWeekDays.map((day) => {
                    const lunchHours = Math.floor(day.lunchMinutes / 60)
                    const lunchMins = day.lunchMinutes % 60
                    const workHours = Math.floor(day.workMinutes / 60)
                    const workMins = day.workMinutes % 60
                    
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
                            {day.sessions.length > 0 ? (
                              <>
                                <span className="work-time">{workHours}h {workMins}m</span>
                                {day.lunchMinutes > 0 && (
                                  <span className="lunch-time" style={{fontSize: '0.85em', color: '#666', marginLeft: '4px'}}>
                                    (+{lunchHours > 0 ? `${lunchHours}h ` : ''}{lunchMins}m lunch)
                                  </span>
                                )}
                              </>
                            ) : '—'}
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
                                
                                {/* Edit/Delete buttons for draft and rejected sessions */}
                                {(session.status === 'draft' || session.status === 'rejected') && (
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
                        {weeklySessions.filter(s => s.status === 'rejected').length} sessions rejected <button className="convert-to-draft-btn" onClick={convertRejectedToDraft} style={{ marginLeft: '10px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }} title="Convert all rejected sessions to draft status so you can edit and re-submit them">Make Changes</button></div>
                    )}
                  </div>
                  
                  {/* Submission form - only show if there are draft sessions */}
                  {weeklySessions.filter(s => s.status === 'draft' && s.duration && s.endTime).length > 0 && (
                    <div className="submission-form">
                      <p className="submission-instructions">
                        By providing your initials below, you certify that the dates, times, and hours worked recorded above are accurate and complete. All sessions for the week will be submitted together for approval.
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

  // Show Access Denied screen for unapproved users (but not while still loading role)
  if (session && user && userRole === 'user' && !loading) {
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
        {userRole === 'admin' || userRole === 'super_admin' ? (
          // Admin/Super Admin navigation: Clock, My Hours, Admin, Projects, Materials, Roles, History
          <>
            <button 
              className={`nav-item ${activeTab === 'clock' ? 'active' : ''}`}
              onClick={() => setActiveTab('clock')}
            >
              <Clock size={20} />
              <span>Clock</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'timesheet' ? 'active' : ''}`}
              onClick={() => setActiveTab('timesheet')}
            >
              <FileText size={20} />
              <span>My Hours</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <Shield size={20} />
              <span>Admin</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('projects')}
            >
              <Calendar size={20} />
              <span>Projects</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'materials' ? 'active' : ''}`}
              onClick={() => setActiveTab('materials')}
            >
              <Package size={20} />
              <span>Materials</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'roles' ? 'active' : ''}`}
              onClick={() => setActiveTab('roles')}
            >
              <Users size={20} />
              <span>Roles</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <History size={20} />
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
              className={`nav-item ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('projects')}
            >
              <Calendar size={24} />
              <span>Projects</span>
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
              <div className="header-actions">
                <button 
                  className="print-btn no-print" 
                  onClick={handlePrintProjectReport}
                  title="Print Project Report"
                  style={{ marginRight: '10px' }}
                >
                  <FileText size={20} /> Print Report
                </button>
                <button 
                  className="modal-close-btn" 
                  onClick={() => setSelectedProjectForStats(null)}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="project-stats-summary">
              <div className="stat-box">
                <h4>Work Hours</h4>
                <p className="stat-value">{Math.round(projectStats.workMinutes / 60 * 10) / 10}h</p>
              </div>
              <div className="stat-box">
                <h4>Sessions</h4>
                <p className="stat-value">{projectStats.sessionCount}</p>
              </div>
              <div className="stat-box">
                <h4>Workers</h4>
                <p className="stat-value">{Object.keys(projectStats.employeeHours).length}</p>
              </div>
              {userRole === 'super_admin' && (() => {
                let totalBilled = 0
                Object.entries(projectStats.hoursByRole).forEach(([role, minutes]) => {
                  const roleData = roles.find(r => r.role_name === role)
                  const rate = roleData?.hourly_rate ? parseFloat(roleData.hourly_rate) : null
                  if (rate !== null) {
                    totalBilled += ((minutes as number) / 60) * rate
                  }
                })
                return (
                  <div className="stat-box" style={{ backgroundColor: '#e8f5e9' }}>
                    <h4>Total Billed</h4>
                    <p className="stat-value">${totalBilled.toFixed(2)}</p>
                  </div>
                )
              })()}
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
                      {userRole === 'super_admin' && (
                        <>
                          <th>Billing Rate</th>
                          <th>Total Billed</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let grandTotal = 0
                      const rows = Object.entries(projectStats.hoursByRole)
                        .sort((a, b) => (b[1] as number) - (a[1] as number))
                        .map(([role, minutes]) => {
                          const mins = minutes as number
                          const hours = Math.round(mins / 60 * 10) / 10
                          const percentage = Math.round((mins / projectStats.totalMinutes) * 100)
                          const roleData = roles.find(r => r.role_name === role)
                          const rate = roleData?.hourly_rate ? parseFloat(roleData.hourly_rate) : null
                          const billed = rate !== null ? (mins / 60) * rate : null
                          if (billed !== null) grandTotal += billed
                          return (
                            <tr key={role}>
                              <td><strong>{role}</strong></td>
                              <td>{hours}h</td>
                              <td>{percentage}%</td>
                              {userRole === 'super_admin' && (
                                <>
                                  <td>{rate !== null ? `$${rate.toFixed(2)}/hr` : <span style={{color: '#999'}}>No rate</span>}</td>
                                  <td>{billed !== null ? `$${billed.toFixed(2)}` : '—'}</td>
                                </>
                              )}
                            </tr>
                          )
                        })
                      return (
                        <>
                          {rows}
                          {userRole === 'super_admin' && grandTotal > 0 && (
                            <tr style={{ borderTop: '2px solid #333', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                              <td colSpan={3}><strong>GRAND TOTAL BILLED</strong></td>
                              <td></td>
                              <td><strong>${grandTotal.toFixed(2)}</strong></td>
                            </tr>
                          )}
                        </>
                      )
                    })()}
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
                <label>Date:</label>
                <input
                  type="date"
                  value={(() => {
                    const startDate = new Date(editingSession.start_time || editingSession.startTime)
                    return startDate.toISOString().split('T')[0]
                  })()}
                  onChange={(e) => {
                    // Update the date while preserving the time
                    const newDate = new Date(e.target.value)
                    const currentStart = new Date(editingSession.start_time || editingSession.startTime)
                    const currentEnd = new Date(editingSession.end_time || editingSession.endTime)
                    
                    // Set the new date with existing times
                    newDate.setHours(currentStart.getHours(), currentStart.getMinutes(), currentStart.getSeconds())
                    const newEndDate = new Date(e.target.value)
                    newEndDate.setHours(currentEnd.getHours(), currentEnd.getMinutes(), currentEnd.getSeconds())
                    
                    // Recalculate duration
                    const newDuration = Math.round((newEndDate.getTime() - newDate.getTime()) / (1000 * 60))
                    
                    setEditingSession({
                      ...editingSession,
                      startTime: newDate,
                      start_time: newDate.toISOString(),
                      endTime: newEndDate,
                      end_time: newEndDate.toISOString(),
                      duration: newDuration
                    })
                  }}
                />
              </div>

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
                  {roles
                    .filter(role => role.status === 'active')
                    .map(role => (
                      <option key={role.id} value={role.role_name}>
                        {role.role_name}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time:</label>
                  <input
                    type="time"
                    value={(() => {
                      const startDate = new Date(editingSession.start_time || editingSession.startTime)
                      const hours = startDate.getHours().toString().padStart(2, '0')
                      const minutes = startDate.getMinutes().toString().padStart(2, '0')
                      return `${hours}:${minutes}`
                    })()}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':')
                      const newStart = new Date(editingSession.start_time || editingSession.startTime)
                      newStart.setHours(parseInt(hours), parseInt(minutes))
                      
                      // Recalculate duration when start time changes
                      const endTime = new Date(editingSession.end_time || editingSession.endTime)
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
                    value={(() => {
                      const endDate = new Date(editingSession.end_time || editingSession.endTime)
                      const hours = endDate.getHours().toString().padStart(2, '0')
                      const minutes = endDate.getMinutes().toString().padStart(2, '0')
                      return `${hours}:${minutes}`
                    })()}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':')
                      const newEnd = new Date(editingSession.end_time || editingSession.endTime)
                      newEnd.setHours(parseInt(hours), parseInt(minutes))
                      
                      // Recalculate duration when end time changes
                      const startTime = new Date(editingSession.start_time || editingSession.startTime)
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
                  {roles
                    .filter(role => role.status === 'active')
                    .map(role => (
                      <option key={role.id} value={role.role_name}>
                        {role.role_name}
                      </option>
                    ))
                  }
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
              <div className="session-materials-list" style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#000' }}>Added Materials</h4>
                {sessionMaterials.map((sm: any) => (
                  <div key={sm.id} className="session-material-item" style={{ 
                    padding: '16px', 
                    background: 'white', 
                    border: '2px solid #22c55e', 
                    borderRadius: '12px', 
                    marginBottom: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div className="material-details" style={{ flex: 1 }}>
                      <strong style={{ fontSize: '16px', display: 'block', marginBottom: '6px', color: '#000' }}>{sm.materials.name}</strong>
                      <span style={{ fontSize: '15px', color: '#22c55e', fontWeight: '600' }}>{sm.quantity} {sm.materials.unit}</span>
                      {sm.notes && <div className="material-notes" style={{ fontSize: '14px', color: '#666', marginTop: '8px', fontStyle: 'italic' }}>{sm.notes}</div>}
                    </div>
                    <button
                      className="icon-btn delete"
                      onClick={() => deleteSessionMaterial(sm.id)}
                      title="Remove"
                      style={{ flexShrink: 0 }}
                    >
                      <Trash2 size={18} />
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

      {/* Project Notes Modal */}
      {showProjectNotes && selectedProjectForNotes && (
        <div className="modal-overlay" onClick={() => setShowProjectNotes(false)}>
          <div className="modal-content project-notes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Project Details</h3>
                <p className="modal-subtitle">{selectedProjectForNotes.name}</p>
              </div>
              <button 
                className="modal-close-btn" 
                onClick={() => setShowProjectNotes(false)}
              >
                ×
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="modal-tabs">
              <button
                className={`tab-btn ${projectModalTab === 'notes' ? 'active' : ''}`}
                onClick={() => setProjectModalTab('notes')}
              >
                Notes
              </button>
              <button
                className={`tab-btn ${projectModalTab === 'materials' ? 'active' : ''}`}
                onClick={() => setProjectModalTab('materials')}
              >
                Materials
              </button>
            </div>

            {/* Notes Tab Content */}
            {projectModalTab === 'notes' && (
              <>
                {/* Add Note Form */}
                <div className="add-note-form">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note for this project..."
                    rows={3}
                    className="note-textarea"
                  />
                  <button
                    className="btn-primary"
                    onClick={addProjectNote}
                    disabled={!newNote.trim() || isAddingNote}
                  >
                    {isAddingNote ? 'Adding...' : 'Add Note'}
                  </button>
                </div>

                {/* Notes List */}
                <div className="notes-list">
                  {projectNotes.length === 0 ? (
                    <div className="empty-state">
                      <p>No notes yet. Be the first to add one!</p>
                    </div>
                  ) : (
                    projectNotes.map(note => (
                      <div key={note.id} className="note-item">
                        <div className="note-header">
                          <div className="note-author">
                            <strong>{note.user_name}</strong>
                            <span className="note-date">
                              {new Date(note.created_at).toLocaleDateString()} at {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {user && note.user_id === user.id && (
                            <button
                              className="icon-btn delete"
                              onClick={() => deleteProjectNote(note.id)}
                              title="Delete note"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        <div className="note-text">{note.note_text}</div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Materials Tab Content */}
            {projectModalTab === 'materials' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px' }}>
                {/* Materials List - Takes up most of the space */}
                <div style={{ flex: 1, overflow: 'auto', minHeight: '300px' }}>
                  {sessionMaterials.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                      <p style={{ fontSize: '16px', color: '#666' }}>No materials added yet.</p>
                      <p style={{ fontSize: '14px', color: '#999' }}>Add materials below to track what's used on this project</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {sessionMaterials.map((material) => (
                        <div 
                          key={material.id} 
                          style={{ 
                            padding: '20px', 
                            background: 'white', 
                            border: '2px solid #22c55e', 
                            borderRadius: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: '16px'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '18px', fontWeight: '600', color: '#000', marginBottom: '8px' }}>
                              {material.materials.name}
                            </div>
                            {editingSessionMaterial?.id === material.id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editingSessionMaterial.quantity}
                                    onChange={(e) => setEditingSessionMaterial({...editingSessionMaterial, quantity: e.target.value})}
                                    style={{ width: '120px', padding: '8px 12px', fontSize: '16px', borderRadius: '6px', border: '2px solid #ddd' }}
                                  />
                                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#666' }}>{material.materials.unit}</span>
                                </div>
                                <input
                                  type="text"
                                  value={editingSessionMaterial.notes || ''}
                                  onChange={(e) => setEditingSessionMaterial({...editingSessionMaterial, notes: e.target.value})}
                                  placeholder="Optional notes..."
                                  style={{ padding: '8px 12px', fontSize: '15px', borderRadius: '6px', border: '2px solid #ddd', width: '100%' }}
                                />
                              </div>
                            ) : (
                              <>
                                <div style={{ fontSize: '17px', color: '#22c55e', fontWeight: '600', marginBottom: '6px' }}>
                                  {material.quantity} {material.materials.unit}
                                </div>
                                <div style={{ fontSize: '14px', color: '#666' }}>
                                  {new Date(material.created_at).toLocaleDateString()}
                                </div>
                                {material.notes && (
                                  <div style={{ fontSize: '15px', color: '#666', marginTop: '8px', fontStyle: 'italic' }}>
                                    {material.notes}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                            {editingSessionMaterial?.id === material.id ? (
                              <>
                                <button
                                  className="icon-btn save"
                                  onClick={() => updateSessionMaterial(editingSessionMaterial)}
                                  title="Save changes"
                                  style={{ width: '40px', height: '40px', background: '#22c55e', color: 'white', border: 'none' }}
                                >
                                  <Check size={20} />
                                </button>
                                <button
                                  className="icon-btn cancel"
                                  onClick={() => setEditingSessionMaterial(null)}
                                  title="Cancel"
                                  style={{ width: '40px', height: '40px', background: '#6b7280', color: 'white', border: 'none' }}
                                >
                                  <X size={20} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="icon-btn edit"
                                  onClick={() => setEditingSessionMaterial({
                                    id: material.id,
                                    quantity: material.quantity.toString(),
                                    notes: material.notes || ''
                                  })}
                                  title="Edit material"
                                  style={{ width: '40px', height: '40px' }}
                                >
                                  <Edit2 size={20} />
                                </button>
                                <button
                                  className="icon-btn delete"
                                  onClick={() => deleteSessionMaterial(material.id)}
                                  title="Delete material"
                                  style={{ width: '40px', height: '40px' }}
                                >
                                  <Trash2 size={20} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Material Form - Compact at bottom */}
                <div style={{ 
                  padding: '16px', 
                  background: '#f9fafb', 
                  border: '2px solid #e5e7eb', 
                  borderRadius: '12px',
                  flexShrink: 0
                }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Add Material</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '12px', marginBottom: '12px' }}>
                    <select
                      value={newSessionMaterial.materialId}
                      onChange={(e) => setNewSessionMaterial({...newSessionMaterial, materialId: e.target.value})}
                      style={{ padding: '8px 12px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ddd' }}
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
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newSessionMaterial.quantity}
                      onChange={(e) => setNewSessionMaterial({...newSessionMaterial, quantity: e.target.value})}
                      placeholder="Quantity"
                      style={{ padding: '8px 12px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ddd' }}
                    />
                    <input
                      type="text"
                      value={newSessionMaterial.notes}
                      onChange={(e) => setNewSessionMaterial({...newSessionMaterial, notes: e.target.value})}
                      placeholder="Notes (optional)"
                      style={{ padding: '8px 12px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <button
                    className="btn-primary"
                    onClick={async () => {
                      const tempMaterial = {
                        ...newSessionMaterial,
                        project: selectedProjectForNotes.name,
                        date: new Date().toISOString().split('T')[0]
                      }
                      setNewSessionMaterial(tempMaterial)
                      await addSessionMaterial()
                      loadProjectMaterials(selectedProjectForNotes.name)
                    }}
                    disabled={!newSessionMaterial.materialId || !newSessionMaterial.quantity}
                    style={{ width: '100%', padding: '10px' }}
                  >
                    Add Material
                  </button>
                </div>
              </div>
            )}
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

      {/* Printable Project Report */}
      {showPrintProjectReport && projectStats && (
        <div className="print-content">
          <div className="print-header">
            <div className="print-title">Project Completion Report</div>
            <div className="print-subtitle">
              Project: {projectStats.project.name}<br />
              Type: {projectStats.project.type}<br />
              Location: {projectStats.project.location}<br />
              Date Range: {projectStats.firstDate ? formatDateForPrint(projectStats.firstDate) : 'N/A'} - {projectStats.lastDate ? formatDateForPrint(projectStats.lastDate) : 'N/A'}<br />
              Report Date: {formatDateForPrint(new Date())}
            </div>
          </div>

          <div className="print-section">
            <h3>Project Summary</h3>
            <table className="print-table" style={{ width: '60%' }}>
              <tbody>
                <tr>
                  <td><strong>Total Work Hours</strong></td>
                  <td>{Math.round(projectStats.workMinutes / 60 * 10) / 10} hours</td>
                </tr>
                <tr>
                  <td><strong>Total Sessions</strong></td>
                  <td>{projectStats.sessionCount}</td>
                </tr>
                <tr>
                  <td><strong>Workers Involved</strong></td>
                  <td>{Object.keys(projectStats.employeeHours).length}</td>
                </tr>
                <tr>
                  <td><strong>Project Duration</strong></td>
                  <td>
                    {projectStats.firstDate && projectStats.lastDate
                      ? `${Math.ceil((projectStats.lastDate.getTime() - projectStats.firstDate.getTime()) / (1000 * 60 * 60 * 24))} days`
                      : 'N/A'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {userRole === 'super_admin' && (() => {
            let totalBilled = 0
            Object.entries(projectStats.hoursByRole).forEach(([role, minutes]: [string, any]) => {
              const roleData = roles.find((r: any) => r.role_name === role)
              const rate = roleData?.hourly_rate ? parseFloat(roleData.hourly_rate) : null
              if (rate !== null) {
                totalBilled += (minutes / 60) * rate
              }
            })
            return totalBilled > 0 ? (
              <div className="print-section">
                <h3>Billing Summary (Super Admin Only)</h3>
                <table className="print-table" style={{ width: '60%' }}>
                  <tbody>
                    <tr style={{ backgroundColor: '#e8f5e9' }}>
                      <td><strong>GRAND TOTAL BILLED</strong></td>
                      <td><strong>${totalBilled.toFixed(2)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null
          })()}

          {Object.keys(projectStats.hoursByRole).length > 0 && (
            <div className="print-section">
              <h3>Hours by Equipment/Role</h3>
              <table className="print-table">
                <thead>
                  <tr>
                    <th>Role/Equipment</th>
                    <th>Hours</th>
                    <th>% of Total</th>
                    {userRole === 'super_admin' && (
                      <>
                        <th>Billing Rate</th>
                        <th>Total Billed</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let grandTotal = 0
                    const rows = Object.entries(projectStats.hoursByRole)
                      .sort((a, b) => (b[1] as number) - (a[1] as number))
                      .map(([role, minutes]) => {
                        const mins = minutes as number
                        const hours = Math.round(mins / 60 * 10) / 10
                        const percentage = Math.round((mins / projectStats.totalMinutes) * 100)
                        const roleData = roles.find((r: any) => r.role_name === role)
                        const rate = roleData?.hourly_rate ? parseFloat(roleData.hourly_rate) : null
                        const billed = rate !== null ? (mins / 60) * rate : null
                        if (billed !== null) grandTotal += billed
                        return (
                          <tr key={role}>
                            <td>{role}</td>
                            <td>{hours}h</td>
                            <td>{percentage}%</td>
                            {userRole === 'super_admin' && (
                              <>
                                <td>{rate !== null ? `$${rate.toFixed(2)}/hr` : <em style={{color: '#999'}}>No rate</em>}</td>
                                <td>{billed !== null ? `$${billed.toFixed(2)}` : '—'}</td>
                              </>
                            )}
                          </tr>
                        )
                      })
                    return (
                      <>
                        {rows}
                        {userRole === 'super_admin' && grandTotal > 0 && (
                          <tr style={{ borderTop: '2px solid #000', fontWeight: 'bold' }}>
                            <td colSpan={3}><strong>GRAND TOTAL BILLED</strong></td>
                            <td></td>
                            <td><strong>${grandTotal.toFixed(2)}</strong></td>
                          </tr>
                        )}
                      </>
                    )
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {Object.keys(projectStats.employeeHours).length > 0 && (
            <div className="print-section">
              <h3>Hours by Employee</h3>
              <table className="print-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Hours Worked</th>
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
                          <td>{employee}</td>
                          <td>{hours}h</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}

          {Object.keys(projectStats.materialTotals).length > 0 && (
            <div className="print-section">
              <h3>Materials Used</h3>
              <table className="print-table">
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
                          <td>{material}</td>
                          <td>{materialData.quantity} {materialData.unit}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Admin Approved Timesheet Print Layout */}
      {showPrintAdminTimesheet && timesheetToPrint && (
        <div className="print-content admin-timesheet-print">
          <div className="print-header">
            <h1>Approved Timesheet</h1>
            <p>Employee: {timesheetToPrint.userName}</p>
            <p>Week Ending: {timesheetToPrint.weekEndingDate ? formatDateForPrint(new Date(timesheetToPrint.weekEndingDate)) : 'N/A'}</p>
            <p>Employee Initials: {timesheetToPrint.employeeInitials || 'N/A'}</p>
            <p>Submitted: {timesheetToPrint.submittedAt ? formatDateForPrint(new Date(timesheetToPrint.submittedAt)) : 'N/A'}</p>
            {timesheetToPrint.sessions[0]?.approved_at && (
              <p>Approved: {formatDateForPrint(new Date(timesheetToPrint.sessions[0].approved_at))}</p>
            )}
          </div>

          <div className="print-section">
            <h3>Daily Hours Summary</h3>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Total Hours</th>
                  <th>Lunch</th>
                  <th>Work Hours</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Group sessions by date
                  const sessionsByDate = timesheetToPrint.sessions.reduce((acc: any, session: any) => {
                    const date = new Date(session.start_time).toDateString()
                    if (!acc[date]) {
                      acc[date] = []
                    }
                    acc[date].push(session)
                    return acc
                  }, {})

                  // Sort dates chronologically
                  const sortedDates = Object.keys(sessionsByDate).sort((a, b) => 
                    new Date(a).getTime() - new Date(b).getTime()
                  )

                  return sortedDates.map(date => {
                    const daySessions = sessionsByDate[date]
                    const totalMinutes = daySessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0)
                    const lunchMinutes = daySessions
                      .filter((s: any) => s.project === 'Lunch')
                      .reduce((sum: number, s: any) => sum + (s.duration || 0), 0)
                    const workMinutes = totalMinutes - lunchMinutes

                    const totalHours = Math.floor(totalMinutes / 60)
                    const totalMins = totalMinutes % 60
                    const lunchHours = Math.floor(lunchMinutes / 60)
                    const lunchMins = lunchMinutes % 60
                    const workHours = Math.floor(workMinutes / 60)
                    const workMins = workMinutes % 60

                    return (
                      <tr key={date}>
                        <td>{formatDateForPrint(new Date(date))}</td>
                        <td>{totalHours}h {totalMins}m</td>
                        <td>{lunchHours}h {lunchMins}m</td>
                        <td>{workHours}h {workMins}m</td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>

          <div className="print-section">
            <h3>Role Breakdown</h3>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Group work sessions (exclude Lunch) by role
                  const roleMap: Record<string, number> = {}
                  timesheetToPrint.sessions
                    .filter((s: any) => s.project !== 'Lunch')
                    .forEach((s: any) => {
                      roleMap[s.role] = (roleMap[s.role] || 0) + (s.duration || 0)
                    })

                  const rows = Object.entries(roleMap).map(([roleName, minutes]) => {
                    const h = Math.floor((minutes as number) / 60)
                    const m = (minutes as number) % 60
                    return (
                      <tr key={roleName}>
                        <td>{roleName}</td>
                        <td>{h}h {m}m</td>
                      </tr>
                    )
                  })

                  return <>{rows}</>
                })()}
              </tbody>
            </table>
          </div>

          {userRole === 'super_admin' && (() => {
            // Find the employee's pay rate
            const employee = allUsers.find(u => u.user_id === timesheetToPrint.userId)
            const payRate = employee?.employee_hourly_rate ? parseFloat(employee.employee_hourly_rate) : null
            
            if (!payRate) return null
            
            // Calculate total pay
            const lunchMinutes = timesheetToPrint.sessions
              .filter((s: any) => s.project === 'Lunch')
              .reduce((sum: number, s: any) => sum + (s.duration || 0), 0)
            const workMinutes = timesheetToPrint.totalMinutes - lunchMinutes
            const workHours = workMinutes / 60
            const totalPay = workHours * payRate
            
            return (
              <div className="print-section">
                <h3>Pay Summary (Super Admin Only)</h3>
                <table className="print-table" style={{ width: '60%' }}>
                  <tbody>
                    <tr>
                      <td><strong>Employee Pay Rate:</strong></td>
                      <td>${payRate.toFixed(2)}/hr</td>
                    </tr>
                    <tr>
                      <td><strong>Total Work Hours:</strong></td>
                      <td>{Math.floor(workMinutes / 60)}h {workMinutes % 60}m ({workHours.toFixed(2)} hrs)</td>
                    </tr>
                    <tr style={{ backgroundColor: '#e8f5e9', fontWeight: 'bold' }}>
                      <td><strong>TOTAL PAY:</strong></td>
                      <td><strong>${totalPay.toFixed(2)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })()}

          <div className="print-section">
            <h3>Week Summary</h3>
            <table className="print-table">
              <tbody>
                <tr>
                  <td><strong>Total Work Hours:</strong></td>
                  <td>
                    {(() => {
                      const lunchMinutes = timesheetToPrint.sessions
                        .filter((s: any) => s.project === 'Lunch')
                        .reduce((sum: number, s: any) => sum + (s.duration || 0), 0)
                      const workMinutes = timesheetToPrint.totalMinutes - lunchMinutes
                      const hours = Math.floor(workMinutes / 60)
                      const mins = workMinutes % 60
                      return `${hours}h ${mins}m`
                    })()}
                  </td>
                </tr>
                <tr>
                  <td><strong>Total Lunch Time:</strong></td>
                  <td>
                    {(() => {
                      const lunchMinutes = timesheetToPrint.sessions
                        .filter((s: any) => s.project === 'Lunch')
                        .reduce((sum: number, s: any) => sum + (s.duration || 0), 0)
                      const hours = Math.floor(lunchMinutes / 60)
                      const mins = lunchMinutes % 60
                      return `${hours}h ${mins}m`
                    })()}
                  </td>
                </tr>
                <tr>
                  <td><strong>Days Worked:</strong></td>
                  <td>
                    {(() => {
                      const uniqueDates = new Set(
                        timesheetToPrint.sessions
                          .filter((s: any) => s.project !== 'Lunch')
                          .map((s: any) => new Date(s.start_time).toDateString())
                      )
                      return uniqueDates.size
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {timesheetToPrint.sessions[0]?.admin_notes && (
            <div className="print-section">
              <h3>Admin Notes</h3>
              <p>{timesheetToPrint.sessions[0].admin_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App



