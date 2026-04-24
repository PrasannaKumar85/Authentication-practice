const express = require('express')//import express
const path = require('path')          //import path
const {open} = require('sqlite')      //import sqlite and destructure the obj  open
const sqlite3 = require('sqlite3')    //import sqlite3
const bcrypt = require('bcrypt')          //import bcrypt
const app = express()                     //call express instance
app.use(express.json())                   //it is middle ware to allow json objects
const dbpath = path.join(__dirname, 'userData.db')     //get dbpath
let db = null
const initializeDBAndServer = async () => {       //initializeDBAnd Servrr
  try {
    db = await open({
      filename: dbpath,               
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('server running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DBerror:${e.message}`)
    process.exit(1)                   //process.exit(1) helps to exit the process
  }
}
initializeDBAndServer()
//Registration API
app.post('/register/', async (request, response) => {
  const {username, name, password, gender, location} = request.body               //destructure the request.body contains json 
  const hashedpassword = await bcrypt.hash(password, 10)                          //it converts password into hashedpassword which is impossable to mamipulate
  const selectUserQurey = `select * from user                                         //sql query to select the user wether there or not                   
                          where username='${username}'`
  const dbUser = await db.get(selectUserQurey)                                     //dbUser will get wether the user present or not
  if (dbUser !== undefined) {                                                     //if dbuser has alredy a username return user already exists
    response.status(400)                                                           
    response.send('User already exists')
  } else {
    if (password.length < 5) {                                          //if password length lessthan 5 charactrers it is not possabole to create a password
      response.status(400)
      response.send('Password is too short')
    } else {                                                            //if all the conditions are satisfied  create user Query 
      const createUserQuerry = `INSERT INTO user(username,name,password,gender,location)
                                VALUES('${username}','${name}','${hashedpassword}','${gender}','${location}')`
      const dbResponse = await db.run(createUserQuerry)                            //run the query
      response.send('User created successfully')                               //send response
    }
  }
})

// Login API
app.post('/login/', async (request, response) => {

  // Extract username and password from request body
  const { username, password } = request.body

  // SQL query to fetch user details based on username
  // ⚠️ This is vulnerable to SQL Injection (we'll fix later)
  const selectUserQurey = `
    SELECT * FROM user
    WHERE username='${username}'
  `

  // Execute query and get user data from database
  const dbUser = await db.get(selectUserQurey)

  // Check if user exists
  if (dbUser === undefined) {
    // If no user found → invalid username
    response.status(400)
    response.send('Invalid user')
  } else {

    // Compare entered password with hashed password in DB
    const ispasswordMatched = await bcrypt.compare(
      password,           // plain password from request
      dbUser.password     // hashed password from database
    )

    // If passwords match
    if (ispasswordMatched === true) {
      response.send('Login success!')
    } else {
      // If password is wrong
      response.status(400)
      response.send('Invalid password')
    }
  }
})

// change password API
app.put('/change-password', async (request, response) => {

  // Get username, old password, and new password from request body
  const {username, oldPassword, newPassword} = request.body

  // SQL query to fetch user details using username
  const selectUserQuery = `SELECT * FROM user WHERE username='${username}'`

  // Execute query and store result (user data from DB)
  const dbUser = await db.get(selectUserQuery)

  // ✅ Step 1: Check if user exists
  if (dbUser === undefined) {
    response.status(400) // set HTTP status to 400 (Bad Request)
    return response.send('User not found') // stop execution if user not found
  }

  // ✅ Step 2: Check old password
  // Compare entered oldPassword with hashed password stored in database
  const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password)

  // If old password does not match
  if (!isPasswordMatched) {
    response.status(400)
    return response.send('Invalid current password') // stop execution
  }

  // ✅ Step 3: Validate new password
  // Check if new password length is less than 5 characters
  if (newPassword.length < 5) {
    response.status(400)
    return response.send('Password is too short') // stop execution
  }

  // ✅ Step 4: Hash + update
  // Convert new password into hashed format using bcrypt
  const newHashedPassword = await bcrypt.hash(newPassword, 10)

  // SQL query to update password in database
  const updateQuery = `
    UPDATE user 
    SET password='${newHashedPassword}'
    WHERE username='${username}'
  `

  // Execute update query
  await db.run(updateQuery)

  // Send success response
  response.send('Password updated')
})
module.exports = app
