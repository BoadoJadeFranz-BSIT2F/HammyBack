const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const supabase = require('../config/supabase');
const router = express.Router();

// Google OAuth login endpoint
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Google token required' });
    }

    // Verify Google token and get user info
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const googleUser = await response.json();

    if (googleUser.error) {
      return res.status(401).json({ message: 'Invalid Google token' });
    }

    const { email, name, picture } = googleUser;

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    let user;

    if (existingUser) {
      // User exists, update profile picture and log them in
      const { data: updatedUser } = await supabase
        .from('users')
        .update({ profile_picture: picture })
        .eq('id', existingUser.id)
        .select()
        .single();
      
      user = updatedUser || existingUser;
    } else {
      // Create new user with Google auth
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([
          {
            email,
            name,
            profile_picture: picture,
            auth_provider: 'google',
            profile_completed: false,
            role: 'student'
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ message: 'Error creating user' });
      }

      user = newUser;
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpire }
    );

    res.json({
      message: 'Login successful',
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profileCompleted: user.profile_completed,
        profilePicture: user.profile_picture,
        authProvider: 'google',
        hasPassword: !!user.password,
        major: user.major,
        academicYear: user.academic_year,
        targetGPA: user.target_gpa,
        department: user.department,
        subjects: user.subjects
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete profile for Google users
router.post('/complete-profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const { role, major, academicYear, targetGPA, department, subjects } = req.body;

    // Update user profile
    const updateData = {
      role: role || 'student',
      profile_completed: true
    };

    if (role === 'student') {
      updateData.major = major;
      updateData.academic_year = academicYear;
      updateData.target_gpa = targetGPA;
    } else if (role === 'teacher') {
      updateData.major = major;
      updateData.department = department;
      updateData.subjects = subjects;
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', decoded.id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return res.status(500).json({ message: 'Error updating profile' });
    }

    res.json({
      message: 'Profile completed successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        profileCompleted: updatedUser.profile_completed,
        profilePicture: updatedUser.profile_picture,        authProvider: 'google',
        hasPassword: !!updatedUser.password,        major: updatedUser.major,
        academicYear: updatedUser.academic_year,
        targetGPA: updatedUser.target_gpa,
        department: updatedUser.department,
        subjects: updatedUser.subjects
      }
    });
  } catch (error) {
    console.error('Complete profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
