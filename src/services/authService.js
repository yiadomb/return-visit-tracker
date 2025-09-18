import { supabase } from './supabaseClient'

export const authService = {
  async getSession() {
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    return data?.session || null
  },

  async getUser() {
    if (!supabase) return null
    const { data } = await supabase.auth.getUser()
    return data?.user || null
  },

  onAuthStateChange(callback) {
    if (!supabase) return () => {}
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null)
    })
  },

  async signInWithGoogle() {
    if (!supabase) throw new Error('Supabase not configured')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) throw error
    return data
  },

  async signIn(email, password) {
    if (!supabase) throw new Error('Supabase not configured')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data.user
  },

  async signUp(email, password) {
    if (!supabase) throw new Error('Supabase not configured')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data.user
  },

  async signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
  },

  // Check if user has a complete profile (for Google OAuth users)
  getUserDisplayInfo(user) {
    if (!user) return null
    return {
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
      avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      provider: user.app_metadata?.provider || 'email'
    }
  }
}


