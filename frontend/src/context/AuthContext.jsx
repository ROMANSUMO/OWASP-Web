import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, AUTH_ERRORS } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        const getSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                
                if (session) {
                    setUser(session.user);
                    setIsAuthenticated(true);
                    // Fetch user profile data
                    await fetchUserProfile(session.user.id);
                } else {
                    setUser(null);
                    setIsAuthenticated(false);
                }
            } catch (error) {
                console.error('Error getting session:', error);
                setUser(null);
                setIsAuthenticated(false);
            } finally {
                setLoading(false);
            }
        };

        getSession();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state change:', event, session);
                
                if (session) {
                    setUser(session.user);
                    setIsAuthenticated(true);
                    // Fetch user profile data when user signs in
                    await fetchUserProfile(session.user.id);
                    
                    // Create profile if it doesn't exist (for OAuth sign-ins)
                    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                        await ensureUserProfile(session.user);
                    }
                } else {
                    setUser(null);
                    setIsAuthenticated(false);
                }
                setLoading(false);
            }
        );

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    // Fetch user profile data from profiles table
    const fetchUserProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Error fetching profile:', error);
                return;
            }

            if (data) {
                // Merge profile data with auth user data
                setUser(prevUser => ({ ...prevUser, profile: data }));
            }
        } catch (error) {
            console.error('Error in fetchUserProfile:', error);
        }
    };

    const login = async (credentials) => {
        try {
            console.log('Login attempt with:', { email: credentials.email });
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password,
            });

            if (error) {
                console.error('Login error:', error);
                
                let errorMessage = AUTH_ERRORS.NETWORK_ERROR;
                if (error.message.includes('Invalid login credentials')) {
                    errorMessage = AUTH_ERRORS.INVALID_CREDENTIALS;
                } else if (error.message.includes('Email not confirmed')) {
                    errorMessage = 'Please check your email and confirm your account';
                } else {
                    errorMessage = error.message;
                }
                
                return { 
                    success: false, 
                    message: errorMessage,
                    error: error
                };
            }

            if (data.user) {
                console.log('Login successful:', data.user.email);
                return { 
                    success: true, 
                    message: 'Login successful',
                    user: data.user
                };
            }

            return { success: false, message: 'Login failed' };
        } catch (error) {
            console.error('Login exception:', error);
            return { success: false, message: AUTH_ERRORS.NETWORK_ERROR };
        }
    };

    const register = async (userData) => {
        try {
            console.log('Registration attempt with:', { 
                email: userData.email, 
                username: userData.username 
            });

            // Validate password match on frontend
            if (userData.password !== userData.confirmPassword) {
                return {
                    success: false,
                    message: 'Password confirmation does not match password',
                    errors: [{ msg: 'Password confirmation does not match password' }]
                };
            }

            // Sign up with Supabase Auth
            const { data, error } = await supabase.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        username: userData.username,
                        display_name: userData.username,
                    }
                }
            });

            if (error) {
                console.error('Registration error:', error);
                
                let errorMessage = AUTH_ERRORS.NETWORK_ERROR;
                if (error.message.includes('User already registered')) {
                    errorMessage = AUTH_ERRORS.EMAIL_IN_USE;
                } else if (error.message.includes('Password should be')) {
                    errorMessage = AUTH_ERRORS.WEAK_PASSWORD;
                } else {
                    errorMessage = error.message;
                }
                
                return { 
                    success: false, 
                    message: errorMessage,
                    error: error
                };
            }

            if (data.user) {
                console.log('Registration successful:', data.user.email);
                
                // Create profile record
                await createUserProfile(data.user.id, userData.username);
                
                // Check if user needs email confirmation
                if (!data.session) {
                    return {
                        success: true,
                        message: 'Registration successful! Please check your email to confirm your account.',
                        user: data.user,
                        needsConfirmation: true
                    };
                }
                
                return { 
                    success: true, 
                    message: 'Registration successful',
                    user: data.user
                };
            }

            return { success: false, message: 'Registration failed' };
        } catch (error) {
            console.error('Registration exception:', error);
            return { success: false, message: AUTH_ERRORS.NETWORK_ERROR };
        }
    };

    // Create user profile in profiles table
    const createUserProfile = async (userId, username) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: userId,
                        username: username,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    }
                ])
                .select()
                .single();

            if (error) {
                console.error('Error creating profile:', error);
                return;
            }

            console.log('Profile created successfully:', data);
        } catch (error) {
            console.error('Error in createUserProfile:', error);
        }
    };

    // Ensure user profile exists (for OAuth sign-ins)
    const ensureUserProfile = async (user) => {
        try {
            // Check if profile exists
            const { data: existingProfile, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (fetchError && fetchError.code === 'PGRST116') {
                // Profile doesn't exist, create it
                console.log('Creating profile for OAuth user:', user.id);
                
                // Extract username from user metadata or email
                const username = user.user_metadata?.name || 
                                user.user_metadata?.full_name || 
                                user.email?.split('@')[0] || 
                                `user_${user.id.slice(0, 8)}`;
                
                await createUserProfile(user.id, username);
            } else if (fetchError) {
                console.error('Error checking profile:', fetchError);
            } else {
                console.log('Profile already exists for user:', user.id);
            }
        } catch (error) {
            console.error('Error in ensureUserProfile:', error);
        }
    };

    const logout = async () => {
        try {
            console.log('Logout attempt');
            
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                console.error('Logout error:', error);
            } else {
                console.log('Logout successful');
            }
            
            // State will be updated via onAuthStateChange listener
        } catch (error) {
            console.error('Logout exception:', error);
        }
    };

    // Update user profile
    const updateProfile = async (profileData) => {
        try {
            if (!user?.id) return { success: false, message: 'User not authenticated' };

            const { data, error } = await supabase
                .from('profiles')
                .update({
                    ...profileData,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id)
                .select()
                .single();

            if (error) {
                console.error('Profile update error:', error);
                return { success: false, message: error.message };
            }

            // Update local user state
            setUser(prevUser => ({ ...prevUser, profile: data }));
            
            return { success: true, message: 'Profile updated successfully', data };
        } catch (error) {
            console.error('Profile update exception:', error);
            return { success: false, message: 'Failed to update profile' };
        }
    };

    // Google OAuth sign-in
    const signInWithGoogle = async () => {
        try {
            console.log('Google sign-in attempt');
            
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/home`
                }
            });

            if (error) {
                console.error('Google sign-in error:', error);
                return { 
                    success: false, 
                    message: error.message,
                    error: error
                };
            }

            return { 
                success: true, 
                message: 'Redirecting to Google...'
            };
        } catch (error) {
            console.error('Google sign-in exception:', error);
            return { success: false, message: AUTH_ERRORS.NETWORK_ERROR };
        }
    };

    const value = {
        isAuthenticated,
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        fetchUserProfile,
        signInWithGoogle
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};