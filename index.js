const express = require('express');
require('dotenv').config();
const cors = require('cors');
require('./include/dbconnect');
const Membership = require('./model/membership');
const bcrypt = require("bcrypt");
const sgMail = require('@sendgrid/mail');
const PORT = process.env.PORT || 3000;

const Jwt = require('jsonwebtoken');
const City = require('./model/cityFetch');
const jwtKey = 'e-comm';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
app.use(cors());
app.use(express.json());


app.post("/register", async (req, res) => {
    const { fname, lname, phone, password, email, country, stree_address, city, state, gender, postalcode, landmark, status,sess } = req.body;

    try {
        const existingMember = await Membership.findOne({ where: { email } });
        if (existingMember) {
            return res.status(400).send({ message: "Email already in use." });
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const uniqueStatusId = Math.floor(100000 + Math.random() * 900000).toString();
        const newMember = await Membership.create({
            fname,
            lname,
            phone,
            password: hashedPassword,
            email,
            country,
            stree_address,
            city,
            state,
            gender,
            postalcode,
            landmark,
            status:uniqueStatusId,
            sess,
        });
        const customUserId = `emr00${newMember.member_id}`;
        await Membership.update(
            { userid: customUserId },
            { where: { member_id: newMember.member_id } }
        );
        const updatedMember = await Membership.findOne({ where: { member_id: newMember.member_id } });
        const response = { ...updatedMember.toJSON() };
        delete response.password;

        const msg = {
            to: email,
            from: 'quadir@emrmarketing.in',
            subject: 'Verify Your Email Address',
            html: `<h5>Hi ${fname},</h5><p>Thank you for registering with us!</p>
<p>To complete your registration, please verify your email address by using the code below:</p>
<p style="font-size: 18px; font-weight: bold; color: #333;">${uniqueStatusId}</p>
<p><br><br><strong>With Gratitude,</strong><br><br><strong>EMR Marketing LLC</strong><br><br><img src="https://www.emrmarketing.in/images/logo.jpg" alt="EMR Marketing" width="150" /></p>`,
        };

        await sgMail.send(msg);

        res.send({
            message: "User registered successfully.",
            member: response,
        });
    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).send({ message: "An internal server error occurred." });
    }
});


app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).send({ result: "Email and password are required" });
        }
        const user = await Membership.findOne({ where: { email } });
        if (!user) {
            return res.status(404).send({ result: "No user found with this email" });
        }
        if (user.status !== "2") { 
            return res.status(403).send({ result: "Account is not active or not authorized for login" });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).send({ result: "Invalid password" });
        }
        const token = Jwt.sign({ id: user.member_id }, jwtKey, { expiresIn: "2h" });
        const response = { ...user.toJSON() };
        delete response.password; 
        res.send({
            user: response,
            auth: token,
        });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).send({ result: "An internal server error occurred" });
    }
});

app.post('/forget-password', async (req, res) => {
    const { email } = req.body;
    try {
        if (!email) {
            return res.status(400).send({ result: "Email is required" });
        }
        const user = await Membership.findOne({ where: { email } });
        if (!user) {
            return res.status(404).send({ result: "No user found with this email" });
        }
        const uniqueStatusId = Math.floor(100000 + Math.random() * 900000).toString();
        await Membership.update(
            { status: uniqueStatusId },
            { where: { member_id: user.member_id } }
        );
        const resetToken = Jwt.sign({ id: user.member_id }, jwtKey, { expiresIn: "1h" });
        const resetLink = `https://yourfrontenddomain.com/reset-password?token=${resetToken}`;
        const msg = {
            to: email,
            from: 'quadir@emrmarketing.in',
            subject: 'Password Reset Request',
            html: `<p>Hi ${user.fname},</p>
                   <p>You requested to reset your password. Click the link below to reset it:</p>
                   <a href="${resetLink}">Reset Password</a>
                   <p>${uniqueStatusId}</p>
                   <p>If you didn't request this, please ignore this email.</p>`,
        };

        await sgMail.send(msg);

        res.send({ result: "Password reset link has been sent to your email" });
    } catch (error) {
        console.error("Error during forget password:", error);
        res.status(500).send({ result: "An internal server error occurred" });
    }
});

app.get("/cities", async(req,res)=>{
    let cities = await City.findAll();
    if(cities.length>0){
        res.send(cities)
    }else{
        res.send({result: "No Products Found"})
    }
});

// Passcode and Session ID Verification API
app.post('/verify', async (req, res) => {
    const { sessionId, passcode } = req.body;
    console.log('Received data:', { sessionId, passcode });

    try {
        // Validate input
        if (!sessionId || !passcode) {
            return res.status(400).send({ result: "Session ID and Passcode are required" });
        }

        // Check in Membership model
        const user = await Membership.findOne({ where: { sess: sessionId, status: passcode } });

        if (!user) {
            return res.status(401).send({ result: "Invalid session ID or passcode" });
        }

        // Update status to 2
        user.status = "2";
        await user.save(); // Save the updated user

        // Respond with success
        res.status(200).send({
            result: "Verification successful",
            user: { id: user.member_id, email: user.email },
        });
    } catch (error) {
        console.error("Error during passcode and session verification:", error);
        res.status(500).send({ result: "An internal server error occurred" });
    }
});

app.post('/reset-password', async (req, res) => {
  const { getEmail, passcode, newPassword } = req.body;
  if (!getEmail || !passcode || !newPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const user = await Membership.findOne({ where: { email: getEmail } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid Email ID' });
    }
    if (user.status !== passcode) {
      return res.status(401).json({ message: 'Invalid passcode' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    user.status = 2;
    await user.save();
    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


app.put('/profile/:id', async (req, res) => {
  const userId = req.params.id;
  const { fname, lname, email, phone, stree_address, pincode, landmark, city, state } = req.body;

  try {
    // Validation for missing fields
    if (!fname || !lname || !email || !phone || !pincode || !city || !state) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    // Update the profile using Sequelize
    const [updated] = await Membership.update(
      { fname, lname, email, phone, stree_address, pincode, landmark, city, state },
      { where: { member_id: userId } }
    );

    if (updated === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});



function verifyToken(req,res,next){
    let token = req.headers['authorization'];
    if(token){
        token = token.split(' ')[1];
        Jwt.verify(token, jwtKey,(err,valid)=>{
            if(err){
                res.status(401).send({result : "Please provide valid token"})
            }
            else{
                next();
            }
        })
    }
    else{
        res.status(403).send({result:"Please add token with"})
    }
}
app.listen(3000, () => {
    console.log('Server is listenin on PORT :' + PORT);
})