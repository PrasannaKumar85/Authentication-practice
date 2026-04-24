const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const app = express()
app.use(express.json())
const dbpath = path.join(__dirname, 'userData.db')
let db = null
const initializeDBAndServer = async () => {
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
    process.exit(1)
  }
}
initializeDBAndServer()
//Registration API
app.post('/register/', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  const hashedpassword = await bcrypt.hash(password, 10)
  const selectUserQurey = `select * from user
                          where username='${username}'`
  const dbUser = await db.get(selectUserQurey)
  if (dbUser !== undefined) {
    response.status(400)
    response.send('User already exists')
  } else {
    if (password.length < 5) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const createUserQuerry = `INSERT INTO user(username,name,password,gender,location)
                                VALUES('${username}','${name}','${hashedpassword}','${gender}','${location}')`
      const dbResponse = await db.run(createUserQuerry)
      response.send('User created successfully')
    }
  }
})

//Login API
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectUserQurey = `select * from user
                          where username='${username}'`
  const dbUser = await db.get(selectUserQurey)
  if (dbUser === undefined) {
    //Invalid username
    response.status(400)
    response.send('Invalid user')
  } else {
    const ispasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (ispasswordMatched === true) {
      response.send('Login success!')
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})
//change password API
app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body

  const selectUserQuery = `SELECT * FROM user WHERE username='${username}'`
  const dbUser = await db.get(selectUserQuery)

  // ✅ Step 1: Check user exists
  if (dbUser === undefined) {
    response.status(400)
    return response.send('User not found')
  }

  // ✅ Step 2: Check old password
  const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password)

  if (!isPasswordMatched) {
    response.status(400)
    return response.send('Invalid current password')
  }

  // ✅ Step 3: Validate new password
  if (newPassword.length < 5) {
    response.status(400)
    return response.send('Password is too short')
  }

  // ✅ Step 4: Hash + update
  const newHashedPassword = await bcrypt.hash(newPassword, 10)

  const updateQuery = `
    UPDATE user 
    SET password='${newHashedPassword}'
    WHERE username='${username}'
  `
  await db.run(updateQuery)

  response.send('Password updated')
})
module.exports = app
