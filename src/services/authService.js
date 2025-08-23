import { supabase } from './supabaseClient'

export const authService = {
  async getSession() {
    const { data } = await supabase.auth.getSession()
    return data?.session || null
  },

  async getUser() {
    const { data } = await supabase.auth.getUser()
    return data?.user || null
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null)
    })
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data.user
  },

  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data.user
  },

  async signOut() {
    await supabase.auth.signOut()
  }
}


