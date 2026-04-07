const { users, account, client, getCleanClient } = require('../config/appwrite');

const { ID, Account } = require('node-appwrite');

exports.signup = async (req, res) => {
  const { email, password, name } = req.body;

  try {
    // 1. Create user in Appwrite using API KEY client
    const appwriteUser = await users.create(ID.unique(), email, undefined, password, name);

    // 2. Automagically log the user in after signup to set the session cookie
    const tempSession = await account.createEmailPasswordSession(email, password);

    res.status(201).cookie('sessionSecret', tempSession.secret, {

      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (session duration)
      sameSite: 'lax',
    }).json({
      message: 'Signup successful and logged in',
      sessionSecret: tempSession.secret, // Send secret to frontend for localStorage fallback
      user: { id: appwriteUser.$id, email: appwriteUser.email, name: appwriteUser.name },
    });
  } catch (err) {
    console.error('❌ Signup Error:', err);
    res.status(err.code || 500).json({ message: 'Error signing up', error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Verify credentials using our admin account instance
    const tempSession = await account.createEmailPasswordSession(email, password);
    const appwriteUser = await users.get(tempSession.userId);

    // Store the session secret in a cookie
    res.status(200).cookie('sessionSecret', tempSession.secret, {

      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    }).json({
      message: 'Login successful',
      sessionSecret: tempSession.secret, // Send secret to frontend
      user: { id: appwriteUser.$id, email: appwriteUser.email, name: appwriteUser.name },
      userId: tempSession.userId,
    });
  } catch (err) {
    console.error('❌ Login Error:', err);
    res.status(err.code || 401).json({ message: 'Invalid credentials.', error: err.message });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('sessionSecret').json({ message: 'Logged out successfully' });
};

exports.getMe = async (req, res) => {
  try {
    // req.userId is set by the authMiddleware from the session
    const appwriteUser = await users.get(req.userId);
    
    res.status(200).json({
      user: appwriteUser
    });
  } catch (err) {
    res.status(err.code || 500).json({ message: 'Error fetching profile', error: err.message });
  }
};
