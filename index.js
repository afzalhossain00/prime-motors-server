const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const port = process.env.PORT || 5000
require('dotenv').config()

const app = express()

//middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eqk1vsl.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const categoryOptionCollction = client.db('primeMotors').collection('category')
        const bikesOptionCollction = client.db('primeMotors').collection('bikes')
        const bookingsCollction = client.db('primeMotors').collection('bookings')
        const usersCollction = client.db('primeMotors').collection('users')


        app.get('/category', async (req, res) => {
            const query = {};
            const options = await categoryOptionCollction.find(query).toArray();
            res.send(options);
        })

        app.get('/category/:categoryId', async (req, res) => {
            const categoryId = req.params.categoryId;
            const query = { categoryId: parseInt(categoryId) }
            const result = await bikesOptionCollction.find(query).toArray()
            res.send(result);
        })

        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const bookings = await bookingsCollction.find(query).toArray();
            res.send(bookings)
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body
            const result = await bookingsCollction.insertOne(booking)
            res.send(result);
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollction.insertOne(user)
            res.send(result)
        })
    }

    finally {

    }

}

run().catch(console.log);


app.get('/', async (req, res) => {
    res.send('Prime Motors server is running')
})

app.listen(port, () => console.log(`Prime motors running on ${port}`));