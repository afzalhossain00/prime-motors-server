const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const port = process.env.PORT || 5000
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const app = express()

//middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eqk1vsl.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('Unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next()
    })
}



async function run() {
    try {
        const categoryOptionCollction = client.db('primeMotors').collection('category')
        const bikesOptionCollction = client.db('primeMotors').collection('bikes')
        const bookingsCollction = client.db('primeMotors').collection('bookings')
        const usersCollection = client.db('primeMotors').collection('users')
        const sellerProductCollction = client.db('primeMotors').collection('sellerProduct')
        const paymentsCollction = client.db('primeMotors').collection('payments')

        const verifyAdmin = async (req, res, next) => {
            // console.log('verifyAdmin', req.decoded.email);
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.status !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }

        //Verify Seller
        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'seller') {
                return res.status(403).send({ message: 'Forbidden Access' })
            }
            next();
        }


        app.get('/category', async (req, res) => {
            const query = {};
            const options = await categoryOptionCollction.find(query).toArray();
            res.send(options);
        })

        app.get('/category/:categoryId', async (req, res) => {
            const categoryId = req.params.categoryId;
            const query = { categoryId: categoryId }
            const result = await bikesOptionCollction.find(query).toArray()
            res.send(result);
        });

        app.post('/bikes', verifyJWT, async (req, res) => {
            const bikes = req.body;
            const result = await bikesOptionCollction.insertOne(bikes);
            res.send(result);
        })

        app.get('/bookings', async (req, res) => {
            const email = req.query.email;

            // verifyJWT,
            // const decodedEmail = req.decoded.email;

            // if (email !== decodedEmail) {
            //     return res.status(403).send({ message: 'forbidden access' })
            // }

            const query = { email: email }
            // console.log(email);
            const bookings = await bookingsCollction.find(query).toArray();
            res.send(bookings)
        });

        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await bookingsCollction.findOne(query)
            res.send(booking)
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body
            const result = await bookingsCollction.insertOne(booking)
            res.send(result);
        });

        app.post("/create-payment-intent", async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: "usd",
                amount: amount,
                "payment_method_types": [
                    "card"
                ],
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollction.insertOne(payment);
            const id = payment.bookingId;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingsCollction.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '7d' })
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: '' })
        });

        app.get('/users', async (req, res) => {
            const query = {}
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.status === 'admin' })
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user)
            res.send(result)
        });

        app.delete('/users/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })

        app.put('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    status: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options)
            res.send(result);
        });

        app.get('/sellerProduct', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const sellers = await sellerProductCollction.find(query).toArray();
            res.send(sellers);
        });

        app.post('/sellerProduct', verifyJWT, async (req, res) => {
            const product = req.body;
            const result = await sellerProductCollction.insertOne(product);
            res.send(result);
        })

        app.delete('/sellerProduct/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await sellerProductCollction.deleteOne(filter);
            res.send(result);
        });

        app.put('/users/seller/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    role: 'seller'
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.send(result);

        });

        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'seller' })
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