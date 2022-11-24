const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000
require('dotenv').config()

const app = express()

//middleware
app.use(cors())
app.use(express.json())

app.get('/', async (req, res) => {
    res.send('Prime Motors server is running')
})

app.listen(port, () => console.log(`Prime motors running on ${port}`));