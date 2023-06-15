const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv")
const cookieParser = require("cookie-parser");

const verifyToken = require("./middleware/verifyToken.js");



const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

dotenv.config();

const auth = express();

auth.use(express.json());
auth.use(cookieParser());
auth.use(cors({ origin: true }));



const db = admin.firestore();

// Register User
auth.post("/register", (req, res) => {

    (async () => {
        const { username, email, password, confirmPassword } = req.body;
        
        const checkEmail = await db.collection("users").where('email', '==', req.body.email).get();
        if(!checkEmail.empty) return res.status(400).json({msg: "Email telah terdaftar"});

        if (password !== confirmPassword) return res.status(400).json({msg: "Password dan Confirm Password Tidak Sesuai"});
        
        const salt = await bcrypt.genSalt();
        const hashPassword = await bcrypt.hash(password, salt);

        try {
            await db.collection("users").doc(`/${Date.now()}/`).create({
                id: Date.now(),
                username: username,
                email: email, 
                password: hashPassword
            });

            res.status(200).send({msg: "Registrasi Berhasil"});
        } catch (error) {
            console.log(error);
            res.status(404).send({msg: "Registrasi Gagal"});
        }
    })();
});

// Login User
auth.post("/login", (req, res) => {
    (async() => {
        try {
            const reqDoc = await db.collection("users").where('email', '==', req.body.email).get();
            const uId = reqDoc.docs[0].id;
            const reqData = await db.collection("users").doc(uId).get();
            const user = reqData.data();            
            const compare = await bcrypt.compare(req.body.password, user.password);
            
            if(!compare) return res.status(400).json({msg: "Email atau Password Salah"});

            const userId = user.password;
            const username = user.username;
            const email = user.email;

            const accessToken = jwt.sign({userId,username, email}, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '60s'
            });

            const refreshToken = jwt.sign({userId,username, email}, process.env.REFRESH_TOKEN_SECRET, {
                expiresIn: '1d'
            });

            await db.collection("users").doc(uId).update({refresh_token: refreshToken});

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000,
                // secure: true
            });
            // console.log({accessToken});
            res.json({ accessToken });
        } catch (error) {
            console.log(error);
            res.status(404).send({msg: "Email Belum Terdaftar"});

        }
    })();
});

//Refresh Token
auth.get('/token', (req, res) => {
    (async() => {
        try {
            const refreshToken = req.cookies.refreshToken;
            
            if(!refreshToken) return res.sendStatus(401);   
            
            const reqDoc = await db.collection("users").where('refresh_token', '==', refreshToken).get();
            
            if(!reqDoc) return res.sendStatus(403);

            const uId = reqDoc.docs[0].id;
            const reqData = await db.collection("users").doc(uId).get();
            const token = reqData.data();

            
            
            jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (error, decode) =>{
                if(error) return res.sendStatus(403);
                const userId = token.id;
                const username = token.username;
                const email = token.email;
                const accessToken = jwt.sign({userId, username, email}, process.env.ACCESS_TOKEN_SECRET, {
                    expiresIn: '60s'
                });
                res.json({ accessToken });
            });
        } catch (error) {
            console.log(error);
        }
        
    })();
});

//log out
auth.delete("/logout", (req, res) =>{
    (async () => {
        try {
            const refreshToken = req.cookies.refreshToken;
            if(!refreshToken) return res.sendStatus(204);

            const reqDoc = await db.collection("users").where('refresh_token', '==', refreshToken).get();
            if(!reqDoc) return res.sendStatus(204);

            const uId = reqDoc.docs[0].id;
        
            await db.collection("users").doc(uId).update({refresh_token: null});

            res.clearCookie('refreshToken');
            return res.sendStatus(200);
        } catch (error) {
            console.log(error);
        }
    }

)();
});

//Get user data
auth.get("/profile",  (req, res) => {
    (async() => {
        try {
            const token = req.cookies.refreshToken;
            
            const reqDoc = await db.collection('users').where('refresh_token', '==', token).get();
            
            const uId = reqDoc.docs[0].id;

            const reqData = await db.collection("users").doc(uId).get();
            
            const response = reqData.data();
            
            return res.json(
                {
                    username: response.username,
                    email: response.email
                }
            );
        } catch (error) {
            console.log(error);
        }
        
    
    })();
});

// Update user data
auth.post("/editProfile", (req, res) =>{
    (async()=> {
        try {
            const { username, email, password } = req.body;
            const token = req.cookies.refreshToken;

            const reqDoc = await db.collection('users').where('refresh_token', '==', token).get();
            
            const uId = reqDoc.docs[0].id;

            if( username !== null && username !== "") {
                await db.collection("users").doc(uId).update(
                    {
                        username: username,
                    }
                );
            }

            if( email !== null && email !== "") {
                await db.collection("users").doc(uId).update(
                    {
                        email: email,
                    }
                );
            }
            if( password == null && password == ""){
                const salt = await bcrypt.genSalt();
                const hashPassword = await bcrypt.hash(password, salt);
                await db.collection("users").doc(uId).update(
                    {
                        password: hashPassword
                    }
                );
            }
                                    
            res.status(200).json({ msg: "Data Berhasil Diperbarui" });
        } catch (error) {
            console.log(error);
            res.status(404).json({ msg: "Data Gagal Diperbarui" })
        }
    }

    )();
});

exports.auth = functions.region('asia-southeast2').https.onRequest(auth);