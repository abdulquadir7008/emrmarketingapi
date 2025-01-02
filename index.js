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

app = express();
app.use(express.json());
app.use(cors());

app.post("/register", async (req, res) => {
    const { fname, lname, phone, password, email, country, stree_address, city, state, gender, postalcode, landmark, status } = req.body;

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
        const resetToken = Jwt.sign({ id: user.member_id }, jwtKey, { expiresIn: "1h" });
        const resetLink = `https://yourfrontenddomain.com/reset-password?token=${resetToken}`;
        const msg = {
            to: email,
            from: 'quadir@emrmarketing.in',
            subject: 'Password Reset Request',
            html: `<p>Hi ${user.fname},</p>
                   <p>You requested to reset your password. Click the link below to reset it:</p>
                   <a href="${resetLink}">Reset Password</a>
                   <p>If you didn't request this, please ignore this email.</p>`,
        };

        await sgMail.send(msg);

        res.send({ result: "Password reset link has been sent to your email" });
    } catch (error) {
        console.error("Error during forget password:", error);
        res.status(500).send({ result: "An internal server error occurred" });
    }
});

app.get("/cities", verifyToken,async(req,res)=>{
    let cities = await City.findAll();
    if(cities.length>0){
        res.send(cities)
    }else{
        res.send({result: "No Products Found"})
    }
})

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