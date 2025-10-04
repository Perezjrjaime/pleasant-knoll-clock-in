import { createClient } from '@supabase/supabase-js'

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for TypeScript
export interface WorkSession {
  id?: string
  user_id: string
  project: string
  location: string
  role: string
  start_time: string
  end_time?: string
  duration?: number
  created_at?: string
}

export interface Project {
  id?: string
  name: string
  type: string
  status: string
  location: string
  created_at?: string
}

export interface UserRole {
  id?: string
  user_id: string
  email: string
  full_name: string
  role: 'admin' | 'employee'
  created_at?: string
  updated_at?: string
}

export interface User {
  id?: string
  name: string
  employee_id: string
  role: string
  is_supervisor: boolean
  created_at?: string
}

// Database operations
export const supabaseOperations = {
  // Work Sessions
  async createWorkSession(session: Omit<WorkSession, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('work_sessions')
      .insert([session])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async updateWorkSession(id: string, updates: Partial<WorkSession>) {
    const { data, error } = await supabase
      .from('work_sessions')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  },

  async getWorkSessions(userId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('work_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false })

    if (startDate) {
      query = query.gte('start_time', startDate)
    }
    if (endDate) {
      query = query.lte('start_time', endDate)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getAllWorkSessions(startDate?: string, endDate?: string) {
    let query = supabase
      .from('work_sessions')
      .select(`
        *,
        users:user_id (name, employee_id)
      `)
      .order('start_time', { ascending: false })

    if (startDate) {
      query = query.gte('start_time', startDate)
    }
    if (endDate) {
      query = query.lte('start_time', endDate)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  // Projects
  async getProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'active')
      .order('name')
    
    if (error) throw error
    return data
  },

  async createProject(project: Omit<Project, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('projects')
      .insert([project])
      .select()
    
    if (error) throw error
    return data[0]
  },

  // Users
  async getUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data
  },

  async getUserById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  async createUser(user: Omit<User, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select()
    
    if (error) throw error
    return data[0]
  },

  // User Roles
  async getUserRole(userId: string) {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
    return data
  },

  async createUserRole(userRole: Omit<UserRole, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('user_roles')
      .insert([userRole])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async updateUserRole(userId: string, role: 'admin' | 'employee') {
    const { data, error } = await supabase
      .from('user_roles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
    
    if (error) throw error
    return data[0]
  },

  async getAllUserRoles() {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('full_name')
    
    if (error) throw error
    return data
  }
}