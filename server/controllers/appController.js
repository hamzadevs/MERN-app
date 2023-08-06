import UserModel from "../models/User.model.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'
import otpGenerator  from 'otp-generator'
import ENV from '../config.js'


/** middleware for verify user */
export async function verifyUser(req, res, next) {
    try {
        const { username } = req.method == "GET" ? req.query : req.body;

        // check the user existance
        const exist = await UserModel.findOne({ username });
        if(!exist) return res.status(404).send({ error : "Can't find User!"});
        next();
        
    } catch (error) {
        return res.status(400).send({error: "Authentication Error"})
    }
}

export async function register(req, res) {
    try {
        const { username, password, profile, email } = req.body;        

        // check the existing user
        const existUsername = await UserModel.findOne({ username }).then((user) => {
            if(user) res.status(400).json({ error : "Please use unique username"});
        }).catch((error) => res.status(500).send({ error}));

        // check for existing email
        const existEmail = await UserModel.findOne({ email }).then((user) => {
            if(user) res.status(400).json({ error : "Please use unique email"});
        }).catch((error) => res.status(500).send({ error}));


        Promise.all([existUsername, existEmail])
            .then((r) => {
                if(password){
                    bcrypt.hash(password, 10)
                        .then( hashedPassword => {
                            
                            const user = new UserModel({
                                username,
                                password: hashedPassword,
                                profile: profile || '',
                                email
                            });

                            // return save result as a response
                            user.save()
                                .then(result => res.status(201).send({ msg: "User Register Successfully"}))
                                .catch(error => res.status(500).send({error}))

                        }).catch(error => {
                            return res.status(500).send({
                                error : "Enable to hashed password"
                            })
                        })
                }
            }).catch(error => {
                return res.status(500).send({ error })
            })


    } catch (error) {
        return res.status(500).send(error);
    }
}
/** POST: http://localhost:8080/api/login 
 * @param: {
  "username" : "example123",
  "password" : "admin123"
}
*/
export async function login(req, res) {
    const {username, password} = req.body;
    try {
        UserModel.findOne({username})
            .then(user => {
                bcrypt.compare(password, user.password)
                .then(passwordCheck => {
                    if(!passwordCheck) return res.status(400).send({error: "Don't have Password"})

                    //create jwt token
                    const token = jwt.sign({
                        userId: user._id,
                        username: user.username
                    }, ENV.JWT_SECRET || 'secret', { expiresIn: "24h"} )

                    return res.status(200).send({
                        msg: "Login Successful...",
                        username: user.username,
                        token
                    })


                }).catch(error => {
                    return res.status(400).send({error: "Password does not match"})
                })
            })
    } catch (error) {
        return res.status(400).send({error})
    }
}

export async function getUser(req, res) {
  const {username} = req.params;

  try {
    if(!username) return res.status(501).send({ error: "Invalid Username"})
    UserModel.findOne({username}).then(user => {
        if(!user) return res.status(501).send({ error: "Couldn't Find the user" })
        /** remove password from user */
        // mongoose return unnecessary data with object so convert it into json
        const { password, ...rest } = Object.assign({}, user.toJSON());

        return res.status(200).send(rest);
    }).catch(error => res.status(500).send({error}))
  } catch (error) {
    
  }
}

export async function updateUser(req, res) {
    try {
        const id = req.query.id;
        //const { userId } = req.user;

        if(id){
            const body = req.body;

            // update the data
            UserModel.updateOne({ _id : id }, body)
            .then(() => res.status(201).send({ msg : "Record Updated...!"}))
            .catch(err => {
                throw err;
            })

        }else{
            return res.status(401).send({ error : "User Not Found...!"});
        }

    } catch (error) {
        return res.status(401).send({ error });
    }
}

/** GET: http://localhost:8080/api/generateOTP */
export async function generateOTP(req, res) {
    req.app.locals.OTP = await otpGenerator.generate(6, { lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false})
    res.status(201).send({ code: req.app.locals.OTP })
}

/** GET: http://localhost:8080/api/verifyOTP */
export async function verifyOTP(req, res) {
    const { code } = req.query;
    if(parseInt(req.app.locals.OTP) === parseInt(code)){
        req.app.locals.OTP = null; // reset the OTP value
        req.app.locals.resetSession = true; // start session for reset password
        return res.status(201).send({ msg: 'Verify Successsfully!'})
    }
    return res.status(400).send({ error: "Invalid OTP"});
}

// successfully redirect user when OTP is valid
/** GET: http://localhost:8080/api/createResetSession */
export async function createResetSession(req, res) {
    if(req.app.locals.resetSession){
        return res.status(201).send({ flag : req.app.locals.resetSession})
   }
   return res.status(440).send({error : "Session expired!"})
}

// update the password when we have valid session
/** PUT: http://localhost:8080/api/resetPassword */
export async function resetPassword(req, res) {
    if(!req.app.locals.resetSession) return res.status(440).send({error : "Session expired!"});

    const { username, password } = req.body;

    try {
        
        UserModel.findOne({ username})
            .then(user => {
                bcrypt.hash(password, 10)
                    .then(hashedPassword => {
                        UserModel.updateOne({ username : user.username },
                        { password: hashedPassword}).then(() => {
                                req.app.locals.resetSession = false; // reset session
                                return res.status(201).send({ msg : "Record Updated...!"})
                        }).catch(err => {throw err;})
                    })
                    .catch( e => {
                        return res.status(500).send({
                            error : "Enable to hashed password"
                        })
                    })
            })
            .catch(error => {
                return res.status(404).send({ error : "Username not Found"});
            })

    } catch (error) {
        return res.status(500).send({ error })
    }

}
