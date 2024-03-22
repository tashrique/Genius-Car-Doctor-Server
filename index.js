const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { ObjectId, MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();



const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.i6nrryx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


const verifyJWT = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.status(401).send('Unauthorized');
        return;
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            res.status(403).send('Forbidden');
            return;
        }

        req.decoded = decoded;
        next();
    })
}


async function run() {

    try {
        const serviceCollection = client.db('geniusCar').collection('services');
        const orderCollection = client.db('geniusCar').collection('orders');

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })


        // Get all services
        app.get('/services', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);

            const services = await cursor.toArray();
            res.send(services);
        })


        //Get one service
        app.get('/services/:id', async (req, res) => {
            const serviceId = req.params.id;
            const query = { _id: new ObjectId(serviceId) };
            const service = await serviceCollection.findOne(query);
            res.send(service);
        })


        // Make an order
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.json(result);
        })


        // Get user orders
        app.get('/orders', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            if (decoded.email !== req.query.email) {
                res.status(403).send('Forbidden');
                return;
            }
            let query = {};
            if (req.query.email) {
                query = { email: req.query.email };
            }
            const cursor = orderCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        })



        //Delete user order
        app.delete('/orders/:id', async (req, res) => {
            const orderId = req.params.id;
            const query = { _id: new ObjectId(orderId) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })

        //Edit order
        app.patch('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const status = req.body.status;
            const updateDoc = {
                $set: {
                    status: status
                },
            };
            const result = await orderCollection.updateOne(query, updateDoc);
            res.send(result);
        })

    } catch {
        console.log('Error in connecting to database');
    }

}

run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Server Genius Car is running');
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})